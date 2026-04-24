import { useState, useMemo } from 'react';
import { Navigation, type NavPage, type DateRange } from './components/Navigation';
import { MetricCard } from './components/MetricCard';
import { PerformanceChart } from './components/PerformanceChart';
import { ActivityChart } from './components/ActivityChart';
import { EntriesTable } from './components/EntriesTable';
import { DeviationsTable } from './components/DeviationsTable';
import { CharacteristicsPanel } from './components/CharacteristicsPanel';
import { InspectionsPage } from './pages/InspectionsPage';
import { DeviationsPage } from './pages/DeviationsPage';
import { ReportsPage } from './pages/ReportsPage';
import {
  ClipboardCheck, XCircle, AlertTriangle, TrendingUp,
  Loader2, ChevronDown, Filter,
} from 'lucide-react';
import { useDashboardData } from '../data/DataContext';
import type { CapaRecord, CharacteristicRecord, InspectionLotRecord } from '../data/types';

function computeMetrics(
  lots: InspectionLotRecord[],
  chars: CharacteristicRecord[],
  capa: CapaRecord[],
  product: string,
  dateRange: { start: string; end: string },
) {
  // Apply date filter first (lotCreated is YYYY-MM-DD, string comparison is safe)
  const inRange = (d: string) => {
    if (!d) return true;
    if (dateRange.start && d < dateRange.start) return false;
    if (dateRange.end   && d > dateRange.end)   return false;
    return true;
  };

  const dateLots = lots.filter(l => inRange(l.lotCreated ?? ''));
  const dateCapa = capa.filter(c => inRange(c.defectCreatedDate ?? ''));

  const fLots  = product === 'All Products' ? dateLots  : dateLots.filter(l  => l.productDescription  === product);
  const fChars = product === 'All Products' ? chars     : chars.filter(c    => c.productDescription  === product);
  const fCapa  = product === 'All Products' ? dateCapa  : dateCapa.filter(c  => c.productDescription  === product);

  const total    = fLots.length;
  const passed   = fLots.filter(l => l.status === 'passed').length;
  const rejected = fLots.filter(l => l.status === 'rejected').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '—';
  const inSpec    = fChars.filter(c => c.valuation === 'A').length;
  const outOfSpec = fChars.filter(c => c.valuation === 'R').length;
  const openDev   = fCapa.filter(c => !c.resolutionCreatedDate).length;

  return { total, passRate, rejected, openDev, inSpec, outOfSpec, capaTotal: fCapa.length };
}

export default function App() {
  const { data, loading, error } = useDashboardData();

  const [activePage,       setActivePage]       = useState<NavPage>('overview');
  const [selectedProduct,  setSelectedProduct]  = useState('All Products');
  const [productDropOpen,  setProductDropOpen]  = useState(false);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [dateRange,        setDateRange]        = useState<DateRange>({ start: '', end: '' });

  // Reset search when page changes
  const handlePageChange = (page: NavPage) => {
    setActivePage(page);
    setSearchQuery('');
  };

  const products = data?.products ?? ['All Products'];

  const metrics = useMemo(() => {
    if (!data) return null;
    return computeMetrics(data.lots, data.chars, data.capa, selectedProduct, dateRange);
  }, [data, selectedProduct, dateRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard data…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 max-w-md">
          <h2 className="text-destructive mb-2">Failed to load data</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        activePage={activePage}
        onPageChange={handlePageChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        openDeviations={metrics?.openDev ?? 0}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <main className="px-6 py-8 max-w-[1600px] mx-auto">

        {/* ── Overview page ── */}
        {activePage === 'overview' && (
          <>
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="mb-1">Quality Control Dashboard</h1>
                <p className="text-muted-foreground">
                  Real-time monitoring of inspection lots, batch quality, and deviations
                </p>
              </div>

              {/* Global product selector */}
              <div className="relative">
                <button
                  id="global-product-selector"
                  onClick={() => setProductDropOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-sm font-medium shadow-sm"
                >
                  <Filter className="size-4 text-muted-foreground" />
                  <span className="max-w-[200px] truncate">{selectedProduct}</span>
                  <ChevronDown className={`size-4 text-muted-foreground transition-transform ${productDropOpen ? 'rotate-180' : ''}`} />
                </button>

                {productDropOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProductDropOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-popover shadow-xl z-20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-border text-xs text-muted-foreground font-medium">
                        Filter all panels by product
                      </div>
                      <div className="max-h-72 overflow-y-auto p-1">
                        {products.map(p => (
                          <button
                            key={p}
                            onClick={() => { setSelectedProduct(p); setProductDropOpen(false); }}
                            className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                              selectedProduct === p
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'hover:bg-accent'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard label="Total Inspections" value={String(metrics!.total)}    icon={ClipboardCheck} />
              <MetricCard label="Pass Rate"          value={metrics!.passRate}         icon={TrendingUp} />
              <MetricCard label="Rejected Batches"   value={String(metrics!.rejected)} icon={XCircle} />
              <MetricCard label="Open Deviations"    value={String(metrics!.openDev)}  icon={AlertTriangle} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="rounded-lg border border-border p-6">
                <PerformanceChart productFilter={selectedProduct} dateRange={dateRange} />
              </div>
              <div className="rounded-lg border border-border p-6">
                <ActivityChart productFilter={selectedProduct} dateRange={dateRange} />
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="rounded-lg border border-border p-6">
                <div className="text-sm text-muted-foreground mb-2">In-Spec Tests</div>
                <div className="text-3xl mb-1">{metrics!.inSpec.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Characteristics within range</div>
              </div>
              <div className="rounded-lg border border-border p-6">
                <div className="text-sm text-muted-foreground mb-2">Out-of-Spec Tests</div>
                <div className="text-3xl mb-1">{metrics!.outOfSpec.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Require investigation</div>
              </div>
              <div className="rounded-lg border border-border p-6">
                <div className="text-sm text-muted-foreground mb-2">Total CAPA Records</div>
                <div className="text-3xl mb-1">{metrics!.capaTotal.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Corrective actions logged</div>
              </div>
            </div>

            {/* Tables preview */}
            <div className="space-y-8">
              <CharacteristicsPanel productFilter={selectedProduct} dateRange={dateRange} />
              <EntriesTable         productFilter={selectedProduct} searchQuery={searchQuery} dateRange={dateRange} />
              <DeviationsTable      productFilter={selectedProduct} searchQuery={searchQuery} dateRange={dateRange} />
            </div>
          </>
        )}

        {/* ── Inspections page ── */}
        {activePage === 'inspections' && (
          <InspectionsPage productFilter={selectedProduct} searchQuery={searchQuery} dateRange={dateRange} />
        )}

        {/* ── Deviations page ── */}
        {activePage === 'deviations' && (
          <DeviationsPage productFilter={selectedProduct} searchQuery={searchQuery} dateRange={dateRange} />
        )}

        {/* ── Reports page ── */}
        {activePage === 'reports' && (
          <ReportsPage productFilter={selectedProduct} />
        )}
      </main>
    </div>
  );
}