'use client';

import { useState, useEffect } from 'react';
import { Link, Copy, Check, Eye, Globe, Lock, RefreshCw, ExternalLink, Clock, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { projectService, Project } from '@/lib/services/projectService';
import { createClient } from '@/lib/supabase/client';

interface ShareLinkPanelProps {
  project: Project | null;
  onProjectUpdate: (updated: Project) => void;
}

interface AccessRecord {
  id: string;
  visitorHash: string;
  country: string;
  countryFlag: string;
  city: string;
  accessedAt: Date;
  referrer?: string;
  duration?: string;
}

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://metabuilde7640.builtwithrocket.new';

export default function ShareLinkPanel({ project, onProjectUpdate }: ShareLinkPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [accesses, setAccesses] = useState<AccessRecord[]>([]);

  const enabled = project?.shareEnabled ?? false;
  const shareSlug = project?.shareSlug ?? null;
  const shareUrl = shareSlug ? `${SITE_URL}/share/${shareSlug}` : null;
  const accessLevel = project?.shareAccess ?? 'public';

  useEffect(() => {
    if (!project?.id || !enabled) {
      setAccesses([]);
      return;
    }
    const supabase = createClient();
    supabase
      .from('share_accesses')
      .select('*')
      .eq('app_id', project.id)
      .order('accessed_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setAccesses(data.map((r: any) => ({
            id: r.id,
            visitorHash: r.visitor_hash,
            country: r.country,
            countryFlag: r.country_flag,
            city: r.city,
            accessedAt: new Date(r.accessed_at),
            referrer: r.referrer ?? undefined,
            duration: r.duration ?? undefined,
          })));
        }
      });
  }, [project?.id, enabled]);

  const handleToggle = async () => {
    if (!project) return;
    setIsEnabling(true);
    try {
      if (!enabled) {
        let slug = shareSlug;
        if (!slug) {
          slug = await projectService.enableShare(project.id);
        } else {
          await projectService.update(project.id, { shareEnabled: true });
        }
        const updated = await projectService.getById(project.id);
        if (updated) onProjectUpdate(updated);
        toast.info('Share link enabled');
      } else {
        await projectService.disableShare(project.id);
        const updated = await projectService.getById(project.id);
        if (updated) onProjectUpdate(updated);
        toast.info('Share link disabled — existing link no longer works');
      }
    } catch (err) {
      toast.error('Failed to update share link');
    } finally {
      setIsEnabling(false);
    }
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Share link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateLink = async () => {
    if (!project) return;
    setIsRegenerating(true);
    try {
      await projectService.regenerateShareSlug(project.id);
      const updated = await projectService.getById(project.id);
      if (updated) onProjectUpdate(updated);
      toast.success('Share link regenerated — old link is now invalid');
    } catch (err) {
      toast.error('Failed to regenerate link');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAccessLevelChange = async (level: 'public' | 'private') => {
    if (!project) return;
    await projectService.update(project.id, { shareAccess: level });
    const updated = await projectService.getById(project.id);
    if (updated) onProjectUpdate(updated);
    toast.info(`Share link set to ${level}`);
  };

  const uniqueCountries = new Set(accesses.map(a => a.country)).size;

  return (
    <div className="rounded-2xl border border-zinc-800/60 glass-card overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-600/25 flex items-center justify-center">
            <Link size={16} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-700 text-zinc-200">Share Link</h2>
            <p className="text-xs text-zinc-500">Generate a public URL for your project preview</p>
          </div>
        </div>

        {/* Enable/disable toggle */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-zinc-500">{enabled ? 'Link active' : 'Link disabled'}</span>
          <button
            onClick={handleToggle}
            disabled={isEnabling || !project}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 disabled:opacity-50 ${enabled ? 'bg-violet-600' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!project ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-sm">
            Select a project to manage its share link
          </div>
        ) : (
          <>
            {/* Link display */}
            <div className={`transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/60">
                <Globe size={14} className="text-violet-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-mono text-zinc-300 truncate">
                  {shareUrl ?? 'Enable share link to generate URL'}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={copyLink}
                    disabled={!shareUrl}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-600 transition-all disabled:opacity-40 ${
                      copied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/25' :'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {shareUrl && (
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700 transition-all"
                      title="Open share link"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Controls row */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  {/* Access level */}
                  <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
                    {(['public', 'private'] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => handleAccessLevelChange(level)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-500 transition-all ${
                          accessLevel === level
                            ? 'bg-zinc-700 text-zinc-200' :'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {level === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setShowQr(!showQr)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-500 border transition-all ${
                      showQr
                        ? 'bg-violet-600/15 text-violet-300 border-violet-600/25'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    <QrCode size={11} />
                    QR Code
                  </button>
                </div>

                <button
                  onClick={regenerateLink}
                  disabled={isRegenerating || !shareSlug}
                  className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-50"
                >
                  {isRegenerating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Regenerate link
                </button>
              </div>

              {/* Access level warning */}
              {accessLevel === 'public' && (
                <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
                  <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300/80">
                    Public links are accessible to anyone with the URL. No login required to view.
                  </p>
                </div>
              )}

              {/* QR Code placeholder */}
              {showQr && shareUrl && (
                <div className="mt-3 flex items-center justify-center p-4 rounded-xl bg-white">
                  <div className="w-32 h-32 bg-zinc-200 rounded-lg flex items-center justify-center">
                    <div className="grid grid-cols-7 gap-0.5 opacity-80">
                      {Array.from({ length: 49 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-3.5 h-3.5 rounded-sm ${Math.random() > 0.5 ? 'bg-zinc-900' : 'bg-transparent'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total views', value: accesses.length, icon: Eye, color: 'text-violet-400' },
                { label: 'Countries', value: uniqueCountries, icon: Globe, color: 'text-blue-400' },
                { label: 'Avg. session', value: accesses.length > 0 ? '—' : '0', icon: Clock, color: 'text-green-400' },
              ].map((stat, i) => {
                const StatIcon = stat.icon;
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <StatIcon size={16} className={stat.color} />
                    <div>
                      <p className="text-base font-700 text-zinc-200 tabular-nums">{stat.value}</p>
                      <p className="text-[11px] text-zinc-600">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Access log */}
            {accesses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-600 uppercase tracking-widest text-zinc-600">Recent Accesses</p>
                  <span className="text-[10px] text-zinc-700">{accesses.length} visits</span>
                </div>

                <div className="rounded-xl border border-zinc-800/60 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800/40 bg-zinc-900/30">
                        <th className="text-left px-4 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600">Visitor</th>
                        <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 hidden md:table-cell">Location</th>
                        <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 hidden lg:table-cell">Referrer</th>
                        <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 hidden md:table-cell">Duration</th>
                        <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accesses.map((access, i) => (
                        <tr
                          key={access.id}
                          className={`border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20 transition-colors ${i === 0 ? 'bg-violet-600/5' : ''}`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                <Eye size={10} className="text-zinc-500" />
                              </div>
                              <span className="font-mono text-[11px] text-zinc-500">{access.visitorHash || 'anonymous'}</span>
                              {i === 0 && (
                                <span className="px-1.5 py-0.5 text-[9px] font-700 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">NEW</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{access.countryFlag}</span>
                              <span className="text-zinc-400">{access.city || access.country}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 hidden lg:table-cell">
                            {access.referrer ? (
                              <span className="text-zinc-500 font-mono text-[11px]">{access.referrer}</span>
                            ) : (
                              <span className="text-zinc-700">direct</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 hidden md:table-cell">
                            <span className="text-zinc-500 tabular-nums">{access.duration ?? '—'}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-zinc-600">{formatRelativeTime(access.accessedAt)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}