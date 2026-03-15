'use client';

import { useState, useEffect, useRef } from 'react';
import PromptPanel from './PromptPanel';
import FileOutputPanel from './FileOutputPanel';
import GeneratorStatusBar from './GeneratorStatusBar';
import LivePreviewSandbox from './LivePreviewSandbox';
import ProjectMemoryPanel from './ProjectMemoryPanel';
import CollaborationPanel from './CollaborationPanel';
import NotionContextSelector, { NotionContextItem } from './NotionContextSelector';
import { Eye, EyeOff, Save, Check, AlertCircle, RefreshCw, Clock, Brain, Users, Key } from 'lucide-react';
import { toast } from 'sonner';
import { projectService } from '@/lib/services/projectService';
import { projectMemoryService, ProjectMemory } from '@/lib/services/projectMemoryService';
import { useChat } from '@/lib/hooks/useChat.ts';

export type GenerationStatus = 'idle' | 'generating' | 'complete' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokenCount?: number;
  filesGenerated?: number;
}

export interface GeneratedFile {
  path: string;
  language: string;
  content: string;
  isNew?: boolean;
  isModified?: boolean;
  size: number;
}

export type ModelOption = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-4.1';

const BASE_SYSTEM_PROMPT = `You are an expert code generation assistant. When the user describes a feature or component, generate complete, production-ready code files.

Format your response as follows:
1. Start with a brief explanation of what you built (2-4 sentences).
2. Then list each file using this exact format:

\`\`\`tsx path=src/components/ComponentName.tsx
// file content here
\`\`\`

Rules:
- Always use the path= annotation in code blocks
- Generate complete, working TypeScript/React code with proper imports
- Use Tailwind CSS for styling
- Include TypeScript interfaces
- Make code production-ready and well-structured`;

function buildSystemPrompt(memory: ProjectMemory | null): string {
  return BASE_SYSTEM_PROMPT + projectMemoryService.buildContextString(memory);
}

