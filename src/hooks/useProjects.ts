import { useEffect } from 'react';
import { useProjectsStore } from '@/features/projects/projectsStore';
import { useAuth } from './useAuth';

export function useProjects() {
  const { user } = useAuth();
  const store = useProjectsStore();

  useEffect(() => {
    if (user?.id) store.fetchProjects(user.id);
  }, [user?.id]);

  return store;
}
