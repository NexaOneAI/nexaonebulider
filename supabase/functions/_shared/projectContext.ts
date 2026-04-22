/**
 * Project Context Builder
 *
 * Genera un resumen estructurado y compacto del proyecto para inyectar como
 * contexto adicional en los prompts de la IA. Reduce el ruido al mostrar
 * sólo señales clave en lugar de toda la base de código:
 *
 *   - Rutas registradas en react-router
 *   - Componentes top-level exportados (default exports)
 *   - Design tokens detectados en index.css (variables CSS HSL)
 *   - Dependencias clave (de package.json si está presente)
 *   - Lista de archivos por carpeta (sólo paths, sin contenido)
 *
 * El resultado se trunca para no exceder ~CHAR_LIMIT (proxy ≈ 2000 tokens).
 *
 * Sin dependencias externas — funciona en Deno y en Node (para tests).
 */

export interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

export interface ProjectContextSummary {
  routes: string[];
  components: string[];
  designTokens: string[];
  dependencies: string[];
  fileTree: string[];
  totalFiles: number;
  truncated: boolean;
}

const CHAR_LIMIT = 6000; // ≈2000 tokens

const ROUTE_REGEX = /<Route\s+[^>]*path=["'`]([^"'`]+)["'`]/g;
const DEFAULT_EXPORT_REGEX =
  /export\s+default\s+(?:function\s+([A-Z]\w+)|(?:class\s+([A-Z]\w+))|([A-Z]\w+))/g;
const NAMED_FN_COMPONENT =
  /export\s+(?:const|function)\s+([A-Z]\w+)\s*[=(]/g;
const CSS_TOKEN_REGEX = /--([a-z][a-z0-9-]*)\s*:\s*([^;]+);/gi;

export function extractRoutes(files: ProjectFile[]): string[] {
  const routes = new Set<string>();
  for (const file of files) {
    if (!/\.(tsx|jsx)$/i.test(file.path)) continue;
    const matches = file.content.matchAll(ROUTE_REGEX);
    for (const m of matches) {
      if (m[1]) routes.add(m[1]);
    }
  }
  return Array.from(routes).sort();
}

export function extractComponents(files: ProjectFile[]): string[] {
  const comps = new Set<string>();
  for (const file of files) {
    if (!/\.(tsx|jsx)$/i.test(file.path)) continue;
    // Skip massive files (probably not user-authored components)
    if (file.content.length > 30_000) continue;

    for (const m of file.content.matchAll(DEFAULT_EXPORT_REGEX)) {
      const name = m[1] || m[2] || m[3];
      if (name) comps.add(name);
    }
    for (const m of file.content.matchAll(NAMED_FN_COMPONENT)) {
      if (m[1]) comps.add(m[1]);
    }
  }
  return Array.from(comps).sort().slice(0, 40);
}

export function extractDesignTokens(files: ProjectFile[]): string[] {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    if (!/index\.css$|globals\.css$/i.test(file.path)) continue;
    for (const m of file.content.matchAll(CSS_TOKEN_REGEX)) {
      const key = m[1];
      const val = m[2].trim();
      // Tokens del design system: nombres de color/superficie/efecto.
      // Usamos anclaje al inicio para no matchear --random-non-color.
      if (
        !/^(primary|secondary|accent|background|foreground|muted|border|input|ring|card|popover|destructive|sidebar)(-|$)/i.test(key) &&
        !/^(gradient|shadow|radius)(-|$)/i.test(key)
      ) {
        continue;
      }
      const line = `--${key}: ${val}`;
      if (!seen.has(line)) {
        seen.add(line);
        tokens.push(line);
      }
      if (tokens.length >= 30) break;
    }
    if (tokens.length >= 30) break;
  }
  return tokens;
}

export function extractDependencies(files: ProjectFile[]): string[] {
  const pkg = files.find((f) => f.path === "package.json");
  if (!pkg) return [];
  try {
    const json = JSON.parse(pkg.content);
    const deps = { ...(json.dependencies || {}), ...(json.devDependencies || {}) };
    // Filter to "interesting" deps — skip transitive noise
    const interesting = Object.keys(deps).filter((d) =>
      /^(react|@radix|@tanstack|zustand|tailwind|lucide|recharts|cmdk|date-fns|zod|@hookform|@supabase|framer-motion|sonner|react-router|react-hook-form)/.test(d),
    );
    return interesting.sort().slice(0, 25);
  } catch {
    return [];
  }
}

export function buildFileTree(files: ProjectFile[]): string[] {
  const byDir = new Map<string, string[]>();
  for (const f of files) {
    const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : ".";
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir)!.push(f.path.split("/").pop() || f.path);
  }
  const lines: string[] = [];
  const sortedDirs = Array.from(byDir.keys()).sort();
  for (const dir of sortedDirs) {
    const children = byDir.get(dir)!.sort();
    lines.push(`${dir}/  →  ${children.slice(0, 8).join(", ")}${children.length > 8 ? ` … (+${children.length - 8})` : ""}`);
  }
  return lines;
}

export function summarizeProject(files: ProjectFile[]): ProjectContextSummary {
  return {
    routes: extractRoutes(files),
    components: extractComponents(files),
    designTokens: extractDesignTokens(files),
    dependencies: extractDependencies(files),
    fileTree: buildFileTree(files),
    totalFiles: files.length,
    truncated: false,
  };
}

export function renderProjectContext(summary: ProjectContextSummary): string {
  const sections: string[] = ["# Project Context (auto-generated summary)"];

  if (summary.routes.length) {
    sections.push(`## Routes\n${summary.routes.map((r) => `- ${r}`).join("\n")}`);
  }
  if (summary.components.length) {
    sections.push(`## Components (top-level)\n${summary.components.join(", ")}`);
  }
  if (summary.designTokens.length) {
    sections.push(
      `## Design tokens (use these — never hardcode colors)\n${summary.designTokens.join("\n")}`,
    );
  }
  if (summary.dependencies.length) {
    sections.push(`## Key dependencies\n${summary.dependencies.join(", ")}`);
  }
  if (summary.fileTree.length) {
    sections.push(`## File structure (${summary.totalFiles} files)\n${summary.fileTree.join("\n")}`);
  }

  let rendered = sections.join("\n\n");
  if (rendered.length > CHAR_LIMIT) {
    rendered = rendered.slice(0, CHAR_LIMIT) + "\n\n[…context truncated]";
  }
  return rendered;
}

