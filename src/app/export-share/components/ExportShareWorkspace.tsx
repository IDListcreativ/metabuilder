'use client';

import { useState, useEffect } from 'react';
import GitHubExportPanel from './GitHubExportPanel';
import ShareLinkPanel from './ShareLinkPanel';
import { projectService, Project } from '@/lib/services/projectService';
import { ChevronDown, RefreshCw } from 'lucide-react';

export type GitHubConnectionStatus = 'disconnected' | 'connecting' | 'connected';
export type ExportStep = 'idle' | 'preparing' | 'pushing' | 'complete' | 'error';

export interface ShareAccess {
  id: string;
  visitorId: string;
  country: string;
  accessedAt: Date;
  referrer?: string;
}

export default function ExportShareWorkspace() {
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus>('disconnected');
  const [exportStep, setExportStep] = useState<ExportStep>('idle');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  useEffect(() => {
    projectService.getAll().then((data) => {
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]);
    }).catch(console.error).finally(() => setLoadingProjects(false));
  }, []);

  const handleProjectUpdate = async (updated: Project) => {
    setSelectedProject(updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 flex-shrink-0">
        <div>
          <h1 className="text-lg font-700 text-zinc-100">Export & Share</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Push to GitHub or generate a public share link</p>
        </div>
        {/* Project selector */}
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-colors"
          >
            {loadingProjects ? (
              <RefreshCw size={12} className="text-zinc-500 animate-spin" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500" />
            )}
            <span className="text-sm text-zinc-300 font-500 max-w-[180px] truncate">
              {selectedProject?.name ?? (loadingProjects ? 'Loading…' : 'No projects')}
            </span>
            <ChevronDown size={12} className="text-zinc-600" />
          </button>

          {showProjectDropdown && projects.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-lg z-20">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); setExportStep('idle'); }}
                  className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors ${
                    selectedProject?.id === p.id ? 'bg-violet-600/10 text-violet-300' : 'text-zinc-300'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 space-y-6 max-w-screen-2xl">
        {/* GitHub Export */}
        <GitHubExportPanel
          connectionStatus={githubStatus}
          onConnectionChange={setGithubStatus}
          exportStep={exportStep}
          onExportStepChange={setExportStep}
          project={selectedProject}
        />

        {/* Share Link */}
        <ShareLinkPanel
          project={selectedProject}
          onProjectUpdate={handleProjectUpdate}
        />
      </div>
    </div>
  );
}