import * as XLSX from 'xlsx';
import type {
  InspectionLotRecord,
  CharacteristicRecord,
  CapaRecord,
  DailyTrend,
  ProductSummary,
  DashboardMetrics,
} from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert an Excel serial date or a raw string to "YYYY-MM-DD" */
function toDateString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number') {
    // Excel date serial → JS Date
    const date = XLSX.SSF.parse_date_code(raw);
    if (!date) return String(raw);
    const y = date.y;
    const m = String(date.m).padStart(2, '0');
    const d = String(date.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Already a string – try to normalise
  const s = String(raw).trim();
  // Handles "2025-08-01" or "01-08-2025" or "08/01/2025"
  const parts = s.split(/[-/]/);
  if (parts.length === 3) {
    // Guess format: if first part > 12 it is DD-MM-YYYY
    if (Number(parts[0]) > 31) return s; // already YYYY-MM-DD
    if (Number(parts[2]) > 31) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return s;
}

function toTimeString(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'number') {
    // Fractional day
    const totalSec = Math.round(raw * 86400);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  return String(raw).trim();
}

function toString(raw: unknown): string {
  if (raw == null) return '';
  return String(raw).trim();
}

function toNumber(raw: unknown): number {
  if (raw == null) return 0;
  const n = Number(raw);
  return isNaN(n) ? 0 : n;
}

/** Parse a worksheet to an array of plain objects, using row-1 as headers */
function sheetToObjects(ws: XLSX.WorkSheet): Record<string, unknown>[] {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
    raw: true,
  });
}

// ─── Sheet parsers ────────────────────────────────────────────────────────────

function parseQALS(ws: XLSX.WorkSheet): InspectionLotRecord[] {
  const rows = sheetToObjects(ws);
  return rows.map((r) => ({
    // InspectionLot is column A – the actual lot number (e.g. 40000002501)
    // matching QAMR's InspectionLot directly
    inspectionLot: toString(r['InspectionLot']),
    objectNumber: toString(r['ObjectNumber']),
    lotCreated: toDateString(r['LotCreated']),
    lotCreationTime: toTimeString(r['LotCreationTime']),
    createdBy: toString(r['CreatedBy']),
    startDate: toDateString(r['StartDate']),
    startTime: toTimeString(r['StartTime']),
    endDate: toDateString(r['EndDate']),
    endTime: toTimeString(r['EndTime']),
    tasklistType: toString(r['TasklistType']),
    processOrder: toString(r['ProcessOrder']),
    product: toString(r['Product']),
    productDescription: toString(r['ProductDescription']),
    batch: toString(r['Batch']),
  }));
}

function parseQAMR(ws: XLSX.WorkSheet): CharacteristicRecord[] {
  const rows = sheetToObjects(ws);
  return rows.map((r) => ({
    inspectionLot: toString(r['InspectionLot']),
    nodeNo: toString(r['NodeNo']),
    productDescription: toString(r['ProductDescription']),
    characteristicCode: toString(r['CharacteristicCode']),
    characteristicDesc: toString(r['CharacteristicDesc']),
    createdBy: toString(r['CreatedBy']),
    createdOn: toDateString(r['CreatedOn']),
    valuation: (toString(r['Valuation']).toUpperCase() === 'R' ? 'R' : 'A') as 'A' | 'R',
    inspector: toString(r['Inspector']),
    startDate: toDateString(r['StartDate']),
    startTime: toTimeString(r['StartTime']),
    endDate: toDateString(r['EndDate']),
    endTime: toTimeString(r['EndTime']),
    qualitative: toString(r['Qualitative']) || undefined,
  }));
}

