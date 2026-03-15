'use client';

import { useEffect, useState, useRef } from 'react';
import { Terminal, ExternalLink, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DeploymentRecord } from './DeploymentHubWorkspace';

interface LogLine {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning' | 'dim' | 'command';
  text: string;
  timestamp: string;
}

const VERCEL_DEPLOY_LOGS: LogLine[] = [
  { id: '1', type: 'dim', text: '▶ Initializing build', timestamp: '00:00' },
  { id: '2', type: 'info', text: 'Detected framework: Create React App', timestamp: '00:01' },
  { id: '3', type: 'info', text: 'Installing dependencies (npm install)…', timestamp: '00:02' },
  { id: '4', type: 'command', text: '  npm install --production=false', timestamp: '00:02' },
  { id: '5', type: 'dim', text: '  added 1,482 packages in 18.4s', timestamp: '00:21' },
  { id: '6', type: 'info', text: 'Running build command: npm run build', timestamp: '00:22' },
  { id: '7', type: 'command', text: '  react-scripts build', timestamp: '00:22' },
  { id: '8', type: 'dim', text: '  Creating an optimized production build…', timestamp: '00:23' },
  { id: '9', type: 'dim', text: '  Compiled successfully.', timestamp: '00:41' },
  { id: '10', type: 'dim', text: '  File sizes after gzip:', timestamp: '00:41' },
  { id: '11', type: 'dim', text: '    142.38 kB  build/static/js/main.a3f8c12.js', timestamp: '00:41' },
  { id: '12', type: 'dim', text: '    4.82 kB    build/static/css/main.7b2e4a9.css', timestamp: '00:41' },
  { id: '13', type: 'info', text: 'Uploading build output to CDN…', timestamp: '00:42' },
  { id: '14', type: 'dim', text: '  Uploading 24 files (148.3 kB)…', timestamp: '00:43' },
];

const LIVE_LOG_LINES: LogLine[] = [
  { id: 'l1', type: 'dim', text: '▶ Initializing build', timestamp: '00:00' },
  { id: 'l2', type: 'info', text: 'Detected framework: Create React App', timestamp: '00:01' },
  { id: 'l3', type: 'info', text: 'Installing dependencies…', timestamp: '00:02' },
  { id: 'l4', type: 'command', text: '  npm install --production=false', timestamp: '00:02' },
  { id: 'l5', type: 'dim', text: '  added 1,482 packages in 22.1s', timestamp: '00:24' },
  { id: 'l6', type: 'info', text: 'Running build command: npm run build', timestamp: '00:25' },
  { id: 'l7', type: 'command', text: '  react-scripts build', timestamp: '00:25' },
  { id: 'l8', type: 'dim', text: '  Creating an optimized production build…', timestamp: '00:26' },
];

interface DeploymentLogPanelProps {
  deployment: DeploymentRecord | null;
}

