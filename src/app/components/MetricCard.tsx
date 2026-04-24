import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  trend?: 'up' | 'down';
}

export function MetricCard({ label, value, change, trend, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border p-6 flex items-start justify-between">
      <div className="flex-1">
        <div className="text-muted-foreground mb-2">{label}</div>
        <div className="text-4xl tracking-tight mb-2">{value}</div>
        {change && (
          <div className={`inline-flex items-center gap-1 text-sm ${
            trend === 'up' ? 'text-chart-1' : 'text-destructive'
          }`}>
            <span>{change}</span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </div>
      <div className="rounded-lg bg-muted p-3">
        <Icon className="size-5 text-foreground" />
      </div>
    </div>
  );
}
