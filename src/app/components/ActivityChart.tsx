import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDashboardData } from '../../data/DataContext';
import type { DateRange } from './Navigation';

interface ActivityChartProps {
  productFilter: string;
  dateRange?: DateRange;
}

export function ActivityChart({ productFilter, dateRange }: ActivityChartProps) {
  const { data } = useDashboardData();

  const chartData = (() => {
    if (!data) return [];

    const inRange = (d: string) => {
      if (!d) return true;
      if (dateRange?.start && d < dateRange.start) return false;
      if (dateRange?.end   && d > dateRange.end)   return false;
      return true;
    };

    // Filter lots by date range first
    const filteredLots = data.lots.filter(l => inRange(l.lotCreated ?? ''));

    if (productFilter === 'All Products') {
      // Rebuild product summary from date-filtered lots
      const map = new Map<string, { passed: number; rejected: number }>();
      for (const lot of filteredLots) {
        const key = lot.productDescription || 'Unknown';
        if (!map.has(key)) map.set(key, { passed: 0, rejected: 0 });
        const entry = map.get(key)!;
        if (lot.status === 'passed') entry.passed++;
        else if (lot.status === 'rejected') entry.rejected++;
      }
      return [...map.entries()].map(([desc, counts]) => ({
        product: desc.replace(' Tablets', '').replace('(', '').replace(')', '').trim(),
        ...counts,
      }));
    }

    // Single-product: show it with date-filtered numbers
    const lots = filteredLots.filter(l => l.productDescription === productFilter);
    const passed   = lots.filter(l => l.status === 'passed').length;
    const rejected = lots.filter(l => l.status === 'rejected').length;
    const label = productFilter.replace(' Tablets', '').replace('(', '').replace(')', '').trim();
    return [{ product: label, passed, rejected }];
  })();

  return (
    <div>
      <div className="mb-6">
        <h3>Product Quality Performance</h3>
        {productFilter !== 'All Products' && (
          <p className="text-xs text-muted-foreground mt-0.5">{productFilter}</p>
        )}
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" vertical={false} />
          <XAxis
            dataKey="product"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'oklch(var(--muted-foreground))', fontSize: 11 }}
            angle={-20}
            textAnchor="end"
            height={70}
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
          <Bar dataKey="passed"   fill="#22c55e" radius={[4, 4, 0, 0]} name="Passed" />
          <Bar dataKey="rejected" fill="#ef4444" radius={[4, 4, 0, 0]} name="Rejected" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
