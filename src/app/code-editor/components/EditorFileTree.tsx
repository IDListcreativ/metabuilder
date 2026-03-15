'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, Folder, FileCode, FileJson, FileCog } from 'lucide-react';
import { EditorFile } from './CodeEditorWorkspace';

interface EditorFileTreeProps {
  files: EditorFile[];
  activeFile: string;
  openFiles: string[];
  onOpenFile: (path: string) => void;
  width: number;
}

const FILE_ICON_MAP: Record<string, React.ReactNode> = {
  tsx: <FileCode size={12} className="text-blue-400 flex-shrink-0" />,
  ts: <FileCode size={12} className="text-blue-300 flex-shrink-0" />,
  json: <FileJson size={12} className="text-yellow-400 flex-shrink-0" />,
  css: <FileCog size={12} className="text-pink-400 flex-shrink-0" />,
  js: <FileCode size={12} className="text-yellow-300 flex-shrink-0" />,
};

function buildTree(files: EditorFile[]) {
  const tree: Record<string, (EditorFile | { isDir: true; name: string; path: string })[]> = { '': [] };

  files.forEach(file => {
    const parts = file.path.split('/');
    if (parts.length === 1) {
      tree[''].push(file);
    } else {
      // Ensure all parent dirs exist
      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');
        const parentPath = parts.slice(0, i - 1).join('/');
        if (!tree[dirPath]) {
          tree[dirPath] = [];
          const parentKey = parentPath || '';
          if (!tree[parentKey]) tree[parentKey] = [];
          const alreadyAdded = tree[parentKey].some((item: any) => item.path === dirPath && item.isDir);
          if (!alreadyAdded) {
            tree[parentKey].push({ isDir: true, name: parts[i - 1], path: dirPath });
          }
        }
      }
      const parentPath = parts.slice(0, -1).join('/');
      tree[parentPath].push(file);
    }
  });

  return tree;
}

function TreeNode({
  item,
  tree,
  depth,
  activeFile,
  openFiles,
  onOpenFile,
}: {
  item: any;
  tree: any;
  depth: number;
  activeFile: string;
  openFiles: string[];
  onOpenFile: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (item.isDir) {
    const children = tree[item.path] || [];
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full px-2 py-1 hover:bg-zinc-800/40 transition-colors text-left"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {expanded
            ? <ChevronDown size={11} className="text-zinc-600 flex-shrink-0" />
            : <ChevronRight size={11} className="text-zinc-600 flex-shrink-0" />
          }
          {expanded
            ? <FolderOpen size={12} className="text-amber-400/70 flex-shrink-0" />
            : <Folder size={12} className="text-amber-400/70 flex-shrink-0" />
          }
          <span className="text-[11px] text-zinc-400 ml-1">{item.name}</span>
        </button>
        {expanded && children.map((child: any, i: number) => (
          <TreeNode key={i} item={child} tree={tree} depth={depth + 1} activeFile={activeFile} openFiles={openFiles} onOpenFile={onOpenFile} />
        ))}
      </div>
    );
  }

  const lang = item.path.split('.').pop() || '';
  const icon = FILE_ICON_MAP[lang] || <FileCode size={12} className="text-zinc-400 flex-shrink-0" />;
  const fileName = item.path.split('/').pop()!;
  const isActive = item.path === activeFile;
  const isOpen = openFiles.includes(item.path);

  return (
    <button
      onClick={() => onOpenFile(item.path)}
      className={`flex items-center gap-1.5 w-full py-1.5 hover:bg-zinc-800/40 transition-colors text-left group ${isActive ? 'bg-violet-600/12 border-r-2 border-violet-500' : ''}`}
      style={{ paddingLeft: `${14 + depth * 12}px` }}
    >
      {icon}
      <span className={`text-[11px] truncate flex-1 ${isActive ? 'text-violet-300' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
        {fileName}
      </span>
      {item.isDirty && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mr-2" title="Unsaved changes" />
      )}
      {isOpen && !isActive && (
        <span className="w-1 h-1 rounded-full bg-zinc-600 flex-shrink-0 mr-2" />
      )}
    </button>
  );
}

export default function EditorFileTree({ files, activeFile, openFiles, onOpenFile, width }: EditorFileTreeProps) {
  const tree = buildTree(files);
  const rootItems = tree[''] || [];

  return (
    <div
      className="flex flex-col border-r border-zinc-800/60 bg-zinc-900/30 flex-shrink-0 overflow-hidden"
      style={{ width: `${width}px` }}
    >
      <div className="flex items-center px-3 py-2.5 border-b border-zinc-800/40 flex-shrink-0">
        <span className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">Explorer</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        <div className="px-2 py-1">
          <div className="flex items-center gap-1 px-2 py-1">
            <ChevronDown size={11} className="text-zinc-600" />
            <span className="text-[11px] font-600 text-zinc-400 uppercase tracking-wide">ecommerce-app</span>
          </div>
        </div>
        {rootItems.map((item: any, i: number) => (
          <TreeNode key={i} item={item} tree={tree} depth={0} activeFile={activeFile} openFiles={openFiles} onOpenFile={onOpenFile} />
        ))}
      </div>
    </div>
  );
}