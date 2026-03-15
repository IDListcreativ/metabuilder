'use client';

import { useState, useEffect } from 'react';
import { Zap, Clock, FileCode, Cpu, Eye, EyeOff } from 'lucide-react';
import { GenerationStatus } from './AIGeneratorWorkspace';

interface GeneratorStatusBarProps {
  status: GenerationStatus;
  model: string;
  totalTokens: number;
  fileCount: number;
  lastGenTime: string;
  showPreview?: boolean;
  onTogglePreview?: () => void;
}

const STATUS_CONFIG = {
  idle: { label: 'Ready', color: 'text-zinc-500', dot: 'bg-zinc-600' },
  generating: { label: 'Generating…', color: 'text-violet-400', dot: 'bg-violet-500 status-pulse' },
  complete: { label: 'Complete', color: 'text-green-400', dot: 'bg-green-500' },
  error: { label: 'Error', color: 'text-red-400', dot: 'bg-red-500' },
};

export default function GeneratorStatusBar({ status, model, totalTokens, fileCount, lastGenTime, showPreview, onTogglePreview }: GeneratorStatusBarProps) {
  const cfg = STATUS_CONFIG[status];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-800/60 bg-zinc-900/50 flex-shrink-0 text-[11px] font-mono">
      <div className="flex items-center gap-4">
        {/* Status */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          <span className={cfg.color}>{cfg.label}</span>
        </div>

        {/* Model */}
        <div className="flex items-center gap-1 text-zinc-600">
          <Cpu size={10} />
          <span>{model}</span>
        </div>

        {/* Files */}
        <div className="flex items-center gap-1 text-zinc-600">
          <FileCode size={10} />
          <span className="tabular-nums">{fileCount} files</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Last gen time */}
        <div className="flex items-center gap-1 text-zinc-600">
          <Clock size={10} />
          <span className="tabular-nums">{lastGenTime}</span>
        </div>

        {/* Token usage */}
        <div className="flex items-center gap-1 text-zinc-600">
          <Zap size={10} />
          <span className="tabular-nums">{totalTokens.toLocaleString()} / 100,000 tokens</span>
        </div>

        {/* Preview toggle */}
        {onTogglePreview && (
          <button
            onClick={onTogglePreview}
            className={`flex items-center gap-1 transition-colors ${showPreview ? 'text-violet-400' : 'text-zinc-600 hover:text-zinc-400'}`}
            title={showPreview ? 'Hide preview' : 'Show preview'}
          >
            {showPreview ? <Eye size={10} /> : <EyeOff size={10} />}
            <span>preview</span>
          </button>
        )}

        {/* Last updated */}
        <span className="text-zinc-700">
          {mounted ? `Updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}
        </span>
      </div>
    </div>
  );
}