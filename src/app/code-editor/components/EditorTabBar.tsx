'use client';

import { X, FileCode } from 'lucide-react';
import { EditorFile } from './CodeEditorWorkspace';

interface EditorTabBarProps {
  tabs: string[];
  activeTab: string;
  files: EditorFile[];
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

const LANG_COLORS: Record<string, string> = {
  tsx: 'text-blue-400',
  ts: 'text-blue-300',
  json: 'text-yellow-400',
  css: 'text-pink-400',
  js: 'text-yellow-300',
};

export default function EditorTabBar({ tabs, activeTab, files, onSelectTab, onCloseTab }: EditorTabBarProps) {
  return (
    <div className="flex items-end overflow-x-auto bg-zinc-900/50 border-b border-zinc-800/60 flex-shrink-0 scrollbar-hide">
      {tabs.map((path) => {
        const file = files.find(f => f.path === path);
        const fileName = path.split('/').pop()!;
        const lang = fileName.split('.').pop() || '';
        const isActive = path === activeTab;

        return (
          <div
            key={path}
            onClick={() => onSelectTab(path)}
            className={`
              group flex items-center gap-2 px-4 py-2.5 cursor-pointer border-r border-zinc-800/40 flex-shrink-0 min-w-0
              transition-all duration-150 relative
              ${isActive
                ? 'bg-zinc-950 text-zinc-200' :'bg-zinc-900/30 text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-300'
              }
            `}
          >
            {/* Active underline */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600 to-fuchsia-500" />
            )}

            <FileCode size={12} className={`flex-shrink-0 ${LANG_COLORS[lang] || 'text-zinc-400'}`} />
            <span className={`text-xs font-500 truncate max-w-[120px] ${isActive ? 'text-zinc-200' : ''}`}>
              {fileName}
            </span>

            {/* Dirty indicator */}
            {file?.isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved changes" />
            )}

            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); onCloseTab(path); }}
              className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all ${
                isActive
                  ? 'opacity-60 hover:opacity-100 hover:bg-zinc-700' :'opacity-0 group-hover:opacity-60 hover:opacity-100 hover:bg-zinc-700'
              }`}
              aria-label={`Close ${fileName}`}
            >
              <X size={10} />
            </button>
          </div>
        );
      })}

      {/* Empty space */}
      <div className="flex-1" />
    </div>
  );
}