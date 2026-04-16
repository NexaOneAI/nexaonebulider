import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  fullScreen?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };

export function Loader({ fullScreen, className, size = 'md' }: LoaderProps) {
  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className={cn('animate-spin text-primary', sizeMap[size], className)} />
      </div>
    );
  }
  return <Loader2 className={cn('animate-spin text-primary', sizeMap[size], className)} />;
}
