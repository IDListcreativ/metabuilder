'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Database, Search, X, ChevronDown, Loader2, FileText, Check, AlertCircle, Star } from 'lucide-react';

interface NotionResult {
  id: string;
  type: 'page' | 'database';
  title: string;
  icon?: string;
  lastEdited?: string;
}

interface NotionContextItem {
  id: string;
  type: 'page' | 'database';
  title: string;
  content: string;
}

export interface FavoriteNotionItem {
  id: string;
  type: 'page' | 'database';
  title: string;
  icon?: string;
}

interface NotionContextSelectorProps {
  onContextChange: (items: NotionContextItem[]) => void;
}

const FAVORITES_KEY = 'notion_favorites';

export function getNotionFavorites(): FavoriteNotionItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveNotionFavorites(favs: FavoriteNotionItem[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function extractTitle(obj: Record<string, unknown>): string {
  const props = obj.properties as Record<string, unknown> | undefined;
  if (props) {
    for (const key of ['Name', 'Title', 'title']) {
      const prop = props[key] as Record<string, unknown> | undefined;
      if (prop) {
        const titleArr = prop.title as Array<{ plain_text?: string }> | undefined;
        if (titleArr?.[0]?.plain_text) return titleArr[0].plain_text;
      }
    }
  }
  const titleProp = (obj as Record<string, unknown>).title as Array<{ plain_text?: string }> | undefined;
  if (Array.isArray(titleProp) && titleProp[0]?.plain_text) return titleProp[0].plain_text;
  return 'Untitled';
}

function extractIcon(obj: Record<string, unknown>): string | undefined {
  const icon = obj.icon as Record<string, unknown> | undefined;
  if (!icon) return undefined;
  if (icon.type === 'emoji') return icon.emoji as string;
  return undefined;
}

function blocksToText(blocks: Array<Record<string, unknown>>): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const type = block.type as string;
    const blockData = block[type] as Record<string, unknown> | undefined;
    if (!blockData) continue;
    const richText = blockData.rich_text as Array<{ plain_text?: string }> | undefined;
    let text = richText?.map(r => r.plain_text ?? '').join('') ?? '';
    if (!text) continue;
    if (type === 'heading_1') lines.push(`# ${text}`);
    else if (type === 'heading_2') lines.push(`## ${text}`);
    else if (type === 'heading_3') lines.push(`### ${text}`);
    else if (type === 'bulleted_list_item') lines.push(`• ${text}`);
    else if (type === 'numbered_list_item') lines.push(`- ${text}`);
    else if (type === 'code') lines.push(`\`\`\`\n${text}\n\`\`\``);
    else if (type === 'callout') lines.push(`> ${text}`);
    else if (type === 'to_do') {
      const checked = (blockData.checked as boolean) ? '[x]' : '[ ]';
      lines.push(`${checked} ${text}`);
    } else {
      lines.push(text);
    }
  }
  return lines.join('\n');
}

function dbRowsToText(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return '';
  const lines: string[] = [];
  for (const row of rows.slice(0, 20)) {
    const props = row.properties as Record<string, Record<string, unknown>> | undefined;
    if (!props) continue;
    const parts: string[] = [];
    for (const [key, val] of Object.entries(props)) {
      const type = val.type as string;
      let text = '';
      if (type === 'title') {
        const arr = val.title as Array<{ plain_text?: string }> | undefined;
        text = arr?.map(r => r.plain_text ?? '').join('') ?? '';
      } else if (type === 'rich_text') {
        const arr = val.rich_text as Array<{ plain_text?: string }> | undefined;
        text = arr?.map(r => r.plain_text ?? '').join('') ?? '';
      } else if (type === 'select') {
        text = (val.select as { name?: string } | null)?.name ?? '';
      } else if (type === 'multi_select') {
        const arr = val.multi_select as Array<{ name?: string }> | undefined;
        text = arr?.map(s => s.name ?? '').join(', ') ?? '';
      } else if (type === 'number') {
        text = String(val.number ?? '');
      } else if (type === 'checkbox') {
        text = val.checkbox ? 'true' : 'false';
      } else if (type === 'date') {
        const d = val.date as { start?: string } | null;
        text = d?.start ?? '';
      } else if (type === 'url') {
        text = (val.url as string) ?? '';
      }
      if (text) parts.push(`${key}: ${text}`);
    }
    if (parts.length) lines.push(parts.join(' | '));
  }
  return lines.join('\n');
}

