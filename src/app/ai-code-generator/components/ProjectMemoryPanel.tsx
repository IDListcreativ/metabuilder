'use client';

import { useState, useEffect, useRef } from 'react';
import { Brain, Plus, ChevronDown, ChevronUp, Palette, Type, Package, Layers, MessageSquare, Save, X, Check, Lightbulb, Pencil } from 'lucide-react';
import { projectMemoryService, ProjectMemory, BrandColor, ComponentPattern, Decision } from '@/lib/services/projectMemoryService';
import { toast } from 'sonner';

interface ProjectMemoryPanelProps {
  appId: string | null;
  onMemoryChange?: (memory: ProjectMemory | null) => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-zinc-900/60 hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-violet-400">{icon}</span>
          <span className="text-xs font-600 text-zinc-300">{title}</span>
        </div>
        {open ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
      </button>
      {open && <div className="px-3 py-3 bg-zinc-950/40 space-y-2">{children}</div>}
    </div>
  );
}

export default function ProjectMemoryPanel({ appId, onMemoryChange }: ProjectMemoryPanelProps) {
  const [memory, setMemory] = useState<ProjectMemory | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local editable state
  const [brandColors, setBrandColors] = useState<BrandColor[]>([]);
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#8b5cf6');
  const [preferredLibs, setPreferredLibs] = useState<string[]>([]);
  const [newLib, setNewLib] = useState('');
  const [patterns, setPatterns] = useState<ComponentPattern[]>([]);
  const [newPatternName, setNewPatternName] = useState('');
  const [newPatternDesc, setNewPatternDesc] = useState('');
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [newDecision, setNewDecision] = useState('');
  const [customContext, setCustomContext] = useState('');
  const [fontFamily, setFontFamily] = useState('');
  const [dirty, setDirty] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!appId) return;
    setLoading(true);
    projectMemoryService.getByAppId(appId).then(m => {
      setLoading(false);
      if (m) {
        setMemory(m);
        setBrandColors(m.brandColors);
        setPreferredLibs(m.preferredLibraries);
        setPatterns(m.componentPatterns);
        setDecisions(m.decisions);
        setCustomContext(m.customContext);
        setFontFamily(m.typography?.fontFamily ?? '');
        onMemoryChange?.(m);
      }
    });
  }, [appId]);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    if (!appId) return;
    setSaving(true);
    const updated = await projectMemoryService.upsert(appId, {
      brandColors,
      typography: { fontFamily },
      preferredLibraries: preferredLibs,
      componentPatterns: patterns,
      decisions,
      customContext,
    });
    setSaving(false);
    if (updated) {
      setMemory(updated);
      setDirty(false);
      onMemoryChange?.(updated);
      toast.success('Project memory saved', { description: 'AI will use this context in every prompt.' });
    } else {
      toast.error('Failed to save memory. Make sure you are signed in and have a saved project.');
    }
  };

  const addColor = () => {
    if (!newColorName.trim()) return;
    setBrandColors(prev => [...prev, { name: newColorName.trim(), hex: newColorHex }]);
    setNewColorName('');
    setNewColorHex('#8b5cf6');
    markDirty();
  };

  const removeColor = (i: number) => {
    setBrandColors(prev => prev.filter((_, idx) => idx !== i));
    markDirty();
  };

  const addLib = () => {
    if (!newLib.trim()) return;
    setPreferredLibs(prev => [...prev, newLib.trim()]);
    setNewLib('');
    markDirty();
  };

  const removeLib = (i: number) => {
    setPreferredLibs(prev => prev.filter((_, idx) => idx !== i));
    markDirty();
  };

  const addPattern = () => {
    if (!newPatternName.trim() || !newPatternDesc.trim()) return;
    setPatterns(prev => [...prev, { name: newPatternName.trim(), description: newPatternDesc.trim() }]);
    setNewPatternName('');
    setNewPatternDesc('');
    markDirty();
  };

  const removePattern = (i: number) => {
    setPatterns(prev => prev.filter((_, idx) => idx !== i));
    markDirty();
  };

  const addDecision = () => {
    if (!newDecision.trim()) return;
    setDecisions(prev => [...prev, {
      id: String(Date.now()),
      summary: newDecision.trim(),
      timestamp: new Date().toISOString(),
    }]);
    setNewDecision('');
    markDirty();
  };

  const removeDecision = (i: number) => {
    setDecisions(prev => prev.filter((_, idx) => idx !== i));
    markDirty();
  };

  if (!appId) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
        <Brain size={28} className="text-zinc-700" />
        <p className="text-xs text-zinc-600 leading-relaxed">
          Save your project first to enable Project Memory. The AI will then remember your brand, libraries, and decisions across every session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-violet-400" />
          <span className="text-xs font-600 text-zinc-300">Project Memory</span>
          {memory && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-violet-600/20 text-violet-400 border border-violet-600/25">
              Active
            </span>
          )}
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-600 bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30 transition-all disabled:opacity-50"
          >
            {saving ? <Check size={11} className="animate-pulse" /> : <Save size={11} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-5 h-5 rounded-full border-2 border-violet-600/30 border-t-violet-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {/* Info banner */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-600/10 border border-violet-600/20">
            <Lightbulb size={12} className="text-violet-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Everything here is injected into every AI prompt automatically — no re-explaining needed.
            </p>
          </div>

          {/* Brand Colors */}
          <Section title="Brand Colors" icon={<Palette size={12} />} defaultOpen>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {brandColors.map((c, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 group">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.hex }} />
                  <span className="text-[11px] text-zinc-300">{c.name}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">{c.hex}</span>
                  <button onClick={() => removeColor(i)} className="opacity-0 group-hover:opacity-100 ml-0.5 text-zinc-600 hover:text-red-400 transition-all">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={newColorHex}
                onChange={e => setNewColorHex(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                value={newColorName}
                onChange={e => setNewColorName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addColor()}
                placeholder="Color name (e.g. Primary)"
                className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
              />
              <button onClick={addColor} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </Section>

          {/* Typography */}
          <Section title="Typography" icon={<Type size={12} />}>
            <input
              value={fontFamily}
              onChange={e => { setFontFamily(e.target.value); markDirty(); }}
              placeholder="Font family (e.g. Inter, Geist)"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
            />
          </Section>

          {/* Preferred Libraries */}
          <Section title="Preferred Libraries" icon={<Package size={12} />}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {preferredLibs.map((lib, i) => (
                <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 group">
                  <span className="text-[11px] text-zinc-300">{lib}</span>
                  <button onClick={() => removeLib(i)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                value={newLib}
                onChange={e => setNewLib(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLib()}
                placeholder="e.g. react-query, zustand, framer-motion"
                className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
              />
              <button onClick={addLib} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </Section>

          {/* Component Patterns */}
          <Section title="Component Patterns" icon={<Layers size={12} />}>
            <div className="space-y-1.5 mb-2">
              {patterns.map((p, i) => (
                <div key={i} className="flex items-start gap-2 px-2 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-600 text-zinc-300">{p.name}</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{p.description}</p>
                  </div>
                  <button onClick={() => removePattern(i)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <input
                value={newPatternName}
                onChange={e => setNewPatternName(e.target.value)}
                placeholder="Pattern name (e.g. Card Component)"
                className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
              />
              <div className="flex gap-1.5">
                <input
                  value={newPatternDesc}
                  onChange={e => setNewPatternDesc(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPattern()}
                  placeholder="Description (e.g. Always use rounded-xl with shadow)"
                  className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
                />
                <button onClick={addPattern} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </Section>

          {/* Past Decisions */}
          <Section title="Past Decisions" icon={<MessageSquare size={12} />}>
            <div className="space-y-1.5 mb-2">
              {decisions.slice(-8).map((d, i) => (
                <div key={d.id} className="flex items-start gap-2 px-2 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40 group">
                  <p className="flex-1 text-[11px] text-zinc-400 leading-relaxed">{d.summary}</p>
                  <button onClick={() => removeDecision(decisions.length - Math.min(8, decisions.length) + i)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input
                value={newDecision}
                onChange={e => setNewDecision(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDecision()}
                placeholder="e.g. Use Zustand for global state"
                className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50"
              />
              <button onClick={addDecision} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors">
                <Plus size={12} />
              </button>
            </div>
          </Section>

          {/* Custom Context */}
          <Section title="Custom Context" icon={<Pencil size={12} />}>
            <textarea
              value={customContext}
              onChange={e => { setCustomContext(e.target.value); markDirty(); }}
              rows={4}
              placeholder="Any additional context you want the AI to always know about this project…"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-lg px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50 resize-none leading-relaxed"
            />
          </Section>

          {/* Save button at bottom */}
          {dirty && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-600 bg-violet-600/20 border border-violet-500/40 text-violet-300 hover:bg-violet-600/30 transition-all disabled:opacity-50"
            >
              {saving ? <Check size={12} className="animate-pulse" /> : <Save size={12} />}
              {saving ? 'Saving…' : 'Save Memory'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
