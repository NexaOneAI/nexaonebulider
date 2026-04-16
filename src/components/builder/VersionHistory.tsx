import { Clock } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export function VersionHistory() {
  // Will be connected to project_versions table
  return (
    <div className="p-4">
      <EmptyState
        icon={<Clock className="h-10 w-10" />}
        title="Sin versiones aún"
        description="Las versiones se guardan automáticamente al generar o editar"
      />
    </div>
  );
}
