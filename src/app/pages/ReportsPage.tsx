import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDashboardData } from '../../data/DataContext';
import { CheckCircle2, XCircle, TrendingUp, Package } from 'lucide-react';

interface ReportsPageProps {
  productFilter: string;
}

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export function ReportsPage({ productFilter }: ReportsPageProps) {
  const { data } = useDashboardData();

  const { lots, chars, capa } = useMemo(() => {
    if (!data) return { lots: [], chars: [], capa: [] };
    const isAll = productFilter === 'All Products';
    return {
      lots:  isAll ? data.lots  : data.lots.filter(l => l.productDescription === productFilter),
      chars: isAll ? data.chars : data.chars.filter(c => c.productDescription === productFilter),
      capa:  isAll ? data.capa  : data.capa.filter(c => c.productDescription === productFilter),
    };
  }, [data, productFilter]);

  // Inspector performance
  const inspectorStats = useMemo(() => {
    const map = new Map<string, { passed: number; rejected: number }>();
    for (const lot of lots) {
      const key = lot.createdBy || 'Unknown';
      if (!map.has(key)) map.set(key, { passed: 0, rejected: 0 });
      const e = map.get(key)!;
      if (lot.status === 'passed') e.passed++;
      else if (lot.status === 'rejected') e.rejected++;
    }
    return [...map.entries()].map(([inspector, v]) => ({ inspector, ...v, total: v.passed + v.rejected }))
      .sort((a, b) => b.total - a.total).slice(0, 8);
  }, [lots]);

  // Characteristic failure rates
  const charFailures = useMemo(() => {
    const map = new Map<string, { failed: number; total: number }>();
    for (const c of chars) {
      const key = c.characteristicDesc;
      if (!map.has(key)) map.set(key, { failed: 0, total: 0 });
      const e = map.get(key)!;
      e.total++;
      if (c.valuation === 'R') e.failed++;
    }
    return [...map.entries()].map(([name, v]) => ({
      name,
      failRate: v.total > 0 ? +((v.failed / v.total) * 100).toFixed(1) : 0,
      failed: v.failed,
      total: v.total,
    })).sort((a, b) => b.failRate - a.failRate);
  }, [chars]);

  // Pass/fail pie
  const passed   = lots.filter(l => l.status === 'passed').length;
  const rejected = lots.filter(l => l.status === 'rejected').length;
  const pending  = lots.filter(l => l.status === 'pending').length;
  const pieData  = [
    { name: 'Passed',  value: passed },
    { name: 'Rejected', value: rejected },
    { name: 'Pending', value: pending },
  ].filter(d => d.value > 0);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { passed: number; rejected: number }>();
    for (const lot of lots) {
      if (!lot.lotCreated) continue;
      const monthKey = lot.lotCreated.slice(0, 7); // YYYY-MM
      if (!map.has(monthKey)) map.set(monthKey, { passed: 0, rejected: 0 });
      const e = map.get(monthKey)!;
      if (lot.status === 'passed') e.passed++;
      else if (lot.status === 'rejected') e.rejected++;
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => {
      const dt = new Date(m + '-01T00:00:00');
      return { month: dt.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), ...v };
    });
  }, [lots]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1">Reports &amp; Analytics</h1>
        <p className="text-muted-foreground">
          Aggregated quality metrics, inspector performance and characteristic failure analysis
        </p>
      </div>

      {/* ── Summary row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Lots',     value: lots.length, icon: Package,      color: 'text-primary' },
          { label: 'Pass Rate',      value: lots.length > 0 ? ((passed/lots.length)*100).toFixed(1)+'%' : '—', icon: TrendingUp, color: 'text-green-600' },
          { label: 'Rejected Lots',  value: rejected, icon: XCircle,         color: 'text-red-500' },
          { label: 'CAPA Actions',   value: capa.length, icon: CheckCircle2, color: 'text-blue-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-border p-5 flex items-center gap-4">
            <div className={`${color}`}><Icon className="size-6" /></div>
            <div>
              <div className="text-2xl font-semibold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pie chart */}
        <div className="rounded-lg border border-border p-6">
          <h3 className="mb-4">Lot Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={['#22c55e','#ef4444','#94a3b8'][i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly trend */}
        <div className="rounded-lg border border-border p-6 lg:col-span-2">
          <h3 className="mb-4">Monthly Inspection Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false}
                tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false}
                tick={{ fill: 'oklch(var(--muted-foreground))' }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'oklch(var(--popover))', border: '1px solid oklch(var(--border))', borderRadius: '0.5rem' }} />
              <Legend />
              <Line type="monotone" dataKey="passed"   stroke="#22c55e" strokeWidth={2} name="Passed"   dot={{ r: 3, fill: '#22c55e' }} />
              <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} name="Rejected" dot={{ r: 3, fill: '#ef4444' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Inspector performance ── */}
      <div className="rounded-lg border border-border p-6">
        <h3 className="mb-4">Inspector Performance</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={inspectorStats} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false}
              tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="inspector" axisLine={false} tickLine={false} width={90}
              tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: 'oklch(var(--popover))', border: '1px solid oklch(var(--border))', borderRadius: '0.5rem' }} />
            <Legend />
            <Bar dataKey="passed"   fill="#22c55e" radius={[0, 4, 4, 0]} name="Passed"   stackId="a" />
            <Bar dataKey="rejected" fill="#ef4444" radius={[0, 4, 4, 0]} name="Rejected" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Characteristic failure rates ── */}
      <div className="rounded-lg border border-border p-6">
        <h3 className="mb-4">Characteristic Failure Rates</h3>
        <div className="space-y-3">
          {charFailures.map((c) => (
            <div key={c.name} className="flex items-center gap-4">
              <div className="w-44 text-sm text-muted-foreground truncate shrink-0">{c.name}</div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${c.failRate}%`,
                    backgroundColor: c.failRate > 10 ? '#ef4444' : c.failRate > 5 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
              <div className="w-20 text-sm text-right font-mono text-muted-foreground shrink-0">
                {c.failRate}% <span className="text-xs">({c.failed}/{c.total})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
