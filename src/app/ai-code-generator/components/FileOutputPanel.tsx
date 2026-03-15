'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode, FolderOpen, Folder, Plus, Eye, Download, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GeneratedFile, GenerationStatus } from './AIGeneratorWorkspace';

interface FileOutputPanelProps {
  files: GeneratedFile[];
  selectedFile: GeneratedFile | null;
  onSelectFile: (file: GeneratedFile) => void;
  status: GenerationStatus;
}

const LANG_COLORS: Record<string, string> = {
  tsx: 'text-blue-400',
  ts: 'text-blue-300',
  json: 'text-yellow-400',
  css: 'text-pink-400',
  md: 'text-zinc-400',
  js: 'text-yellow-300',
};

const LANG_BG: Record<string, string> = {
  tsx: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ts: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  json: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  css: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  js: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
};

function getFileIcon(lang: string, size = 13) {
  return <FileCode size={size} className={LANG_COLORS[lang] || 'text-zinc-400'} />;
}

function groupFilesByDir(files: GeneratedFile[]) {
  const tree: Record<string, GeneratedFile[]> = {};
  files.forEach(f => {
    const parts = f.path.split('/');
    if (parts.length === 1) {
      if (!tree['root']) tree['root'] = [];
      tree['root'].push(f);
    } else {
      const dir = parts.slice(0, -1).join('/');
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(f);
    }
  });
  return tree;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

// Minimal syntax highlighting
function highlightCode(code: string, lang: string): string {
  if (lang === 'json') {
    return code
      .replace(/(".*?")/g, '<span class="text-yellow-300">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="text-green-400">$1</span>');
  }
  return code
    .replace(/(\/\/.*)/g, '<span class="text-zinc-500">$1</span>')
    .replace(/\b(import|export|from|const|let|var|function|return|interface|type|extends|implements|class|default|if|else|for|while|async|await|new|typeof|null|undefined|true|false)\b/g, '<span class="text-violet-400">$1</span>')
    .replace(/('.*?'|".*?"|`.*?`)/g, '<span class="text-green-400">$1</span>')
    .replace(/\b([A-Z][a-zA-Z]+)\b/g, '<span class="text-blue-300">$1</span>');
}

export default function FileOutputPanel({ files, selectedFile, onSelectFile, status }: FileOutputPanelProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['src/components', 'src/pages', 'src/hooks', 'src/types', 'root']));
  const [treeWidth, setTreeWidth] = useState(220);

  const tree = groupFilesByDir(files);
  const sortedDirs = Object.keys(tree).sort(a => a === 'root' ? -1 : 1);

  const toggleDir = (dir: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  };

  const newFiles = files.filter(f => f.isNew).length;
  const modifiedFiles = files.filter(f => f.isModified).length;

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* File tree sidebar */}
      <div
        className="flex flex-col bg-zinc-900/40 border-r border-zinc-800/40 flex-shrink-0"
        style={{ width: `${treeWidth}px` }}
      >
        {/* Tree header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/40 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <FolderOpen size={13} className="text-zinc-500" />
            <span className="text-xs font-600 text-zinc-400">Files</span>
            <span className="text-[10px] text-zinc-600 tabular-nums">({files.length})</span>
          </div>
          <div className="flex items-center gap-1">
            {newFiles > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-green-400 font-600">
                <Plus size={9} />{newFiles}
              </span>
            )}
            {modifiedFiles > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-600 ml-1">
                <RefreshCw size={9} />{modifiedFiles}
              </span>
            )}
          </div>
        </div>

        {/* Tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {status === 'generating' && (
            <div className="flex items-center gap-2 px-3 py-2 mx-2 mb-1 rounded-lg bg-violet-600/10 border border-violet-600/20">
              <Loader2 size={11} className="text-violet-400 animate-spin flex-shrink-0" />
              <span className="text-[11px] text-violet-300">Updating files…</span>
            </div>
          )}

          {sortedDirs.map((dir) => {
            const dirFiles = tree[dir];
            const isExpanded = expandedDirs.has(dir);
            const dirLabel = dir === 'root' ? '/' : dir;

            return (
              <div key={dir}>
                {dir !== 'root' && (
                  <button
                    onClick={() => toggleDir(dir)}
                    className="flex items-center gap-1.5 w-full px-3 py-1 hover:bg-zinc-800/40 transition-colors group"
                  >
                    {isExpanded
                      ? <ChevronDown size={11} className="text-zinc-600 flex-shrink-0" />
                      : <ChevronRight size={11} className="text-zinc-600 flex-shrink-0" />
                    }
                    {isExpanded
                      ? <FolderOpen size={12} className="text-amber-400/70 flex-shrink-0" />
                      : <Folder size={12} className="text-amber-400/70 flex-shrink-0" />
                    }
                    <span className="text-[11px] text-zinc-400 truncate">{dirLabel.split('/').pop()}</span>
                  </button>
                )}

                {(dir === 'root' || isExpanded) && (
                  <ul>
                    {dirFiles.map((file) => {
                      const fileName = file.path.split('/').pop()!;
                      const isSelected = selectedFile?.path === file.path;
                      return (
                        <li key={file.path}>
                          <button
                            onClick={() => onSelectFile(file)}
                            className={`flex items-center gap-1.5 w-full px-3 py-1.5 transition-colors group ${
                              dir !== 'root' ? 'pl-7' : ''
                            } ${isSelected
                              ? 'bg-violet-600/15 border-r-2 border-violet-500'
                              : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            {getFileIcon(file.language)}
                            <span className={`text-[11px] truncate flex-1 text-left ${isSelected ? 'text-violet-300' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                              {fileName}
                            </span>
                            {file.isNew && (
                              <span className="text-[9px] font-700 text-green-400 bg-green-400/10 px-1 rounded flex-shrink-0">N</span>
                            )}
                            {file.isModified && !file.isNew && (
                              <span className="text-[9px] font-700 text-amber-400 bg-amber-400/10 px-1 rounded flex-shrink-0">M</span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {/* Tree footer */}
        <div className="flex-shrink-0 border-t border-zinc-800/40 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">
              {files.reduce((acc, f) => acc + f.size, 0) / 1024 < 1
                ? `${files.reduce((acc, f) => acc + f.size, 0)}B`
                : `${(files.reduce((acc, f) => acc + f.size, 0) / 1024).toFixed(1)}KB`
              } total
            </span>
            <button
              onClick={() => toast.success('Project downloaded as ZIP')}
              className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Download all files"
            >
              <Download size={10} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Code preview */}
      <div className="flex flex-col flex-1 min-w-0 bg-zinc-950">
        {/* File tab bar */}
        {selectedFile && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/40 flex-shrink-0 bg-zinc-900/30">
            <div className="flex items-center gap-2">
              {getFileIcon(selectedFile.language, 14)}
              <span className="text-sm font-500 text-zinc-200">{selectedFile.path}</span>
              {selectedFile.isNew && (
                <span className="px-1.5 py-0.5 text-[10px] font-700 rounded bg-green-500/15 text-green-400 border border-green-500/20">NEW</span>
              )}
              {selectedFile.isModified && !selectedFile.isNew && (
                <span className="px-1.5 py-0.5 text-[10px] font-700 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">MODIFIED</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 text-[10px] font-600 rounded border ${LANG_BG[selectedFile.language] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                .{selectedFile.language}
              </span>
              <span className="text-[10px] text-zinc-600 tabular-nums">{formatBytes(selectedFile.size)}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedFile.content);
                  toast.success(`Copied ${selectedFile.path.split('/').pop()}`);
                }}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Copy file content"
              >
                <Eye size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Code content */}
        <div className="flex-1 overflow-auto">
          {selectedFile ? (
            <div className="relative">
              {/* Line numbers + code */}
              <div className="flex min-h-full">
                {/* Line numbers */}
                <div className="flex-shrink-0 py-4 pr-3 pl-4 text-right select-none border-r border-zinc-800/40 bg-zinc-900/20">
                  {selectedFile.content.split('\n').map((_, i) => (
                    <div key={i} className="text-[11px] font-mono text-zinc-700 leading-6 tabular-nums">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Code */}
                <pre className="flex-1 py-4 px-4 text-[12.5px] font-mono leading-6 text-zinc-300 overflow-x-auto">
                  <code
                    dangerouslySetInnerHTML={{
                      __html: highlightCode(selectedFile.content, selectedFile.language)
                    }}
                  />
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mb-4">
                <FileCode size={22} className="text-zinc-600" />
              </div>
              <p className="text-sm text-zinc-500 font-500">No files generated yet</p>
              <p className="text-xs text-zinc-700 mt-1">Describe what you want to build in the chat panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}