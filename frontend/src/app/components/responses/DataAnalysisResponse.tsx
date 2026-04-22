import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts';
import { ChevronDown, ChevronRight, AlertCircle, TrendingDown } from 'lucide-react';

const trendData = [
  { date: 'Jan 15', value: 94.2, threshold: 95 },
  { date: 'Jan 22', value: 95.8, threshold: 95 },
  { date: 'Jan 29', value: 93.1, threshold: 95 },
  { date: 'Feb 05', value: 91.5, threshold: 95 },
  { date: 'Feb 12', value: 92.8, threshold: 95 },
  { date: 'Feb 19', value: 89.2, threshold: 95 },
  { date: 'Feb 26', value: 90.1, threshold: 95 },
];

const batchData = [
  { batch: 'BT-2024-1847', parameter: 'pH Level', value: '6.8', spec: '7.0 ± 0.2', status: 'rejected', deviation: '-2.9%' },
  { batch: 'BT-2024-1851', parameter: 'Viscosity', value: '142 cP', spec: '150 ± 10 cP', status: 'rejected', deviation: '-5.3%' },
  { batch: 'BT-2024-1863', parameter: 'Moisture', value: '4.2%', spec: '< 3.5%', status: 'rejected', deviation: '+20%' },
  { batch: 'BT-2024-1872', parameter: 'pH Level', value: '6.7', spec: '7.0 ± 0.2', status: 'rejected', deviation: '-4.3%' },
  { batch: 'BT-2024-1889', parameter: 'Purity', value: '97.8%', spec: '≥ 98.5%', status: 'rejected', deviation: '-0.7%' },
];

export default function DataAnalysisResponse() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (batch: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(batch)) {
      newExpanded.delete(batch);
    } else {
      newExpanded.add(batch);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="p-8 space-y-8">
      {/* Summary */}
      <div>
        <h3 className="text-xl mb-2">5 batches rejected in last 30 days</h3>
        <p className="text-[15px] opacity-60">Primary failure: pH deviation and viscosity out of specification</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Rejection Rate</div>
          <div className="text-2xl">8.3%</div>
          <div className="text-[13px] mt-1 text-red-600 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            +2.1% vs last month
          </div>
        </div>
        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Avg Pass Rate</div>
          <div className="text-2xl">91.7%</div>
          <div className="text-[13px] mt-1 opacity-50">Target: 95%</div>
        </div>
        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Total Batches</div>
          <div className="text-2xl">60</div>
          <div className="text-[13px] mt-1 opacity-50">Feb 2024</div>
        </div>
      </div>

      {/* Chart Section */}
      <div>
        <div className="mb-4">
          <h4 className="mb-1">Pass Rate Trend</h4>
          <p className="text-[13px] opacity-50">Weekly pass rate with 95% threshold</p>
        </div>
        <div className="h-[280px] -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#00000060', fontSize: 13 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#00000060', fontSize: 13 }}
                dx={-8}
                domain={[85, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="url(#gradient)"
                strokeWidth={2.5}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table */}
      <div>
        <h4 className="mb-4">Rejected Batches</h4>
        <div className="border border-black/[0.08] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-black/[0.06]">
                <th className="text-left px-4 py-3 text-[13px] opacity-60"></th>
                <th className="text-left px-4 py-3 text-[13px] opacity-60">Batch ID</th>
                <th className="text-left px-4 py-3 text-[13px] opacity-60">Parameter</th>
                <th className="text-left px-4 py-3 text-[13px] opacity-60">Value</th>
                <th className="text-left px-4 py-3 text-[13px] opacity-60">Specification</th>
                <th className="text-left px-4 py-3 text-[13px] opacity-60">Deviation</th>
                <th className="text-left px-4 py-3 text-[13px] opacity-60">Status</th>
              </tr>
            </thead>
            <tbody>
              {batchData.map((row, idx) => (
                <>
                  <tr
                    key={row.batch}
                    className="border-b border-black/[0.04] hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => toggleRow(row.batch)}
                  >
                    <td className="px-4 py-3.5 w-8">
                      {expandedRows.has(row.batch) ? (
                        <ChevronDown className="w-4 h-4 opacity-40" />
                      ) : (
                        <ChevronRight className="w-4 h-4 opacity-40" />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-[14px]">{row.batch}</td>
                    <td className="px-4 py-3.5 text-[14px]">{row.parameter}</td>
                    <td className="px-4 py-3.5 text-[14px]">{row.value}</td>
                    <td className="px-4 py-3.5 text-[14px] opacity-60">{row.spec}</td>
                    <td className="px-4 py-3.5 text-[14px] text-red-600">{row.deviation}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-[13px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Rejected
                      </span>
                    </td>
                  </tr>
                  {expandedRows.has(row.batch) && (
                    <tr className="bg-slate-50/50 border-b border-black/[0.04]">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="pl-6 space-y-2 text-[14px]">
                          <div><span className="opacity-50">Test Date:</span> Feb {15 + idx}, 2024</div>
                          <div><span className="opacity-50">Equipment:</span> Analyzer-03</div>
                          <div><span className="opacity-50">Operator:</span> Lab Tech {idx + 1}</div>
                          <div><span className="opacity-50">Notes:</span> Retest recommended, material quarantined</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight Panel */}
      <div className="bg-slate-50 rounded-lg p-6 border border-black/[0.06]">
        <h4 className="mb-3">Key Insights</h4>
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <span className="text-[13px] opacity-50">Key drivers:</span>
            <span className="px-2.5 py-1 bg-white rounded-md text-[13px] border border-black/[0.06]">pH Control</span>
            <span className="px-2.5 py-1 bg-white rounded-md text-[13px] border border-black/[0.06]">Raw Material Variance</span>
            <span className="px-2.5 py-1 bg-white rounded-md text-[13px] border border-black/[0.06]">Equipment Drift</span>
          </div>
          <div className="pt-2 space-y-2 text-[14px]">
            <div className="flex gap-2">
              <span className="opacity-50">•</span>
              <span>pH deviations correlate with Supplier B raw materials</span>
            </div>
            <div className="flex gap-2">
              <span className="opacity-50">•</span>
              <span>Viscosity failures cluster around equipment maintenance cycles</span>
            </div>
            <div className="flex gap-2">
              <span className="opacity-50">•</span>
              <span>Rejection rate increased 2.1% month-over-month</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
