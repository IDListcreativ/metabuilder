'use client';

import { useState, useRef, useEffect } from 'react';
import { EditorFile } from './CodeEditorWorkspace';
import { FileCode, Lock } from 'lucide-react';

interface EditorPaneProps {
  file?: EditorFile;
  onCursorChange: (pos: { line: number; col: number }) => void;
  onSave: () => void;
}

// Token-based syntax highlighting
function tokenize(code: string, lang: string): string {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (lang === 'json') {
    html = html
      .replace(/("(?:[^"\\]|\\.)*")\s*:/g, '<span class="text-violet-300">$1</span>:')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="text-green-400">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="text-blue-400">$1</span>')
      .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="text-orange-400">$1</span>');
    return html;
  }

  // TSX/TS/JS
  html = html
    // Comments
    .replace(/(\/\/[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-zinc-500 italic">$1</span>')
    // Keywords
    .replace(/\b(import|export|from|const|let|var|function|return|interface|type|extends|implements|class|default|if|else|for|while|async|await|new|typeof|null|undefined|true|false|void|never|string|number|boolean|readonly|as|in|of|throw|try|catch|finally|switch|case|break|continue|this|super|static|public|private|protected)\b/g, '<span class="text-violet-400">$1</span>')
    // JSX tags
    .replace(/(&lt;\/?)([\w.]+)(\s|&gt;|\/&gt;)/g, '$1<span class="text-blue-300">$2</span>$3')
    // Strings
    .replace(/(`(?:[^`\\]|\\.)*`)/g, '<span class="text-green-400">$1</span>')
    .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-green-400">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>')
    // Numbers
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="text-orange-400">$1</span>')
    // Function calls
    .replace(/\b([a-z_$][a-zA-Z_$0-9]*)(?=\s*\()/g, '<span class="text-yellow-300">$1</span>')
    // Type names (PascalCase)
    .replace(/\b([A-Z][a-zA-Z_$0-9]*)\b/g, '<span class="text-blue-300">$1</span>');

  return html;
}

export default function EditorPane({ file, onCursorChange, onSave }: EditorPaneProps) {
  const [content, setContent] = useState(file?.content || '');
  const [highlightLine, setHighlightLine] = useState<number | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (file) setContent(file.content);
  }, [file?.path]);

  const lines = content.split('\n');
  const lineCount = lines.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      onSave();
    }
    // Tab key → insert 2 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const textBefore = content.substring(0, el.selectionStart);
    const line = textBefore.split('\n').length;
    const lastNewline = textBefore.lastIndexOf('\n');
    const col = el.selectionStart - lastNewline;
    onCursorChange({ line, col });
    setHighlightLine(line);
  };

  const syncScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-zinc-950">
        <FileCode size={36} className="text-zinc-800" />
        <p className="text-sm text-zinc-600">No file open</p>
        <p className="text-xs text-zinc-700">Open a file from the Explorer to start editing</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-zinc-950 relative">
      {/* Gutter: line numbers */}
      <div className="flex-shrink-0 select-none bg-zinc-900/20 border-r border-zinc-800/40 overflow-hidden">
        <div className="py-4 pr-3 pl-4">
          {lines.map((_, i) => (
            <div
              key={i}
              className={`text-[12px] font-mono leading-6 text-right tabular-nums transition-colors ${
                highlightLine === i + 1 ? 'text-violet-400' : 'text-zinc-700'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Editor: stacked textarea + highlighted pre */}
      <div className="flex-1 relative overflow-hidden">
        {/* Syntax-highlighted layer */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 py-4 px-4 text-[13px] font-mono leading-6 overflow-auto pointer-events-none whitespace-pre"
          style={{ tabSize: 2 }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className={`${highlightLine === i + 1 ? 'bg-violet-600/8' : ''}`}
              dangerouslySetInnerHTML={{ __html: tokenize(line, file.language) || '&nbsp;' }}
            />
          ))}
        </pre>

        {/* Editable textarea */}
        <textarea
          ref={editorRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          onScroll={syncScroll}
          readOnly={file.isReadOnly}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="absolute inset-0 w-full h-full py-4 px-4 text-[13px] font-mono leading-6 bg-transparent text-transparent caret-violet-400 resize-none focus:outline-none overflow-auto whitespace-pre"
          style={{ tabSize: 2, caretColor: '#a78bfa' }}
          aria-label={`Edit ${file.path}`}
        />

        {/* Read-only overlay */}
        {file.isReadOnly && (
          <div className="absolute top-2 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60">
            <Lock size={10} className="text-zinc-500" />
            <span className="text-[10px] text-zinc-500">Read only</span>
          </div>
        )}
      </div>
    </div>
  );
}