import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardData } from '../../data/DataContext';
import type { DateRange } from './Navigation';

interface PerformanceChartProps {
  productFilter: string;
  dateRange?: DateRange;
}

export function PerformanceChart({ productFilter, dateRange }: PerformanceChartProps) {
  const { data } = useDashboardData();

  const chartData = (() => {
    if (!data) return [];
    // Build trend for the product, then filter by date range
    const allTrend = data.buildDailyTrend(productFilter);
    if (!dateRange?.start && !dateRange?.end) return allTrend;

    // allTrend dates are already formatted as "Mon DD" labels — we need to
    // filter the raw lots instead and rebuild the trend ourselves.
    const inRange = (d: string) => {
      if (!d) return true;
      if (dateRange.start && d < dateRange.start) return false;
      if (dateRange.end   && d > dateRange.end)   return false;
      return true;
    };

    const filteredLots = data.lots.filter(l => {
      const matchProduct = productFilter === 'All Products' || l.productDescription === productFilter;
      return matchProduct && inRange(l.lotCreated ?? '');
    });

    const map = new Map<string, { passed: number; rejected: number }>();
    for (const lot of filteredLots) {
      const dateKey = lot.lotCreated;
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, { passed: 0, rejected: 0 });
      const entry = map.get(dateKey)!;
      if (lot.status === 'passed') entry.passed++;
      else if (lot.status === 'rejected') entry.rejected++;
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, counts]) => {
        const dt = new Date(dateStr + 'T00:00:00');
        const label = isNaN(dt.getTime())
          ? dateStr
          : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { date: label, ...counts };
      });
  })();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3>Inspection Pass/Reject Trend</h3>
          {productFilter !== 'All Products' && (
            <p className="text-xs text-muted-foreground mt-0.5">{productFilter}</p>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 11 }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'oklch(var(--muted-foreground))' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'oklch(var(--popover))',
              border: '1px solid oklch(var(--border))',
              borderRadius: '0.5rem',
              padding: '0.75rem',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="passed"
            stroke="#22c55e"
            strokeWidth={2}
            name="Passed"
            dot={{ r: 4, fill: '#22c55e' }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="rejected"
            stroke="#ef4444"
            strokeWidth={2}
            name="Rejected"
            dot={{ r: 4, fill: '#ef4444' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
