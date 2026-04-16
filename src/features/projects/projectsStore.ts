import { create } from 'zustand';
import { projectsService } from './projectsService';
import type { Project } from './projectTypes';

interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  fetchProjects: (userId: string) => Promise<void>;
  fetchProject: (projectId: string) => Promise<void>;
  createProject: (project: Partial<Project>) => Promise<Project | null>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  fetchProjects: async (userId) => {
    set({ loading: true });
    const projects = await projectsService.list(userId);
    set({ projects, loading: false });
  },

  fetchProject: async (projectId) => {
    set({ loading: true });
    const project = await projectsService.get(projectId);
    set({ currentProject: project, loading: false });
  },

  createProject: async (project) => {
    const created = await projectsService.create(project);
    if (created) set({ projects: [created, ...get().projects] });
    return created;
  },

  updateProject: async (projectId, updates) => {
    const updated = await projectsService.update(projectId, updates);
    if (updated) {
      set({
        projects: get().projects.map((p) => (p.id === projectId ? updated : p)),
        currentProject: get().currentProject?.id === projectId ? updated : get().currentProject,
      });
    }
  },

  removeProject: async (projectId) => {
    const ok = await projectsService.remove(projectId);
    if (ok) {
      set({ projects: get().projects.filter((p) => p.id !== projectId) });
    }
  },
}));
