import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Project, ProjectTemplate } from '../types';
import { projectTemplates } from '../features/projects/templates';

type ProjectContextValue = {
  projects: Project[];
  currentProject: Project | null;
  createProject: (name: string, template: ProjectTemplate) => void;
  loadProject: (projectId: string) => void;
  updateProjectCode: (code: string) => void;
};

const STORAGE_KEY = 'simuemu32-projects';

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

const sortByUpdatedAt = (items: Project[]) =>
  [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `project-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed: Project[] = JSON.parse(stored);
      return sortByUpdatedAt(parsed);
    } catch (error) {
      console.error('No se pudieron cargar los proyectos guardados', error);
      return [];
    }
  });
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  const currentProject = useMemo(
    () => projects.find((project) => project.id === currentProjectId) ?? null,
    [currentProjectId, projects],
  );

  const createProject = useCallback((name: string, template: ProjectTemplate) => {
    const now = new Date().toISOString();
    const project: Project = {
      id: generateId(),
      name,
      template,
      code: projectTemplates[template],
      createdAt: now,
      updatedAt: now,
    };

    setProjects((prev) => sortByUpdatedAt([...prev, project]));
    setCurrentProjectId(project.id);
  }, []);

  const loadProject = useCallback((projectId: string) => {
    setCurrentProjectId(projectId);
  }, []);

  const updateProjectCode = useCallback((code: string) => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === currentProjectId
          ? { ...project, code, updatedAt: new Date().toISOString() }
          : project,
      ),
    );
  }, [currentProjectId]);

  const value = useMemo(
    () => ({ projects, currentProject, createProject, loadProject, updateProjectCode }),
    [projects, currentProject, createProject, loadProject, updateProjectCode],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext debe usarse dentro de ProjectProvider');
  }
  return context;
};
