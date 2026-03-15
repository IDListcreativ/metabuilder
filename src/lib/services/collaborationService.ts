'use client';

import { createClient } from '@/lib/supabase/client';

export type CollabRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
  id: string;
  appId: string;
  userId: string;
  role: CollabRole;
  invitedBy: string | null;
  createdAt: string;
  // Joined from user_profiles
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

export interface ComponentComment {
  id: string;
  appId: string;
  userId: string;
  filePath: string;
  content: string;
  resolved: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined from user_profiles
  authorName?: string;
  authorAvatar?: string;
}

export interface PresenceUser {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  color: string;
  lastSeen: string;
}

const PRESENCE_COLORS = [
  '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#3b82f6', '#84cc16',
];

function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

function mapCollaborator(row: any): Collaborator {
  return {
    id: row.id,
    appId: row.app_id,
    userId: row.user_id,
    role: row.role,
    invitedBy: row.invited_by ?? null,
    createdAt: row.created_at,
    email: row.user_profiles?.email,
    fullName: row.user_profiles?.full_name,
    avatarUrl: row.user_profiles?.avatar_url,
  };
}

function mapComment(row: any): ComponentComment {
  return {
    id: row.id,
    appId: row.app_id,
    userId: row.user_id,
    filePath: row.file_path,
    content: row.content,
    resolved: row.resolved,
    parentId: row.parent_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: row.user_profiles?.full_name,
    authorAvatar: row.user_profiles?.avatar_url,
  };
}

export const collaborationService = {
  // ── Collaborators ──────────────────────────────────────────

  async getCollaborators(appId: string): Promise<Collaborator[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_collaborators')
      .select('*, user_profiles(email, full_name, avatar_url)')
      .eq('app_id', appId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('collaborationService.getCollaborators error:', error.message);
      return [];
    }
    return (data ?? []).map(mapCollaborator);
  },

  async inviteByEmail(appId: string, email: string, role: CollabRole): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Look up user by email
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'No account found with that email address.' };
    }

    const { error } = await supabase
      .from('project_collaborators')
      .upsert(
        { app_id: appId, user_id: profile.id, role, invited_by: user.id },
        { onConflict: 'app_id,user_id' }
      );

    if (error) {
      console.error('collaborationService.inviteByEmail error:', error.message);
      return { success: false, error: 'Failed to add collaborator.' };
    }
    return { success: true };
  },

  async updateRole(collaboratorId: string, role: CollabRole): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_collaborators')
      .update({ role })
      .eq('id', collaboratorId);
    if (error) {
      console.error('collaborationService.updateRole error:', error.message);
      return false;
    }
    return true;
  },

  async removeCollaborator(collaboratorId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('project_collaborators')
      .delete()
      .eq('id', collaboratorId);
    if (error) {
      console.error('collaborationService.removeCollaborator error:', error.message);
      return false;
    }
    return true;
  },

  async getMyRole(appId: string): Promise<CollabRole | 'owner' | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if owner
    const { data: app } = await supabase
      .from('apps')
      .select('user_id')
      .eq('id', appId)
      .single();
    if (app?.user_id === user.id) return 'owner';

    // Check collaborator role
    const { data: collab } = await supabase
      .from('project_collaborators')
      .select('role')
      .eq('app_id', appId)
      .eq('user_id', user.id)
      .single();
    return (collab?.role as CollabRole) ?? null;
  },

  // ── Comments ───────────────────────────────────────────────

  async getComments(appId: string, filePath?: string): Promise<ComponentComment[]> {
    const supabase = createClient();
    let query = supabase
      .from('component_comments')
      .select('*, user_profiles(full_name, avatar_url)')
      .eq('app_id', appId)
      .order('created_at', { ascending: true });

    if (filePath) {
      query = query.eq('file_path', filePath);
    }

    const { data, error } = await query;
    if (error) {
      console.error('collaborationService.getComments error:', error.message);
      return [];
    }
    return (data ?? []).map(mapComment);
  },

  async addComment(appId: string, filePath: string, content: string, parentId?: string): Promise<ComponentComment | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('component_comments')
      .insert({
        app_id: appId,
        user_id: user.id,
        file_path: filePath,
        content,
        parent_id: parentId ?? null,
      })
      .select('*, user_profiles(full_name, avatar_url)')
      .single();

    if (error) {
      console.error('collaborationService.addComment error:', error.message);
      return null;
    }
    return mapComment(data);
  },

  async resolveComment(commentId: string, resolved: boolean): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('component_comments')
      .update({ resolved })
      .eq('id', commentId);
    if (error) return false;
    return true;
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const supabase = createClient();
    const { error } = await supabase
      .from('component_comments')
      .delete()
      .eq('id', commentId);
    if (error) return false;
    return true;
  },

  // ── Realtime Presence ──────────────────────────────────────

  subscribeToPresence(
    appId: string,
    currentUser: { userId: string; fullName: string; avatarUrl?: string },
    onPresenceChange: (users: PresenceUser[]) => void
  ) {
    const supabase = createClient();
    const channel = supabase.channel(`presence:${appId}`, {
      config: { presence: { key: currentUser.userId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Omit<PresenceUser, 'userId'>>();
        const users: PresenceUser[] = Object.entries(state).map(([userId, presences]) => {
          const p = (presences as any[])[0] ?? {};
          return {
            userId,
            fullName: p.fullName ?? 'Unknown',
            avatarUrl: p.avatarUrl,
            color: colorForUser(userId),
            lastSeen: p.lastSeen ?? new Date().toISOString(),
          };
        });
        onPresenceChange(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            fullName: currentUser.fullName,
            avatarUrl: currentUser.avatarUrl,
            lastSeen: new Date().toISOString(),
          });
        }
      });

    return channel;
  },

  subscribeToComments(
    appId: string,
    onInsert: (comment: ComponentComment) => void,
    onUpdate: (comment: ComponentComment) => void,
    onDelete: (id: string) => void
  ) {
    const supabase = createClient();
    return supabase
      .channel(`comments:${appId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'component_comments', filter: `app_id=eq.${appId}` },
        async (payload) => {
          // Re-fetch with joined user_profiles
          const { data } = await supabase
            .from('component_comments')
            .select('*, user_profiles(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) onInsert(mapComment(data));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'component_comments', filter: `app_id=eq.${appId}` },
        async (payload) => {
          const { data } = await supabase
            .from('component_comments')
            .select('*, user_profiles(full_name, avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) onUpdate(mapComment(data));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'component_comments', filter: `app_id=eq.${appId}` },
        (payload) => onDelete(payload.old.id)
      )
      .subscribe();
  },

  colorForUser,
};
