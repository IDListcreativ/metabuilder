'use client';

import { createClient } from '@/lib/supabase/client';

export interface ProjectFile {
  path: string;
  language: string;
  content: string;
  size: number;
}

export interface GenerationHistoryEntry {
  id: string;
  prompt: string;
  response: string;
  filesGenerated: number;
  tokenCount: number;
  timestamp: string;
  model: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  prompt: string;
  code: string;
  status: 'draft' | 'published' | 'archived';
  icon: string;
  model: string;
  totalTokens: number;
  tags: string[];
  files: ProjectFile[];
  generationHistory: GenerationHistoryEntry[];
  shareSlug: string | null;
  shareEnabled: boolean;
  shareAccess: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? '',
    prompt: row.prompt ?? '',
    code: row.code ?? '',
    status: row.status ?? 'draft',
    icon: row.icon ?? '🚀',
    model: row.model ?? 'gpt-4o-mini',
    totalTokens: row.total_tokens ?? 0,
    tags: row.tags ?? [],
    files: row.files ?? [],
    generationHistory: row.generation_history ?? [],
    shareSlug: row.share_slug ?? null,
    shareEnabled: row.share_enabled ?? false,
    shareAccess: row.share_access ?? 'public',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectService = {
  async getAll(): Promise<Project[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('projectService.getAll error:', error.message);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async getById(id: string): Promise<Project | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return mapRow(data);
  },

  async save(project: {
    name: string;
    description: string;
    prompt: string;
    model: string;
    totalTokens: number;
    files: ProjectFile[];
    generationHistory: GenerationHistoryEntry[];
    tags: string[];
    status: 'draft' | 'published' | 'archived';
  }): Promise<Project | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('apps')
      .insert({
        user_id: user.id,
        name: project.name,
        description: project.description,
        prompt: project.prompt,
        model: project.model,
        total_tokens: project.totalTokens,
        files: project.files,
        generation_history: project.generationHistory,
        tags: project.tags,
        status: project.status,
        code: project.files.map(f => f.content).join('\n\n'),
      })
      .select()
      .single();

    if (error) {
      console.error('projectService.save error:', error.message);
      return null;
    }
    return mapRow(data);
  },

  async update(id: string, updates: Partial<{
    name: string;
    description: string;
    status: 'draft' | 'published' | 'archived';
    model: string;
    totalTokens: number;
    files: ProjectFile[];
    generationHistory: GenerationHistoryEntry[];
    tags: string[];
    shareSlug: string | null;
    shareEnabled: boolean;
    shareAccess: string;
  }>): Promise<Project | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.model !== undefined) dbUpdates.model = updates.model;
    if (updates.totalTokens !== undefined) dbUpdates.total_tokens = updates.totalTokens;
    if (updates.files !== undefined) {
      dbUpdates.files = updates.files;
      dbUpdates.code = updates.files.map(f => f.content).join('\n\n');
    }
    if (updates.generationHistory !== undefined) dbUpdates.generation_history = updates.generationHistory;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.shareSlug !== undefined) dbUpdates.share_slug = updates.shareSlug;
    if (updates.shareEnabled !== undefined) dbUpdates.share_enabled = updates.shareEnabled;
    if (updates.shareAccess !== undefined) dbUpdates.share_access = updates.shareAccess;

    const { data, error } = await supabase
      .from('apps')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('projectService.update error:', error.message);
      return null;
    }
    return mapRow(data);
  },

  async delete(id: string): Promise<boolean> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('apps')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('projectService.delete error:', error.message);
      return false;
    }
    return true;
  },

  async duplicate(id: string): Promise<Project | null> {
    const original = await projectService.getById(id);
    if (!original) return null;
    return projectService.save({
      name: `${original.name} (Copy)`,
      description: original.description,
      prompt: original.prompt,
      model: original.model,
      totalTokens: original.totalTokens,
      files: original.files,
      generationHistory: original.generationHistory,
      tags: original.tags,
      status: 'draft',
    });
  },

  async getStats(userId?: string): Promise<{
    totalProjects: number;
    totalFiles: number;
    totalTokens: number;
    totalGenerations: number;
  }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { totalProjects: 0, totalFiles: 0, totalTokens: 0, totalGenerations: 0 };

    const { data, error } = await supabase
      .from('apps')
      .select('files, total_tokens, generation_history')
      .eq('user_id', user.id);

    if (error || !data) return { totalProjects: 0, totalFiles: 0, totalTokens: 0, totalGenerations: 0 };

    return {
      totalProjects: data.length,
      totalFiles: data.reduce((acc, p) => acc + ((p.files as any[])?.length ?? 0), 0),
      totalTokens: data.reduce((acc, p) => acc + (p.total_tokens ?? 0), 0),
      totalGenerations: data.reduce((acc, p) => acc + ((p.generation_history as any[])?.length ?? 0), 0),
    };
  },

  async enableShare(id: string): Promise<string | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const slug = `${id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`;
    const updated = await projectService.update(id, {
      shareSlug: slug,
      shareEnabled: true,
    });
    return updated?.shareSlug ?? null;
  },

  async disableShare(id: string): Promise<boolean> {
    const updated = await projectService.update(id, { shareEnabled: false });
    return updated !== null;
  },

  async regenerateShareSlug(id: string): Promise<string | null> {
    const slug = `${id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`;
    const updated = await projectService.update(id, { shareSlug: slug });
    return updated?.shareSlug ?? null;
  },
};
