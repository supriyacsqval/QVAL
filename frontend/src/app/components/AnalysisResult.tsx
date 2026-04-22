import { useState } from 'react';
import { motion } from 'motion/react';
import { Download, X, FileText, TrendingUp, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { exportReport, downloadFile } from '../../services/api';

interface AnalysisResultProps {
  analysis: {
    id: string;
    mode: 'manual' | 'csv' | 'trend';
    input: Record<string, any>;
    result: Record<string, any>;
    timestamp: Date;
  };
  onDelete: () => void;
}

export default function AnalysisResult({ analysis, onDelete }: AnalysisResultProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'pdf' | 'docx') => {
    setIsExporting(true);
    try {
      const blob = await exportReport(analysis.result, format);
      const filename = `analysis_${analysis.id}_${new Date().getTime()}.${format === 'pdf' ? 'pdf' : 'docx'}`;
      downloadFile(blob, filename);
    } catch (err) {
      alert(`Export failed: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const isBatchResult = analysis.result.results && Array.isArray(analysis.result.results);
  const isTrendResult = analysis.result.records && Array.isArray(analysis.result.records);

  const getModeIcon = () => {
    switch (analysis.mode) {
      case 'csv':
        return '📄';
      case 'trend':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="bg-white/90 border border-black/[0.08] rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
    >
      {/* Header */}
      <div className="border-b border-black/[0.08] p-4 bg-gradient-to-r from-slate-50/90 to-teal-50/40">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-2xl text-slate-700">{getModeIcon()}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold capitalize">{analysis.mode} Analysis</h3>
                <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                  {analysis.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm opacity-60">
                {analysis.mode === 'manual' && 
                  `${analysis.input.product} / ${analysis.input.characteristic}`
                }
                {analysis.mode === 'csv' && analysis.input.filename}
                {analysis.mode === 'trend' && 
                  `${analysis.input.type === 'batch' ? 'Batch' : 'Product'}: ${analysis.input.value}${analysis.input.characteristic ? ` / ${analysis.input.characteristic}` : ''}`
                }
              </p>
            </div>
          </div>
            <button
            onClick={onDelete}
              className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4 opacity-50" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Batch Results */}
        {isBatchResult && (
          <div className="space-y-4">
            {analysis.result.rca_report && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="font-semibold mb-2">Batch RCA Summary</h4>
                <p className="text-sm opacity-80 leading-relaxed">{analysis.result.rca_report}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs opacity-60">Batches Processed</p>
                <p className="text-2xl font-bold text-blue-600">{analysis.result.batches}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs opacity-60">Accepted</p>
                <p className="text-2xl font-bold text-green-600">{analysis.result.accepted}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs opacity-60">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{analysis.result.rejected}</p>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-black/[0.08]">
                  <tr>
                    <th className="text-left py-2 px-2">Batch</th>
                    <th className="text-left py-2 px-2">Product</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.result.results.map((result: any, idx: number) => (
                    <tr key={idx} className="border-b border-black/[0.08] hover:bg-slate-50">
                      <td className="py-2 px-2 font-mono text-xs">{result.batch}</td>
                      <td className="py-2 px-2">{result.product}</td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            result.hybrid?.status === 'R'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {result.hybrid?.status === 'R' ? 'Rejected' : 'Accepted'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs opacity-60">
                        {result.hybrid?.reason || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manual Prediction Results */}
        {!isBatchResult && !isTrendResult && analysis.result.decision_text && (
          <div className="space-y-4">
            {/* Status */}
            <div className={`p-4 rounded-lg ${
              analysis.result.status === 'R'
                ? 'bg-red-50 border border-red-200'
                : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`text-sm font-semibold ${
                analysis.result.status === 'R'
                  ? 'text-red-700'
                  : 'text-green-700'
              }`}>
                Status: {analysis.result.status === 'R' ? 'REJECTED' : 'ACCEPTED'}
              </p>
            </div>

            {/* Decision */}
            <div>
              <h4 className="font-semibold mb-2">Decision</h4>
              <p className="text-sm opacity-75 leading-relaxed">
                {analysis.result.decision_text}
              </p>
            </div>

            {/* Measurements */}
            {analysis.result.measure_text && (
              <div>
                <h4 className="font-semibold mb-2">Measurements</h4>
                <p className="text-sm opacity-75 leading-relaxed">
                  {analysis.result.measure_text}
                </p>
              </div>
            )}

            {/* Analysis */}
            {analysis.result.analysis_text && (
              <div>
                <h4 className="font-semibold mb-2">SHAP Analysis</h4>
                <p className="text-sm opacity-75 leading-relaxed">
                  {analysis.result.analysis_text}
                </p>
              </div>
            )}

            {/* CAPA */}
            {analysis.result.capa_text && (
              <div>
                <h4 className="font-semibold mb-2">CAPA Action</h4>
                <p className="text-sm opacity-75 leading-relaxed">
                  {analysis.result.capa_text}
                </p>
              </div>
            )}

            {Array.isArray(analysis.result.root_causes) && analysis.result.root_causes.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Root Causes</h4>
                <div className="space-y-2">
                  {analysis.result.root_causes.map((cause: string, index: number) => (
                    <p key={index} className="text-sm opacity-75 leading-relaxed">• {cause}</p>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(analysis.result.suggestions) && analysis.result.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Suggestions</h4>
                <div className="space-y-2">
                  {analysis.result.suggestions.map((suggestion: string, index: number) => (
                    <p key={index} className="text-sm opacity-75 leading-relaxed">• {suggestion}</p>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(analysis.result.warnings) && analysis.result.warnings.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Warnings</h4>
                <div className="space-y-2">
                  {analysis.result.warnings.map((warning: string, index: number) => (
                    <p key={index} className="text-sm opacity-75 leading-relaxed">• {warning}</p>
                  ))}
                </div>
              </div>
            )}

            {analysis.result.rca_report && (
              <div>
                <h4 className="font-semibold mb-2">RCA Report</h4>
                <p className="text-sm opacity-75 leading-relaxed">{analysis.result.rca_report}</p>
              </div>
            )}

            {/* Trend Context */}
            {analysis.result.trend_text && (
              <div>
                <h4 className="font-semibold mb-2">Trend Context</h4>
                <p className="text-sm opacity-75 leading-relaxed">
                  {analysis.result.trend_text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Trend Results */}
        {isTrendResult && (
          <div className="space-y-4">
            {/* All Products Summary */}
            {analysis.result.all_products && analysis.result.products && (
              <div>
                <h4 className="font-semibold mb-3">All Products Summary ({analysis.result.total_products} products)</h4>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-black/[0.08] sticky top-0 bg-white">
                      <tr>
                        <th className="text-left py-2 px-2">Product</th>
                        <th className="text-left py-2 px-2">Total Checks</th>
                        <th className="text-left py-2 px-2">Rejected</th>
                        <th className="text-left py-2 px-2">Reject Rate</th>
                        <th className="text-left py-2 px-2">Avg Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.result.products.map((product: any, idx: number) => (
                        <tr key={idx} className="border-b border-black/[0.08] hover:bg-slate-50">
                          <td className="py-2 px-2 font-medium">{product.product}</td>
                          <td className="py-2 px-2 text-center">{product.total_rows}</td>
                          <td className="py-2 px-2 text-center">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              {product.reject_rows}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {(product.reject_rate * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 px-2 text-center font-mono">
                            {product.avg_quantitative?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary */}
            {analysis.result.trend_text && !analysis.result.all_products && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm">{analysis.result.trend_text}</p>
              </div>
            )}

            {/* Chart */}
            {analysis.result.records.length > 0 && !analysis.result.all_products && (
              <div>
                <h4 className="font-semibold mb-3">Trend Chart</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analysis.result.records.map((record: any) => ({
                      time: new Date(record.event_time).getTime(),
                      value: record.quantitative || 0,
                      status: record.status,
                      date: record.event_time.split(' ')[0]
                    })).sort((a, b) => a.time - b.time)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        type="number" 
                        scale="time" 
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis dataKey="value" />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: any, name: string, props: any) => [
                          `${value?.toFixed(2)} (${props.payload.status === 'R' ? 'Rejected' : 'Accepted'})`,
                          'Value'
                        ]}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8884d8" 
                        dot={(props: any) => (
                          <circle 
                            cx={props.cx} 
                            cy={props.cy} 
                            r={4} 
                            fill={props.payload.status === 'R' ? '#ef4444' : '#22c55e'} 
                          />
                        )}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Records Table */}
            {analysis.result.records.length > 0 && !analysis.result.all_products && (
              <div>
                <h4 className="font-semibold mb-3">Recent Records ({analysis.result.total_records})</h4>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-black/[0.08] sticky top-0 bg-white">
                      <tr>
                        <th className="text-left py-2 px-2">Time</th>
                        <th className="text-left py-2 px-2">Product</th>
                        <th className="text-left py-2 px-2">Characteristic</th>
                        <th className="text-left py-2 px-2">Value</th>
                        <th className="text-left py-2 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.result.records.map((record: any, idx: number) => (
                        <tr key={idx} className="border-b border-black/[0.08] hover:bg-slate-50">
                          <td className="py-2 px-2 text-xs">{record.event_time}</td>
                          <td className="py-2 px-2 text-xs">{record.product}</td>
                          <td className="py-2 px-2 text-xs">{record.characteristic}</td>
                          <td className="py-2 px-2 text-xs font-mono">
                            {record.quantitative?.toFixed(2)}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              record.status === 'R'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {record.status === 'R' ? 'R' : 'A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {analysis.result.records.length === 0 && (
              <p className="text-sm opacity-60">No records found for this query.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer - Export Options */}
      <div className="border-t border-black/[0.08] bg-slate-50/80 p-4 flex gap-2">
        <button
          onClick={() => handleExport('pdf')}
          disabled={isExporting}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:from-teal-700 hover:to-teal-600 transition-all disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export PDF'}
        </button>
        <button
          onClick={() => handleExport('docx')}
          disabled={isExporting}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:from-amber-700 hover:to-orange-600 transition-all disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export DOCX'}
        </button>
      </div>
    </motion.div>
  );
}