export default function DeploymentLogPanel({ deployment }: DeploymentLogPanelProps) {
  const [visibleLines, setVisibleLines] = useState<LogLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!deployment) {
      setVisibleLines([]);
      return;
    }

    if (deployment.status === 'deploying') {
      // Stream log lines progressively
      setVisibleLines([]);
      setIsStreaming(true);
      let i = 0;
      streamRef.current = setInterval(() => {
        if (i < LIVE_LOG_LINES.length) {
          const line = LIVE_LOG_LINES[i];
          if (line) {
            setVisibleLines(prev => [...prev, line]);
          }
          i++;
        } else {
          clearInterval(streamRef.current!);
          setIsStreaming(true); // keep cursor blinking — deploy still in progress
        }
      }, 600);
    } else if (deployment.status === 'success') {
      setIsStreaming(false);
      setVisibleLines([
        ...VERCEL_DEPLOY_LOGS,
        { id: 'ok1', type: 'success', text: '✓ Build completed in 94s', timestamp: '01:34' },
        { id: 'ok2', type: 'success', text: `✓ Deployed to ${deployment.url}`, timestamp: '01:34' },
        { id: 'ok3', type: 'dim', text: `  Commit: ${deployment.commitSha} · Branch: ${deployment.branch}`, timestamp: '01:34' },
      ]);
    } else if (deployment.status === 'failed') {
      setIsStreaming(false);
      setVisibleLines([
        { id: 'e1', type: 'dim', text: '▶ Initializing build', timestamp: '00:00' },
        { id: 'e2', type: 'info', text: 'Installing dependencies…', timestamp: '00:01' },
        { id: 'e3', type: 'command', text: '  npm install --production=false', timestamp: '00:02' },
        { id: 'e4', type: 'info', text: 'Running build command: npm run build', timestamp: '00:28' },
        { id: 'e5', type: 'command', text: '  react-scripts build', timestamp: '00:28' },
        { id: 'e6', type: 'error', text: `✗ Error: ${deployment.errorMessage}`, timestamp: '00:31' },
        { id: 'e7', type: 'error', text: '  at resolveModule (/usr/local/lib/node_modules/react-scripts/scripts/build.js:145:14)', timestamp: '00:31' },
        { id: 'e8', type: 'error', text: '✗ Build failed with exit code 1', timestamp: '00:31' },
      ]);
    } else {
      setVisibleLines([]);
    }

    return () => { if (streamRef.current) clearInterval(streamRef.current); };
  }, [deployment?.id, deployment?.status]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLines]);

  const getLineClass = (type: LogLine['type']) => {
    switch (type) {
      case 'success': return 'log-success';
      case 'error': return 'log-error';
      case 'warning': return 'log-warning';
      case 'info': return 'log-info';
      case 'command': return 'text-zinc-300';
      case 'dim': return 'log-dim';
      default: return 'text-zinc-400';
    }
  };

  const copyLogs = () => {
    const text = visibleLines.map(l => `[${l.timestamp}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Logs copied to clipboard');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Log header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/40 flex-shrink-0 bg-zinc-900/30 travertine-panel">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-zinc-500" />
          <span className="text-xs font-600 text-zinc-400">Build Log</span>
          {deployment && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="text-xs font-mono text-zinc-600">{deployment.id}</span>
            </>
          )}
          {isStreaming && deployment?.status === 'deploying' && (
            <div className="flex items-center gap-1.5 ml-1">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 status-pulse" />
              <span className="text-[11px] text-violet-400">Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {deployment?.url && (
            <a
              href={deployment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              <ExternalLink size={11} />
              Open URL
            </a>
          )}
          <button
            onClick={copyLogs}
            disabled={visibleLines.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all disabled:opacity-40"
          >
            <Copy size={11} />
            Copy
          </button>
        </div>
      </div>

      {/* Log content */}
      <div className="flex-1 overflow-y-auto bg-zinc-950/50 p-4 font-mono text-[12px] leading-6 stone-editor-bg">
        {!deployment ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Terminal size={28} className="text-zinc-800" />
            <p className="text-sm text-zinc-600">No deployment selected</p>
            <p className="text-xs text-zinc-700">Select a deployment from the history below to view its logs</p>
          </div>
        ) : visibleLines.length === 0 ? (
          <div className="flex items-center gap-2 text-zinc-600">
            <RefreshCw size={12} className="animate-spin" />
            <span>Waiting for build output…</span>
          </div>
        ) : (
          <>
            {visibleLines.map((line) => line && (
              <div key={line.id} className="flex gap-3 group hover:bg-zinc-800/20 px-1 rounded">
                <span className="text-zinc-700 select-none flex-shrink-0 tabular-nums">{line.timestamp}</span>
                <span className={getLineClass(line.type)}>{line.text}</span>
              </div>
            ))}

            {/* Blinking cursor when streaming */}
            {isStreaming && (
              <div className="flex gap-3 px-1">
                <span className="text-zinc-700 select-none flex-shrink-0">
                  {String(Math.floor(visibleLines.length * 0.6)).padStart(2, '0')}:{String((visibleLines.length * 3) % 60).padStart(2, '0')}
                </span>
                <span className="text-zinc-400 typing-cursor" />
              </div>
            )}
          </>
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}