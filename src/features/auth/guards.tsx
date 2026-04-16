import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './authStore';
import { Loader } from '@/components/ui/Loader';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, initialized, initialize } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);

  if (!initialized || loading) return <Loader fullScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading, initialized, initialize } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);

  if (!initialized || loading) return <Loader fullScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
