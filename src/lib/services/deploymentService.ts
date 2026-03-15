'use client';

import { createClient } from '@/lib/supabase/client';

export type DeployPlatform = 'vercel' | 'netlify';
export type DeployStatus = 'success' | 'failed' | 'deploying' | 'queued' | 'cancelled';

export interface Deployment {
  id: string;
  userId: string;
  appId: string | null;
  platform: DeployPlatform;
  projectName: string;
  branch: string;
  commitSha: string;
  status: DeployStatus;
  url?: string;
  triggeredBy: string;
  errorMessage?: string;
  duration?: number;
  startedAt: Date;
  createdAt: Date;
}

function mapRow(row: any): Deployment {
  return {
    id: row.id,
    userId: row.user_id,
    appId: row.app_id ?? null,
    platform: row.platform as DeployPlatform,
    projectName: row.project_name,
    branch: row.branch,
    commitSha: row.commit_sha,
    status: row.status as DeployStatus,
    url: row.url ?? undefined,
    triggeredBy: row.triggered_by,
    errorMessage: row.error_message ?? undefined,
    duration: row.duration ?? undefined,
    startedAt: new Date(row.started_at),
    createdAt: new Date(row.created_at),
  };
}

export const deploymentService = {
  async getAll(): Promise<Deployment[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('deployments')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('deploymentService.getAll error:', error.message);
      return [];
    }
    return (data ?? []).map(mapRow);
  },

  async create(deployment: {
    platform: DeployPlatform;
    projectName: string;
    branch?: string;
    appId?: string;
  }): Promise<Deployment | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const commitSha = Math.random().toString(16).slice(2, 9);

    const { data, error } = await supabase
      .from('deployments')
      .insert({
        user_id: user.id,
        app_id: deployment.appId ?? null,
        platform: deployment.platform,
        project_name: deployment.projectName,
        branch: deployment.branch ?? 'main',
        commit_sha: commitSha,
        status: 'deploying',
        triggered_by: user.email ?? user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('deploymentService.create error:', error.message);
      return null;
    }
    return mapRow(data);
  },

  async updateStatus(
    id: string,
    status: DeployStatus,
    extras?: { url?: string; errorMessage?: string; duration?: number }
  ): Promise<Deployment | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const updates: Record<string, any> = { status };
    if (extras?.url !== undefined) updates.url = extras.url;
    if (extras?.errorMessage !== undefined) updates.error_message = extras.errorMessage;
    if (extras?.duration !== undefined) updates.duration = extras.duration;

    const { data, error } = await supabase
      .from('deployments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('deploymentService.updateStatus error:', error.message);
      return null;
    }
    return mapRow(data);
  },
};
