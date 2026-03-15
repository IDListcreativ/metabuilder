'use client';

import { useState } from 'react';
import { Menu, Bell, Search, Zap, ChevronDown } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';


interface TopbarProps {
  onMobileMenuToggle: () => void;
  sidebarCollapsed: boolean;
}

export default function Topbar({ onMobileMenuToggle, sidebarCollapsed }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="flex items-center h-14 px-4 lg:px-6 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm flex-shrink-0 z-20 gap-3 travertine-panel">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2">
        <AppLogo size={24} />
        <span className="font-700 text-sm glam-text">MetaBuilder</span>
      </div>

      {/* Search */}
      <div className="hidden md:flex flex-1 max-w-sm">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search projects, files…"
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-600/50 focus:ring-1 focus:ring-violet-600/30 transition-all"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 font-mono bg-zinc-800 px-1 py-0.5 rounded">⌘K</kbd>
        </div>
      </div>

      <div className="flex-1 md:flex-none" />

      {/* Token balance */}
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/10 border border-violet-600/20">
        <Zap size={12} className="text-violet-400" />
        <span className="text-xs font-600 text-violet-300 tabular-nums">48,204</span>
        <span className="text-[10px] text-zinc-500">tokens</span>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="relative p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-fuchsia-500 border border-zinc-950" />
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-10 w-72 glass-card rounded-xl border border-zinc-800/60 shadow-card z-50 overflow-hidden slide-up">
            <div className="px-4 py-3 border-b border-zinc-800/60">
              <p className="text-sm font-600 text-zinc-200">Notifications</p>
            </div>
            <div className="divide-y divide-zinc-800/40">
              {[
                { title: 'Deploy succeeded', sub: 'react-dashboard → Vercel', time: '2m ago', dot: 'bg-green-500' },
                { title: 'Generation complete', sub: 'ecommerce-app · 14 files', time: '18m ago', dot: 'bg-violet-500' },
                { title: 'GitHub export ready', sub: 'analytics-tool pushed', time: '1h ago', dot: 'bg-blue-500' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-600 text-zinc-200 truncate">{n.title}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{n.sub}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 flex-shrink-0">{n.time}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-zinc-800/60">
              <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all</button>
            </div>
          </div>
        )}
      </div>

      {/* User avatar */}
      <div className="flex items-center gap-2 cursor-pointer group">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-700 text-white">
          A
        </div>
        <ChevronDown size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors hidden sm:block" />
      </div>
    </header>
  );
}