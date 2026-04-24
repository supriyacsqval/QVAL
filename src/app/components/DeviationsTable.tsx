import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboardData } from '../../data/DataContext';
import type { DateRange } from './Navigation';

const PAGE_SIZE = 10;

interface DeviationsTableProps {
  productFilter: string;
  searchQuery?: string;
  dateRange?: DateRange;
}

export function DeviationsTable({ productFilter, searchQuery = '', dateRange }: DeviationsTableProps) {
  const { data } = useDashboardData();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const allCapa = data?.capa ?? [];

  const filtered = allCapa.filter((c) => {
    const matchProduct = productFilter === 'All Products' || c.productDescription === productFilter;
    const matchStatus =
      statusFilter === 'all'      ? true :
      statusFilter === 'open'     ? !c.resolutionCreatedDate :
      !!c.resolutionCreatedDate;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || [
      c.notification, c.batch, c.productDescription, c.itemText, c.taskText
    ].some(v => (v ?? '').toLowerCase().includes(q));
    const d = c.defectCreatedDate ?? '';
    const matchStart = !dateRange?.start || d >= dateRange.start;
    const matchEnd   = !dateRange?.end   || d <= dateRange.end;
    return matchProduct && matchStatus && matchSearch && matchStart && matchEnd;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageCapa   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleStatus = (s: typeof statusFilter) => { setStatusFilter(s); setPage(0); };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-red-500" />
          <h3>CAPA – Deviations</h3>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'open', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleStatus(s)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Notification</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Batch</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Product</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Deviation</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Value</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Defect Date</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Task</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageCapa.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground text-sm">
                    No records found.
                  </td>
                </tr>
              ) : pageCapa.map((c, idx) => (
                <tr key={`${c.notification}-${idx}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{c.notification}</td>
                  <td className="px-6 py-4 font-mono text-sm">{c.batch}</td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="truncate text-sm">{c.productDescription}</div>
                  </td>
                  <td className="px-6 py-4 text-sm max-w-[200px]">
                    <div className="truncate">{c.itemText}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-red-600">{c.deviationValue}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{c.defectCreatedDate}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground max-w-[200px]">
                    <div className="truncate">{c.taskText}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs ${
                      c.resolutionCreatedDate
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-red-500/10 text-red-600'
                    }`}>
                      {c.resolutionCreatedDate ? 'resolved' : 'open'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted/20 text-sm text-muted-foreground">
            <span>
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span>{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
