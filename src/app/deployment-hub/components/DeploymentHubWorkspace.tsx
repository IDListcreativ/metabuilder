'use client';

import { useState, useEffect, useCallback } from 'react';
import DeploymentTargetCards from './DeploymentTargetCards';
import DeploymentLogPanel from './DeploymentLogPanel';
import DeploymentHistoryTable from './DeploymentHistoryTable';
import { deploymentService, Deployment, DeployPlatform } from '@/lib/services/deploymentService';
import { RefreshCw } from 'lucide-react';

export type { DeployPlatform };
export type DeployStatus = 'success' | 'failed' | 'deploying' | 'queued' | 'cancelled';

export interface DeploymentRecord {
  id: string;
  platform: DeployPlatform;
  projectName: string;
  branch: string;
  commitSha: string;
  status: DeployStatus;
  url?: string;
  triggeredBy: string;
  startedAt: Date;
  duration?: number;
  errorMessage?: string;
}

function toRecord(d: Deployment): DeploymentRecord {
  return {
    id: d.id,
    platform: d.platform,
    projectName: d.projectName,
    branch: d.branch,
    commitSha: d.commitSha,
    status: d.status,
    url: d.url,
    triggeredBy: d.triggeredBy,
    startedAt: d.startedAt,
    duration: d.duration,
    errorMessage: d.errorMessage,
  };
}

export default function DeploymentHubWorkspace() {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [activeDeployId, setActiveDeployId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const data = await deploymentService.getAll();
      const records = data.map(toRecord);
      setDeployments(records);
      // Auto-select the most recent deploying one, or the first
      const deploying = records.find(d => d.status === 'deploying');
      if (deploying) setActiveDeployId(deploying.id);
      else if (records.length > 0 && !activeDeployId) setActiveDeployId(records[0].id);
    } catch (err) {
      console.error('Failed to load deployments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const activeDeploy = deployments.find(d => d.id === activeDeployId) || null;

  const handleNewDeploy = async (platform: DeployPlatform, projectName: string) => {
    const created = await deploymentService.create({ platform, projectName });
    if (!created) return;

    const record = toRecord(created);
    setDeployments(prev => [record, ...prev]);
    setActiveDeployId(record.id);

    // Simulate deploy completion after a delay
    const startTime = Date.now();
    setTimeout(async () => {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const success = Math.random() > 0.2; // 80% success rate
      const updated = await deploymentService.updateStatus(
        record.id,
        success ? 'success' : 'failed',
        success
          ? { url: `https://${projectName}.${platform === 'vercel' ? 'vercel.app' : 'netlify.app'}`, duration }
          : { errorMessage: 'Build failed: dependency resolution error', duration }
      );
      if (updated) {
        setDeployments(prev =>
          prev.map(d => d.id === updated.id ? toRecord(updated) : d)
        );
      }
    }, 8000 + Math.random() * 4000);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 stone-editor-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 flex-shrink-0 travertine-panel">
        <div>
          <h1 className="text-lg font-700 text-zinc-100">Deployment Hub</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Configure targets and deploy to Vercel or Netlify</p>
        </div>
        <div className="flex items-center gap-2">
          {deployments.some(d => d.status === 'deploying') && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/15 border border-violet-600/25">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 status-pulse" />
              <span className="text-xs font-600 text-violet-300">
                {deployments.filter(d => d.status === 'deploying').length} deploy in progress
              </span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
              <RefreshCw size={12} className="text-zinc-500 animate-spin" />
              <span className="text-xs text-zinc-500">Loading…</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Target config */}
        <div className="w-[380px] xl:w-[420px] 2xl:w-[460px] flex-shrink-0 border-r border-zinc-800/60 overflow-y-auto travertine-panel">
          <DeploymentTargetCards onDeploy={handleNewDeploy} />
        </div>

        {/* Right: Log + history */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Log panel */}
          <DeploymentLogPanel deployment={activeDeploy} />

          {/* History table */}
          <div className="flex-shrink-0 border-t border-zinc-800/60">
            <DeploymentHistoryTable
              deployments={deployments}
              activeId={activeDeployId}
              onSelectDeploy={setActiveDeployId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}