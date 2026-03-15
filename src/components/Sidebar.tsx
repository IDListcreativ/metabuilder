'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Code2, Rocket, Share2, ChevronLeft, ChevronRight, Settings, HelpCircle, LogOut, X, FolderOpen, Sun, Moon, UserCircle, CreditCard, BookOpen, Star, Database, FileText, LayoutTemplate } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect } from 'react';
import { getNotionFavorites, FavoriteNotionItem } from '@/app/ai-code-generator/components/NotionContextSelector';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  currentPath: string;
}

const navItems = [
  {
    group: 'Build',
    items: [
      { label: 'AI Generator', icon: Sparkles, href: '/ai-code-generator', badge: null },
      { label: 'Code Editor', icon: Code2, href: '/code-editor', badge: null },
      { label: 'Saved Projects', icon: FolderOpen, href: '/saved-projects', badge: null },
      { label: 'Templates', icon: LayoutTemplate, href: '/templates', badge: null },
    ],
  },
  {
    group: 'Deliver',
    items: [
      { label: 'Deployment Hub', icon: Rocket, href: '/deployment-hub', badge: '2' },
      { label: 'Export & Share', icon: Share2, href: '/export-share', badge: null },
      { label: 'Usage & Billing', icon: CreditCard, href: '/usage-billing', badge: null },
      { label: 'Notion', icon: BookOpen, href: '/notion-integration', badge: null },
    ],
  },
];

