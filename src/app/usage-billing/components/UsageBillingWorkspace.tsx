'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  DollarSign,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ChevronDown,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Icon from '@/components/ui/AppIcon';
import { toast } from 'sonner';


// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectUsage {
  name: string;
  tokens: number;
  cost: number;
  requests: number;
  model: string;
  color: string;
}

interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
}

interface QuotaLimit {
  label: string;
  used: number;
  limit: number;
  unit: string;
  status: 'ok' | 'warning' | 'critical';
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const dailyUsage: DailyUsage[] = [
  { date: 'Mar 1', tokens: 42000, cost: 0.84 },
  { date: 'Mar 2', tokens: 58000, cost: 1.16 },
  { date: 'Mar 3', tokens: 31000, cost: 0.62 },
  { date: 'Mar 4', tokens: 75000, cost: 1.5 },
  { date: 'Mar 5', tokens: 91000, cost: 1.82 },
  { date: 'Mar 6', tokens: 64000, cost: 1.28 },
  { date: 'Mar 7', tokens: 48000, cost: 0.96 },
  { date: 'Mar 8', tokens: 112000, cost: 2.24 },
  { date: 'Mar 9', tokens: 87000, cost: 1.74 },
  { date: 'Mar 10', tokens: 95000, cost: 1.9 },
  { date: 'Mar 11', tokens: 73000, cost: 1.46 },
  { date: 'Mar 12', tokens: 128000, cost: 2.56 },
  { date: 'Mar 13', tokens: 104000, cost: 2.08 },
  { date: 'Mar 14', tokens: 89000, cost: 1.78 },
  { date: 'Mar 15', tokens: 61000, cost: 1.22 },
];

const projectUsage: ProjectUsage[] = [
  { name: 'E-commerce Dashboard', tokens: 312000, cost: 6.24, requests: 847, model: 'gpt-4o', color: '#a78bfa' },
  { name: 'SaaS Landing Page', tokens: 198000, cost: 3.96, requests: 512, model: 'gpt-4o-mini', color: '#f472b6' },
  { name: 'Portfolio Builder', tokens: 145000, cost: 2.9, requests: 389, model: 'gpt-4o-mini', color: '#34d399' },
  { name: 'Admin Panel', tokens: 98000, cost: 1.96, requests: 241, model: 'gpt-4o', color: '#60a5fa' },
  { name: 'Blog Platform', tokens: 67000, cost: 1.34, requests: 178, model: 'gpt-4o-mini', color: '#fbbf24' },
  { name: 'Other', tokens: 38000, cost: 0.76, requests: 94, model: '—', color: '#71717a' },
];

const quotaLimits: QuotaLimit[] = [
  { label: 'Monthly Token Limit', used: 858000, limit: 1000000, unit: 'tokens', status: 'warning' },
  { label: 'Requests per Minute', used: 42, limit: 60, unit: 'RPM', status: 'ok' },
  { label: 'Requests per Day', used: 2261, limit: 10000, unit: 'req/day', status: 'ok' },
  { label: 'Monthly Spend Cap', used: 17.16, limit: 25, unit: 'USD', status: 'warning' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

function getQuotaPct(used: number, limit: number): number {
  return Math.min(100, (used / limit) * 100);
}

const statusConfig = {
  ok: { color: 'text-emerald-400', bar: 'bg-emerald-500', icon: CheckCircle2, label: 'Healthy' },
  warning: { color: 'text-amber-400', bar: 'bg-amber-500', icon: AlertTriangle, label: 'Near Limit' },
  critical: { color: 'text-red-400', bar: 'bg-red-500', icon: XCircle, label: 'Critical' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  trendUp,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex flex-col gap-3 travertine-panel">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={17} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-600 ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-700 text-zinc-100 tabular-nums">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function QuotaBar({ quota }: { quota: QuotaLimit }) {
  const pct = getQuotaPct(quota.used, quota.limit);
  const cfg = statusConfig[quota.status];
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon size={13} className={cfg.color} />
          <span className="text-sm font-500 text-zinc-300">{quota.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-600 px-1.5 py-0.5 rounded-full border ${
            quota.status === 'ok' ?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : quota.status === 'warning' ?'bg-amber-500/10 border-amber-500/20 text-amber-400' :'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {cfg.label}
          </span>
          <span className="text-xs text-zinc-500 tabular-nums">
            {quota.unit === 'USD'
              ? `$${quota.used.toFixed(2)} / $${quota.limit}`
              : `${formatTokens(quota.used)} / ${formatTokens(quota.limit)} ${quota.unit}`}
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-zinc-600 text-right">{pct.toFixed(1)}% used</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700/60 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="font-600" style={{ color: p.color }}>
          {p.dataKey === 'tokens' ? formatTokens(p.value) + ' tokens' : formatCost(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'overview' | 'projects' | 'quotas';

export default function UsageBillingWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [chartMetric, setChartMetric] = useState<'tokens' | 'cost'>('tokens');
  const [refreshing, setRefreshing] = useState(false);

  // ── Toast alerts for quota thresholds ──────────────────────────────────────
  useEffect(() => {
    const MONTHLY_TOKEN_WARN = 0.75;
    const RATE_LIMIT_WARN = 0.75;

    quotaLimits.forEach((quota) => {
      const pct = quota.used / quota.limit;

      if (quota.label === 'Monthly Token Limit' && pct >= MONTHLY_TOKEN_WARN) {
        const pctDisplay = Math.round(pct * 100);
        toast.warning(`Monthly token usage at ${pctDisplay}%`, {
          description: `You've used ${formatTokens(quota.used)} of ${formatTokens(quota.limit)} tokens this month. Consider upgrading your plan.`,
          duration: 8000,
          id: 'monthly-token-alert',
        });
      }

      if (quota.label === 'Requests per Minute' && pct >= RATE_LIMIT_WARN) {
        const pctDisplay = Math.round(pct * 100);
        toast.warning(`API rate limit at ${pctDisplay}%`, {
          description: `RPM usage: ${quota.used} / ${quota.limit} requests per minute. Slow down requests to avoid throttling.`,
          duration: 8000,
          id: 'rpm-alert',
        });
      }

      if (quota.label === 'Requests per Day' && pct >= RATE_LIMIT_WARN) {
        const pctDisplay = Math.round(pct * 100);
        toast.warning(`Daily request limit at ${pctDisplay}%`, {
          description: `RPD usage: ${quota.used.toLocaleString()} / ${quota.limit.toLocaleString()} requests today.`,
          duration: 8000,
          id: 'rpd-alert',
        });
      }

      if (quota.label === 'Monthly Spend Cap' && pct >= RATE_LIMIT_WARN) {
        const pctDisplay = Math.round(pct * 100);
        toast.warning(`Monthly spend cap at ${pctDisplay}%`, {
          description: `Spend: $${quota.used.toFixed(2)} of $${quota.limit} cap. Review your usage to avoid service interruption.`,
          duration: 8000,
          id: 'spend-cap-alert',
        });
      }
    });
  }, []);

  const totalTokens = dailyUsage.reduce((s, d) => s + d.tokens, 0);
  const totalCost = dailyUsage.reduce((s, d) => s + d.cost, 0);
  const totalRequests = projectUsage.reduce((s, p) => s + p.requests, 0);
  const avgCostPerRequest = totalCost / totalRequests;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'projects', label: 'Project Breakdown' },
    { id: 'quotas', label: 'API Quota Limits' },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-950 stone-editor-bg overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 flex-shrink-0 travertine-panel sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-700 text-zinc-100">Usage &amp; Billing</h1>
          <p className="text-xs text-zinc-500 mt-0.5">OpenAI token consumption, costs, and API quota status</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs text-zinc-400">
            <Clock size={12} />
            <span>Mar 1 – Mar 15, 2026</span>
            <ChevronDown size={12} />
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0 border-b border-zinc-800/60 flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-500 rounded-t-lg border-b-2 transition-all duration-150 -mb-px ${
              activeTab === tab.id
                ? 'text-violet-300 border-violet-500 bg-violet-600/10'
                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:border-zinc-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-6 py-6 space-y-6">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                icon={Zap}
                label="Total Tokens (MTD)"
                value={formatTokens(totalTokens)}
                sub="gpt-4o + gpt-4o-mini"
                trend="+12.4%"
                trendUp={true}
                accent="bg-violet-600"
              />
              <StatCard
                icon={DollarSign}
                label="Total Cost (MTD)"
                value={formatCost(totalCost)}
                sub="Across all projects"
                trend="+8.7%"
                trendUp={true}
                accent="bg-fuchsia-600"
              />
              <StatCard
                icon={BarChart3}
                label="API Requests (MTD)"
                value={totalRequests.toLocaleString()}
                sub="Successful completions"
                trend="+5.2%"
                trendUp={true}
                accent="bg-pink-600"
              />
              <StatCard
                icon={DollarSign}
                label="Avg Cost / Request"
                value={`$${avgCostPerRequest.toFixed(4)}`}
                sub="Blended across models"
                trend="-3.1%"
                trendUp={false}
                accent="bg-indigo-600"
              />
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 travertine-panel">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-sm font-600 text-zinc-200">Daily Usage Trend</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Token consumption and cost over time</p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
                  <button
                    onClick={() => setChartMetric('tokens')}
                    className={`px-3 py-1 rounded-md text-xs font-500 transition-all ${
                      chartMetric === 'tokens' ?'bg-violet-600 text-white' :'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Tokens
                  </button>
                  <button
                    onClick={() => setChartMetric('cost')}
                    className={`px-3 py-1 rounded-md text-xs font-500 transition-all ${
                      chartMetric === 'cost' ?'bg-violet-600 text-white' :'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Cost
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dailyUsage} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f472b6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f472b6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      chartMetric === 'tokens' ? formatTokens(v) : `$${v.toFixed(1)}`
                    }
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke={chartMetric === 'tokens' ? '#a78bfa' : '#f472b6'}
                    strokeWidth={2}
                    fill={chartMetric === 'tokens' ? 'url(#gradTokens)' : 'url(#gradCost)'}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Model breakdown mini */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 travertine-panel">
                <h2 className="text-sm font-600 text-zinc-200 mb-4">Model Breakdown</h2>
                <div className="space-y-3">
                  {[
                    { model: 'gpt-4o', tokens: 410000, cost: 8.2, pct: 48 },
                    { model: 'gpt-4o-mini', tokens: 448000, cost: 8.96, pct: 52 },
                  ].map((m) => (
                    <div key={m.model} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-600 text-zinc-300 font-mono">{m.model}</span>
                        <span className="text-zinc-500 tabular-nums">
                          {formatTokens(m.tokens)} · {formatCost(m.cost)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 travertine-panel">
                <h2 className="text-sm font-600 text-zinc-200 mb-4">Billing Estimate</h2>
                <div className="space-y-2.5">
                  {[
                    { label: 'gpt-4o input tokens', value: '$4.10' },
                    { label: 'gpt-4o output tokens', value: '$4.10' },
                    { label: 'gpt-4o-mini input tokens', value: '$0.27' },
                    { label: 'gpt-4o-mini output tokens', value: '$0.27' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">{row.label}</span>
                      <span className="font-600 text-zinc-300 tabular-nums">{row.value}</span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-800 pt-2.5 flex items-center justify-between text-sm">
                    <span className="font-600 text-zinc-200">Estimated Total</span>
                    <span className="font-700 text-violet-300 tabular-nums">{formatCost(totalCost)}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── PROJECTS TAB ── */}
        {activeTab === 'projects' && (
          <>
            {/* Bar chart */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-5 travertine-panel">
              <div className="mb-5">
                <h2 className="text-sm font-600 text-zinc-200">Token Spend by Project</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Cumulative token usage across all projects this month</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projectUsage} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#71717a', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis
                    tick={{ fill: '#71717a', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatTokens(v)}
                    width={44}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tokens" radius={[4, 4, 0, 0]}>
                    {projectUsage.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Project table */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden travertine-panel">
              <div className="px-5 py-4 border-b border-zinc-800/60">
                <h2 className="text-sm font-600 text-zinc-200">Project Details</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      {['Project', 'Model', 'Tokens', 'Cost', 'Requests', 'Avg / Req'].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-[11px] font-600 uppercase tracking-wider text-zinc-600"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projectUsage.map((p, i) => (
                      <tr
                        key={p.name}
                        className={`border-b border-zinc-800/40 hover:bg-zinc-800/30 transition-colors ${
                          i === projectUsage.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="font-500 text-zinc-200 truncate max-w-[160px]">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/40">
                            {p.model}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-300 tabular-nums font-500">{formatTokens(p.tokens)}</td>
                        <td className="px-5 py-3 text-zinc-300 tabular-nums font-500">{formatCost(p.cost)}</td>
                        <td className="px-5 py-3 text-zinc-400 tabular-nums">{p.requests.toLocaleString()}</td>
                        <td className="px-5 py-3 text-zinc-500 tabular-nums text-xs">
                          ${(p.cost / p.requests).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-800/30 border-t border-zinc-700/60">
                      <td className="px-5 py-3 font-700 text-zinc-200" colSpan={2}>Total</td>
                      <td className="px-5 py-3 font-700 text-violet-300 tabular-nums">
                        {formatTokens(projectUsage.reduce((s, p) => s + p.tokens, 0))}
                      </td>
                      <td className="px-5 py-3 font-700 text-violet-300 tabular-nums">
                        {formatCost(projectUsage.reduce((s, p) => s + p.cost, 0))}
                      </td>
                      <td className="px-5 py-3 font-700 text-zinc-300 tabular-nums">
                        {projectUsage.reduce((s, p) => s + p.requests, 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── QUOTAS TAB ── */}
        {activeTab === 'quotas' && (
          <>
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <Info size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300/80 leading-relaxed">
                Quota limits are set in your{' '}
                <a
                  href="https://platform.openai.com/account/limits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-amber-200 transition-colors"
                >
                  OpenAI account settings
                </a>
                . Usage shown here is estimated based on API responses and may differ slightly from OpenAI's dashboard.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-6 space-y-6 travertine-panel">
              <div>
                <h2 className="text-sm font-600 text-zinc-200">API Rate &amp; Spend Limits</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Current consumption against configured limits</p>
              </div>
              {quotaLimits.map((q) => (
                <QuotaBar key={q.label} quota={q} />
              ))}
            </div>

            {/* Rate limit tiers */}
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 overflow-hidden travertine-panel">
              <div className="px-5 py-4 border-b border-zinc-800/60">
                <h2 className="text-sm font-600 text-zinc-200">Model Rate Limits</h2>
                <p className="text-xs text-zinc-500 mt-1">Per-model TPM and RPM limits for your tier</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      {['Model', 'TPM Limit', 'RPM Limit', 'TPD Limit', 'Tier'].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-left text-[11px] font-600 uppercase tracking-wider text-zinc-600"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { model: 'gpt-4o', tpm: '30,000', rpm: '500', tpd: '90,000', tier: 'Tier 2' },
                      { model: 'gpt-4o-mini', tpm: '200,000', rpm: '500', tpd: '2,000,000', tier: 'Tier 2' },
                      { model: 'gpt-4-turbo', tpm: '30,000', rpm: '500', tpd: '90,000', tier: 'Tier 2' },
                    ].map((row, i, arr) => (
                      <tr
                        key={row.model}
                        className={`hover:bg-zinc-800/30 transition-colors ${i < arr.length - 1 ? 'border-b border-zinc-800/40' : ''}`}
                      >
                        <td className="px-5 py-3">
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/40">
                            {row.model}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-400 tabular-nums text-xs">{row.tpm}</td>
                        <td className="px-5 py-3 text-zinc-400 tabular-nums text-xs">{row.rpm}</td>
                        <td className="px-5 py-3 text-zinc-400 tabular-nums text-xs">{row.tpd}</td>
                        <td className="px-5 py-3">
                          <span className="text-xs font-600 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">
                            {row.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