export default function NotionContextSelector({ onContextChange }: NotionContextSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'page' | 'database'>('all');
  const [results, setResults] = useState<NotionResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<NotionContextItem[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteNotionItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load favorites from localStorage on mount
  useEffect(() => {
    setFavorites(getNotionFavorites());
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = useCallback(async (q: string, f: 'all' | 'page' | 'database') => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const body: Record<string, unknown> = { page_size: 20 };
      if (q.trim()) body.query = q.trim();
      if (f !== 'all') body.filter = { value: f, property: 'object' };
      const res = await fetch('/api/notion/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error || 'Search failed');
        setResults([]);
        return;
      }
      const items: NotionResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        type: r.object as 'page' | 'database',
        title: extractTitle(r),
        icon: extractIcon(r),
        lastEdited: r.last_edited_time as string | undefined,
      }));
      setResults(items);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Initial load when dropdown opens
  useEffect(() => {
    if (isOpen) {
      doSearch(query, filter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Debounced search on query/filter change
  useEffect(() => {
    if (!isOpen) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      doSearch(query, filter);
    }, 350);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [query, filter, isOpen, doSearch]);

  const toggleFavorite = (item: NotionResult, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = getNotionFavorites();
    const exists = current.find(f => f.id === item.id);
    let updated: FavoriteNotionItem[];
    if (exists) {
      updated = current.filter(f => f.id !== item.id);
    } else {
      updated = [...current, { id: item.id, type: item.type, title: item.title, icon: item.icon }];
    }
    saveNotionFavorites(updated);
    setFavorites(updated);
    // Dispatch storage event so Sidebar can react
    window.dispatchEvent(new Event('notion-favorites-updated'));
  };

  const isFavorited = (id: string) => favorites.some(f => f.id === id);

  const handleSelect = async (item: NotionResult) => {
    // Toggle off if already selected
    if (selectedItems.find(s => s.id === item.id)) {
      let updated = selectedItems.filter(s => s.id !== item.id);
      setSelectedItems(updated);
      onContextChange(updated);
      return;
    }

    setLoadingId(item.id);
    setFetchError(null);
    try {
      let content = '';
      if (item.type === 'page') {
        const res = await fetch(`/api/notion/page/${item.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch page');
        const blocks: Array<Record<string, unknown>> = data.blocks?.results ?? [];
        content = blocksToText(blocks);
      } else {
        const res = await fetch(`/api/notion/database/${item.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_size: 25 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch database');
        const rows: Array<Record<string, unknown>> = data.results ?? [];
        content = dbRowsToText(rows);
      }

      const contextItem: NotionContextItem = {
        id: item.id,
        type: item.type,
        title: item.title,
        content: content || '(No readable content found)',
      };
      let updated = [...selectedItems, contextItem];
      setSelectedItems(updated);
      onContextChange(updated);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoadingId(null);
    }
  };

  const removeItem = (id: string) => {
    let updated = selectedItems.filter(s => s.id !== id);
    setSelectedItems(updated);
    onContextChange(updated);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-600 border transition-all duration-200 ${
          selectedItems.length > 0 || isOpen
            ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-glow-sm'
            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
        }`}
        title="Add Notion context"
      >
        <BookOpen size={12} />
        <span>Notion</span>
        {selectedItems.length > 0 && (
          <span className="px-1 py-0.5 text-[9px] font-700 rounded-full bg-violet-500/30 text-violet-200 tabular-nums leading-none">
            {selectedItems.length}
          </span>
        )}
        <ChevronDown size={10} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-80 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/60">
            <div className="flex items-center gap-1.5">
              <BookOpen size={12} className="text-violet-400" />
              <span className="text-xs font-600 text-zinc-200">Notion Context</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X size={13} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-2.5 pb-2">
            <div className="flex items-center gap-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-2.5 py-1.5 focus-within:border-violet-600/50 transition-colors">
              <Search size={12} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search pages & databases…"
                className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                autoFocus
              />
              {isSearching && <Loader2 size={11} className="text-violet-400 animate-spin flex-shrink-0" />}
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-3 pb-2">
            {(['all', 'page', 'database'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[10px] font-600 rounded-md transition-all duration-150 capitalize ${
                  filter === f
                    ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30'
                    : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                }`}
              >
                {f === 'all' ? 'All' : f === 'page' ? 'Pages' : 'Databases'}
              </button>
            ))}
          </div>

          {/* Error */}
          {(searchError || fetchError) && (
            <div className="mx-3 mb-2 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle size={11} className="text-red-400 flex-shrink-0" />
              <span className="text-[11px] text-red-300">{searchError || fetchError}</span>
            </div>
          )}

          {/* Results list */}
          <div className="max-h-52 overflow-y-auto px-2 pb-2">
            {results.length === 0 && !isSearching && !searchError && (
              <div className="py-6 text-center">
                <FileText size={20} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No results found</p>
                <p className="text-[10px] text-zinc-700 mt-0.5">Make sure pages are shared with your integration</p>
              </div>
            )}
            {results.map(item => {
              const isSelected = !!selectedItems.find(s => s.id === item.id);
              const isLoading = loadingId === item.id;
              const starred = isFavorited(item.id);
              return (
                <div
                  key={item.id}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group ${
                    isSelected
                      ? 'bg-violet-600/15 border border-violet-500/25'
                      : 'hover:bg-zinc-800/60 border border-transparent'
                  }`}
                >
                  {/* Clickable area */}
                  <button
                    onClick={() => handleSelect(item)}
                    disabled={isLoading}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {/* Icon */}
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-sm ${
                      item.type === 'database' ? 'bg-blue-500/15' : 'bg-zinc-800'
                    }`}>
                      {item.icon ? (
                        <span className="text-sm leading-none">{item.icon}</span>
                      ) : item.type === 'database' ? (
                        <Database size={12} className="text-blue-400" />
                      ) : (
                        <FileText size={12} className="text-zinc-400" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-500 truncate ${isSelected ? 'text-violet-200' : 'text-zinc-300'}`}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] capitalize ${item.type === 'database' ? 'text-blue-500' : 'text-zinc-600'}`}>
                          {item.type}
                        </span>
                        {item.lastEdited && (
                          <span className="text-[10px] text-zinc-700">{formatDate(item.lastEdited)}</span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* State indicator + star */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isLoading ? (
                      <Loader2 size={12} className="text-violet-400 animate-spin" />
                    ) : isSelected ? (
                      <Check size={12} className="text-violet-400" />
                    ) : null}
                    {/* Star/save button */}
                    <button
                      onClick={(e) => toggleFavorite(item, e)}
                      title={starred ? 'Remove from favorites' : 'Save as favorite'}
                      className={`p-0.5 rounded transition-all duration-150 ${
                        starred
                          ? 'text-amber-400 hover:text-amber-300' :'text-zinc-700 hover:text-amber-400 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <Star size={12} className={starred ? 'fill-amber-400' : ''} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected summary */}
          {selectedItems.length > 0 && (
            <div className="border-t border-zinc-800/60 px-3 py-2.5">
              <p className="text-[10px] text-zinc-500 mb-1.5 font-600 uppercase tracking-wide">Added as context</p>
              <div className="flex flex-col gap-1">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/40">
                    {item.type === 'database' ? (
                      <Database size={10} className="text-blue-400 flex-shrink-0" />
                    ) : (
                      <FileText size={10} className="text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="text-[11px] text-zinc-300 flex-1 truncate">{item.title}</span>
                    <span className="text-[10px] text-zinc-600 tabular-nums flex-shrink-0">
                      {item.content.length > 0 ? `${Math.round(item.content.length / 4)} tokens` : ''}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { NotionContextItem };
