import { Search, Plus, ChevronDown, LayoutDashboard, ClipboardList, AlertTriangle, BarChart3, Bell, CalendarRange, X } from 'lucide-react';
import { useState } from 'react';

export type NavPage = 'overview' | 'inspections' | 'deviations' | 'reports';

export interface DateRange {
  start: string; // 'YYYY-MM-DD' or ''
  end: string;
}

interface NavigationProps {
  activePage: NavPage;
  onPageChange: (page: NavPage) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  openDeviations?: number;
  dateRange: DateRange;
  onDateRangeChange: (r: DateRange) => void;
}

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'inspections', label: 'Inspections', icon: ClipboardList   },
  { id: 'deviations',  label: 'Deviations',  icon: AlertTriangle   },
  { id: 'reports',     label: 'Reports',     icon: BarChart3       },
];

export function Navigation({
  activePage,
  onPageChange,
  searchQuery,
  onSearchChange,
  openDeviations = 0,
  dateRange,
  onDateRangeChange,
}: NavigationProps) {
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const isDateActive = !!(dateRange.start || dateRange.end);

  const clearDates = () => {
    onDateRangeChange({ start: '', end: '' });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-6 px-6">

        {/* ── Brand ── */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-primary flex items-center justify-center">
              <BarChart3 className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">QualityControl</span>
          </div>

          {/* ── Nav tabs ── */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onPageChange(id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  activePage === id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
                {/* Badge for open deviations on the Deviations tab */}
                {id === 'deviations' && openDeviations > 0 && (
                  <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                    {openDeviations}
                  </span>
                )}
                {/* Active underline */}
                {activePage === id && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Right side ── */}
        <div className="flex items-center gap-3">

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                activePage === 'inspections' ? 'Search lots, batches, products…' :
                activePage === 'deviations'  ? 'Search notifications, batches…' :
                'Search…'
              }
              className="h-8 w-56 rounded-md border border-border bg-muted/40 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:w-72 transition-all"
            />
          </div>

          {/* Date range picker */}
          <div className="relative">
            <button
              id="date-range-picker-btn"
              onClick={() => setIsDatePickerOpen((o) => !o)}
              title="Filter by date range"
              className={`relative flex items-center gap-1.5 h-8 px-2.5 rounded-md text-sm transition-colors ${
                isDateActive
                  ? 'bg-primary/10 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
              }`}
            >
              <CalendarRange className="size-4" />
              {isDateActive && (
                <span className="text-xs font-medium">
                  {dateRange.start || '…'} → {dateRange.end || '…'}
                </span>
              )}
            </button>

            {isDatePickerOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDatePickerOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-popover shadow-xl z-20 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="size-4 text-primary" />
                      <span className="text-sm font-semibold">Date Range Filter</span>
                    </div>
                    <button
                      onClick={() => setIsDatePickerOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date</label>
                      <input
                        id="date-range-start"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                        className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date</label>
                      <input
                        id="date-range-end"
                        type="date"
                        value={dateRange.end}
                        min={dateRange.start || undefined}
                        onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                        className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                      />
                    </div>

                    {isDateActive && (
                      <button
                        onClick={() => { clearDates(); setIsDatePickerOpen(false); }}
                        className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <X className="size-3.5" /> Clear filter
                      </button>
                    )}
                  </div>

                  {isDateActive && (
                    <div className="px-4 pb-3 text-xs text-muted-foreground">
                      Filtering: <span className="text-foreground font-medium">{dateRange.start || 'any'}</span> → <span className="text-foreground font-medium">{dateRange.end || 'any'}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Notification bell */}
          <button className="relative flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            <Bell className="size-4" />
            {openDeviations > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* New inspection */}
          <button
            onClick={() => onPageChange('inspections')}
            className="hidden sm:flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            New Inspection
          </button>

          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <div className="size-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                QC
              </div>
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>

            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover p-1 shadow-lg z-20">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-sm font-medium">QC Inspector</p>
                    <p className="text-xs text-muted-foreground">Plant 1010</p>
                  </div>
                  <a href="#" className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent transition-colors">
                    Profile
                  </a>
                  <a href="#" className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent transition-colors">
                    Settings
                  </a>
                  <div className="my-1 h-px bg-border" />
                  <a href="#" className="flex items-center gap-2 rounded px-3 py-2 text-sm text-red-500 hover:bg-accent transition-colors">
                    Sign Out
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
