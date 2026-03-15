'use client';

import { useState } from 'react';
import { ExternalLink, XCircle, CheckCircle, Loader2, Clock, GitBranch, AlertCircle, ChevronDown } from 'lucide-react';
import { DeploymentRecord, DeployStatus, DeployPlatform } from './DeploymentHubWorkspace';

interface DeploymentHistoryTableProps {
  deployments: DeploymentRecord[];
  activeId: string | null;
  onSelectDeploy: (id: string) => void;
}

const STATUS_CONFIG: Record<DeployStatus, { label: string; icon: React.ReactNode; badge: string }> = {
  success: {
    label: 'Success',
    icon: <CheckCircle size={12} className="text-green-400" />,
    badge: 'bg-green-500/15 text-green-400 border-green-500/25',
  },
  failed: {
    label: 'Failed',
    icon: <XCircle size={12} className="text-red-400" />,
    badge: 'bg-red-500/15 text-red-400 border-red-500/25',
  },
  deploying: {
    label: 'Deploying',
    icon: <Loader2 size={12} className="text-violet-400 animate-spin" />,
    badge: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  },
  queued: {
    label: 'Queued',
    icon: <Clock size={12} className="text-zinc-400" />,
    badge: 'bg-zinc-700/60 text-zinc-400 border-zinc-600/40',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <AlertCircle size={12} className="text-zinc-500" />,
    badge: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40',
  },
};

const PLATFORM_BADGE: Record<DeployPlatform, string> = {
  vercel: 'bg-white/10 text-white border-white/15',
  netlify: 'bg-[#00C7B7]/10 text-[#00C7B7] border-[#00C7B7]/20',
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default function DeploymentHistoryTable({ deployments, activeId, onSelectDeploy }: DeploymentHistoryTableProps) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? deployments : deployments.slice(0, 5);

  return (
    <div className="flex flex-col" style={{ maxHeight: '280px' }}>
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-zinc-800/40 flex-shrink-0 bg-zinc-900/30">
        <p className="text-xs font-600 uppercase tracking-widest text-zinc-600">Deploy History</p>
        <span className="text-[10px] text-zinc-700 tabular-nums">{deployments.length} total</span>
      </div>

      <div className="overflow-y-auto flex-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800/40">
              <th className="text-left px-5 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 whitespace-nowrap">Status</th>
              <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 whitespace-nowrap">Project</th>
              <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 whitespace-nowrap hidden md:table-cell">Platform</th>
              <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 whitespace-nowrap hidden lg:table-cell">Branch</th>
              <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 whitespace-nowrap hidden lg:table-cell">Commit</th>
              <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 whitespace-nowrap">Duration</th>
              <th className="text-left px-3 py-2 text-[10px] font-600 uppercase tracking-wider text-zinc-600 whitespace-nowrap">Time</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {displayed.map((dep) => {
              const statusCfg = STATUS_CONFIG[dep.status];
              const isActive = dep.id === activeId;

              return (
                <tr
                  key={dep.id}
                  onClick={() => onSelectDeploy(dep.id)}
                  className={`border-b border-zinc-800/30 cursor-pointer transition-colors ${
                    isActive ? 'bg-violet-600/8' : 'hover:bg-zinc-800/30'
                  }`}
                >
                  {/* Status */}
                  <td className="px-5 py-2.5 whitespace-nowrap">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-600 ${statusCfg.badge}`}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </div>
                  </td>

                  {/* Project */}
                  <td className="px-3 py-2.5">
                    <span className="font-500 text-zinc-300 truncate max-w-[140px] block">{dep.projectName}</span>
                    {dep.errorMessage && (
                      <span className="text-[10px] text-red-400 truncate block max-w-[160px]" title={dep.errorMessage}>
                        {dep.errorMessage.slice(0, 40)}…
                      </span>
                    )}
                  </td>

                  {/* Platform */}
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-600 border capitalize ${PLATFORM_BADGE[dep.platform]}`}>
                      {dep.platform}
                    </span>
                  </td>

                  {/* Branch */}
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <div className="flex items-center gap-1 text-zinc-500">
                      <GitBranch size={10} />
                      <span className="font-mono text-[11px]">{dep.branch}</span>
                    </div>
                  </td>

                  {/* Commit */}
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    <span className="font-mono text-[11px] text-zinc-600">{dep.commitSha}</span>
                  </td>

                  {/* Duration */}
                  <td className="px-3 py-2.5 tabular-nums text-zinc-500 whitespace-nowrap">
                    {dep.status === 'deploying'
                      ? <span className="text-violet-400 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Live</span>
                      : formatDuration(dep.duration)
                    }
                  </td>

                  {/* Time */}
                  <td className="px-3 py-2.5 text-zinc-600 whitespace-nowrap">
                    {formatRelativeTime(dep.startedAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2.5">
                    {dep.url && (
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 transition-colors inline-flex"
                        title="Open deployed URL"
                      >
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {deployments.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors"
          >
            <ChevronDown size={12} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
            {showAll ? 'Show less' : `Show ${deployments.length - 5} more`}
          </button>
        )}
      </div>
    </div>
  );
}