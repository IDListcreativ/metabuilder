'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Message, GenerationStatus } from './AIGeneratorWorkspace';
import NotionContextSelector, { NotionContextItem } from './NotionContextSelector';

interface PromptPanelProps {
  messages: Message[];
  status: GenerationStatus;
  totalTokens: number;
  model: string;
  onSendMessage: (content: string) => void;
  notionContext: NotionContextItem[];
  onNotionContextChange: (items: NotionContextItem[]) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const QUICK_PROMPTS = [
  'Add dark mode toggle',
  'Add loading skeletons',
  'Add error boundaries',
  'Extract custom hooks',
  'Add unit tests',
  'Optimize performance',
];

export default function PromptPanel({ messages, status, totalTokens, model, onSendMessage, notionContext, onNotionContextChange }: PromptPanelProps) {
  const [input, setInput] = useState('');
  const [rows, setRows] = useState(1);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!input.trim() || status === 'generating') return;
    onSendMessage(input.trim());
    setInput('');
    setRows(1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const lineCount = e.target.value.split('\n').length;
    setRows(Math.min(lineCount, 6));
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const tokenBudget = 100000;
  const tokenPercent = Math.min((totalTokens / tokenBudget) * 100, 100);

  return (
    <div className="flex flex-col w-[420px] xl:w-[460px] 2xl:w-[500px] flex-shrink-0 min-w-0 bg-zinc-950">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400" />
          <span className="text-xs font-600 text-zinc-300">Conversation</span>
          <span className="px-1.5 py-0.5 text-[10px] font-600 rounded-full bg-zinc-800 text-zinc-500 tabular-nums">
            {messages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Notion context selector */}
          <NotionContextSelector onContextChange={onNotionContextChange} />
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-zinc-600">Token usage</span>
            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${tokenPercent > 80 ? 'bg-red-500' : tokenPercent > 60 ? 'bg-amber-500' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'}`}
                style={{ width: `${tokenPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 tabular-nums">{formatTokens(totalTokens)}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 group animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === 'user' ?'bg-gradient-to-br from-violet-500 to-fuchsia-500' :'bg-zinc-800 border border-zinc-700'
            }`}>
              {msg.role === 'user'
                ? <User size={13} className="text-white" />
                : <Bot size={13} className="text-violet-400" />
              }
            </div>

            {/* Bubble */}
            <div className={`flex flex-col gap-1 max-w-[calc(100%-48px)] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-3 py-2.5 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user' ?'bg-violet-600/20 border border-violet-600/25 text-zinc-200 rounded-tr-sm' :'bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 rounded-tl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="space-y-1">
                    {msg.content.split('\n').map((line, i) => {
                      if (line.startsWith('•')) {
                        return (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                            <span dangerouslySetInnerHTML={{ __html: line.replace('• ', '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100 font-600">$1</strong>') }} />
                          </div>
                        );
                      }
                      return (
                        <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100 font-600">$1</strong>') }} />
                      );
                    })}
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>

              {/* Meta row */}
              <div className={`flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <span className="text-[10px] text-zinc-600 tabular-nums">{mounted ? formatTime(msg.timestamp) : ''}</span>
                {msg.tokenCount && (
                  <span className="text-[10px] text-zinc-700 tabular-nums">{formatTokens(msg.tokenCount)} tokens</span>
                )}
                {msg.filesGenerated && (
                  <span className="text-[10px] text-violet-600 tabular-nums">{msg.filesGenerated} files</span>
                )}
                <button
                  onClick={() => handleCopy(msg.content)}
                  className="p-0.5 rounded hover:bg-zinc-700 text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Copy message"
                >
                  <Copy size={10} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Generating indicator */}
        {status === 'generating' && (
          <div className="flex gap-2.5 animate-fade-in">
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot size={13} className="text-violet-400" />
            </div>
            <div className="px-3 py-2.5 rounded-xl rounded-tl-sm bg-zinc-800/80 border border-zinc-700/60">
              <div className="flex items-center gap-2">
                <Loader2 size={12} className="text-violet-400 animate-spin" />
                <span className="text-xs text-zinc-400 token-pulse">Generating code…</span>
              </div>
              <div className="flex gap-1 mt-2">
                {['CartSidebar.tsx', 'CheckoutSummary.tsx'].map((f, i) => (
                  <span key={i} className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-700/60 text-zinc-400">{f}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Notion context chips */}
      {notionContext.length > 0 && (
        <div className="flex-shrink-0 px-4 pt-2 pb-1 flex flex-wrap gap-1.5">
          {notionContext.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-violet-600/10 border border-violet-500/25 text-[11px] text-violet-300"
            >
              <span className="truncate max-w-[120px]">{item.title}</span>
              <span className="text-violet-600 capitalize text-[9px]">{item.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick prompts */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-zinc-800/40">
        <div className="flex gap-1.5 flex-wrap">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="px-2 py-1 text-[11px] rounded-md bg-zinc-800/80 text-zinc-500 hover:bg-zinc-700/80 hover:text-zinc-300 border border-zinc-700/60 transition-all duration-150"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2">
        <div className={`relative flex items-end gap-2 bg-zinc-900/80 border rounded-xl p-2.5 transition-all duration-200 ${
          status === 'generating' ?'border-violet-600/30 shadow-glow-sm' :'border-zinc-700/60 hover:border-zinc-600/60 focus-within:border-violet-600/50 focus-within:shadow-glow-sm'
        }`}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={rows}
            placeholder={status === 'generating' ? 'Generating…' : 'Describe what to build or refine…'}
            disabled={status === 'generating'}
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed min-h-[20px] max-h-[120px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status === 'generating'}
            className="flex-shrink-0 w-8 h-8 rounded-lg btn-glam flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none transition-all duration-150"
            aria-label="Send message"
          >
            {status === 'generating'
              ? <Loader2 size={14} className="text-white animate-spin" />
              : <Send size={14} className="text-white" />
            }
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5 px-0.5">
          <span className="text-[10px] text-zinc-700">Enter to send · Shift+Enter for newline</span>
          <span className="text-[10px] text-zinc-700 tabular-nums">{input.length} chars</span>
        </div>
      </div>
    </div>
  );
}