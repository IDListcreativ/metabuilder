'use client';

import { GitBranch, FileCode, AlertCircle } from 'lucide-react';
import { EditorFile } from './CodeEditorWorkspace';

interface EditorStatusBarProps {
  file?: EditorFile;
  cursorPos: { line: number; col: number };
  openTabCount: number;
}

const LANG_LABEL: Record<string, string> = {
  tsx: 'TypeScript React',
  ts: 'TypeScript',
  json: 'JSON',
  css: 'CSS',
  js: 'JavaScript',
  md: 'Markdown',
};

export default function EditorStatusBar({ file, cursorPos, openTabCount }: EditorStatusBarProps) {
  const lang = file?.path.split('.').pop() || '';

  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-zinc-800/60 bg-zinc-900/70 flex-shrink-0 text-[11px] font-mono">
      {/* Left */}
      <div className="flex items-center gap-3 text-zinc-600">
        <div className="flex items-center gap-1">
          <GitBranch size={10} />
          <span>main</span>
        </div>

        {file?.isDirty && (
          <div className="flex items-center gap-1 text-amber-500">
            <AlertCircle size={10} />
            <span>Unsaved changes</span>
          </div>
        )}

        <span className="text-zinc-700">
          {openTabCount} open {openTabCount === 1 ? 'file' : 'files'}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 text-zinc-600">
        <span className="tabular-nums">
          Ln {cursorPos.line}, Col {cursorPos.col}
        </span>

        {file && (
          <>
            <span>UTF-8</span>
            <span>LF</span>
            <div className="flex items-center gap-1 text-blue-400">
              <FileCode size={10} />
              <span>{LANG_LABEL[lang] || lang.toUpperCase()}</span>
            </div>
          </>
        )}

        <span>Spaces: 2</span>
      </div>
    </div>
  );
}