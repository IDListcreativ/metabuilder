'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink, Loader2, Play, Maximize2, Minimize2 } from 'lucide-react';
import { GeneratedFile, GenerationStatus } from './AIGeneratorWorkspace';

interface LivePreviewSandboxProps {
  files: GeneratedFile[];
  status: GenerationStatus;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_CONFIG: Record<DeviceMode, { width: string; label: string; icon: React.ReactNode }> = {
  desktop: { width: '100%', label: 'Desktop', icon: <Monitor size={13} /> },
  tablet: { width: '768px', label: 'Tablet', icon: <Tablet size={13} /> },
  mobile: { width: '375px', label: 'Mobile', icon: <Smartphone size={13} /> },
};

const ENTRY_CANDIDATES = [
  'src/App.tsx',
  'src/App.jsx',
  'App.tsx',
  'App.jsx',
  'src/app/page.tsx',
  'src/app/page.jsx',
  'app/page.tsx',
  'app/page.jsx',
  'src/main.tsx',
  'src/main.jsx',
  'main.tsx',
  'main.jsx',
  'src/index.tsx',
  'src/index.jsx',
  'index.tsx',
  'index.jsx',
];

const CODE_EXTENSIONS = new Set(['tsx', 'ts', 'jsx', 'js']);
const STYLE_EXTENSIONS = new Set(['css', 'scss', 'sass', 'less']);

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function getExtension(path: string): string {
  const fileName = normalizePath(path).split('/').pop() ?? '';
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? '' : fileName.slice(lastDot + 1).toLowerCase();
}

function isCodeFile(file: GeneratedFile): boolean {
  return CODE_EXTENSIONS.has(getExtension(file.path));
}

function isStyleFile(file: GeneratedFile): boolean {
  return STYLE_EXTENSIONS.has(getExtension(file.path));
}

function hasDefaultExport(content: string): boolean {
  return /export\s+default\s+/m.test(content);
}

function getEntryFile(files: GeneratedFile[]): string | null {
  const normalizedFiles = files
    .filter(isCodeFile)
    .map((file) => ({ ...file, path: normalizePath(file.path) }));

  for (const candidate of ENTRY_CANDIDATES) {
    const match = normalizedFiles.find((file) => file.path === candidate);
    if (match) return match.path;
  }

  const appLike = normalizedFiles.find(
    (file) => /(^|\/)(App|page|index)\.(tsx|ts|jsx|js)$/i.test(file.path) && hasDefaultExport(file.content)
  );
  if (appLike) return appLike.path;

  const defaultExport = normalizedFiles.find((file) => hasDefaultExport(file.content));
  if (defaultExport) return defaultExport.path;

  return normalizedFiles[0]?.path ?? null;
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function buildPreviewHTML(files: GeneratedFile[]): string {
  const codeFiles = files
    .filter(isCodeFile)
    .map((file) => ({
      path: normalizePath(file.path),
      content: file.content,
    }));

  const styleBundle = files
    .filter(isStyleFile)
    .map((file) => `/* ${normalizePath(file.path)} */\n${file.content}`)
    .join('\n\n');

  const entryFile = getEntryFile(files);
  const fileMap = Object.fromEntries(codeFiles.map((file) => [file.path, file.content]));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Live Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #root { min-height: 100%; }
    body {
      margin: 0;
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
      color: #111827;
    }
    .preview-shell {
      min-height: 100vh;
      padding: 24px;
    }
    .preview-card {
      max-width: 880px;
      margin: 0 auto;
      padding: 24px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(148, 163, 184, 0.25);
      box-shadow: 0 30px 80px rgba(15, 23, 42, 0.12);
      backdrop-filter: blur(14px);
    }
    .preview-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: #4338ca;
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.18);
    }
    .preview-title {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.15;
      margin: 18px 0 10px;
      color: #0f172a;
    }
    .preview-copy {
      font-size: 14px;
      line-height: 1.7;
      color: #475569;
      margin: 0;
    }
    .preview-code {
      margin-top: 18px;
      padding: 16px;
      border-radius: 18px;
      background: #0f172a;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12px;
      line-height: 1.6;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script id="preview-files" type="application/json">${serializeForScript(fileMap)}</script>
  <script id="preview-entry" type="application/json">${serializeForScript(entryFile)}</script>
  <script id="preview-styles" type="application/json">${serializeForScript(styleBundle)}</script>
  <script>
    (function () {
      const files = JSON.parse(document.getElementById('preview-files').textContent || '{}');
      const entryFile = JSON.parse(document.getElementById('preview-entry').textContent || 'null');
      const inlineStyles = JSON.parse(document.getElementById('preview-styles').textContent || '""');
      const root = document.getElementById('root');
      const ReactRef = window.React;
      const ReactDOMRef = window.ReactDOM;
      const BabelRef = window.Babel;

      function normalizePath(path) {
        return String(path || '').replace(/\\\\/g, '/').replace(/^\\.\\//, '').replace(/^\\/+/, '');
      }

      function getExtension(path) {
        const normalized = normalizePath(path);
        const fileName = normalized.split('/').pop() || '';
        const index = fileName.lastIndexOf('.');
        return index === -1 ? '' : fileName.slice(index + 1).toLowerCase();
      }

      function dirname(path) {
        const normalized = normalizePath(path);
        const pieces = normalized.split('/');
        pieces.pop();
        return pieces.join('/');
      }

      function joinPath(baseDir, relativePath) {
        const stack = (baseDir ? baseDir.split('/') : []).filter(Boolean);
        const parts = normalizePath(relativePath).split('/');
        for (const part of parts) {
          if (!part || part === '.') continue;
          if (part === '..') stack.pop();
          else stack.push(part);
        }
        return stack.join('/');
      }

      function resolveFile(candidate) {
        const normalized = normalizePath(candidate);
        const fileCandidates = [
          normalized,
          normalized + '.tsx',
          normalized + '.ts',
          normalized + '.jsx',
          normalized + '.js',
          normalized + '/index.tsx',
          normalized + '/index.ts',
          normalized + '/index.jsx',
          normalized + '/index.js',
        ];

        for (const current of fileCandidates) {
          if (Object.prototype.hasOwnProperty.call(files, current)) {
            return current;
          }
        }
        return null;
      }

      function resolveImport(fromFile, request) {
        const cleaned = String(request || '').split('?')[0].split('#')[0];

        if (/\\.(css|scss|sass|less)$/.test(cleaned)) {
          return cleaned;
        }

        if (cleaned.startsWith('@/')) {
          return resolveFile('src/' + cleaned.slice(2));
        }

        if (cleaned.startsWith('/')) {
          return resolveFile(cleaned.slice(1));
        }

        if (cleaned.startsWith('.')) {
          return resolveFile(joinPath(dirname(fromFile), cleaned));
        }

        return cleaned;
      }

      function flattenClasses(values) {
        return values
          .flat(Infinity)
          .filter(Boolean)
          .join(' ');
      }

      function createIconStub(name) {
        return function IconStub(props) {
          const nextProps = Object.assign({}, props || {});
          const children = nextProps.children || name;
          delete nextProps.children;
          nextProps.style = Object.assign(
            {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '1.25rem',
              minHeight: '1.25rem',
              borderRadius: '999px',
              border: '1px solid rgba(148, 163, 184, 0.45)',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#475569',
              background: 'rgba(255,255,255,0.75)',
              padding: '0.15rem 0.35rem',
            },
            nextProps.style || {}
          );
          return ReactRef.createElement('span', nextProps, children);
        };
      }

      const iconProxy = new Proxy({ __esModule: true }, {
        get(target, prop) {
          if (prop in target) return target[prop];
          return createIconStub(String(prop));
        }
      });

      const motionProxy = new Proxy({}, {
        get(_target, prop) {
          return function MotionStub(props) {
            const element = typeof prop === 'string' ? prop : 'div';
            return ReactRef.createElement(element, props, props && props.children);
          };
        }
      });

      const toastStub = new Proxy({}, {
        get() {
          return function noop() {};
        }
      });

      const nextLink = { __esModule: true, default: function Link(props) {
        const nextProps = Object.assign({}, props || {});
        const href = nextProps.href || '#';
        delete nextProps.href;
        return ReactRef.createElement('a', Object.assign({ href }, nextProps), nextProps.children);
      } };

      const nextImage = { __esModule: true, default: function Image(props) {
        const nextProps = Object.assign({}, props || {});
        const src = typeof nextProps.src === 'string'
          ? nextProps.src
          : (nextProps.src && nextProps.src.src) || '';
        return ReactRef.createElement('img', Object.assign({}, nextProps, { src, alt: nextProps.alt || '' }));
      } };

      const nextNavigation = {
        useRouter() {
          return {
            push() {},
            replace() {},
            refresh() {},
            back() {},
            forward() {},
            prefetch() { return Promise.resolve(); },
          };
        },
        usePathname() {
          return '/';
        },
        useSearchParams() {
          return new URLSearchParams();
        },
      };

      const externalModules = {
        react: ReactRef,
        'react-dom': ReactDOMRef,
        'react-dom/client': {
          createRoot: ReactDOMRef.createRoot
            ? ReactDOMRef.createRoot.bind(ReactDOMRef)
            : function createRoot(container) {
                return {
                  render(node) {
                    ReactDOMRef.render(node, container);
                  },
                };
              },
        },
        'lucide-react': iconProxy,
        '@heroicons/react/24/outline': iconProxy,
        '@heroicons/react/24/solid': iconProxy,
        'framer-motion': { motion: motionProxy, AnimatePresence: function AnimatePresence(props) {
          return ReactRef.createElement(ReactRef.Fragment, null, props && props.children);
        } },
        sonner: { toast: toastStub, Toaster: function Toaster() { return null; } },
        clsx: function clsx() { return flattenClasses(Array.from(arguments)); },
        classnames: function classnames() { return flattenClasses(Array.from(arguments)); },
        'tailwind-merge': { twMerge: function twMerge() { return flattenClasses(Array.from(arguments)); } },
        'next/link': nextLink,
        'next/image': nextImage,
        'next/navigation': nextNavigation,
      };

      const moduleCache = {};

      function renderMessage(title, message, detail) {
        root.innerHTML =
          '<div class="preview-shell">' +
            '<div class="preview-card">' +
              '<div class="preview-badge">Live Preview</div>' +
              '<h1 class="preview-title">' + title + '</h1>' +
              '<p class="preview-copy">' + message + '</p>' +
              (detail ? '<pre class="preview-code">' + detail.replace(/[<>&]/g, function (char) {
                return char === '<' ? '&lt;' : char === '>' ? '&gt;' : '&amp;';
              }) + '</pre>' : '') +
            '</div>' +
          '</div>';
      }

      function requireModule(request, fromFile) {
        const resolved = resolveImport(fromFile, request);

        if (/\\.(css|scss|sass|less)$/.test(resolved)) {
          return {};
        }

        if (Object.prototype.hasOwnProperty.call(externalModules, resolved)) {
          return externalModules[resolved];
        }

        if (Object.prototype.hasOwnProperty.call(externalModules, request)) {
          return externalModules[request];
        }

        if (!resolved || !Object.prototype.hasOwnProperty.call(files, resolved)) {
          throw new Error('Missing dependency "' + request + '" imported from ' + fromFile + '.');
        }

        return loadModule(resolved);
      }

      function loadModule(filePath) {
        const normalized = normalizePath(filePath);
        if (moduleCache[normalized]) {
          return moduleCache[normalized].exports;
        }

        const source = files[normalized];
        if (typeof source !== 'string') {
          throw new Error('Preview could not find file "' + normalized + '".');
        }

        if (!BabelRef || !BabelRef.availablePlugins || !BabelRef.availablePlugins['transform-modules-commonjs']) {
          throw new Error('Preview compiler plugin "transform-modules-commonjs" failed to load.');
        }

        const module = { exports: {} };
        moduleCache[normalized] = module;

        const compiled = BabelRef.transform(source, {
          filename: normalized,
          presets: [
            ['typescript', { allExtensions: true, isTSX: true }],
            ['react', { runtime: 'classic' }],
          ],
          plugins: ['transform-modules-commonjs'],
          sourceType: 'module',
        }).code;

        const evaluator = new Function('require', 'module', 'exports', compiled);
        evaluator(function localRequire(request) {
          return requireModule(request, normalized);
        }, module, module.exports);

        return module.exports;
      }

      class PreviewErrorBoundary extends ReactRef.Component {
        constructor(props) {
          super(props);
          this.state = { error: null };
        }

        static getDerivedStateFromError(error) {
          return { error: error instanceof Error ? error : new Error(String(error)) };
        }

        render() {
          if (this.state.error) {
            return ReactRef.createElement(
              'div',
              { className: 'preview-shell' },
              ReactRef.createElement(
                'div',
                { className: 'preview-card' },
                ReactRef.createElement('div', { className: 'preview-badge' }, 'Live Preview'),
                ReactRef.createElement('h1', { className: 'preview-title' }, 'Preview crashed while rendering'),
                ReactRef.createElement(
                  'p',
                  { className: 'preview-copy' },
                  'The generated files compiled, but the React tree threw an error during render.'
                ),
                ReactRef.createElement('pre', { className: 'preview-code' }, this.state.error.message || String(this.state.error))
              )
            );
          }
          return this.props.children;
        }
      }

      if (inlineStyles) {
        const styleTag = document.createElement('style');
        styleTag.textContent = inlineStyles;
        document.head.appendChild(styleTag);
      }

      window.addEventListener('error', function (event) {
        if (event && event.error) {
          renderMessage('Preview failed to load', 'The generated code threw an error before React finished rendering.', event.error.message || String(event.error));
        }
      });

      window.addEventListener('unhandledrejection', function (event) {
        if (event && event.reason) {
          renderMessage('Preview failed to load', 'The generated code rejected a promise during startup.', String(event.reason));
        }
      });

      if (!entryFile) {
        renderMessage(
          'No entry file found',
          'The generator returned files, but none looked like an app entry. Create App.tsx, page.tsx, main.tsx, or index.tsx to enable the live preview.'
        );
        return;
      }

      try {
        const entryModule = loadModule(entryFile);
        const Entry =
          entryModule.default ||
          Object.values(entryModule).find(function (value) {
            return typeof value === 'function';
          });

        if (typeof Entry !== 'function') {
          throw new Error('Entry file "' + entryFile + '" does not export a React component.');
        }

        const rootClient = ReactDOMRef.createRoot
          ? ReactDOMRef.createRoot(root)
          : {
              render(node) {
                ReactDOMRef.render(node, root);
              },
            };

        rootClient.render(
          ReactRef.createElement(
            PreviewErrorBoundary,
            null,
            ReactRef.createElement(Entry)
          )
        );
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        renderMessage(
          'Preview unavailable',
          'The generator produced files, but the sandbox could not compile or run them yet. The file tree on the left is still the source of truth.',
          detail
        );
      }
    })();
  </script>
</body>
</html>`;
}

export default function LivePreviewSandbox({ files, status }: LivePreviewSandboxProps) {
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previewHTML, setPreviewHTML] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (files.length > 0) {
      setPreviewHTML(buildPreviewHTML(files));
      setIsLoading(true);
      return;
    }

    setPreviewHTML('');
    setIsLoading(false);
  }, [files, refreshKey]);

  useEffect(() => {
    if (status !== 'complete') return;

    const timer = setTimeout(() => {
      setRefreshKey((current) => current + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [status]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
    setIsLoading(true);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const deviceConfig = DEVICE_CONFIG[device];

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-zinc-950 ${isFullscreen ? 'fixed inset-0 z-50' : 'flex-1 min-w-0'}`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/60 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${status === 'generating' ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[11px] font-600 text-zinc-300">Live Preview</span>
          </div>

          <div className="w-px h-3.5 bg-zinc-700 mx-0.5" />

          <div className="flex items-center gap-0.5 bg-zinc-800/80 rounded-md p-0.5">
            {(Object.keys(DEVICE_CONFIG) as DeviceMode[]).map((currentDevice) => (
              <button
                key={currentDevice}
                onClick={() => setDevice(currentDevice)}
                title={DEVICE_CONFIG[currentDevice].label}
                className={`flex items-center justify-center w-6 h-6 rounded transition-all duration-150 ${
                  device === currentDevice
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {DEVICE_CONFIG[currentDevice].icon}
              </button>
            ))}
          </div>

          <span className="text-[10px] text-zinc-600 font-mono">{deviceConfig.label}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {status === 'generating' && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Loader2 size={9} className="text-amber-400 animate-spin" />
              <span className="text-[10px] text-amber-400">Updating…</span>
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={status === 'generating'}
            title="Refresh preview"
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => {
              const blob = new Blob([previewHTML], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
            }}
            title="Open in new tab"
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ExternalLink size={12} />
          </button>

          <button
            onClick={() => setIsFullscreen((current) => !current)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-900/30 flex items-start justify-center p-3">
        <div
          className="relative bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300 flex-shrink-0"
          style={{
            width: deviceConfig.width,
            maxWidth: '100%',
            minHeight: '100%',
          }}
        >
          {isLoading && previewHTML && (
            <div className="absolute inset-0 bg-zinc-900/80 flex flex-col items-center justify-center z-10 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
              <span className="text-xs text-zinc-400">Rendering preview…</span>
            </div>
          )}

          {previewHTML ? (
            <iframe
              ref={iframeRef}
              key={refreshKey}
              srcDoc={previewHTML}
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              className="w-full border-0"
              style={{ minHeight: '600px', height: '100%', display: 'block' }}
              title="Live Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-96 gap-4 text-zinc-500">
              <Play size={32} className="text-zinc-700" />
              <div className="text-center">
                <p className="text-sm font-500 text-zinc-400">No preview available</p>
                <p className="text-xs text-zinc-600 mt-1">Generate code to see a live preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-t border-zinc-800/40 bg-zinc-900/30 flex-shrink-0">
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-600">
          <span>{files.length} files</span>
          <span>·</span>
          <span>{files.filter((file) => file.language === 'tsx' || file.language === 'jsx').length} components</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Sandbox isolated</span>
        </div>
      </div>
    </div>
  );
}
