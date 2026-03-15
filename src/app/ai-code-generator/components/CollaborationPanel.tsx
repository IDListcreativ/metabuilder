'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, UserPlus, MessageSquare, Send, Check, X, Trash2, Crown, Pencil, Eye, Circle, CheckCircle2 } from 'lucide-react';
import {
  collaborationService,
  Collaborator,
  ComponentComment,
  PresenceUser,
  CollabRole,
} from '@/lib/services/collaborationService';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface CollaborationPanelProps {
  appId: string | null;
  selectedFilePath?: string;
}

const ROLE_ICONS: Record<CollabRole | 'owner', React.ReactNode> = {
  owner: <Crown size={11} className="text-amber-400" />,
  editor: <Pencil size={11} className="text-violet-400" />,
  viewer: <Eye size={11} className="text-zinc-500" />,
};

const ROLE_LABELS: Record<CollabRole | 'owner', string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

function Avatar({ name, color, size = 24 }: { name: string; color: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-600"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function CollaborationPanel({ appId, selectedFilePath }: CollaborationPanelProps) {
  const [tab, setTab] = useState<'team' | 'comments'>('team');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [comments, setComments] = useState<ComponentComment[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [myRole, setMyRole] = useState<CollabRole | 'owner' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollabRole>('editor');
  const [inviting, setInviting] = useState(false);

  // Comment form
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sendingComment, setSendingComment] = useState(false);

  const [loading, setLoading] = useState(false);
  const presenceChannelRef = useRef<any>(null);
  const commentsChannelRef = useRef<any>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appId) return;
    loadData();
    return () => {
      presenceChannelRef.current?.unsubscribe();
      commentsChannelRef.current?.unsubscribe();
    };
  }, [appId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const loadData = async () => {
    if (!appId) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);

      // Setup presence
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      presenceChannelRef.current = collaborationService.subscribeToPresence(
        appId,
        { userId: user.id, fullName: profile?.full_name ?? 'You', avatarUrl: profile?.avatar_url },
        setPresence
      );
    }

    const [collabs, commentsData, role] = await Promise.all([
      collaborationService.getCollaborators(appId),
      collaborationService.getComments(appId),
      collaborationService.getMyRole(appId),
    ]);

    setCollaborators(collabs);
    setComments(commentsData);
    setMyRole(role);
    setLoading(false);

    // Subscribe to realtime comments
    commentsChannelRef.current = collaborationService.subscribeToComments(
      appId,
      (c) => setComments(prev => [...prev, c]),
      (c) => setComments(prev => prev.map(x => x.id === c.id ? c : x)),
      (id) => setComments(prev => prev.filter(x => x.id !== id))
    );
  };

  const handleInvite = async () => {
    if (!appId || !inviteEmail.trim()) return;
    setInviting(true);
    const result = await collaborationService.inviteByEmail(appId, inviteEmail.trim(), inviteRole);
    setInviting(false);
    if (result.success) {
      setInviteEmail('');
      toast.success('Collaborator added!');
      const updated = await collaborationService.getCollaborators(appId);
      setCollaborators(updated);
    } else {
      toast.error(result.error ?? 'Failed to add collaborator');
    }
  };

  const handleRoleChange = async (collaboratorId: string, role: CollabRole) => {
    const ok = await collaborationService.updateRole(collaboratorId, role);
    if (ok) {
      setCollaborators(prev => prev.map(c => c.id === collaboratorId ? { ...c, role } : c));
      toast.success('Role updated');
    }
  };

  const handleRemove = async (collaboratorId: string) => {
    const ok = await collaborationService.removeCollaborator(collaboratorId);
    if (ok) {
      setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      toast.success('Collaborator removed');
    }
  };

  const handleSendComment = async () => {
    if (!appId || !newComment.trim()) return;
    setSendingComment(true);
    const filePath = selectedFilePath ?? '';
    await collaborationService.addComment(appId, filePath, newComment.trim(), replyTo ?? undefined);
    setSendingComment(false);
    setNewComment('');
    setReplyTo(null);
  };

  const handleResolve = async (commentId: string, resolved: boolean) => {
    await collaborationService.resolveComment(commentId, resolved);
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved } : c));
  };

  const handleDeleteComment = async (commentId: string) => {
    await collaborationService.deleteComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const canManage = myRole === 'owner';
  const canEdit = myRole === 'owner' || myRole === 'editor';

  const filteredComments = selectedFilePath
    ? comments.filter(c => c.filePath === selectedFilePath || c.filePath === '')
    : comments;

  if (!appId) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
        <Users size={28} className="text-zinc-700" />
        <p className="text-xs text-zinc-600 leading-relaxed">
          Save your project first to enable Team Collaboration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-violet-400" />
          <span className="text-xs font-600 text-zinc-300">Team</span>
        </div>
        {/* Live presence avatars */}
        {presence.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {presence.slice(0, 4).map(u => (
                <div key={u.userId} title={`${u.fullName} — online`} className="ring-1 ring-zinc-900 rounded-full">
                  <Avatar name={u.fullName} color={u.color} size={20} />
                </div>
              ))}
            </div>
            <span className="text-[10px] text-green-400 ml-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse" />
              {presence.length} online
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800/40 flex-shrink-0">
        {(['team', 'comments'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-600 transition-colors ${
              tab === t
                ? 'text-violet-400 border-b-2 border-violet-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t === 'team' ? `Team (${collaborators.length})` : `Comments (${filteredComments.filter(c => !c.resolved).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-5 h-5 rounded-full border-2 border-violet-600/30 border-t-violet-500 animate-spin" />
        </div>
      ) : tab === 'team' ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {/* Invite form — owners only */}
          {canManage && (
            <div className="space-y-2 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
              <p className="text-[11px] font-600 text-zinc-400">Invite collaborator</p>
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="Email address"
                className="w-full bg-zinc-950 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
              />
              <div className="flex gap-1.5">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as CollabRole)}
                  className="flex-1 bg-zinc-950 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-violet-600/50 cursor-pointer"
                >
                  <option value="editor">Editor — can generate & edit</option>
                  <option value="viewer">Viewer — read only</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30 transition-all disabled:opacity-50"
                >
                  {inviting ? <Check size={11} className="animate-pulse" /> : <UserPlus size={11} />}
                  {inviting ? 'Adding…' : 'Invite'}
                </button>
              </div>
            </div>
          )}

          {/* Collaborators list */}
          <div className="space-y-1.5">
            {collaborators.length === 0 ? (
              <div className="text-center py-6">
                <Users size={20} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No collaborators yet.</p>
                {canManage && <p className="text-[11px] text-zinc-700 mt-1">Invite someone above to get started.</p>}
              </div>
            ) : (
              collaborators.map(c => {
                const isOnline = presence.some(p => p.userId === c.userId);
                const presenceColor = presence.find(p => p.userId === c.userId)?.color ?? '#6b7280';
                return (
                  <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/40 group">
                    <div className="relative flex-shrink-0">
                      <Avatar name={c.fullName ?? c.email ?? '?'} color={presenceColor} size={28} />
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-1 ring-zinc-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-600 text-zinc-300 truncate">{c.fullName ?? c.email}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {canManage && c.userId !== currentUserId ? (
                        <select
                          value={c.role}
                          onChange={e => handleRoleChange(c.id, e.target.value as CollabRole)}
                          className="bg-zinc-800 border border-zinc-700/60 rounded-md px-1.5 py-0.5 text-[10px] text-zinc-400 focus:outline-none cursor-pointer"
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-800/60">
                          {ROLE_ICONS[c.role]}
                          <span className="text-[10px] text-zinc-500">{ROLE_LABELS[c.role]}</span>
                        </div>
                      )}
                      {canManage && c.userId !== currentUserId && (
                        <button
                          onClick={() => handleRemove(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-zinc-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Comments tab */
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {selectedFilePath && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
                <span className="text-[10px] text-zinc-600">Showing comments for</span>
                <span className="text-[10px] font-mono text-violet-400 truncate">{selectedFilePath}</span>
              </div>
            )}
            {filteredComments.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare size={20} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No comments yet.</p>
                <p className="text-[11px] text-zinc-700 mt-1">Start a discussion below.</p>
              </div>
            ) : (
              filteredComments.map(c => {
                const presenceColor = presence.find(p => p.userId === c.userId)?.color
                  ?? collaborationService.colorForUser(c.userId);
                const isOwn = c.userId === currentUserId;
                return (
                  <div
                    key={c.id}
                    className={`group rounded-xl border p-2.5 transition-all ${
                      c.resolved
                        ? 'bg-zinc-900/30 border-zinc-800/30 opacity-60'
                        : c.parentId
                        ? 'ml-4 bg-zinc-900/40 border-zinc-800/40' :'bg-zinc-900/60 border-zinc-800/60'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Avatar name={c.authorName ?? 'U'} color={presenceColor} size={22} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-600 text-zinc-300">{c.authorName ?? 'Unknown'}</span>
                          {c.filePath && !selectedFilePath && (
                            <span className="text-[10px] font-mono text-zinc-600 truncate max-w-[80px]">{c.filePath.split('/').pop()}</span>
                          )}
                          <span className="text-[10px] text-zinc-600 ml-auto">{formatRelativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{c.content}</p>
                        <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit && !c.resolved && (
                            <button
                              onClick={() => setReplyTo(c.id)}
                              className="text-[10px] text-zinc-600 hover:text-violet-400 transition-colors"
                            >
                              Reply
                            </button>
                          )}
                          <button
                            onClick={() => handleResolve(c.id, !c.resolved)}
                            className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-green-400 transition-colors"
                          >
                            {c.resolved ? <Circle size={10} /> : <CheckCircle2 size={10} />}
                            {c.resolved ? 'Reopen' : 'Resolve'}
                          </button>
                          {isOwn && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment input */}
          {canEdit && (
            <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-zinc-800/40">
              {replyTo && (
                <div className="flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded-lg bg-violet-600/10 border border-violet-600/20">
                  <span className="text-[10px] text-violet-400">Replying to comment</span>
                  <button onClick={() => setReplyTo(null)} className="ml-auto text-zinc-600 hover:text-zinc-400">
                    <X size={10} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-1.5 bg-zinc-900/80 border border-zinc-700/60 rounded-xl p-2 focus-within:border-violet-600/50 transition-colors">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                  rows={2}
                  placeholder={selectedFilePath ? `Comment on ${selectedFilePath.split('/').pop()}…` : 'Add a comment…'}
                  className="flex-1 bg-transparent text-xs text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim() || sendingComment}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300 hover:bg-violet-600/30 transition-all disabled:opacity-40"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
