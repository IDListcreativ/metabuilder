'use client';

import { useState, useEffect } from 'react';
import { LayoutTemplate, Search, Star, Copy, Pencil, Check, X, Plus, Trash2, Zap, Database, Globe, Component, Shield, Webhook, FileCode2, ChevronRight, Save, RotateCcw, Tag, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';


interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  prompt: string;
  starred: boolean;
  isCustom: boolean;
  createdAt: string;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'REST API': Globe,
  'React Component': Component,
  'Database': Database,
  'Auth': Shield,
  'Webhook': Webhook,
  'Utility': FileCode2,
  'Custom': Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
  'REST API': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'React Component': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  'Database': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  'Auth': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  'Webhook': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Utility': 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  'Custom': 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
};

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'tpl-rest-crud',
    title: 'REST API – Full CRUD',
    description: 'Express.js REST API with full CRUD operations, input validation, error handling, and OpenAPI docs.',
    category: 'REST API',
    tags: ['express', 'typescript', 'openapi'],
    prompt: `Build a production-ready REST API using Express.js and TypeScript with the following:
- Full CRUD endpoints (GET list, GET by id, POST, PUT, DELETE)
- Request validation using Zod
- Centralized error handling middleware
- OpenAPI/Swagger documentation
- Pagination and filtering on list endpoints
- Proper HTTP status codes and response envelopes
- Environment-based configuration

Resource name: [RESOURCE_NAME]
Fields: [FIELDS]`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'tpl-react-form',
    title: 'React Form Component',
    description: 'Accessible, validated form with React Hook Form, Zod schema, and error states.',
    category: 'React Component',
    tags: ['react', 'react-hook-form', 'zod', 'typescript'],
    prompt: `Create a fully accessible React form component using TypeScript with:
- React Hook Form for state management
- Zod schema validation with inline error messages
- Controlled inputs with proper ARIA labels
- Loading and disabled states during submission
- Success/error toast feedback
- Responsive layout using Tailwind CSS

Form purpose: [FORM_PURPOSE]
Fields: [FIELDS_LIST]
Submit action: [SUBMIT_ACTION]`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'tpl-db-schema',
    title: 'Database Schema',
    description: 'PostgreSQL schema with migrations, indexes, RLS policies, and seed data.',
    category: 'Database',
    tags: ['postgresql', 'supabase', 'migrations', 'rls'],
    prompt: `Design a PostgreSQL database schema with:
- Table definitions with proper data types and constraints
- Primary keys (UUID), foreign keys, and indexes
- Row Level Security (RLS) policies for multi-tenant access
- Created_at / updated_at timestamps with triggers
- Migration file (idempotent, using IF NOT EXISTS)
- Seed data for development
- TypeScript types matching the schema

Entity: [ENTITY_NAME]
Relationships: [RELATIONSHIPS]
Access rules: [ACCESS_RULES]`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'tpl-auth-flow',
    title: 'Auth Flow – JWT + Refresh',
    description: 'Secure authentication with JWT access tokens, refresh token rotation, and session management.',
    category: 'Auth',
    tags: ['jwt', 'refresh-tokens', 'security', 'typescript'],
    prompt: `Implement a secure authentication system with:
- JWT access tokens (short-lived, 15 min)
- Refresh token rotation stored in httpOnly cookies
- Middleware for protected routes
- Login, register, logout, and refresh endpoints
- Password hashing with bcrypt
- Rate limiting on auth endpoints
- TypeScript interfaces for User and Session

Framework: [FRAMEWORK]
User fields: [USER_FIELDS]
Storage: [TOKEN_STORAGE]`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'tpl-webhook-handler',
    title: 'Webhook Handler',
    description: 'Secure webhook receiver with signature verification, idempotency, and retry logic.',
    category: 'Webhook',
    tags: ['webhooks', 'security', 'idempotency'],
    prompt: `Build a robust webhook handler with:
- HMAC signature verification
- Idempotency key tracking to prevent duplicate processing
- Event type routing to specific handlers
- Async queue for heavy processing
- Dead letter queue for failed events
- Structured logging per event
- TypeScript types for all event payloads

Provider: [WEBHOOK_PROVIDER]
Events to handle: [EVENT_TYPES]
Processing logic: [PROCESSING_DESCRIPTION]`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'tpl-react-data-table',
    title: 'React Data Table',
    description: 'Sortable, filterable data table with pagination, row selection, and bulk actions.',
    category: 'React Component',
    tags: ['react', 'table', 'typescript', 'tailwind'],
    prompt: `Create a feature-rich data table React component with:
- Column sorting (asc/desc) with visual indicators
- Global search and per-column filters
- Client-side pagination with configurable page size
- Row selection (single and multi-select with shift-click)
- Bulk action toolbar (appears when rows selected)
- Loading skeleton state
- Empty state with illustration
- Responsive: horizontal scroll on mobile
- TypeScript generics for row data type

Columns: [COLUMN_DEFINITIONS]
Bulk actions: [BULK_ACTIONS]
Row click action: [ROW_CLICK_ACTION]`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'tpl-utility-debounce',
    title: 'Custom React Hooks Bundle',
    description: 'Collection of production-ready hooks: useDebounce, useLocalStorage, useFetch, useIntersection.',
    category: 'Utility',
    tags: ['react', 'hooks', 'typescript', 'utilities'],
    prompt: `Generate a bundle of production-ready custom React hooks in TypeScript:
1. useDebounce(value, delay) — debounces any value
2. useLocalStorage(key, initialValue) — synced localStorage state
3. useFetch(url, options) — data fetching with loading/error/data states
4. useIntersectionObserver(ref, options) — element visibility detection
5. useMediaQuery(query) — responsive breakpoint detection
6. useClickOutside(ref, handler) — outside click detection

Each hook must:
- Be fully typed with generics where appropriate
- Handle cleanup (abort controllers, event listeners)
- Include JSDoc comments with usage examples`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
  {
    id: 'tpl-nextjs-api-route',
    title: 'Next.js API Route',
    description: 'Next.js App Router API route with auth middleware, validation, and typed responses.',
    category: 'REST API',
    tags: ['nextjs', 'app-router', 'typescript', 'middleware'],
    prompt: `Create a Next.js App Router API route handler with:
- GET and POST method handlers
- Auth middleware using Supabase session
- Request body validation with Zod
- Typed NextResponse with consistent envelope shape
- Error handling with proper HTTP status codes
- Rate limiting headers
- CORS configuration

Route path: [ROUTE_PATH]
Purpose: [ROUTE_PURPOSE]
Auth required: [AUTH_REQUIRED]
Request schema: [REQUEST_SCHEMA]`,
    starred: false,
    isCustom: false,
    createdAt: '2026-01-01',
  },
];

