'use client';

import { useState, useEffect } from 'react';
import EditorFileTree from './EditorFileTree';
import EditorTabBar from './EditorTabBar';
import EditorPane from './EditorPane';
import EditorStatusBar from './EditorStatusBar';
import AISuggestionPanel from './AISuggestionPanel';
import { toast } from 'sonner';
import { projectService, Project } from '@/lib/services/projectService';
import { ChevronDown, RefreshCw, FolderOpen } from 'lucide-react';
import Link from 'next/link';

export interface EditorFile {
  path: string;
  language: string;
  content: string;
  isDirty: boolean;
  isReadOnly?: boolean;
  cursor?: { line: number; col: number };
}

export default function CodeEditorWorkspace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<EditorFile[]>([]);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [fileTreeWidth] = useState(220);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  useEffect(() => {
    projectService.getAll().then((data) => {
      setProjects(data);
      if (data.length > 0) {
        loadProject(data[0]);
      }
    }).catch(console.error).finally(() => setLoadingProjects(false));
  }, []);

  const loadProject = (project: Project) => {
    setSelectedProject(project);
    const editorFiles: EditorFile[] = (project.files ?? []).map(f => ({
      path: f.path,
      language: f.language,
      content: f.content,
      isDirty: false,
    }));
    setFiles(editorFiles);
    if (editorFiles.length > 0) {
      setOpenTabs([editorFiles[0].path]);
      setActiveTab(editorFiles[0].path);
    } else {
      setOpenTabs([]);
      setActiveTab('');
    }
  };

  const activeFile = files.find(f => f.path === activeTab);

  const closeTab = (path: string) => {
    const file = files.find(f => f.path === path);
    if (file?.isDirty) {
      toast.warning(`"${path.split('/').pop()}" has unsaved changes`, {
        action: { label: 'Close anyway', onClick: () => doCloseTab(path) },
      });
      return;
    }
    doCloseTab(path);
  };

  const doCloseTab = (path: string) => {
    const newTabs = openTabs.filter(t => t !== path);
    setOpenTabs(newTabs);
    if (activeTab === path && newTabs.length > 0) {
      setActiveTab(newTabs[newTabs.length - 1]);
    }
  };

  const openFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs(prev => [...prev, path]);
    }
    setActiveTab(path);
  };

  const handleSave = async () => {
    if (!selectedProject || !activeFile) return;
    // Mark file as clean
    setFiles(prev => prev.map(f => f.path === activeFile.path ? { ...f, isDirty: false } : f));
    // Persist updated files to Supabase
    const updatedFiles = files.map(f => ({
      path: f.path,
      language: f.language,
      content: f.path === activeFile.path ? activeFile.content : f.content,
      size: new Blob([f.content]).size,
    }));
    await projectService.update(selectedProject.id, { files: updatedFiles });
    toast.success(`Saved ${activeFile.path.split('/').pop()}`);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 stone-editor-bg">
      {/* Editor header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/50 flex-shrink-0 travertine-panel">
        <div className="flex items-center gap-3">
          {/* Project selector */}
          <div className="relative">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center gap-2 text-sm font-600 text-zinc-200 hover:text-zinc-100 transition-colors"
            >
              {loadingProjects ? (
                <RefreshCw size={12} className="text-zinc-500 animate-spin" />
              ) : null}
              <span className="max-w-[200px] truncate">
                {selectedProject?.name ?? (loadingProjects ? 'Loading…' : 'No projects')}
              </span>
              <ChevronDown size={12} className="text-zinc-600" />
            </button>

            {showProjectDropdown && projects.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-lg z-20">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { loadProject(p); setShowProjectDropdown(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm text-left hover:bg-zinc-800 transition-colors ${
                      selectedProject?.id === p.id ? 'bg-violet-600/10 text-violet-300' : 'text-zinc-300'
                    }`}
                  >
                    <FolderOpen size={12} className="text-zinc-500 flex-shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-500 font-mono">Code Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-500 border transition-all ${
              aiPanelOpen
                ? 'bg-violet-600/20 text-violet-300 border-violet-600/30'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            <span>✦</span>
            AI Assist
          </button>
          <button
            onClick={handleSave}
            disabled={!activeFile}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-500 btn-glam text-white disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      {/* Empty state when no projects */}
      {!loadingProjects && projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-6">
          <div className="w-14 h-14 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
            <FolderOpen size={24} className="text-zinc-600" />
          </div>
          <div>
            <p className="text-sm font-600 text-zinc-400 mb-1">No projects yet</p>
            <p className="text-xs text-zinc-600 mb-4">Generate code in the AI Generator and save a project to edit it here</p>
            <Link
              href="/ai-code-generator"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-600/30 text-xs text-violet-300 hover:bg-violet-600/30 transition-all"
            >
              Go to AI Generator
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* File tree */}
          <EditorFileTree
            files={files}
            activeFile={activeTab}
            openFiles={openTabs}
            onOpenFile={openFile}
            width={fileTreeWidth}
          />

          {/* Main editor area */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            {/* Tab bar */}
            <EditorTabBar
              tabs={openTabs}
              activeTab={activeTab}
              files={files}
              onSelectTab={setActiveTab}
              onCloseTab={closeTab}
            />

            {/* Editor + AI panel */}
            <div className="flex flex-1 overflow-hidden">
              {files.length === 0 && !loadingProjects ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center px-6">
                  <p className="text-sm text-zinc-500">This project has no files yet</p>
                  <p className="text-xs text-zinc-600">Generate code in the AI Generator to populate files</p>
                </div>
              ) : (
                <EditorPane
                  file={activeFile}
                  onCursorChange={setCursorPos}
                  onSave={handleSave}
                />
              )}
              {aiPanelOpen && (
                <AISuggestionPanel
                  file={activeFile}
                  onClose={() => setAiPanelOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status bar */}
      <EditorStatusBar
        file={activeFile}
        cursorPos={cursorPos}
        openTabCount={openTabs.length}
      />
    </div>
  );
}