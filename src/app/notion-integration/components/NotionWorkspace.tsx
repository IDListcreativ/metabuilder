'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Database, Search, RefreshCw, ExternalLink,
  FileText, ChevronRight, ChevronDown, AlertCircle, Loader2,
  Calendar, Clock, Hash, CheckSquare, Type, Link2, X, ArrowLeft,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotionPage {
  id: string;
  object: 'page' | 'database';
  url: string;
  created_time: string;
  last_edited_time: string;
  icon?: { type: string; emoji?: string };
  cover?: { type: string; external?: { url: string } };
  properties: Record<string, NotionProperty>;
  title?: string; // extracted helper
}

interface NotionProperty {
  id: string;
  type: string;
  title?: Array<{ plain_text: string }>;
  rich_text?: Array<{ plain_text: string }>;
  number?: number | null;
  select?: { name: string; color: string } | null;
  multi_select?: Array<{ name: string; color: string }>;
  date?: { start: string; end?: string } | null;
  checkbox?: boolean;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  status?: { name: string; color: string } | null;
  people?: Array<{ name?: string }>;
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface PageDetail {
  page: NotionPage;
  blocks: { results: NotionBlock[] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractTitle(item: NotionPage): string {
  if (!item.properties) return 'Untitled';
  for (const prop of Object.values(item.properties)) {
    if (prop.type === 'title' && prop.title?.length) {
      return prop.title.map((t) => t.plain_text).join('');
    }
  }
  return 'Untitled';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getPropertyIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    title: <Type size={12} />,
    rich_text: <FileText size={12} />,
    number: <Hash size={12} />,
    select: <ChevronRight size={12} />,
    multi_select: <ChevronRight size={12} />,
    date: <Calendar size={12} />,
    checkbox: <CheckSquare size={12} />,
    url: <Link2 size={12} />,
    status: <ChevronRight size={12} />,
  };
  return map[type] ?? <Type size={12} />;
}

function renderPropertyValue(prop: NotionProperty): string {
  switch (prop.type) {
    case 'title': return prop.title?.map((t) => t.plain_text).join('') || '—';
    case 'rich_text': return prop.rich_text?.map((t) => t.plain_text).join('') || '—';
    case 'number': return prop.number != null ? String(prop.number) : '—';
    case 'select': return prop.select?.name || '—';
    case 'multi_select': return prop.multi_select?.map((s) => s.name).join(', ') || '—';
    case 'date': return prop.date?.start ? formatDate(prop.date.start) : '—';
    case 'checkbox': return prop.checkbox ? '✓' : '✗';
    case 'url': return prop.url || '—';
    case 'email': return prop.email || '—';
    case 'phone_number': return prop.phone_number || '—';
    case 'status': return prop.status?.name || '—';
    case 'people': return prop.people?.map((p) => p.name || 'User').join(', ') || '—';
    default: return '—';
  }
}

function renderBlock(block: NotionBlock): React.ReactNode {
  const getText = (key: string): string => {
    const data = block[key] as { rich_text?: Array<{ plain_text: string }> } | undefined;
    return data?.rich_text?.map((t) => t.plain_text).join('') || '';
  };

  switch (block.type) {
    case 'paragraph':
      return <p className="text-zinc-300 text-sm leading-relaxed mb-2">{getText('paragraph') || <span className="text-zinc-600">Empty paragraph</span>}</p>;
    case 'heading_1':
      return <h1 className="text-xl font-700 text-zinc-100 mt-4 mb-2">{getText('heading_1')}</h1>;
    case 'heading_2':
      return <h2 className="text-lg font-600 text-zinc-100 mt-3 mb-2">{getText('heading_2')}</h2>;
    case 'heading_3':
      return <h3 className="text-base font-600 text-zinc-200 mt-2 mb-1">{getText('heading_3')}</h3>;
    case 'bulleted_list_item':
      return <li className="text-zinc-300 text-sm ml-4 mb-1 list-disc">{getText('bulleted_list_item')}</li>;
    case 'numbered_list_item':
      return <li className="text-zinc-300 text-sm ml-4 mb-1 list-decimal">{getText('numbered_list_item')}</li>;
    case 'to_do': {
      const todo = block['to_do'] as { checked?: boolean; rich_text?: Array<{ plain_text: string }> } | undefined;
      return (
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${todo?.checked ? 'bg-violet-600 border-violet-600' : 'border-zinc-600'}`}>
            {todo?.checked && <span className="text-white text-[10px]">✓</span>}
          </div>
          <span className={`text-sm ${todo?.checked ? 'line-through text-zinc-500' : 'text-zinc-300'}`}>
            {todo?.rich_text?.map((t) => t.plain_text).join('') || ''}
          </span>
        </div>
      );
    }
    case 'code': {
      const code = block['code'] as { rich_text?: Array<{ plain_text: string }>; language?: string } | undefined;
      return (
        <pre className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 mb-3 overflow-x-auto">
          <code className="text-fuchsia-300 text-xs font-mono">{code?.rich_text?.map((t) => t.plain_text).join('') || ''}</code>
        </pre>
      );
    }
    case 'quote': {
      const quote = block['quote'] as { rich_text?: Array<{ plain_text: string }> } | undefined;
      return (
        <blockquote className="border-l-2 border-violet-500 pl-3 mb-2 text-zinc-400 text-sm italic">
          {quote?.rich_text?.map((t) => t.plain_text).join('') || ''}
        </blockquote>
      );
    }
    case 'divider':
      return <hr className="border-zinc-700 my-3" />;
    case 'callout': {
      const callout = block['callout'] as { rich_text?: Array<{ plain_text: string }>; icon?: { emoji?: string } } | undefined;
      return (
        <div className="flex gap-2 bg-zinc-800/60 border border-zinc-700 rounded-lg p-3 mb-2">
          <span className="text-base">{callout?.icon?.emoji || '💡'}</span>
          <p className="text-zinc-300 text-sm">{callout?.rich_text?.map((t) => t.plain_text).join('') || ''}</p>
        </div>
      );
    }
    default:
      return <p className="text-zinc-600 text-xs italic mb-1">[{block.type} block]</p>;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ color, label }: { color: string; label: string }) {
  const colorMap: Record<string, string> = {
    default: 'bg-zinc-700 text-zinc-300',
    gray: 'bg-zinc-700 text-zinc-300',
    brown: 'bg-amber-900/40 text-amber-400',
    orange: 'bg-orange-900/40 text-orange-400',
    yellow: 'bg-yellow-900/40 text-yellow-400',
    green: 'bg-green-900/40 text-green-400',
    blue: 'bg-blue-900/40 text-blue-400',
    purple: 'bg-violet-900/40 text-violet-400',
    pink: 'bg-pink-900/40 text-pink-400',
    red: 'bg-red-900/40 text-red-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-500 ${colorMap[color] || colorMap.default}`}>
      {label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotionWorkspace() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'page' | 'database'>('all');
  const [results, setResults] = useState<NotionPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<NotionPage | null>(null);
  const [pageDetail, setPageDetail] = useState<PageDetail | null>(null);
  const [dbRows, setDbRows] = useState<NotionPage[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [expandedProps, setExpandedProps] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const doSearch = useCallback(async (q: string, f: typeof filter) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);

    const body: Record<string, unknown> = {
      sort: { timestamp: 'last_edited_time', direction: 'descending' },
      page_size: 20,
    };
    if (q.trim()) body.query = q.trim();
    if (f !== 'all') body.filter = { property: 'object', value: f };

    try {
      const res = await fetch('/api/notion/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      const items: NotionPage[] = (data.results || []).map((item: NotionPage) => ({
        ...item,
        title: extractTitle(item),
      }));
      setResults(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    doSearch('', 'all');
  }, [doSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query, filter);
  };

  const handleFilterChange = (f: typeof filter) => {
    setFilter(f);
    doSearch(query, f);
  };

  const openItem = async (item: NotionPage) => {
    setSelectedItem(item);
    setPageDetail(null);
    setDbRows(null);
    setDetailError(null);
    setDetailLoading(true);
    setExpandedProps(false);

    try {
      if (item.object === 'database') {
        const res = await fetch(`/api/notion/database/${item.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to query database');
        const rows: NotionPage[] = (data.results || []).map((r: NotionPage) => ({
          ...r,
          title: extractTitle(r),
        }));
        setDbRows(rows);
      } else {
        const res = await fetch(`/api/notion/page/${item.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch page');
        setPageDetail(data);
      }
    } catch (e: unknown) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load content');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setPageDetail(null);
    setDbRows(null);
    setDetailError(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <span className="text-base">📝</span>
            </div>
            <div>
              <h1 className="text-base font-700 text-zinc-100">Notion Integration</h1>
              <p className="text-xs text-zinc-500">Browse pages and databases from your workspace</p>
            </div>
          </div>
          <button
            onClick={() => doSearch(query, filter)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages and databases…"
              className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-500 rounded-lg transition-colors disabled:opacity-50"
          >
            Search
          </button>
        </form>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-3">
          {(['all', 'page', 'database'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
              className={`px-3 py-1 rounded-md text-xs font-500 transition-all capitalize ${
                filter === f
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent hover:bg-zinc-800'
              }`}
            >
              {f === 'all' ? 'All' : f === 'page' ? 'Pages' : 'Databases'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Results list */}
        <div className={`flex flex-col border-r border-zinc-800/60 overflow-y-auto ${selectedItem ? 'w-80 flex-shrink-0' : 'flex-1'}`}>
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-zinc-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading workspace…</span>
            </div>
          )}

          {error && (
            <div className="m-4 p-4 bg-red-900/20 border border-red-800/40 rounded-lg flex gap-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-500 text-red-300">Error</p>
                <p className="text-xs text-red-400 mt-0.5">{error}</p>
                {error.includes('NOTION_API_KEY') && (
                  <p className="text-xs text-zinc-500 mt-2">
                    Add <code className="bg-zinc-800 px-1 rounded">NOTION_API_KEY</code> to your <code className="bg-zinc-800 px-1 rounded">.env</code> file.
                  </p>
                )}
              </div>
            </div>
          )}

          {!loading && !error && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <BookOpen size={32} className="mb-3 opacity-40" />
              <p className="text-sm font-500">No results found</p>
              <p className="text-xs mt-1">Try a different search term or filter</p>
            </div>
          )}

          {!loading && !error && results.length > 0 && (
            <ul className="divide-y divide-zinc-800/60">
              {results.map((item) => {
                const isActive = selectedItem?.id === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => openItem(item)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all hover:bg-zinc-800/40 ${isActive ? 'bg-violet-600/10 border-l-2 border-violet-500' : ''}`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.icon?.type === 'emoji' ? (
                          <span className="text-base">{item.icon.emoji}</span>
                        ) : item.object === 'database' ? (
                          <Database size={14} className="text-fuchsia-400" />
                        ) : (
                          <FileText size={14} className="text-violet-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-500 truncate ${isActive ? 'text-violet-300' : 'text-zinc-200'}`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-500 ${item.object === 'database' ? 'bg-fuchsia-900/30 text-fuchsia-400' : 'bg-violet-900/30 text-violet-400'}`}>
                            {item.object}
                          </span>
                          <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(item.last_edited_time)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className={`flex-shrink-0 mt-1 transition-colors ${isActive ? 'text-violet-400' : 'text-zinc-600'}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail panel */}
        {selectedItem && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Detail header */}
            <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-zinc-900/30">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={closeDetail} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors lg:hidden">
                  <ArrowLeft size={14} />
                </button>
                <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0">
                  {selectedItem.icon?.type === 'emoji' ? (
                    <span className="text-sm">{selectedItem.icon.emoji}</span>
                  ) : selectedItem.object === 'database' ? (
                    <Database size={14} className="text-fuchsia-400" />
                  ) : (
                    <FileText size={14} className="text-violet-400" />
                  )}
                </div>
                <h2 className="text-sm font-600 text-zinc-100 truncate">{selectedItem.title}</h2>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={selectedItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
                >
                  <ExternalLink size={11} />
                  Open in Notion
                </a>
                <button onClick={closeDetail} className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors hidden lg:flex">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {detailLoading && (
                <div className="flex items-center justify-center py-16 gap-2 text-zinc-500">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading content…</span>
                </div>
              )}

              {detailError && (
                <div className="p-4 bg-red-900/20 border border-red-800/40 rounded-lg flex gap-3">
                  <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{detailError}</p>
                </div>
              )}

              {/* Page detail */}
              {!detailLoading && !detailError && pageDetail && (
                <div>
                  {/* Meta */}
                  <div className="flex items-center gap-4 mb-5 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      Created {formatDate(selectedItem.created_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      Edited {formatDate(selectedItem.last_edited_time)}
                    </span>
                  </div>

                  {/* Properties */}
                  {Object.keys(selectedItem.properties).length > 0 && (
                    <div className="mb-5">
                      <button
                        onClick={() => setExpandedProps(!expandedProps)}
                        className="flex items-center gap-1.5 text-xs font-600 text-zinc-400 hover:text-zinc-200 mb-2 transition-colors"
                      >
                        {expandedProps ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        Properties ({Object.keys(selectedItem.properties).length})
                      </button>
                      {expandedProps && (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
                          {Object.entries(selectedItem.properties).map(([key, prop]) => (
                            <div key={key} className="flex items-center gap-3 px-3 py-2">
                              <div className="flex items-center gap-1.5 w-36 flex-shrink-0 text-zinc-500">
                                {getPropertyIcon(prop.type)}
                                <span className="text-xs truncate">{key}</span>
                              </div>
                              <span className="text-xs text-zinc-300 truncate">{renderPropertyValue(prop)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Blocks */}
                  <div className="prose-notion">
                    {pageDetail.blocks.results.length === 0 ? (
                      <p className="text-zinc-600 text-sm italic">This page has no content.</p>
                    ) : (
                      pageDetail.blocks.results.map((block) => (
                        <div key={block.id}>{renderBlock(block)}</div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Database rows */}
              {!detailLoading && !detailError && dbRows !== null && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-zinc-500">{dbRows.length} row{dbRows.length !== 1 ? 's' : ''}</p>
                  </div>

                  {dbRows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                      <Database size={28} className="mb-2 opacity-40" />
                      <p className="text-sm">This database is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dbRows.map((row) => {
                        const props = Object.entries(row.properties).filter(([, p]) => p.type !== 'title').slice(0, 4);
                        return (
                          <div key={row.id} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-500 text-zinc-200">{row.title || 'Untitled'}</p>
                              <a
                                href={row.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-600 hover:text-violet-400 transition-colors flex-shrink-0"
                              >
                                <ExternalLink size={12} />
                              </a>
                            </div>
                            {props.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {props.map(([key, prop]) => {
                                  const val = renderPropertyValue(prop);
                                  if (val === '—') return null;
                                  if (prop.type === 'select' && prop.select) {
                                    return <StatusBadge key={key} color={prop.select.color} label={prop.select.name} />;
                                  }
                                  if (prop.type === 'status' && prop.status) {
                                    return <StatusBadge key={key} color={prop.status.color} label={prop.status.name} />;
                                  }
                                  if (prop.type === 'multi_select' && prop.multi_select?.length) {
                                    return prop.multi_select.map((s) => (
                                      <StatusBadge key={`${key}-${s.name}`} color={s.color} label={s.name} />
                                    ));
                                  }
                                  return (
                                    <span key={key} className="text-[11px] text-zinc-500">
                                      <span className="text-zinc-600">{key}:</span> {val}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
