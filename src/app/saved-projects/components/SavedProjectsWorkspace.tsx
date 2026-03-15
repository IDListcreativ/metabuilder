'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FolderOpen, Search, Trash2, Copy, Clock, FileCode, Cpu, Archive, Sparkles, BarChart2, History, X, RefreshCw, Download, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { projectService, Project, GenerationHistoryEntry } from '@/lib/services/projectService';



type Tab = 'projects' | 'history';
type StatusFilter = 'all' | 'draft' | 'published' | 'archived';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  published: 'bg-green-500/15 text-green-400 border-green-500/25',
  complete: 'bg-green-500/15 text-green-400 border-green-500/25',
  archived: 'bg-zinc-700/40 text-zinc-500 border-zinc-600/25',
};

export default function SavedProjectsWorkspace() {
  const [tab, setTab] = useState<Tab>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [stats, setStats] = useState({ totalProjects: 0, totalFiles: 0, totalTokens: 0, totalGenerations: 0 });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [allProjects, allStats] = await Promise.all([
        projectService.getAll(),
        projectService.getStats(),
      ]);
      setProjects(allProjects);
      setStats(allStats);
    } catch (err) {
      console.error('Failed to load projects:', err);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Derive history from all projects' generationHistory
  const history: GenerationHistoryEntry[] = projects
    .flatMap(p => p.generationHistory ?? [])
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredHistory = history.filter(
    (h) =>
      !search ||
      h.prompt.toLowerCase().includes(search.toLowerCase()) ||
      h.response.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const ok = await projectService.delete(id);
    if (ok) {
      if (selectedProject?.id === id) setSelectedProject(null);
      await reload();
      toast.success(`Deleted "${name}"`);
    } else {
      toast.error('Failed to delete project');
    }
  };

  const handleDuplicate = async (id: string) => {
    const copy = await projectService.duplicate(id);
    if (copy) {
      await reload();
      toast.success(`Duplicated as "${copy.name}"`);
    } else {
      toast.error('Failed to duplicate project');
    }
  };

  const handleArchive = async (id: string, current: string) => {
    const next = current === 'archived' ? 'draft' : 'archived';
    const updated = await projectService.update(id, { status: next as Project['status'] });
    if (updated) {
      await reload();
      toast.success(next === 'archived' ? 'Project archived' : 'Project restored');
    }
  };

  const handleExport = (project: Project) => {
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Project exported as JSON');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 stone-editor-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/50 flex-shrink-0 travertine-panel">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <FolderOpen size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-700 text-zinc-100">Saved Projects</h1>
            <p className="text-xs text-zinc-500">Manage your generated projects and history</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="hidden md:flex items-center gap-4">
          {[
            { label: 'Projects', value: stats.totalProjects, icon: FolderOpen },
            { label: 'Files', value: stats.totalFiles, icon: FileCode },
            { label: 'Tokens', value: formatTokens(stats.totalTokens), icon: Cpu },
            { label: 'Generations', value: stats.totalGenerations, icon: History },
          ].map(({ label, value, icon: IconComp }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
              <IconComp size={12} className="text-zinc-500" />
              <span className="text-xs font-600 text-zinc-200 tabular-nums">{value}</span>
              <span className="text-[10px] text-zinc-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Search bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800/40 flex-shrink-0 bg-zinc-900/30 travertine-panel">
        <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-0.5">
          {(['projects', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-600 capitalize transition-all duration-150 ${
                tab === t
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t === 'projects' ? `Projects (${projects.length})` : `History (${history.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 relative max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'projects' ? 'Search projects…' : 'Search history…'}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
              <X size={11} />
            </button>
          )}
        </div>

        {tab === 'projects' && (
          <div className="flex items-center gap-1">
            {(['all', 'draft', 'published', 'archived'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-600 capitalize transition-all duration-150 ${
                  statusFilter === s
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                    : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: list */}
        <div className="flex flex-col w-[380px] xl:w-[420px] flex-shrink-0 border-r border-zinc-800/40 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
              <RefreshCw size={20} className="text-zinc-600 animate-spin mb-3" />
              <p className="text-sm text-zinc-500">Loading projects…</p>
            </div>
          ) : tab === 'projects' ? (
            <>
              {filteredProjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-3">
                    <FolderOpen size={20} className="text-zinc-600" />
                  </div>
                  <p className="text-sm font-600 text-zinc-400 mb-1">
                    {search ? 'No projects match your search' : 'No saved projects yet'}
                  </p>
                  <p className="text-xs text-zinc-600 mb-4">
                    {search ? 'Try a different search term' : 'Save a project from the AI Generator to get started'}
                  </p>
                  {!search && (
                    <Link
                      href="/ai-code-generator"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-600/30 text-xs text-violet-300 hover:bg-violet-600/30 transition-all"
                    >
                      <Sparkles size={12} />
                      Go to AI Generator
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800/40">
                  {filteredProjects.map((project) => (
                    <li key={project.id}>
                      <button
                        onClick={() => setSelectedProject(project)}
                        className={`w-full text-left px-5 py-4 hover:bg-zinc-800/30 transition-colors ${
                          selectedProject?.id === project.id ? 'bg-violet-600/8 border-l-2 border-violet-500' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-600 text-zinc-200 truncate">{project.name}</span>
                              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full border text-[10px] font-600 capitalize ${STATUS_STYLES[project.status] ?? STATUS_STYLES.draft}`}>
                                {project.status}
                              </span>
                            </div>
                            {project.description && (
                              <p className="text-xs text-zinc-500 truncate mb-2">{project.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                              <span className="flex items-center gap-1">
                                <FileCode size={10} />
                                {project.files?.length ?? 0} files
                              </span>
                              <span className="flex items-center gap-1">
                                <Cpu size={10} />
                                {formatTokens(project.totalTokens ?? 0)} tokens
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {formatRelative(project.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 px-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-3">
                    <History size={20} className="text-zinc-600" />
                  </div>
                  <p className="text-sm font-600 text-zinc-400 mb-1">No generation history</p>
                  <p className="text-xs text-zinc-600">History is saved when you generate code in the AI Generator</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-800/40">
                  {filteredHistory.map((entry) => (
                    <li key={entry.id} className="px-5 py-3 hover:bg-zinc-800/20 transition-colors">
                      <p className="text-xs text-zinc-300 line-clamp-2 mb-1.5">{entry.prompt}</p>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-600">
                        <span className="flex items-center gap-1">
                          <FileCode size={10} />
                          {entry.filesGenerated} files
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu size={10} />
                          {formatTokens(entry.tokenCount)} tokens
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatRelative(entry.timestamp)}
                        </span>
                        <span className="text-zinc-700">{entry.model}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Right: project detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedProject ? (
            <div className="p-6 space-y-6">
              {/* Project header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-700 text-zinc-100 mb-1">{selectedProject.name}</h2>
                  {selectedProject.description && (
                    <p className="text-sm text-zinc-400">{selectedProject.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-zinc-600">
                    <span>Created {formatDate(selectedProject.createdAt)}</span>
                    <span>·</span>
                    <span>Updated {formatRelative(selectedProject.updatedAt)}</span>
                    <span>·</span>
                    <span>{selectedProject.model}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleExport(selectedProject)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/60 transition-all"
                  >
                    <Download size={11} />
                    Export
                  </button>
                  <button
                    onClick={() => handleDuplicate(selectedProject.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/60 transition-all"
                  >
                    <Copy size={11} />
                    Duplicate
                  </button>
                  <button
                    onClick={() => handleArchive(selectedProject.id, selectedProject.status)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/60 transition-all"
                  >
                    <Archive size={11} />
                    {selectedProject.status === 'archived' ? 'Restore' : 'Archive'}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedProject.id, selectedProject.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                  >
                    <Trash2 size={11} />
                    Delete
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Files', value: selectedProject.files?.length ?? 0, icon: FileCode },
                  { label: 'Tokens', value: formatTokens(selectedProject.totalTokens ?? 0), icon: Cpu },
                  { label: 'Generations', value: selectedProject.generationHistory?.length ?? 0, icon: History },
                ].map(({ label, value, icon: IconComp }) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                    <IconComp size={16} className="text-violet-400" />
                    <div>
                      <p className="text-base font-700 text-zinc-200 tabular-nums">{value}</p>
                      <p className="text-[11px] text-zinc-600">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              {(selectedProject.tags ?? []).length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag size={12} className="text-zinc-600" />
                  {selectedProject.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-[11px] text-zinc-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Files list */}
              {(selectedProject.files ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-600 uppercase tracking-widest text-zinc-600 mb-3">Files</p>
                  <div className="space-y-1.5">
                    {selectedProject.files.map((file) => (
                      <div key={file.path} className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
                        <div className="flex items-center gap-2">
                          <FileCode size={12} className="text-zinc-500" />
                          <span className="text-xs font-mono text-zinc-300">{file.path}</span>
                        </div>
                        <span className="text-[11px] text-zinc-600">{formatBytes(file.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-3">
                <BarChart2 size={20} className="text-zinc-600" />
              </div>
              <p className="text-sm font-600 text-zinc-400 mb-1">Select a project</p>
              <p className="text-xs text-zinc-600">Click a project from the list to view its details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
