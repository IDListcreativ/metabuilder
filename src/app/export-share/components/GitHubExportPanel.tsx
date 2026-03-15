'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Github, CheckCircle, Loader2, GitBranch, Lock, Unlock, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { GitHubConnectionStatus, ExportStep } from './ExportShareWorkspace';
import { Project } from '@/lib/services/projectService';

interface ExportFormData {
  repoName: string;
  branch: string;
  visibility: 'public' | 'private';
  commitMessage: string;
  createNew: boolean;
}

interface GitHubExportPanelProps {
  connectionStatus: GitHubConnectionStatus;
  onConnectionChange: (s: GitHubConnectionStatus) => void;
  exportStep: ExportStep;
  onExportStepChange: (s: ExportStep) => void;
  project: Project | null;
}

const EXPORT_STEPS = [
  { key: 'preparing', label: 'Preparing files', sub: 'Bundling generated project files' },
  { key: 'pushing', label: 'Pushing to GitHub', sub: 'Creating commit and pushing to remote' },
  { key: 'complete', label: 'Export complete', sub: 'Repository updated successfully' },
];

export default function GitHubExportPanel({
  connectionStatus,
  onConnectionChange,
  exportStep,
  onExportStepChange,
  project,
}: GitHubExportPanelProps) {
  const [showRepoSuggestions, setShowRepoSuggestions] = useState(false);
  const [exportedRepoUrl, setExportedRepoUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [lastFormData, setLastFormData] = useState<ExportFormData | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ExportFormData>({
    defaultValues: {
      repoName: '',
      branch: 'main',
      visibility: 'private',
      commitMessage: 'feat: AI-generated project',
      createNew: false,
    },
  });

  // Update defaults when project changes
  const repoName = watch('repoName');
  const visibility = watch('visibility');
  const createNew = watch('createNew');

  // Sync repo name with selected project
  const projectSlug = project?.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') ?? '';

  const handleConnect = async () => {
    onConnectionChange('connecting');
    // Backend: GET /api/github/connect (OAuth redirect)
    await new Promise(r => setTimeout(r, 1600));
    onConnectionChange('connected');
    toast.success('GitHub account connected');
  };

  const handleDisconnect = () => {
    onConnectionChange('disconnected');
    toast.info('GitHub disconnected');
  };

  const runExport = async (data: ExportFormData) => {
    setExportError(null);
    setLastFormData(data);
    onExportStepChange('preparing');
    try {
      await new Promise(r => setTimeout(r, 1000));
      onExportStepChange('pushing');
      await new Promise(r => setTimeout(r, 1400));
      onExportStepChange('complete');
      setExportedRepoUrl(`https://github.com/alex-dev/${data.repoName}`);
      toast.success(`Exported to github.com/alex-dev/${data.repoName}`);
    } catch (err: any) {
      const msg = err?.message || String(err) || 'Export failed. Please try again.';
      const lower = msg.toLowerCase();
      let userMsg = msg;
      if (lower.includes('not found') || lower.includes('404')) {
        userMsg = `Repository "${data.repoName}" not found. Make sure it exists in your GitHub account or enable "Create new repository".`;
      } else if (lower.includes('permission') || lower.includes('403') || lower.includes('forbidden')) {
        userMsg = 'Permission denied. Your GitHub token may not have write access to this repository.';
      } else if (lower.includes('already exists') || lower.includes('422')) {
        userMsg = `Repository "${data.repoName}" already exists. Disable "Create new repository" to push to the existing one.`;
      } else if (lower.includes('network') || lower.includes('fetch')) {
        userMsg = 'Network error during export. Please check your connection and try again.';
      }
      setExportError(userMsg);
      onExportStepChange('error');
      toast.error('Export failed', { description: userMsg });
    }
  };

  const onSubmit = async (data: ExportFormData) => {
    await runExport(data);
  };

  const handleRetryExport = () => {
    if (lastFormData) {
      runExport(lastFormData);
    }
  };

  const resetExport = () => {
    onExportStepChange('idle');
    setExportedRepoUrl(null);
    setExportError(null);
    setLastFormData(null);
  };

  const isExporting = exportStep === 'preparing' || exportStep === 'pushing';
  const isComplete = exportStep === 'complete';
  const isError = exportStep === 'error';

  return (
    <div className="rounded-2xl border border-zinc-800/60 glass-card overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Github size={18} className="text-zinc-200" />
          </div>
          <div>
            <h2 className="text-sm font-700 text-zinc-200">GitHub Export</h2>
            <p className="text-xs text-zinc-500">Push generated code to a GitHub repository</p>
          </div>
        </div>

        {/* Connection status */}
        {connectionStatus === 'connected' ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20">
              <CheckCircle size={13} className="text-green-400" />
              <div>
                <p className="text-xs font-600 text-green-400">Connected</p>
                <p className="text-[10px] text-zinc-500">@alex-dev</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : connectionStatus === 'connecting' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700">
            <Loader2 size={13} className="text-zinc-400 animate-spin" />
            <span className="text-xs text-zinc-400">Connecting…</span>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 text-white btn-glam"
          >
            <Github size={14} />
            Connect GitHub
          </button>
        )}
      </div>

      {/* Form content */}
      {connectionStatus !== 'connected' ? (
        <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
          <Github size={32} className="text-zinc-700" />
          <p className="text-sm font-600 text-zinc-500">GitHub not connected</p>
          <p className="text-xs text-zinc-700 max-w-xs">Connect your GitHub account to push generated projects directly to your repositories.</p>
          <button
            onClick={handleConnect}
            disabled={connectionStatus === 'connecting'}
            className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 text-white btn-glam disabled:opacity-60"
          >
            {connectionStatus === 'connecting' ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
            {connectionStatus === 'connecting' ? 'Connecting…' : 'Connect GitHub'}
          </button>
        </div>
      ) : isComplete ? (
        <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <div>
            <p className="text-base font-700 text-zinc-200">Export Complete</p>
            <p className="text-sm text-zinc-500 mt-1">Your project has been pushed to GitHub successfully.</p>
          </div>
          {exportedRepoUrl && (
            <a
              href={exportedRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 text-violet-300 bg-violet-600/15 border border-violet-600/25 hover:bg-violet-600/25 transition-colors"
            >
              <Github size={14} />
              {exportedRepoUrl.replace('https://github.com/', '')}
              <ExternalLink size={12} />
            </a>
          )}
          <button onClick={resetExport} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            <RefreshCw size={13} />
            Export again
          </button>
        </div>
      ) : isError ? (
        <div className="px-6 py-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/25 flex items-center justify-center">
            <AlertCircle size={28} className="text-red-400" />
          </div>
          <div>
            <p className="text-base font-700 text-zinc-200">Export Failed</p>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm leading-relaxed">{exportError || 'Something went wrong during the export.'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRetryExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 text-white btn-glam disabled:opacity-60"
            >
              <RefreshCw size={14} className={isExporting ? 'animate-spin' : ''} />
              {isExporting ? 'Retrying…' : 'Retry Export'}
            </button>
            <button onClick={resetExport} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              Edit settings
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              {/* Create new toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <div>
                  <p className="text-sm font-600 text-zinc-300">Create new repository</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Off = push to existing repo</p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('createNew', !createNew)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${createNew ? 'bg-violet-600' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${createNew ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Repository name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-zinc-400">
                  {createNew ? 'New repository name' : 'Repository name'}
                </label>
                <p className="text-xs text-zinc-600">
                  {createNew
                    ? 'Will be created under your GitHub account' :'Must already exist in your GitHub account'
                  }
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="my-react-app"
                    {...register('repoName', {
                      required: 'Repository name is required',
                      pattern: { value: /^[a-zA-Z0-9_-]+$/, message: 'Only letters, numbers, hyphens, and underscores' },
                    })}
                    onFocus={() => setShowRepoSuggestions(!createNew)}
                    onBlur={() => setTimeout(() => setShowRepoSuggestions(false), 150)}
                    className={`w-full bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-all ${
                      errors.repoName ? 'border-red-500/50' : 'border-zinc-700 focus:border-violet-600/50'
                    }`}
                  />
                  {showRepoSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-card z-10 slide-up">
                      {projectSlug && (
                        <button
                          key={projectSlug}
                          type="button"
                          onClick={() => { setValue('repoName', projectSlug); setShowRepoSuggestions(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <Github size={12} className="text-zinc-500" />
                          {projectSlug}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {errors.repoName && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.repoName.message}
                  </p>
                )}
              </div>

              {/* Branch */}
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-zinc-400">Target branch</label>
                <div className="relative">
                  <GitBranch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    type="text"
                    placeholder="main"
                    {...register('branch', { required: 'Branch name is required' })}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-8 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Visibility */}
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-zinc-400">Repository visibility</label>
                <div className="flex gap-2">
                  {(['private', 'public'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValue('visibility', v)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-500 border transition-all ${
                        visibility === v
                          ? 'bg-violet-600/20 text-violet-300 border-violet-600/30'
                          : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      {v === 'private' ? <Lock size={13} /> : <Unlock size={13} />}
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-600">
                  {visibility === 'private' ?'Only you and collaborators can see this repository' :'Anyone on the internet can see this repository'
                  }
                </p>
              </div>

              {/* Commit message */}
              <div className="space-y-1.5">
                <label className="block text-sm font-500 text-zinc-400">Commit message</label>
                <textarea
                  rows={3}
                  {...register('commitMessage', { required: 'Commit message is required' })}
                  className={`w-full bg-zinc-900 border rounded-xl px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none transition-all ${
                    errors.commitMessage ? 'border-red-500/50' : 'border-zinc-700 focus:border-violet-600/50'
                  }`}
                />
                {errors.commitMessage && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.commitMessage.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Export progress */}
          {isExporting && (
            <div className="mt-5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 space-y-3">
              {EXPORT_STEPS.map((step, i) => {
                const stepKeys = ['preparing', 'pushing', 'complete'];
                const currentIdx = stepKeys.indexOf(exportStep);
                const stepIdx = stepKeys.indexOf(step.key);
                const isDone = stepIdx < currentIdx;
                const isActive = step.key === exportStep;

                return (
                  <div key={step.key} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isDone ? 'bg-green-500/20 border border-green-500/30' : isActive ?'bg-violet-600/20 border border-violet-600/30': 'bg-zinc-800 border border-zinc-700'
                    }`}>
                      {isDone
                        ? <CheckCircle size={12} className="text-green-400" />
                        : isActive
                          ? <Loader2 size={12} className="text-violet-400 animate-spin" />
                          : <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      }
                    </div>
                    <div>
                      <p className={`text-xs font-600 ${isDone ? 'text-green-400' : isActive ? 'text-violet-300' : 'text-zinc-600'}`}>
                        {step.label}
                      </p>
                      <p className="text-[11px] text-zinc-600">{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 mt-5">
            <button
              type="submit"
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-600 text-white btn-glam disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <><Loader2 size={14} className="animate-spin" /> Exporting…</>
              ) : (
                <><Github size={14} /> Push to GitHub</>
              )}
            </button>
            <p className="text-xs text-zinc-600">
              Will push <span className="text-zinc-400 font-500">10 files</span> to{' '}
              <span className="font-mono text-zinc-400">github.com/alex-dev/{repoName || '…'}</span>
            </p>
          </div>
        </form>
      )}
    </div>
  );
}