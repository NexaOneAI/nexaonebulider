/**
 * Floating popover positioned next to the currently selected element
 * inside the preview iframe. Tabs: Texto · Color · Fuente · Spacing · Attrs.
 */
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useVisualEditsStore } from '@/features/visualEdits/visualEditsStore';
import { useBuilderStore } from '@/features/builder/builderStore';
import {
  TW_TEXT_COLORS,
  TW_BG_COLORS,
  TW_FONT_SIZES,
  TW_FONT_WEIGHTS,
  TW_FONT_FAMILIES,
  spacingClasses,
} from '@/features/visualEdits/tailwindMap';
import type { AttrName } from '@/features/visualEdits/types';
import { Sparkles, X } from 'lucide-react';

interface Props {
  /** Iframe rect in the parent viewport (for absolute positioning). */
  iframeRect: { left: number; top: number; width: number; height: number };
}

const TEXT_COLOR_SWATCH = TW_TEXT_COLORS.slice(5); // skip semantic, show hues
const BG_COLOR_SWATCH = TW_BG_COLORS.slice(8);

// Which attributes make sense per tag.
const ATTRS_BY_TAG: Record<string, AttrName[]> = {
  img: ['src', 'alt', 'title'],
  a: ['href', 'title'],
  input: ['placeholder', 'title'],
  textarea: ['placeholder', 'title'],
  button: ['title'],
  iframe: ['src', 'title'],
  source: ['src'],
  video: ['src'],
  audio: ['src'],
};

function attrsForTag(tag: string): AttrName[] {
  return ATTRS_BY_TAG[tag] || [];
}

