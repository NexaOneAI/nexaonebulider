/**
 * Nexa Intelligence — memoria persistente del proyecto.
 *
 * Vive DENTRO de project_knowledge.content como un bloque delimitado:
 *
 *   <!-- NEXA_MEMORY_START -->
 *   { ...json estructurado... }
 *   <!-- NEXA_MEMORY_END -->
 *
 * Esto nos permite:
 *  - Reusar la tabla project_knowledge (ya existe, con RLS).
 *  - Mantener el "knowledge" libre del usuario intacto al actualizar memoria.
 *  - Inyectar la misma columna en cada prompt: el LLM ve el knowledge + la memoria.
 */
import { supabase } from '@/integrations/supabase/client';
import type { AppKind, ProjectLevel } from '@/features/builder/suggestions/contextualActions';

export const MEMORY_VERSION = 1;
const MEM_START = '<!-- NEXA_MEMORY_START -->';
const MEM_END = '<!-- NEXA_MEMORY_END -->';
const MEM_BLOCK_RE = new RegExp(`${MEM_START}[\\s\\S]*?${MEM_END}`, 'g');
const MAX_HISTORY = 40;

export interface InstalledModule {
  /** id lógico ("catalog", "cart", "auth", ...) */
  id: string;
  /** etiqueta humana ("Catálogo de productos") */
  label: string;
  /** ISO timestamp en el que se aceptó/aplicó */
  installedAt: string;
  /** créditos estimados que costó */
  credits?: number;
  /** acción raíz que lo originó (suggestion id) */
  actionId?: string;
}

export interface AcceptedSuggestion {
  /** id de la quick-action o módulo */
  id: string;
  /** etiqueta visible al aceptar */
  label: string;
  /** ISO timestamp */
  acceptedAt: string;
}

export interface ProjectDecision {
  /** clave corta ("stack", "auth-provider", "currency") */
  key: string;
  /** valor libre */
  value: string;
  /** ISO timestamp */
  decidedAt: string;
}

export type MemoryActionKind =
  | 'suggestion_accepted'
  | 'module_installed'
  | 'decision'
  | 'reverted'
  | 'error_fixed'
  | 'analyzed';

export interface MemoryActionEntry {
  /** ISO timestamp */
  at: string;
  kind: MemoryActionKind;
  /** descripción humana corta */
  label: string;
  /** id opcional (módulo, sugerencia, etc.) */
  ref?: string;
}

export interface NexaMemory {
  version: number;
  /** Tipo detectado más reciente */
  projectKind: AppKind | null;
  /** Nivel del proyecto más reciente */
  projectLevel: ProjectLevel | null;
  /** Módulos ya implementados (deduplicados por id) */
  installedModules: InstalledModule[];
  /** Sugerencias aceptadas (para no repetirlas) */
  acceptedSuggestions: AcceptedSuggestion[];
  /** Decisiones del usuario (stack, moneda, etc.) */
  decisions: ProjectDecision[];
  /** Historial cronológico (cap MAX_HISTORY) */
  history: MemoryActionEntry[];
  /** ISO timestamp del último cambio */
  updatedAt: string;
}