function parseCapa(ws: XLSX.WorkSheet): CapaRecord[] {
  const rows = sheetToObjects(ws);
  return rows
    .filter((r) => r['NotificationID'] != null || r['Notification'] != null) // skip blank rows
    .map((r) => ({
      // Excel header is 'NotificationID'; fall back to 'Notification' for flexibility
      notification: toString(r['NotificationID'] ?? r['Notification']),
      // Excel header has a trailing space: 'Plant '
      plant: toString(r['Plant '] ?? r['Plant']),
      batch: toString(r['Batch']),
      productDescription: toString(r['ProductDescription']),
      deviationValue: toNumber(r['DeviationValue']),
      defectCreatedDate: toDateString(r['DefectCreatedDate']),
      itemText: toString(r['ItemText']),
      resolutionCreatedDate: r['ResolutionCreatedDate'] != null
        ? toDateString(r['ResolutionCreatedDate'])
        : null,
      taskText: toString(r['TaskText']),
    }));
}

// ─── Derived data ────────────────────────────────────────────────────────────

/** Add pass/fail status and failedTests count onto each lot record */
function enrichLots(
  lots: InspectionLotRecord[],
  chars: CharacteristicRecord[],
): InspectionLotRecord[] {
  // Both QALS InspectionLot and QAMR InspectionLot use the same numeric format
  // e.g. "40000002501" – match them as-is (trim whitespace only)
  const charsByLot = new Map<string, CharacteristicRecord[]>();
  for (const c of chars) {
    const key = c.inspectionLot.trim();
    if (!charsByLot.has(key)) charsByLot.set(key, []);
    charsByLot.get(key)!.push(c);
  }

  return lots.map((lot) => {
    const key = (lot.inspectionLot ?? '').trim();
    const lotChars = charsByLot.get(key) ?? [];
    const failedTests = lotChars.filter((c) => c.valuation === 'R').length;
    const status: 'passed' | 'rejected' | 'pending' =
      lotChars.length === 0
        ? 'pending'
        : failedTests > 0
        ? 'rejected'
        : 'passed';
    return { ...lot, failedTests, status };
  });
}

/** Build daily pass/reject trend grouped by LotCreated date */
function buildDailyTrend(
  lots: InspectionLotRecord[],
  productFilter?: string,
): DailyTrend[] {
  const map = new Map<string, { passed: number; rejected: number }>();

  const filtered =
    productFilter && productFilter !== 'All Products'
      ? lots.filter((l) => l.productDescription === productFilter)
      : lots;

  for (const lot of filtered) {
    const dateKey = lot.lotCreated;
    if (!dateKey) continue;
    if (!map.has(dateKey)) map.set(dateKey, { passed: 0, rejected: 0 });
    const entry = map.get(dateKey)!;
    if (lot.status === 'passed') entry.passed++;
    else if (lot.status === 'rejected') entry.rejected++;
  }

  // Sort by date and format label as "Mon DD"
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, counts]) => {
      const dt = new Date(dateStr + 'T00:00:00');
      const label = isNaN(dt.getTime())
        ? dateStr
        : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date: label, ...counts };
    });
}

/** Summarise pass/reject counts per product for the bar chart */
function buildProductSummary(lots: InspectionLotRecord[]): ProductSummary[] {
  const map = new Map<string, { passed: number; rejected: number }>();
  for (const lot of lots) {
    const key = lot.productDescription || 'Unknown';
    if (!map.has(key)) map.set(key, { passed: 0, rejected: 0 });
    const entry = map.get(key)!;
    if (lot.status === 'passed') entry.passed++;
    else if (lot.status === 'rejected') entry.rejected++;
  }
  // Short label for chart: strip " Tablets"
  return [...map.entries()].map(([desc, counts]) => ({
    product: desc.replace(' Tablets', '').replace('(', '').replace(')', '').trim(),
    ...counts,
  }));
}

/** Compute top-level metric card values */
function buildMetrics(
  lots: InspectionLotRecord[],
  chars: CharacteristicRecord[],
  capa: CapaRecord[],
): DashboardMetrics {
  const total = lots.length;
  const passed = lots.filter((l) => l.status === 'passed').length;
  const rejected = lots.filter((l) => l.status === 'rejected').length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0%';
  const inSpec = chars.filter((c) => c.valuation === 'A').length;
  const outOfSpec = chars.filter((c) => c.valuation === 'R').length;
  const openDeviations = capa.filter((c) => !c.resolutionCreatedDate).length;

  return {
    totalInspections: total,
    passRate,
    rejectedBatches: rejected,
    openDeviations,
    inSpecTests: inSpec,
    outOfSpecTests: outOfSpec,
  };
}

