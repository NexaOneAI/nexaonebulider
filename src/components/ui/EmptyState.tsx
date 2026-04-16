import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-xl border border-dashed border-border/50 bg-card/50 p-12 text-center', className)}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center text-muted-foreground/40">
        {icon}
      </div>
      <p className="mb-1 text-lg font-medium text-muted-foreground">{title}</p>
      {description && <p className="mb-4 text-sm text-muted-foreground/70">{description}</p>}
      {action}
    </div>
  );
}
