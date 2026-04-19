import type { PreviewFrame as FrameKind } from '@/features/builder/previewFrame';

interface Props {
  frame: FrameKind;
  children: React.ReactNode;
}

/**
 * Wraps the preview iframe with a realistic device chrome.
 * The iframe is the `children` prop and is rendered inside a positioned
 * container that mimics the device shell (notch, bezel, traffic lights, etc).
 *
 * Designs use semantic Tailwind tokens so they adapt to light/dark themes.
 */
export function PreviewFrame({ frame, children }: Props) {
  if (frame === 'none') return <>{children}</>;

  if (frame === 'iphone') {
    // Bezel/screen are physical hardware elements: kept as fixed device colors
    // (not part of the app theme). Using arbitrary HSL values keeps them stable
    // across light/dark theme changes.
    return (
      <div className="relative mx-auto flex h-full max-h-[820px] w-[400px] items-center justify-center">
        <div className="relative h-full w-full rounded-[52px] bg-[hsl(220_5%_10%)] p-3 shadow-2xl ring-1 ring-[hsl(220_5%_18%)]">
          <div className="absolute -left-[3px] top-[110px] h-7 w-[3px] rounded-l bg-[hsl(220_5%_15%)]" />
          <div className="absolute -left-[3px] top-[160px] h-12 w-[3px] rounded-l bg-[hsl(220_5%_15%)]" />
          <div className="absolute -left-[3px] top-[220px] h-12 w-[3px] rounded-l bg-[hsl(220_5%_15%)]" />
          <div className="absolute -right-[3px] top-[170px] h-16 w-[3px] rounded-r bg-[hsl(220_5%_15%)]" />
          <div className="relative h-full w-full overflow-hidden rounded-[40px] bg-[hsl(0_0%_0%)]">
            <div className="pointer-events-none absolute left-1/2 top-2 z-10 h-7 w-28 -translate-x-1/2 rounded-full bg-[hsl(0_0%_0%)] ring-1 ring-[hsl(220_5%_18%)]" />
            <div className="h-full w-full overflow-hidden rounded-[40px]">{children}</div>
          </div>
        </div>
      </div>
    );
  }

  if (frame === 'ipad') {
    return (
      <div className="relative mx-auto flex h-full max-h-[1000px] w-[760px] items-center justify-center">
        <div className="relative h-full w-full rounded-[36px] bg-[hsl(220_5%_15%)] p-4 shadow-2xl ring-1 ring-[hsl(220_5%_22%)]">
          <div className="pointer-events-none absolute left-1/2 top-2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[hsl(220_5%_30%)]" />
          <div className="h-full w-full overflow-hidden rounded-[20px] bg-[hsl(0_0%_0%)]">{children}</div>
        </div>
      </div>
    );
  }

  // macOS window — chrome uses semantic theme tokens
  return (
    <div className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl">
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/40 bg-gradient-to-b from-card to-card/70 px-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[hsl(0_75%_60%)] ring-1 ring-foreground/10" />
          <span className="h-3 w-3 rounded-full bg-[hsl(45_95%_55%)] ring-1 ring-foreground/10" />
          <span className="h-3 w-3 rounded-full bg-[hsl(140_55%_50%)] ring-1 ring-foreground/10" />
        </div>
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background/60 px-3 py-0.5 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(140_55%_50%)]" />
          preview.lovable.app
        </div>
        <div className="w-12" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-background">{children}</div>
    </div>
  );
}
