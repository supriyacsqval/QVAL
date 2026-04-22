/**
 * API Service for Hybrid Backend Integration
 * Handles all communication with the Flask API server
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

interface AnalysisResult {
  status: 'A' | 'R';
  decision_reason: string;
  decision_text: string;
  measure_text: string;
  analysis_text: string;
  rca_report?: string;
  root_causes?: string[];
  suggestions?: string[];
  warnings?: string[];
  trend_text: string;
  capa_action: string | null;
  capa_text: string;
  trend: Record<string, any>;
  derived: {
    duration_min: number;
    min_val: number;
    max_val: number;
    deviation: number;
  };
  shap?: {
    enabled: boolean;
    top_feature: string | null;
    top_contribution: number | null;
    top_feature_value: number | null;
    summary: string | null;
    error: string;
  };
  capa?: {
    action: string | null;
    characteristic: string | null;
    confidence: number | null;
    error: string;
    measure_value: number | null;
    measure_min: number | null;
    measure_max: number | null;
    measure_deviation: number | null;
    measure_out_of_bounds: boolean;
  };
}

interface BatchPredictionResult {
  batch: string;
  product: string;
  status: 'A' | 'R';
  decision_text: string;
  measure_text: string;
  analysis_text: string;
  rca_report?: string;
  root_causes?: string[];
  suggestions?: string[];
  warnings?: string[];
  source_capa_text?: string;
  source_capa_details?: Record<string, any>;
  hybrid: {
    status: 'A' | 'R';
    reason: string;
    reject_confidence: number;
  };
  shap: {
    enabled: boolean;
    top_feature: string | null;
    top_contribution: number | null;
  };
  capa: {
    action: string | null;
    characteristic: string | null;
    measure_value: number | null;
  };
}

interface BatchPredictionResponse {
  source_file: string;
  rows_received: number;
  batches: number;
  accepted: number;
  rejected: number;
  rca_report?: string;
  results: BatchPredictionResult[];
}

interface ProductOptions {
  [product: string]: string[];
}

interface DetailedCharacteristicOption {
  characteristic: string;
  min_value: number;
  max_value: number;
  target: number;
}

interface ProductOptionsDetail {
  products: Record<string, DetailedCharacteristicOption[]>;
  products_list: string[];
  characteristics_list: string[];
}

interface SuggestionResponse {
  items: string[];
}

interface TrendSummary {
  product: string;
  characteristic?: string;
  total_rows: number;
  reject_rows: number;
  reject_rate: number;
  trend_text: string;
  recent_rows: Array<any>;
  characteristic_summary: Array<any>;
}

interface BatchTrendData {
  batch: string;
  total_records: number;
  records: Array<any>;
  message?: string;
}

interface HealthStatus {
  ok: boolean;
  hybrid_ready: boolean;
  store_ready: boolean;
  rf_artifact: boolean;
  meta_artifact: boolean;
  shap_ready: boolean;
}

/**
 * Check API health and availability
 */
export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) throw new Error('API health check failed');
  return response.json();
}

/**
 * Get available products and characteristics
 */
export async function getProductOptions(): Promise<ProductOptions> {
  const response = await fetch(`${API_BASE_URL}/api/options`);
  if (!response.ok) throw new Error('Failed to fetch product options');
  return response.json();
}

/**
 * Get products/characteristics with bounds metadata
 */
export async function getProductOptionsDetail(): Promise<ProductOptionsDetail> {
  const response = await fetch(`${API_BASE_URL}/api/options/detail`);
  if (!response.ok) throw new Error('Failed to fetch detailed options');
  return response.json();
}

/**
 * Get searchable suggestions for product, characteristic, or batch/tablet.
 */
export async function getSuggestions(
  type: 'product' | 'characteristic' | 'batch',
  query: string,
  options?: { product?: string; limit?: number }
): Promise<string[]> {
  const params = new URLSearchParams({
    type,
    q: query,
    limit: String(options?.limit ?? 12),
  });
  if (options?.product) {
    params.append('product', options.product);
  }

  const response = await fetch(`${API_BASE_URL}/api/suggestions?${params}`);
  if (!response.ok) throw new Error('Failed to fetch suggestions');
  const data = (await response.json()) as SuggestionResponse;
  return Array.isArray(data.items) ? data.items : [];
}

/**
 * Predict with manual parameters
 */
export async function predictManual(params: {
  product: string;
  characteristics: Record<string, number>;
  startTime: string;
  endTime: string;
  batch?: string;
}): Promise<AnalysisResult> {
  const response = await fetch(`${API_BASE_URL}/api/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Prediction failed');
  }
  return response.json();
}

/**
 * Batch predict from CSV file
 */
export async function predictBatchFile(file: File): Promise<BatchPredictionResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/batch/predict`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Batch prediction failed');
  }
  return response.json();
}

/**
 * Get trend data for a product/characteristic
 */
export async function getTrend(
  product: string,
  characteristic?: string,
  limit: number = 8
): Promise<TrendSummary> {
  const params = new URLSearchParams({ product, limit: limit.toString() });
  if (characteristic) {
    params.append('characteristic', characteristic);
  }

  const response = await fetch(`${API_BASE_URL}/api/trend?${params}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Trend fetch failed');
  }
  return response.json();
}

/**
 * Get trend data for a specific batch/tablet
 */
export async function getBatchTrend(batch: string, limit: number = 100): Promise<BatchTrendData> {
  const params = new URLSearchParams({ batch, limit: limit.toString() });

  const response = await fetch(`${API_BASE_URL}/api/batch/trend?${params}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Batch trend fetch failed');
  }
  return response.json();
}

/**
 * Export analysis results as PDF or DOCX
 */
export async function exportReport(
  analysis: Record<string, any>,
  format: 'pdf' | 'docx' = 'pdf'
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/api/export`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analysis, format }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Export failed');
  }
  return response.blob();
}

/**
 * Download exported file
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