function extractFilesFromResponse(content: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const codeBlockRegex = /```(\w+)\s+path=([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const lang = match[1];
    const path = match[2].trim();
    const code = match[3].trim();
    files.push({
      path,
      language: lang,
      content: code,
      isNew: true,
      isModified: false,
      size: new Blob([code]).size,
    });
  }
  return files;
}

function extractExplanation(content: string): string {
  return content.replace(/```[\s\S]*?```/g, '').trim();
}

type SidePanel = 'memory' | 'collaboration' | null;

export default function AIGeneratorWorkspace() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [model, setModel] = useState<ModelOption>('gpt-4o-mini');
  const [totalTokens, setTotalTokens] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [lastGenTime, setLastGenTime] = useState('—');
  const [errorInfo, setErrorInfo] = useState<{ message: string; isRateLimit: boolean; retryAfter?: number } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [projectMemory, setProjectMemory] = useState<ProjectMemory | null>(null);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [notionContext, setNotionContext] = useState<NotionContextItem[]>([]);

  const genStartRef = useRef<number>(0);
  const pendingUserMsgRef = useRef<Message | null>(null);
  const lastPromptRef = useRef<string>('');
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([
    { role: 'system', content: BASE_SYSTEM_PROMPT },
  ]);

  const { response, fullResponse, isLoading, error, sendMessage } = useChat(
    'OPEN_AI',
    model,
    false
  );

  // Rebuild system prompt whenever memory changes
  useEffect(() => {
    const newSystemPrompt = buildSystemPrompt(projectMemory);
    conversationHistoryRef.current[0] = { role: 'system', content: newSystemPrompt };
  }, [projectMemory]);

  // Handle error from OpenAI
  useEffect(() => {
    if (error) {
      const msg = error.message || 'Generation failed. Please try again.';
      const isRateLimit = msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('429');
      const retryAfterMatch = msg.match(/retry after (\d+)/i);
      const retryAfter = retryAfterMatch ? parseInt(retryAfterMatch[1]) : isRateLimit ? 30 : undefined;

      setErrorInfo({ message: msg, isRateLimit, retryAfter });
      setStatus('error');

      if (pendingUserMsgRef.current) {
        conversationHistoryRef.current.pop();
        pendingUserMsgRef.current = null;
      }

      if (isRateLimit && retryAfter) {
        setRetryCountdown(retryAfter);
        retryTimerRef.current = setInterval(() => {
          setRetryCountdown(prev => {
            if (prev <= 1) {
              if (retryTimerRef.current) clearInterval(retryTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      toast.error(isRateLimit ? 'Rate limit reached' : 'Generation failed', {
        description: isRateLimit ? 'OpenAI is throttling requests. Use the retry button when ready.' : msg,
      });
    }
    return () => {
      if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    };
  }, [error]);

  // Handle completed response
  useEffect(() => {
    if (!isLoading && response && pendingUserMsgRef.current) {
      const elapsed = ((Date.now() - genStartRef.current) / 1000).toFixed(1);
      setLastGenTime(`${elapsed}s`);

      let tokenCount = 0;
      if (fullResponse && typeof fullResponse === 'object' && !Array.isArray(fullResponse)) {
        const usage = (fullResponse as any)?.usage;
        if (usage?.total_tokens) {
          tokenCount = usage.total_tokens;
          setTotalTokens(prev => prev + tokenCount);
        }
      } else if (Array.isArray(fullResponse) && fullResponse.length > 0) {
        // Streaming mode: usage is in the final chunk (enabled via stream_options.include_usage)
        const lastChunk = fullResponse[fullResponse.length - 1];
        const usage = lastChunk?.usage;
        if (usage?.total_tokens) {
          tokenCount = usage.total_tokens;
          setTotalTokens(prev => prev + tokenCount);
        }
      }

      const newFiles = extractFilesFromResponse(response);
      const explanation = extractExplanation(response);

      if (newFiles.length > 0) {
        setFiles(prev => {
          const existingPaths = new Set(prev.map(f => f.path));
          const updated = prev.map(f => {
            const newVersion = newFiles.find(nf => nf.path === f.path);
            if (newVersion) return { ...newVersion, isNew: false, isModified: true };
            return f;
          });
          const brandNew = newFiles.filter(nf => !existingPaths.has(nf.path));
          const merged = [...updated, ...brandNew];
          if (brandNew.length > 0) setSelectedFile(brandNew[0]);
          return merged;
        });
      }

      const assistantMsg: Message = {
        id: String(Date.now()),
        role: 'assistant',
        content: explanation || response,
        timestamp: new Date(),
        tokenCount: tokenCount || undefined,
        filesGenerated: newFiles.length || undefined,
      };

      setMessages(prev => [...prev, assistantMsg]);
      conversationHistoryRef.current.push({ role: 'assistant', content: response });
      pendingUserMsgRef.current = null;
      setStatus('complete');
    }
  }, [isLoading, response, fullResponse]);

  const handleSendMessage = (content: string) => {
    lastPromptRef.current = content;
    setErrorInfo(null);
    setRetryCountdown(0);
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);

    // Append Notion context to the user message if any items are selected
    let enrichedContent = content;
    if (notionContext.length > 0) {
      const contextBlocks = notionContext
        .map(item => `--- Notion ${item.type === 'database' ? 'Database' : 'Page'}: ${item.title} ---\n${item.content}`)
        .join('\n\n');
      enrichedContent = `${content}\n\n[Notion Context]\n${contextBlocks}`;
    }

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    pendingUserMsgRef.current = userMsg;
    setMessages(prev => [...prev, userMsg]);
    setStatus('generating');
    genStartRef.current = Date.now();

    conversationHistoryRef.current.push({ role: 'user', content: enrichedContent });

    sendMessage(
      conversationHistoryRef.current as Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
      { max_completion_tokens: 4096 }
    );
  };

  const handleRetry = () => {
    if (!lastPromptRef.current || retryCountdown > 0) return;
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === 'user' && last.content === lastPromptRef.current) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    handleSendMessage(lastPromptRef.current);
  };

  const handleSaveProject = async () => {
    if (messages.length === 0) {
      toast.error('Nothing to save yet. Generate some code first!');
      return;
    }

    const projectName = messages[0]?.content?.slice(0, 40) || 'ai-generated-project';
    const generationHistory = messages
      .filter(m => m.role === 'user')
      .map(m => {
        const response = messages.find((r, ri) => r.role === 'assistant' && ri > messages.indexOf(m));
        return {
          id: `hist_${m.id}`,
          prompt: m.content,
          response: response?.content ?? '',
          filesGenerated: response?.filesGenerated ?? 0,
          tokenCount: (m.tokenCount ?? 0) + (response?.tokenCount ?? 0),
          timestamp: m.timestamp.toISOString(),
          model,
        };
      });

    const projectFiles = files.map(f => ({
      path: f.path,
      language: f.language,
      content: f.content,
      size: f.size,
    }));

    if (savedProjectId) {
      const updated = await projectService.update(savedProjectId, {
        files: projectFiles,
        totalTokens,
        model,
        generationHistory,
        status: 'published',
      });
      if (updated) {
        toast.success('Project updated');
      } else {
        toast.error('Failed to update project');
        return;
      }
    } else {
      const saved = await projectService.save({
        name: projectName,
        description: messages[0]?.content?.slice(0, 120) ?? '',
        prompt: messages[0]?.content ?? '',
        model,
        totalTokens,
        files: projectFiles,
        generationHistory,
        tags: ['react', 'tailwind', 'ai-generated'],
        status: 'published',
      });
      if (saved) {
        setSavedProjectId(saved.id);
        toast.success('Project saved!', {
          description: 'View it in Saved Projects',
          action: { label: 'View', onClick: () => window.open('/saved-projects', '_blank') },
        });
      } else {
        toast.error('Failed to save project. Make sure you are signed in.');
        return;
      }
    }

    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  };

  const toggleSidePanel = (panel: SidePanel) => {
    setSidePanel(prev => prev === panel ? null : panel);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 stone-editor-bg">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60 bg-zinc-900/50 flex-shrink-0 travertine-panel">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${status === 'generating' ? 'bg-violet-500 status-pulse' : status === 'complete' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-zinc-600'}`} />
            <span className="text-sm font-600 text-zinc-200">AI Code Generator</span>
          </div>
          <span className="text-zinc-700">·</span>
          <span className="text-xs text-zinc-500 font-mono">OpenAI</span>
          {projectMemory && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1 text-[10px] text-violet-400">
                <Brain size={10} />
                Memory active
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ModelOption)}
            disabled={status === 'generating'}
            className="text-xs bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-zinc-300 focus:outline-none focus:border-violet-600/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="gpt-4o-mini">GPT-4o mini</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="gpt-4.1">GPT-4.1</option>
          </select>

          {/* Project Memory toggle */}
          <button
            onClick={() => toggleSidePanel('memory')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-600 border transition-all duration-200 ${
              sidePanel === 'memory' ?'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-glow-sm' :'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
            }`}
            title="Project Memory"
          >
            <Brain size={12} />
            <span>Memory</span>
          </button>

          {/* Team Collaboration toggle */}
          <button
            onClick={() => toggleSidePanel('collaboration')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-600 border transition-all duration-200 ${
              sidePanel === 'collaboration' ?'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-glow-sm' :'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
            }`}
            title="Team Collaboration"
          >
            <Users size={12} />
            <span>Team</span>
          </button>

          {/* Save button */}
          <button
            onClick={handleSaveProject}
            disabled={status === 'generating' || messages.length === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-600 border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
              justSaved
                ? 'bg-green-600/20 border-green-500/40 text-green-300'
                : savedProjectId
                ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600' :'bg-violet-600/20 border-violet-500/40 text-violet-300 hover:bg-violet-600/30'
            }`}
            title={savedProjectId ? 'Update saved project' : 'Save project'}
          >
            {justSaved ? <Check size={12} /> : <Save size={12} />}
            <span>{justSaved ? 'Saved!' : savedProjectId ? 'Update' : 'Save'}</span>
          </button>

          {/* Live Preview toggle */}
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-600 border transition-all duration-200 ${
              showPreview
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-glow-sm'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
            }`}
            title={showPreview ? 'Hide live preview' : 'Show live preview'}
          >
            {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Demo API Key Banner */}
      {showDemoBanner && (
        <div className="flex items-center gap-3 mx-4 mt-3 px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25 flex-shrink-0">
          <Key size={13} className="text-violet-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-violet-300 font-600">Demo API Key:</span>
            <code className="text-xs font-mono text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 rounded select-all">sk-demo-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code>
            <span className="text-[11px] text-zinc-500">— For testing only. Replace with your own key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">platform.openai.com</a></span>
          </div>
          <button
            onClick={() => setShowDemoBanner(false)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0 text-lg leading-none"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Error banner */}
      {status === 'error' && errorInfo && (
        <div className="flex items-start gap-3 mx-4 mt-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/25 flex-shrink-0">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-300 leading-relaxed">{errorInfo.message}</p>
            {errorInfo.isRateLimit && retryCountdown > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Clock size={11} className="text-amber-400" />
                <span className="text-xs text-amber-400 tabular-nums">Auto-retry available in {retryCountdown}s</span>
              </div>
            )}
          </div>
          <button
            onClick={handleRetry}
            disabled={retryCountdown > 0 || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-600 bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
            {retryCountdown > 0 ? `Retry in ${retryCountdown}s` : 'Retry'}
          </button>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat panel */}
        <PromptPanel
          messages={messages}
          status={status}
          totalTokens={totalTokens}
          model={model}
          onSendMessage={handleSendMessage}
          notionContext={notionContext}
          onNotionContextChange={setNotionContext}
        />

        {/* Divider */}
        <div className="w-px bg-zinc-800/60 flex-shrink-0" />

        {/* Center: File output panel */}
        <FileOutputPanel
          files={files}
          selectedFile={selectedFile || (files[0] ?? null)}
          onSelectFile={setSelectedFile}
          status={status}
        />

        {/* Live Preview Sandbox */}
        {showPreview && (
          <>
            <div className="w-px bg-zinc-800/60 flex-shrink-0" />
            <LivePreviewSandbox files={files} status={status} />
          </>
        )}

        {/* Right: Project Memory Panel */}
        {sidePanel === 'memory' && (
          <>
            <div className="w-px bg-zinc-800/60 flex-shrink-0" />
            <div className="w-72 xl:w-80 flex-shrink-0 bg-zinc-950 border-l border-zinc-800/40 overflow-hidden">
              <ProjectMemoryPanel
                appId={savedProjectId}
                onMemoryChange={setProjectMemory}
              />
            </div>
          </>
        )}

        {/* Right: Collaboration Panel */}
        {sidePanel === 'collaboration' && (
          <>
            <div className="w-px bg-zinc-800/60 flex-shrink-0" />
            <div className="w-72 xl:w-80 flex-shrink-0 bg-zinc-950 border-l border-zinc-800/40 overflow-hidden">
              <CollaborationPanel
                appId={savedProjectId}
                selectedFilePath={selectedFile?.path}
              />
            </div>
          </>
        )}
      </div>

      {/* Status bar */}
      <GeneratorStatusBar
        status={status}
        model={model}
        totalTokens={totalTokens}
        fileCount={files.length}
        lastGenTime={lastGenTime}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(p => !p)}
      />
    </div>
  );
}