const bottomItems = [
  { label: 'Account Settings', icon: UserCircle, href: '/account-settings' },
  { label: 'Settings', icon: Settings, href: '/settings' },
  { label: 'Help', icon: HelpCircle, href: '/help' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, currentPath }: SidebarProps) {
  const pathname = usePathname();
  const activePath = currentPath || pathname;
  const { theme, toggleTheme } = useTheme();
  const [notionFavorites, setNotionFavorites] = useState<FavoriteNotionItem[]>([]);

  useEffect(() => {
    setNotionFavorites(getNotionFavorites());
    const handleUpdate = () => setNotionFavorites(getNotionFavorites());
    window.addEventListener('notion-favorites-updated', handleUpdate);
    return () => window.removeEventListener('notion-favorites-updated', handleUpdate);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex flex-col h-full bg-zinc-950 border-r border-zinc-800/60
          transition-all duration-300 ease-in-out relative z-30 travertine-panel
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* Glam accent line at top */}
        <div className="h-[2px] w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 flex-shrink-0" />

        {/* Logo */}
        <div className={`flex items-center h-14 px-3 border-b border-zinc-800/60 flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <AppLogo size={28} />
          {!collapsed && (
            <span className="font-display font-700 text-base glam-text tracking-tight">
              MetaBuilder
            </span>
          )}
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navItems.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="px-2 mb-1.5 text-[10px] font-600 uppercase tracking-widest text-zinc-600">
                  {group.group}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activePath === item.href || activePath.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`
                          group flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-500
                          transition-all duration-150 relative
                          ${isActive
                            ? 'bg-violet-600/15 text-violet-300 border border-violet-600/20'
                            : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 border border-transparent'
                          }
                          ${collapsed ? 'justify-center px-2' : ''}
                        `}
                        title={collapsed ? item.label : undefined}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-r-full" />
                        )}
                        <Icon
                          size={16}
                          className={`flex-shrink-0 transition-colors ${isActive ? 'text-violet-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                        />
                        {!collapsed && (
                          <span className="flex-1 truncate">{item.label}</span>
                        )}
                        {!collapsed && item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-700 rounded-full bg-fuchsia-500/20 text-fuchsia-400 tabular-nums">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Notion Favorites section */}
          {notionFavorites.length > 0 && (
            <div>
              {!collapsed && (
                <div className="flex items-center gap-1.5 px-2 mb-1.5">
                  <Star size={9} className="text-amber-500 fill-amber-500" />
                  <p className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">
                    Notion Favorites
                  </p>
                </div>
              )}
              <ul className="space-y-0.5">
                {notionFavorites.map((fav) => (
                  <li key={fav.id}>
                    <Link
                      href="/notion-integration"
                      className={`
                        group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-500
                        transition-all duration-150
                        text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent
                        ${collapsed ? 'justify-center px-2' : ''}
                      `}
                      title={collapsed ? fav.title : undefined}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${fav.type === 'database' ? 'bg-blue-500/15' : 'bg-zinc-800/80'}`}>
                        {fav.icon ? (
                          <span className="text-[11px] leading-none">{fav.icon}</span>
                        ) : fav.type === 'database' ? (
                          <Database size={10} className="text-blue-400" />
                        ) : (
                          <FileText size={10} className="text-zinc-500" />
                        )}
                      </div>
                      {!collapsed && (
                        <span className="flex-1 truncate">{fav.title}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Bottom items */}
        <div className="flex-shrink-0 border-t border-zinc-800/60 py-3 px-2 space-y-0.5">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300 transition-all duration-150 ${collapsed ? 'justify-center px-2' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && <span className="font-500">{item.label}</span>}
              </Link>
            );
          })}

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Warm Cream (Light)' : 'Switch to Roman Marble (Dark)'}
            className={`
              w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm
              transition-all duration-200 roman-btn border
              ${theme === 'dark' ?'text-amber-400/80 hover:text-amber-300 border-amber-900/30 hover:bg-amber-900/20 hover:border-amber-700/40' :'text-amber-700 hover:text-amber-800 border-amber-300/50 hover:bg-amber-100/60 hover:border-amber-400/60'
              }
              ${collapsed ? 'justify-center px-2' : ''}
            `}
          >
            {theme === 'dark' ? (
              <Sun size={15} className="flex-shrink-0" />
            ) : (
              <Moon size={15} className="flex-shrink-0" />
            )}
            {!collapsed && (
              <span className="font-500 flex-1 text-left">
                {theme === 'dark' ? 'Warm Cream' : 'Roman Marble'}
              </span>
            )}
          </button>

          {/* User profile */}
          <div className={`flex items-center gap-2.5 px-2 py-2 mt-1 rounded-lg hover:bg-zinc-800/60 cursor-pointer transition-all ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-700 text-white flex-shrink-0">
              A
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-600 text-zinc-200 truncate">alex@metabuilder.dev</p>
                <p className="text-[10px] text-zinc-500">Pro Plan</p>
              </div>
            )}
            {!collapsed && <LogOut size={13} className="text-zinc-600 flex-shrink-0" />}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-all duration-150 z-10"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={12} className="text-zinc-400" />
            : <ChevronLeft size={12} className="text-zinc-400" />
          }
        </button>
      </aside>

      {/* Mobile Sidebar drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-zinc-950 border-r border-zinc-800/60
          lg:hidden transition-transform duration-300 ease-in-out travertine-panel
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-[2px] w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 flex-shrink-0" />
        <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <AppLogo size={26} />
            <span className="font-700 text-base glam-text">MetaBuilder</span>
          </div>
          <button onClick={onMobileClose} className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navItems.map((group) => (
            <div key={group.group}>
              <p className="px-2 mb-1.5 text-[10px] font-600 uppercase tracking-widest text-zinc-600">{group.group}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activePath === item.href;
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onMobileClose}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-500 transition-all duration-150 ${isActive ? 'bg-violet-600/15 text-violet-300 border border-violet-600/20' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100 border border-transparent'}`}
                      >
                        <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-violet-400' : 'text-zinc-500'}`} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-700 rounded-full bg-fuchsia-500/20 text-fuchsia-400">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Mobile Notion Favorites */}
          {notionFavorites.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-1.5">
                <Star size={9} className="text-amber-500 fill-amber-500" />
                <p className="text-[10px] font-600 uppercase tracking-widest text-zinc-600">Notion Favorites</p>
              </div>
              <ul className="space-y-0.5">
                {notionFavorites.map((fav) => (
                  <li key={fav.id}>
                    <Link
                      href="/notion-integration"
                      onClick={onMobileClose}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-500 text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-200 border border-transparent transition-all duration-150"
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${fav.type === 'database' ? 'bg-blue-500/15' : 'bg-zinc-800/80'}`}>
                        {fav.icon ? (
                          <span className="text-[11px] leading-none">{fav.icon}</span>
                        ) : fav.type === 'database' ? (
                          <Database size={10} className="text-blue-400" />
                        ) : (
                          <FileText size={10} className="text-zinc-500" />
                        )}
                      </div>
                      <span className="flex-1 truncate">{fav.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
        {/* Mobile theme switcher */}
        <div className="flex-shrink-0 border-t border-zinc-800/60 py-3 px-2">
          <button
            onClick={toggleTheme}
            className={`
              w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 roman-btn border
              ${theme === 'dark' ?'text-amber-400/80 hover:text-amber-300 border-amber-900/30 hover:bg-amber-900/20' :'text-amber-700 hover:text-amber-800 border-amber-300/50 hover:bg-amber-100/60'
              }
            `}
          >
            {theme === 'dark' ? <Sun size={15} className="flex-shrink-0" /> : <Moon size={15} className="flex-shrink-0" />}
            <span className="font-500">{theme === 'dark' ? 'Warm Cream' : 'Roman Marble'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}