export function emptyMemory(): NexaMemory {
  return {
    version: MEMORY_VERSION,
    projectKind: null,
    projectLevel: null,
    installedModules: [],
    acceptedSuggestions: [],
    decisions: [],
    history: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Extrae el bloque JSON de memoria de un content de project_knowledge. */
export function parseMemoryFromContent(content: string | null | undefined): NexaMemory {
  if (!content) return emptyMemory();
  const match = content.match(new RegExp(`${MEM_START}([\\s\\S]*?)${MEM_END}`));
  if (!match) return emptyMemory();
  try {
    const raw = match[1].trim();
    const parsed = JSON.parse(raw) as Partial<NexaMemory>;
    return {
      ...emptyMemory(),
      ...parsed,
      version: parsed.version ?? MEMORY_VERSION,
      installedModules: Array.isArray(parsed.installedModules) ? parsed.installedModules : [],
      acceptedSuggestions: Array.isArray(parsed.acceptedSuggestions) ? parsed.acceptedSuggestions : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return emptyMemory();
  }
}

/** Inserta o reemplaza el bloque de memoria dentro del content original. */
export function serializeMemoryIntoContent(originalContent: string, mem: NexaMemory): string {
  const json = JSON.stringify(mem, null, 2);
  const block = `${MEM_START}\n${json}\n${MEM_END}`;
  // Limpia bloques previos para evitar acumulación.
  const cleaned = (originalContent || '').replace(MEM_BLOCK_RE, '').trimEnd();
  if (!cleaned) return block;
  return `${cleaned}\n\n${block}\n`;
}

/** Devuelve el content limpio (sin el bloque de memoria) para mostrar al usuario. */
export function stripMemoryBlock(content: string | null | undefined): string {
  if (!content) return '';
  return content.replace(MEM_BLOCK_RE, '').trim();
}

interface KnowledgeRow {
  id: string;
  project_id: string;
  user_id: string;
  content: string;
  enabled: boolean;
  updated_at: string;
}

async function fetchRow(projectId: string): Promise<KnowledgeRow | null> {
  const { data, error } = await supabase
    .from('project_knowledge')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return (data as KnowledgeRow | null) ?? null;
}

/** Lee la memoria de un proyecto (vacía si no existe la fila). */
export async function loadMemory(projectId: string): Promise<NexaMemory> {
  if (!projectId) return emptyMemory();
  const row = await fetchRow(projectId);
  return parseMemoryFromContent(row?.content);
}

/**
 * Aplica un mutator sobre la memoria y la persiste preservando el knowledge
 * libre del usuario. Retorna la memoria nueva.
 */
export async function updateMemory(
  projectId: string,
  userId: string,
  mutator: (mem: NexaMemory) => NexaMemory,
): Promise<NexaMemory> {
  if (!projectId || !userId) return emptyMemory();
  const row = await fetchRow(projectId);
  const current = parseMemoryFromContent(row?.content);
  const next: NexaMemory = { ...mutator(current), updatedAt: new Date().toISOString() };
  // Cap history.
  if (next.history.length > MAX_HISTORY) {
    next.history = next.history.slice(next.history.length - MAX_HISTORY);
  }
  const newContent = serializeMemoryIntoContent(row?.content ?? '', next);
  const { error } = await supabase
    .from('project_knowledge')
    .upsert(
      {
        project_id: projectId,
        user_id: userId,
        content: newContent,
        enabled: row?.enabled ?? true,
      },
      { onConflict: 'project_id' },
    );
  if (error) throw error;
  return next;
}

// ---------------------------------------------------------------------------
// Mutators de alto nivel — la UI llama estos, no toca el shape directamente.
// ---------------------------------------------------------------------------

export function recordAcceptedSuggestion(
  mem: NexaMemory,
  s: { id: string; label: string },
): NexaMemory {
  const exists = mem.acceptedSuggestions.some((a) => a.id === s.id);
  const accepted: AcceptedSuggestion[] = exists
    ? mem.acceptedSuggestions.map((a) =>
        a.id === s.id ? { ...a, acceptedAt: new Date().toISOString() } : a,
      )
    : [...mem.acceptedSuggestions, { ...s, acceptedAt: new Date().toISOString() }];
  return {
    ...mem,
    acceptedSuggestions: accepted,
    history: [
      ...mem.history,
      {
        at: new Date().toISOString(),
        kind: 'suggestion_accepted',
        label: s.label,
        ref: s.id,
      },
    ],
  };
}

export function recordInstalledModule(
  mem: NexaMemory,
  m: { id: string; label: string; credits?: number; actionId?: string },
): NexaMemory {
  const exists = mem.installedModules.some((x) => x.id === m.id);
  const installed: InstalledModule[] = exists
    ? mem.installedModules.map((x) =>
        x.id === m.id ? { ...x, installedAt: new Date().toISOString(), credits: m.credits ?? x.credits } : x,
      )
    : [...mem.installedModules, { ...m, installedAt: new Date().toISOString() }];
  return {
    ...mem,
    installedModules: installed,
    history: [
      ...mem.history,
      {
        at: new Date().toISOString(),
        kind: 'module_installed',
        label: m.label,
        ref: m.id,
      },
    ],
  };
}

export function recordDecision(
  mem: NexaMemory,
  d: { key: string; value: string },
): NexaMemory {
  const others = mem.decisions.filter((x) => x.key !== d.key);
  return {
    ...mem,
    decisions: [...others, { ...d, decidedAt: new Date().toISOString() }],
    history: [
      ...mem.history,
      {
        at: new Date().toISOString(),
        kind: 'decision',
        label: `${d.key} = ${d.value}`,
        ref: d.key,
      },
    ],
  };
}

export function recordRevert(mem: NexaMemory, label: string): NexaMemory {
  return {
    ...mem,
    history: [
      ...mem.history,
      { at: new Date().toISOString(), kind: 'reverted', label },
    ],
  };
}

export function recordContext(
  mem: NexaMemory,
  ctx: { kind: AppKind | null; level: ProjectLevel | null },
): NexaMemory {
  if (mem.projectKind === ctx.kind && mem.projectLevel === ctx.level) return mem;
  return { ...mem, projectKind: ctx.kind, projectLevel: ctx.level };
}

/** Conjunto de ids ya aceptados — usado por intentEngine para evitar duplicar sugerencias. */
export function acceptedIds(mem: NexaMemory): Set<string> {
  const ids = new Set<string>();
  mem.acceptedSuggestions.forEach((a) => ids.add(a.id));
  mem.installedModules.forEach((m) => {
    ids.add(m.id);
    if (m.actionId) ids.add(m.actionId);
  });
  return ids;
}
