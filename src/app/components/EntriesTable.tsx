import { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDashboardData } from '../../data/DataContext';
import type { DateRange } from './Navigation';

const PAGE_SIZE = 10;

interface EntriesTableProps {
  productFilter: string;
  searchQuery?: string;
  dateRange?: DateRange;
}

export function EntriesTable({ productFilter, searchQuery = '', dateRange }: EntriesTableProps) {
  const { data } = useDashboardData();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'rejected' | 'pending'>('all');

  const allLots = data?.lots ?? [];

  const filtered = allLots.filter((l) => {
    const matchProduct = productFilter === 'All Products' || l.productDescription === productFilter;
    const matchStatus  = statusFilter === 'all' || l.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch  = !q || [
      l.objectNumber, l.productDescription, l.batch, l.createdBy, l.inspectionLot
    ].some(v => (v ?? '').toLowerCase().includes(q));
    const d = l.lotCreated ?? '';
    const matchStart = !dateRange?.start || d >= dateRange.start;
    const matchEnd   = !dateRange?.end   || d <= dateRange.end;
    return matchProduct && matchStatus && matchSearch && matchStart && matchEnd;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageLots   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filter changes
  const handleStatus = (s: typeof statusFilter) => { setStatusFilter(s); setPage(0); };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h3>Inspection Lots</h3>
        <div className="flex items-center gap-2">
          {(['all', 'passed', 'rejected', 'pending'] as const).map((s) => (
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
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Inspection Lot</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Product</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Batch</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Inspector</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Date</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm text-muted-foreground">Failed Tests</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageLots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground text-sm">
                    No records found.
                  </td>
                </tr>
              ) : pageLots.map((lot, idx) => (
                <tr key={`${lot.objectNumber}-${idx}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-sm">{lot.objectNumber}</td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="truncate text-sm">{lot.productDescription}</div>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm">{lot.batch}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{lot.createdBy}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{lot.lotCreated}</td>
                  <td className="px-6 py-4">
                    {lot.status === 'passed' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-green-500/10 text-green-600 text-xs">
                        <CheckCircle2 className="size-3" /> Passed
                      </span>
                    )}
                    {lot.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-red-500/10 text-red-600 text-xs">
                        <XCircle className="size-3" /> Rejected
                      </span>
                    )}
                    {lot.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-muted text-muted-foreground text-xs">
                        <AlertCircle className="size-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {(lot.failedTests ?? 0) > 0 ? (
                      <span className="text-red-600">{lot.failedTests}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