// ─── Spec limits (hardcoded from domain knowledge) ───────────────────────────
const SPEC_LIMITS: Record<string, { min: string; max: string; unit?: string }> = {
  '10': { min: '95', max: '102', unit: '%' },      // Potency
  '20': { min: '3.5', max: '11' },                 // pH Level
  '30': { min: '-', max: '-' },                    // Appearance
  '40': { min: '0', max: '1', unit: '%' },         // Impurities
  '50': { min: '40', max: '60', unit: '%' },       // Dissolution 15 min
  '60': { min: '70', max: '85', unit: '%' },       // Dissolution 30 min
  '70': { min: '80', max: '90', unit: '%' },       // Dissolution 40 min
  '80': { min: '23', max: '25', unit: '°C' },      // Process Temp
};

// ─── Exported result type ─────────────────────────────────────────────────────

export interface DashboardData {
  lots: InspectionLotRecord[];
  chars: CharacteristicRecord[];
  capa: CapaRecord[];
  metrics: DashboardMetrics;
  products: string[];           // list for dropdown
  productSummary: ProductSummary[];
  specLimits: typeof SPEC_LIMITS;
  buildDailyTrend: (product?: string) => DailyTrend[];
}

// ─── Main loader ─────────────────────────────────────────────────────────────

export async function loadDashboardData(): Promise<DashboardData> {
  const response = await fetch('/data/Data.xlsx');
  if (!response.ok) throw new Error(`Failed to fetch Data.xlsx: ${response.status}`);

  const arrayBuffer = await response.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false });

  const sheetNames = workbook.SheetNames;
  console.log('[dataService] Sheet names:', sheetNames);

  // Resolve sheets by name so extra hidden sheets don't break the index lookup
  const findSheet = (keyword: string) => {
    const name = sheetNames.find((n) => n.trim() === keyword || n.trim().startsWith(keyword));
    if (!name) throw new Error(`Sheet not found: ${keyword}. Available: ${sheetNames.join(', ')}`);
    return workbook.Sheets[name];
  };

  const qalsSheet = findSheet('QALS - Inspection Lot Record');
  const qamrSheet = findSheet('QAMR - Characteristic Recording');
  const capaSheet = findSheet('CAPA');   // exact match – index 3

  const rawLots = parseQALS(qalsSheet);
  const chars = parseQAMR(qamrSheet);
  const capa = parseCapa(capaSheet);

  // Debug: show sample keys from each side
  console.log('[dataService] QALS sample InspectionLots:', rawLots.slice(0, 3).map(l => l.inspectionLot));
  console.log('[dataService] QAMR sample InspectionLots:', chars.slice(0, 3).map(c => c.inspectionLot));
  console.log('[dataService] CAPA records loaded:', capa.length, '– sample:', capa.slice(0, 2));

  const lots = enrichLots(rawLots, chars);

  const passed = lots.filter(l => l.status === 'passed').length;
  const rejected = lots.filter(l => l.status === 'rejected').length;
  const pending = lots.filter(l => l.status === 'pending').length;
  console.log(`[dataService] Enriched lots – passed: ${passed}, rejected: ${rejected}, pending: ${pending}`);

  const metrics = buildMetrics(lots, chars, capa);
  const productSummary = buildProductSummary(lots);
  const products = ['All Products', ...Array.from(new Set(lots.map((l) => l.productDescription))).filter(Boolean)];

  return {
    lots,
    chars,
    capa,
    metrics,
    products,
    productSummary,
    specLimits: SPEC_LIMITS,
    buildDailyTrend: (product?: string) => buildDailyTrend(lots, product),
  };
}
