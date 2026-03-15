'use client';

import { useState, useMemo } from 'react';
import { Sparkles, X, Send, Loader2, Copy, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { toast } from 'sonner';
import { EditorFile } from './CodeEditorWorkspace';

interface AISuggestionPanelProps {
  file?: EditorFile;
  onClose: () => void;
}

interface Suggestion {
  id: string;
  type: 'refactor' | 'fix' | 'improve' | 'explain';
  title: string;
  description: string;
  code?: string;
  applied?: boolean;
}

const MOCK_SUGGESTIONS: Suggestion[] = [
  {
    id: '1',
    type: 'improve',
    title: 'Memoize expensive calculations',
    description: 'The `discount` calculation runs on every render. Wrap it with `useMemo` for performance.',
    code: `const discount = useMemo(() => {\n  if (!product.originalPrice) return null;\n  return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);\n}, [product.price, product.originalPrice]);`,
    applied: false,
  },
  {
    id: '2',
    type: 'fix',
    title: 'Missing key prop warning',
    description: 'The star rating `.map()` on line 47 uses index as key. Consider using the star value directly.',
    code: `{[1,2,3,4,5].map(star => (\n  <span key={star} className={\`text-xs \${star <= product.rating ? 'text-yellow-400' : 'text-gray-200'}\`}>\n    ★\n  </span>\n))}`,
    applied: false,
  },
  {
    id: '3',
    type: 'refactor',
    title: 'Extract StarRating component',
    description: 'The star rating display pattern is used in multiple places. Extract it into a reusable `StarRating` component.',
    applied: false,
  },
];

const TYPE_CONFIG = {
  refactor: { label: 'Refactor', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  fix: { label: 'Fix', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  improve: { label: 'Improve', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  explain: { label: 'Explain', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
};

export default function AISuggestionPanel({ file, onClose }: AISuggestionPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(MOCK_SUGGESTIONS);
  const [expandedId, setExpandedId] = useState<string | null>('1');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const handleAsk = () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    // Backend: POST /api/generate with file context + prompt
    setTimeout(() => {
      setIsLoading(false);
      const newSugg: Suggestion = {
        id: String(Date.now()),
        type: 'explain',
        title: `Response: "${prompt}"`,
        description: 'The `memo` wrapper prevents unnecessary re-renders when the parent component updates but the product prop reference stays the same. This is especially beneficial in large product grids where many cards exist simultaneously.',
        applied: false,
      };
      setSuggestions(prev => [newSugg, ...prev]);
      setExpandedId(newSugg.id);
      setPrompt('');
    }, 1800);
  };

  const handleApply = (id: string) => {
    setAppliedIds(prev => new Set([...prev, id]));
    toast.success('Suggestion applied to editor');
  };

  return (
    <div className="flex flex-col w-72 xl:w-80 border-l border-zinc-800/60 bg-zinc-900/40 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <span className="text-sm font-600 text-zinc-200">AI Assist</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Context badge */}
      {file && (
        <div className="px-4 py-2 border-b border-zinc-800/40 flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            <span className="text-[11px] text-zinc-400 truncate">{file.path.split('/').pop()}</span>
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <p className="text-[10px] font-600 uppercase tracking-widest text-zinc-600 px-1 mb-3">Suggestions</p>

        {suggestions.map((s) => {
          const isExpanded = expandedId === s.id;
          const isApplied = appliedIds.has(s.id);
          const cfg = TYPE_CONFIG[s.type];

          return (
            <div key={s.id} className={`rounded-xl border transition-all ${isExpanded ? 'border-violet-600/25 bg-violet-600/5' : 'border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/30'}`}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="flex items-start gap-2.5 w-full px-3 py-2.5 text-left"
              >
                <span className={`px-1.5 py-0.5 text-[10px] font-600 rounded border flex-shrink-0 mt-0.5 ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="flex-1 text-xs font-500 text-zinc-300 leading-relaxed">{s.title}</span>
                <div className="flex-shrink-0 mt-0.5">
                  {isExpanded
                    ? <ChevronUp size={12} className="text-zinc-600" />
                    : <ChevronDown size={12} className="text-zinc-600" />
                  }
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2.5 slide-up">
                  <p className="text-[12px] text-zinc-400 leading-relaxed">{s.description}</p>
                  {s.code && (
                    <div className="relative rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden">
                      <pre className="text-[11px] font-mono text-zinc-300 p-3 overflow-x-auto leading-5">{s.code}</pre>
                      <button
                        onClick={() => { navigator.clipboard.writeText(s.code!); toast.success('Code copied'); }}
                        className="absolute top-2 right-2 p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {!isApplied ? (
                      <button
                        onClick={() => handleApply(s.id)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-600 btn-glam text-white"
                      >
                        Apply
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-xs font-600 text-green-400">
                        <Check size={11} />
                        Applied
                      </div>
                    )}
                    <button
                      onClick={() => setSuggestions(prev => prev.filter(x => x.id !== s.id))}
                      className="px-3 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ask input */}
      <div className="flex-shrink-0 border-t border-zinc-800/40 p-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            placeholder="Ask AI about this file…"
            rows={2}
            className="flex-1 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50 resize-none"
          />
          <button
            onClick={handleAsk}
            disabled={!prompt.trim() || isLoading}
            className="flex-shrink-0 w-8 h-8 rounded-lg btn-glam flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={13} className="animate-spin text-white" /> : <Send size={13} className="text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}