// ─── QALS – Inspection Lot Record ────────────────────────────────────────────
export interface InspectionLotRecord {
  objectNumber: string;       // QL04000000XXXX
  lotCreated: string;         // date
  lotCreationTime: string;
  createdBy: string;          // inspector ID
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  tasklistType: string;
  processOrder: string;
  product: string;            // SAP material code
  productDescription: string; // human-readable product name
  batch: string;              // batch number
  /** Derived: 'passed' | 'rejected' | 'pending' – set after joining with QAMR */
  status?: 'passed' | 'rejected' | 'pending';
  /** Derived: number of failed characteristics */
  failedTests?: number;
  /** Derived: inspection lot number (numeric part matching QAMR) */
  inspectionLot?: string;
}

// ─── QAMR – Characteristic Recording ────────────────────────────────────────
export interface CharacteristicRecord {
  inspectionLot: string;      // 40000002501 etc.
  nodeNo: string;
  productDescription: string;
  characteristicCode: string; // 10, 20, 30 …
  characteristicDesc: string; // Potency, pH Level …
  createdBy: string;
  createdOn: string;
  valuation: 'A' | 'R';      // A = Accepted, R = Rejected
  inspector: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  qualitative?: string;       // e.g. "Complies"
  quantitative?: number;      // numeric measured value when present
}

// ─── CAPA ────────────────────────────────────────────────────────────────────
export interface CapaRecord {
  notification: string;       // 200000501 etc.
  plant: string;
  batch: string;
  productDescription: string;
  deviationValue: number;
  defectCreatedDate: string;
  itemText: string;           // description of deviation
  resolutionCreatedDate: string | null;
  taskText: string;
}

// ─── Derived / aggregated shapes used by charts ──────────────────────────────
export interface DailyTrend {
  date: string;
  passed: number;
  rejected: number;
}

export interface ProductSummary {
  product: string;
  passed: number;
  rejected: number;
}

export interface DashboardMetrics {
  totalInspections: number;
  passRate: string;          // e.g. "89.7%"
  rejectedBatches: number;
  openDeviations: number;
  inSpecTests: number;
  outOfSpecTests: number;
}