const STORAGE_KEY = 'metabuilder_templates';
const CATEGORIES = ['All', 'REST API', 'React Component', 'Database', 'Auth', 'Webhook', 'Utility', 'Custom'];

function loadTemplates(): Template[] {
  if (typeof window === 'undefined') return BUILT_IN_TEMPLATES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return BUILT_IN_TEMPLATES;
    const parsed: Template[] = JSON.parse(saved);
    // Merge: keep built-ins updated, append custom ones
    const customOnes = parsed.filter(t => t.isCustom);
    const builtInStars = Object.fromEntries(parsed.filter(t => !t.isCustom).map(t => [t.id, t.starred]));
    return [
      ...BUILT_IN_TEMPLATES.map(t => ({ ...t, starred: builtInStars[t.id] ?? t.starred })),
      ...customOnes,
    ];
  } catch {
    return BUILT_IN_TEMPLATES;
  }
}

function saveTemplates(templates: Template[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export default function TemplatesWorkspace() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', description: '', category: 'Custom', tags: '', prompt: '' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const filtered = templates.filter(t => {
    const matchCat = activeCategory === 'All' || t.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q));
    return matchCat && matchSearch;
  });

  const starred = filtered.filter(t => t.starred);
  const unstarred = filtered.filter(t => !t.starred);

  const updateTemplates = (updated: Template[]) => {
    setTemplates(updated);
    saveTemplates(updated);
  };

  const toggleStar = (id: string) => {
    const updated = templates.map(t => t.id === id ? { ...t, starred: !t.starred } : t);
    updateTemplates(updated);
    if (selectedTemplate?.id === id) {
      setSelectedTemplate(prev => prev ? { ...prev, starred: !prev.starred } : null);
    }
    const tpl = templates.find(t => t.id === id);
    toast.success(tpl?.starred ? 'Removed from favorites' : 'Added to favorites');
  };

  const handleSelect = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setEditingPrompt(tpl.prompt);
    setEditingTitle(tpl.title);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editingPrompt);
    setCopied(true);
    toast.success('Prompt copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!selectedTemplate) return;
    const updated = templates.map(t =>
      t.id === selectedTemplate.id
        ? { ...t, prompt: editingPrompt, title: editingTitle }
        : t
    );
    updateTemplates(updated);
    setSelectedTemplate(prev => prev ? { ...prev, prompt: editingPrompt, title: editingTitle } : null);
    setIsEditing(false);
    toast.success('Template saved');
  };

  const handleResetEdit = () => {
    if (!selectedTemplate) return;
    const original = BUILT_IN_TEMPLATES.find(t => t.id === selectedTemplate.id);
    if (original) {
      setEditingPrompt(original.prompt);
      setEditingTitle(original.title);
      toast.success('Reset to original');
    }
  };

  const handleDelete = (id: string) => {
    const tpl = templates.find(t => t.id === id);
    if (!tpl?.isCustom) { toast.error('Built-in templates cannot be deleted'); return; }
    const updated = templates.filter(t => t.id !== id);
    updateTemplates(updated);
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
    toast.success('Template deleted');
  };

  const handleCreateNew = () => {
    if (!newTemplate.title.trim() || !newTemplate.prompt.trim()) {
      toast.error('Title and prompt are required');
      return;
    }
    const tpl: Template = {
      id: `custom-${Date.now()}`,
      title: newTemplate.title.trim(),
      description: newTemplate.description.trim() || 'Custom template',
      category: newTemplate.category,
      tags: newTemplate.tags.split(',').map(t => t.trim()).filter(Boolean),
      prompt: newTemplate.prompt.trim(),
      starred: false,
      isCustom: true,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...templates, tpl];
    updateTemplates(updated);
    setShowNewForm(false);
    setNewTemplate({ title: '', description: '', category: 'Custom', tags: '', prompt: '' });
    setSelectedTemplate(tpl);
    setEditingPrompt(tpl.prompt);
    setEditingTitle(tpl.title);
    toast.success('Template created');
  };

  const handleUseInGenerator = () => {
    if (!selectedTemplate) return;
    sessionStorage.setItem('metabuilder_template_prompt', editingPrompt);
    toast.success('Opening AI Generator with this template…');
  };

  const CategoryIcon = selectedTemplate ? (CATEGORY_ICONS[selectedTemplate.category] || FileCode2) : FileCode2;
  const catColor = selectedTemplate ? (CATEGORY_COLORS[selectedTemplate.category] || CATEGORY_COLORS['Utility']) : '';

  return (
    <div className="flex h-full bg-zinc-950 overflow-hidden">

      {/* Left panel — template list */}
      <div className="w-72 xl:w-80 flex-shrink-0 flex flex-col border-r border-zinc-800/60 bg-zinc-950">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={15} className="text-violet-400" />
            <span className="text-sm font-600 text-zinc-200">Templates</span>
            <span className="px-1.5 py-0.5 text-[10px] font-600 rounded-full bg-zinc-800 text-zinc-500 tabular-nums">
              {templates.length}
            </span>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-600/15 border border-violet-600/25 text-violet-400 hover:bg-violet-600/25 transition-all text-xs font-500"
          >
            <Plus size={11} />
            New
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-zinc-800/40 flex-shrink-0">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full pl-7 pr-3 py-1.5 bg-zinc-900/80 border border-zinc-700/60 rounded-lg text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50 transition-colors"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-3 py-2 border-b border-zinc-800/40 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-500 whitespace-nowrap transition-all duration-150 ${
                  activeCategory === cat
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 border border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
          {starred.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <Star size={9} className="text-amber-500 fill-amber-500" />
                <span className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">Favorites</span>
              </div>
              <ul className="space-y-0.5">
                {starred.map(tpl => (
                  <TemplateListItem
                    key={tpl.id}
                    tpl={tpl}
                    isActive={selectedTemplate?.id === tpl.id}
                    onSelect={handleSelect}
                    onStar={toggleStar}
                  />
                ))}
              </ul>
            </div>
          )}

          {unstarred.length > 0 && (
            <div>
              {starred.length > 0 && (
                <div className="px-2 mb-1">
                  <span className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">All Templates</span>
                </div>
              )}
              <ul className="space-y-0.5">
                {unstarred.map(tpl => (
                  <TemplateListItem
                    key={tpl.id}
                    tpl={tpl}
                    isActive={selectedTemplate?.id === tpl.id}
                    onSelect={handleSelect}
                    onStar={toggleStar}
                  />
                ))}
              </ul>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <LayoutTemplate size={28} className="text-zinc-700 mb-3" />
              <p className="text-sm text-zinc-500 font-500">No templates found</p>
              <p className="text-xs text-zinc-600 mt-1">Try a different search or category</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — detail / editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedTemplate ? (
          <>
            {/* Detail header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 flex-shrink-0 bg-zinc-950">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${catColor}`}>
                  <CategoryIcon size={15} />
                </div>
                <div className="min-w-0">
                  {isEditing ? (
                    <input
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      className="bg-zinc-800/80 border border-zinc-600/60 rounded-md px-2 py-0.5 text-sm font-600 text-zinc-100 focus:outline-none focus:border-violet-500/60 w-64"
                    />
                  ) : (
                    <h2 className="text-sm font-600 text-zinc-100 truncate">{selectedTemplate.title}</h2>
                  )}
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Star */}
                <button
                  onClick={() => toggleStar(selectedTemplate.id)}
                  className={`p-1.5 rounded-lg border transition-all ${
                    selectedTemplate.starred
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :'bg-zinc-800/60 border-zinc-700/60 text-zinc-500 hover:text-amber-400'
                  }`}
                  title={selectedTemplate.starred ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star size={13} className={selectedTemplate.starred ? 'fill-amber-400' : ''} />
                </button>

                {/* Copy */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all text-xs font-500"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>

                {/* Edit / Save */}
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-600/20 border border-violet-600/30 text-violet-300 hover:bg-violet-600/30 transition-all text-xs font-500"
                    >
                      <Save size={12} />
                      Save
                    </button>
                    {!selectedTemplate.isCustom && (
                      <button
                        onClick={handleResetEdit}
                        className="p-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-500 hover:text-zinc-300 transition-all"
                        title="Reset to original"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => { setIsEditing(false); setEditingPrompt(selectedTemplate.prompt); setEditingTitle(selectedTemplate.title); }}
                      className="p-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-500 hover:text-zinc-300 transition-all"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all text-xs font-500"
                  >
                    <Pencil size={12} />
                    Customize
                  </button>
                )}

                {/* Delete (custom only) */}
                {selectedTemplate.isCustom && (
                  <button
                    onClick={() => handleDelete(selectedTemplate.id)}
                    className="p-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/60 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25 transition-all"
                    title="Delete template"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {/* Use in Generator */}
                <Link
                  href="/ai-code-generator"
                  onClick={handleUseInGenerator}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-glam text-white text-xs font-600 transition-all"
                >
                  <Sparkles size={12} />
                  Use in Generator
                  <ChevronRight size={11} />
                </Link>
              </div>
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-2 px-5 py-2 border-b border-zinc-800/40 flex-shrink-0 bg-zinc-950/80">
              <Tag size={11} className="text-zinc-600 flex-shrink-0" />
              <div className="flex gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 text-[10px] font-600 rounded-full border ${catColor}`}>
                  {selectedTemplate.category}
                </span>
                {selectedTemplate.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-800/80 text-zinc-500 border border-zinc-700/60">
                    {tag}
                  </span>
                ))}
                {selectedTemplate.isCustom && (
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                    custom
                  </span>
                )}
              </div>
            </div>

            {/* Prompt editor */}
            <div className="flex-1 overflow-hidden flex flex-col px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileCode2 size={12} className="text-zinc-600" />
                  <span className="text-xs font-600 text-zinc-500 uppercase tracking-wider">Prompt</span>
                </div>
                {isEditing && (
                  <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
                    Editing — customize placeholders in [BRACKETS]
                  </span>
                )}
                {!isEditing && (
                  <span className="text-[10px] text-zinc-600">
                    Replace <span className="font-mono text-zinc-500">[PLACEHOLDERS]</span> before using
                  </span>
                )}
              </div>

              <div className={`flex-1 rounded-xl border overflow-hidden transition-all duration-200 ${
                isEditing
                  ? 'border-violet-600/40 shadow-[0_0_0_1px_rgba(124,58,237,0.15)]'
                  : 'border-zinc-800/60'
              }`}>
                <textarea
                  value={editingPrompt}
                  onChange={e => setEditingPrompt(e.target.value)}
                  readOnly={!isEditing}
                  className={`w-full h-full p-4 bg-zinc-900/60 text-sm font-mono text-zinc-300 leading-relaxed resize-none focus:outline-none transition-colors ${
                    isEditing ? 'text-zinc-200' : 'text-zinc-400 cursor-default'
                  }`}
                  spellCheck={false}
                />
              </div>

              {/* Placeholder hints */}
              {!isEditing && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(editingPrompt.match(/\[[A-Z_]+\]/g) || []).filter((v, i, a) => a.indexOf(v) === i).map(ph => (
                    <span key={ph} className="px-2 py-0.5 text-[11px] font-mono rounded-md bg-zinc-800/80 text-zinc-500 border border-zinc-700/60">
                      {ph}
                    </span>
                  ))}
                  {(editingPrompt.match(/\[[A-Z_]+\]/g) || []).length > 0 && (
                    <span className="text-[11px] text-zinc-600 self-center">← fill these in before sending</span>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-600/20 flex items-center justify-center mb-4">
              <LayoutTemplate size={28} className="text-violet-400" />
            </div>
            <h3 className="text-base font-600 text-zinc-200 mb-2">Pick a template</h3>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
              Select a pre-built prompt from the left panel, customize the placeholders, then send it straight to the AI Generator.
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/15 border border-violet-600/25 text-violet-300 hover:bg-violet-600/25 transition-all text-sm font-500"
            >
              <Plus size={14} />
              Create custom template
            </button>
          </div>
        )}
      </div>

      {/* New template modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
              <div className="flex items-center gap-2">
                <Plus size={14} className="text-violet-400" />
                <span className="text-sm font-600 text-zinc-200">New Template</span>
              </div>
              <button onClick={() => setShowNewForm(false)} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-500 text-zinc-400 mb-1.5">Title *</label>
                  <input
                    value={newTemplate.title}
                    onChange={e => setNewTemplate(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. GraphQL Resolver"
                    className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-500 text-zinc-400 mb-1.5">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={e => setNewTemplate(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500/60 transition-colors"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-500 text-zinc-400 mb-1.5">Tags (comma-separated)</label>
                  <input
                    value={newTemplate.tags}
                    onChange={e => setNewTemplate(p => ({ ...p, tags: e.target.value }))}
                    placeholder="e.g. graphql, typescript"
                    className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-500 text-zinc-400 mb-1.5">Description</label>
                  <input
                    value={newTemplate.description}
                    onChange={e => setNewTemplate(p => ({ ...p, description: e.target.value }))}
                    placeholder="Short description of what this template does"
                    className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-500 text-zinc-400 mb-1.5">Prompt *</label>
                  <textarea
                    value={newTemplate.prompt}
                    onChange={e => setNewTemplate(p => ({ ...p, prompt: e.target.value }))}
                    placeholder="Write your prompt here. Use [PLACEHOLDERS] for customizable parts."
                    rows={6}
                    className="w-full px-3 py-2 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-800/60">
              <button
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 px-4 py-2 rounded-lg btn-glam text-white text-sm font-600"
              >
                <Save size={13} />
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateListItemProps {
  tpl: Template;
  isActive: boolean;
  onSelect: (tpl: Template) => void;
  onStar: (id: string) => void;
}

function TemplateListItem({ tpl, isActive, onSelect, onStar }: TemplateListItemProps) {
  const Icon = CATEGORY_ICONS[tpl.category] || FileCode2;
  const catColor = CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS['Utility'];

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(tpl)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(tpl); }}
        className={`group w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-150 border cursor-pointer ${
          isActive
            ? 'bg-violet-600/10 border-violet-600/20 text-zinc-200'
            : 'border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/40 text-zinc-400'
        }`}
      >
        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 border mt-0.5 ${catColor}`}>
          <Icon size={13} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-xs font-600 truncate ${isActive ? 'text-zinc-100' : 'text-zinc-300 group-hover:text-zinc-100'}`}>
              {tpl.title}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onStar(tpl.id); }}
              className={`flex-shrink-0 p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 ${tpl.starred ? 'opacity-100 text-amber-400' : 'text-zinc-600 hover:text-amber-400'}`}
            >
              <Star size={10} className={tpl.starred ? 'fill-amber-400' : ''} />
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 truncate mt-0.5 leading-snug">{tpl.description}</p>
        </div>
      </div>
    </li>
  );
}
