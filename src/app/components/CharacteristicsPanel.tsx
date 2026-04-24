import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { useDashboardData } from '../../data/DataContext';
import type { DateRange } from './Navigation';

interface CharacteristicsPanelProps {
  productFilter: string;
  dateRange?: DateRange;
}

export function CharacteristicsPanel({ productFilter }: CharacteristicsPanelProps) {
  const { data } = useDashboardData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<string | null>(null);

  const lots = useMemo(() => {
    if (!data) return [];
    const chars = productFilter === 'All Products'
      ? data.chars
      : data.chars.filter((c) => c.productDescription === productFilter);
    return Array.from(new Set(chars.map((c) => c.inspectionLot))).sort();
  }, [data, productFilter]);

  const activeLot = lots.includes(selectedLot ?? '') ? selectedLot! : (lots[0] ?? null);

  const chars = useMemo(() => {
    if (!data || !activeLot) return [];
    return data.chars.filter((c) => c.inspectionLot === activeLot);
  }, [data, activeLot]);

  const meta        = chars[0] ?? null;
  const passedCount = chars.filter((c) => c.valuation === 'A').length;
  const failedCount = chars.filter((c) => c.valuation === 'R').length;
  const specLimits  = data?.specLimits ?? {};

  return (
    <div className="rounded-lg border border-border p-5">
      {/* ── Header ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-base">Test Characteristics</h3>

          {/* Lot picker */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:bg-muted transition-colors text-xs font-mono"
            >
              {activeLot ?? '—'}
              <ChevronDown className="size-3 text-muted-foreground" />
            </button>
            {isOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                <div className="absolute left-0 mt-1.5 w-48 rounded-md border border-border bg-popover shadow-lg z-20">
                  <div className="p-1 max-h-56 overflow-y-auto">
                    {lots.map((lot) => (
                      <button
                        key={lot}
                        onClick={() => { setSelectedLot(lot); setIsOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 rounded text-xs font-mono hover:bg-accent transition-colors ${
                          activeLot === lot ? 'bg-accent' : ''
                        }`}
                      >
                        {lot}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {meta && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{meta.productDescription}</span>
              <span>·</span>
              <span>Inspector: {meta.inspector}</span>
              <span>·</span>
              <span>{meta.createdOn}</span>
            </div>
          )}
        </div>

        {/* Pass/fail summary */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="size-3.5" /> {passedCount} Passed
          </span>
          <span className="flex items-center gap-1 text-red-500">
            <XCircle className="size-3.5" /> {failedCount} Failed
          </span>
        </div>
      </div>

      {/* ── Characteristic cards — 1 row, scroll horizontally if needed ── */}
      {chars.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No characteristics recorded for this lot.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chars.map((char, idx) => {
            const spec   = specLimits[char.characteristicCode] ?? { min: '-', max: '-' };
            const passed = char.valuation === 'A';

            return (
              <div
                key={`${char.characteristicCode}-${idx}`}
                className={`flex-none w-36 rounded-lg border px-3 py-2.5 flex flex-col gap-1.5 ${
                  passed
                    ? 'border-border bg-background'
                    : 'border-red-300/50 bg-red-50/60 dark:bg-red-900/10'
                }`}
              >
                {/* Code badge + status icon */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center justify-center size-6 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                    {char.characteristicCode}
                  </span>
                  {passed
                    ? <CheckCircle2 className="size-4 text-green-500" />
                    : <XCircle      className="size-4 text-red-500" />
                  }
                </div>

                {/* Name */}
                <div className="text-[11px] font-semibold leading-tight line-clamp-2">
                  {char.characteristicDesc}
                </div>

                {/* Range */}
                <div className="text-[10px] text-muted-foreground">
                  {spec.min} – {spec.max}{spec.unit ? ` ${spec.unit}` : ''}
                </div>

                {/* Valuation */}
                <div className={`text-xs font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
                  {char.qualitative || (passed ? 'Accepted' : 'Rejected')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