export function buildProjectContext(files: ProjectFile[]): string {
  const summary = summarizeProject(files);
  return renderProjectContext(summary);
}

/**
 * Carga el bloque de "Project Knowledge" (notas/instrucciones del usuario)
 * desde la tabla `project_knowledge` y lo formatea para inyectarlo en el
 * prompt del modelo. Devuelve string vacío si no hay knowledge habilitado
 * o si la query falla — nunca lanza, para no romper el flujo de chat.
 *
 * Firma: (admin: SupabaseClient, projectId: string) => Promise<string>
 * Tolerante: usa `any` para el cliente porque las edge functions importan
 * Supabase desde npm:/esm sin tipos compartidos.
 */
// deno-lint-ignore no-explicit-any
export async function loadProjectKnowledge(admin: any, projectId: string): Promise<string> {
  if (!admin || !projectId) return "";
  try {
    const { data, error } = await admin
      .from("project_knowledge")
      .select("content, enabled")
      .eq("project_id", projectId)
      .maybeSingle();
    if (error || !data) return "";
    if (data.enabled === false) return "";
    const content = String(data.content || "").trim();
    if (!content) return "";
    return `\n## Project Knowledge (instrucciones persistentes del usuario)\n${content}\n`;
  } catch {
    return "";
  }
}
