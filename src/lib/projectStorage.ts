'use client';

export interface GenerationHistoryEntry {
  id: string;
  prompt: string;
  response: string;
  filesGenerated: number;
  tokenCount: number;
  timestamp: string;
  model: string;
}

export interface SavedProjectFile {
  path: string;
  language: string;
  content: string;
  size: number;
}

export interface SavedProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  model: string;
  totalTokens: number;
  files: SavedProjectFile[];
  generationHistory: GenerationHistoryEntry[];
  tags: string[];
  status: 'draft' | 'complete' | 'archived';
}

const STORAGE_KEY = 'metabuilder_projects';
const HISTORY_KEY = 'metabuilder_generation_history';

function getProjects(): SavedProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setProjects(projects: SavedProject[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export const projectStorage = {
  getAll(): SavedProject[] {
    return getProjects().sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getById(id: string): SavedProject | null {
    return getProjects().find((p) => p.id === id) ?? null;
  },

  save(project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>): SavedProject {
    const projects = getProjects();
    const now = new Date().toISOString();
    const newProject: SavedProject = {
      ...project,
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    setProjects([...projects, newProject]);
    return newProject;
  },

  update(id: string, updates: Partial<Omit<SavedProject, 'id' | 'createdAt'>>): SavedProject | null {
    const projects = getProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const updated: SavedProject = {
      ...projects[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    projects[idx] = updated;
    setProjects(projects);
    return updated;
  },

  delete(id: string): boolean {
    const projects = getProjects();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) return false;
    setProjects(filtered);
    return true;
  },

  duplicate(id: string): SavedProject | null {
    const project = getProjects().find((p) => p.id === id);
    if (!project) return null;
    return projectStorage.save({
      ...project,
      name: `${project.name} (Copy)`,
      status: 'draft',
    });
  },

  // Global generation history (across all projects)
  getGlobalHistory(): GenerationHistoryEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  appendGlobalHistory(entry: Omit<GenerationHistoryEntry, 'id'>): GenerationHistoryEntry {
    const history = projectStorage.getGlobalHistory();
    const newEntry: GenerationHistoryEntry = {
      ...entry,
      id: `hist_${Date.now()}`,
    };
    const trimmed = [newEntry, ...history].slice(0, 200); // keep last 200
    if (typeof window !== 'undefined') {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    }
    return newEntry;
  },

  clearGlobalHistory(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(HISTORY_KEY);
    }
  },

  getStats() {
    const projects = getProjects();
    const history = projectStorage.getGlobalHistory();
    return {
      totalProjects: projects.length,
      totalFiles: projects.reduce((acc, p) => acc + p.files.length, 0),
      totalTokens: projects.reduce((acc, p) => acc + p.totalTokens, 0),
      totalGenerations: history.length,
      storageUsed: JSON.stringify(projects).length + JSON.stringify(history).length,
    };
  },
};