export function VisualEditPopover({ iframeRect }: Props) {
  const selected = useVisualEditsStore((s) => s.selected);
  const setSelected = useVisualEditsStore((s) => s.setSelected);
  const applyChange = useVisualEditsStore((s) => s.applyChange);
  const sendPrompt = useBuilderStore((s) => s.sendPrompt);
  const loading = useBuilderStore((s) => s.loading);
  const [textValue, setTextValue] = useState('');
  const [attrDraft, setAttrDraft] = useState<Record<string, string>>({});
  const [aiPrompt, setAiPrompt] = useState('');

  // Sync local state when selection changes
  useEffect(() => {
    if (!selected) return;
    if (selected.isTextLeaf) setTextValue(selected.text);
    setAttrDraft({ ...(selected.attributes || {}) });
    setAiPrompt('');
  }, [selected?.uid, selected?.isTextLeaf, selected?.text, selected?.attributes]);

  const handleAiEdit = async () => {
    if (!selected || !aiPrompt.trim()) return;
    const loc = selected.location;
    const ctxLines: string[] = [];
    ctxLines.push(`Cambio solicitado sobre un elemento específico del preview:`);
    ctxLines.push('');
    ctxLines.push(`**Instrucción del usuario:** ${aiPrompt.trim()}`);
    ctxLines.push('');
    ctxLines.push(`**Elemento seleccionado:**`);
    ctxLines.push(`- Tag: \`<${selected.tag}>\``);
    if (loc) {
      ctxLines.push(`- Archivo: \`${loc.path}\``);
      ctxLines.push(`- Línea: ${loc.line}, columna: ${loc.column}`);
    }
    if (selected.className) {
      ctxLines.push(`- Clases actuales: \`${selected.className}\``);
    }
    if (selected.isTextLeaf && selected.text) {
      ctxLines.push(`- Texto actual: "${selected.text.slice(0, 200)}"`);
    }
    if (selected.attributes && Object.keys(selected.attributes).length > 0) {
      const attrs = Object.entries(selected.attributes)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}="${String(v).slice(0, 80)}"`)
        .join(' ');
      if (attrs) ctxLines.push(`- Atributos: ${attrs}`);
    }
    ctxLines.push('');
    ctxLines.push('Aplica el cambio sólo a ese elemento (mismo archivo, misma línea). Mantén el resto intacto.');
    const prompt = ctxLines.join('\n');
    setAiPrompt('');
    setSelected(null);
    await sendPrompt(prompt, 'simple_edit');
  };

  if (!selected) return null;

  // Position popover to the right of the element, fall back to below
  const elX = iframeRect.left + selected.rect.x + selected.rect.width + 12;
  const elY = iframeRect.top + selected.rect.y;
  const maxX = window.innerWidth - 340;
  const maxY = window.innerHeight - 480;
  const left = Math.min(Math.max(8, elX), maxX);
  const top = Math.min(Math.max(8, elY), maxY);

  const eligibleAttrs = attrsForTag(selected.tag);
  const hasAttrTab = eligibleAttrs.length > 0;
  const defaultTab = selected.isTextLeaf ? 'text' : hasAttrTab ? 'attrs' : 'color';

  return (
    <div
      className="fixed z-50 w-[340px] rounded-lg border border-border bg-card p-3 shadow-elevated"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">
            {selected.tag}
          </span>
          {selected.location && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {selected.location.path.split('/').pop()}:{selected.location.line}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="rounded p-0.5 text-muted-foreground hover:bg-muted"
          title="Cerrar (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Tabs defaultValue={defaultTab} key={selected.uid}>
        <TabsList className="grid h-8 w-full grid-cols-6 text-[10px]">
          <TabsTrigger value="ai" className="h-6 gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" />
            IA
          </TabsTrigger>
          <TabsTrigger value="text" className="h-6 text-[10px]" disabled={!selected.isTextLeaf}>
            Texto
          </TabsTrigger>
          <TabsTrigger value="color" className="h-6 text-[10px]">Color</TabsTrigger>
          <TabsTrigger value="font" className="h-6 text-[10px]">Fuente</TabsTrigger>
          <TabsTrigger value="space" className="h-6 text-[10px]">Spacing</TabsTrigger>
          <TabsTrigger value="attrs" className="h-6 text-[10px]" disabled={!hasAttrTab}>
            Attrs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-2 space-y-2">
          <Label className="text-[11px] text-muted-foreground">
            Describe el cambio para este {`<${selected.tag}>`}
          </Label>
          <Textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ej: hazlo más grande y centrado, agrega un icono de flecha…"
            className="min-h-[70px] resize-none text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAiEdit();
              }
            }}
          />
          <Button
            size="sm"
            className="h-7 w-full gap-1 text-[11px]"
            onClick={handleAiEdit}
            disabled={!aiPrompt.trim() || loading}
          >
            <Sparkles className="h-3 w-3" />
            {loading ? 'Aplicando…' : 'Aplicar con IA'}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Envía contexto del elemento (tag, clases, archivo, línea) a la IA. Cmd/Ctrl+Enter para enviar.
          </p>
        </TabsContent>

        <TabsContent value="text" className="mt-2 space-y-2">
          <Label className="text-[11px] text-muted-foreground">Contenido</Label>
          <Input
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            className="h-7 w-full text-[11px]"
            onClick={() => applyChange({ kind: 'text', value: textValue }, `Texto: "${textValue.slice(0, 24)}"`)}
            disabled={!selected.isTextLeaf || textValue === selected.text}
          >
            Aplicar texto
          </Button>
          {!selected.isTextLeaf && (
            <p className="text-[10px] text-muted-foreground">
              Este elemento contiene otros componentes; selecciona el hijo de texto directo.
            </p>
          )}
        </TabsContent>

        <TabsContent value="color" className="mt-2 space-y-3">
          <Section label="Color de texto">
            <Swatches
              tokens={TEXT_COLOR_SWATCH}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
          <Section label="Color de fondo">
            <Swatches
              tokens={BG_COLOR_SWATCH}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
        </TabsContent>

        <TabsContent value="font" className="mt-2 space-y-3">
          <Section label="Familia">
            <ChipRow
              tokens={TW_FONT_FAMILIES}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
          <Section label="Tamaño">
            <ChipRow
              tokens={TW_FONT_SIZES}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
          <Section label="Peso">
            <ChipRow
              tokens={TW_FONT_WEIGHTS}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
        </TabsContent>

        <TabsContent value="space" className="mt-2 space-y-3">
          <Section label="Padding (todos)">
            <ChipRow
              tokens={spacingClasses('p')}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
          <Section label="Padding X">
            <ChipRow
              tokens={spacingClasses('px')}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
          <Section label="Padding Y">
            <ChipRow
              tokens={spacingClasses('py')}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
          <Section label="Margin (todos)">
            <ChipRow
              tokens={spacingClasses('m')}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
          <Section label="Gap">
            <ChipRow
              tokens={spacingClasses('gap')}
              onPick={(t) => applyChange({ kind: 'addClass', classes: [t] }, `→ ${t}`)}
            />
          </Section>
        </TabsContent>

        <TabsContent value="attrs" className="mt-2 space-y-2">
          {eligibleAttrs.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              Este tag no expone atributos editables.
            </p>
          )}
          {eligibleAttrs.map((name) => {
            const current = (selected.attributes || {})[name] || '';
            const draft = attrDraft[name] ?? current;
            const dirty = draft !== current;
            return (
              <div key={name} className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {name}
                </Label>
                <div className="flex gap-1">
                  <Input
                    value={draft}
                    onChange={(e) =>
                      setAttrDraft((d) => ({ ...d, [name]: e.target.value }))
                    }
                    className="h-7 text-xs"
                    placeholder={current || `valor de ${name}`}
                  />
                  <Button
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    disabled={!dirty}
                    onClick={() => {
                      const ok = applyChange(
                        { kind: 'attr', name, value: draft },
                        `${name}: "${draft.slice(0, 24)}"`,
                      );
                      if (!ok) {
                        // Most likely the attribute is bound to a JSX expression
                        // and we refused to overwrite it.
                        console.warn('[visual-edits] attr edit rejected (likely bound to expression)');
                      }
                    }}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground">
            Si el atributo está enlazado a una variable (<code>{'{src}'}</code>), no se puede editar aquí.
          </p>
        </TabsContent>
      </Tabs>

      <div className="mt-3 break-all rounded bg-muted/40 p-1.5 font-mono text-[10px] text-muted-foreground">
        {selected.className || <span className="italic">sin clases</span>}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Swatches({ tokens, onPick }: { tokens: string[]; onPick: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tokens.map((t) => (
        <button
          key={t}
          type="button"
          title={t}
          onClick={() => onPick(t)}
          className={`h-5 w-5 rounded border border-border/50 ${t}`}
        />
      ))}
    </div>
  );
}

function ChipRow({ tokens, onPick }: { tokens: string[]; onPick: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tokens.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(t)}
          className="rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted"
        >
          {t}
        </button>
      ))}
    </div>
  );
}
