import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

const trendData = [
  { month: 'Oct', deviation: 2.1, target: 3.0 },
  { month: 'Nov', deviation: 1.8, target: 3.0 },
  { month: 'Dec', deviation: 2.4, target: 3.0 },
  { month: 'Jan', deviation: 3.2, target: 3.0 },
  { month: 'Feb', deviation: 4.1, target: 3.0 },
  { month: 'Mar', deviation: 3.8, target: 3.0 },
];

export default function SummaryResponse() {
  return (
    <div className="p-8 space-y-8">
      {/* Summary */}
      <div>
        <h3 className="text-xl mb-2">Trend Deviation Analysis Complete</h3>
        <p className="text-[15px] opacity-60">6-month analysis shows increasing deviation trend with recent stabilization</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Current Deviation</div>
          <div className="text-2xl mb-1">3.8%</div>
          <div className="text-[13px] text-orange-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Above target (3.0%)
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Peak Deviation</div>
          <div className="text-2xl mb-1">4.1%</div>
          <div className="text-[13px] opacity-50">Feb 2024</div>
        </div>

        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Trend Direction</div>
          <div className="text-2xl mb-1 flex items-center gap-2">
            Stable
          </div>
          <div className="text-[13px] text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 rotate-180" />
            Improving
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div>
        <div className="mb-4">
          <h4 className="mb-1">Deviation Trend (6 Months)</h4>
          <p className="text-[13px] opacity-50">Monthly average deviation vs 3.0% target threshold</p>
        </div>
        <div className="h-[280px] -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorDeviation" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
              <XAxis
                dataKey="month"
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
                domain={[0, 5]}
              />
              <Area
                type="monotone"
                dataKey="deviation"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#colorDeviation)"
              />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Deviation Breakdown */}
      <div>
        <h4 className="mb-4">Deviation Contributors</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-4 bg-white border border-black/[0.08] rounded-lg">
            <div className="flex-1">
              <div className="text-[15px] mb-1">Process Temperature Variance</div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '45%' }} />
              </div>
            </div>
            <div className="text-[15px] opacity-60 w-16 text-right">45%</div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white border border-black/[0.08] rounded-lg">
            <div className="flex-1">
              <div className="text-[15px] mb-1">Raw Material Variability</div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '32%' }} />
              </div>
            </div>
            <div className="text-[15px] opacity-60 w-16 text-right">32%</div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white border border-black/[0.08] rounded-lg">
            <div className="flex-1">
              <div className="text-[15px] mb-1">Mixing Time Inconsistency</div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '23%' }} />
              </div>
            </div>
            <div className="text-[15px] opacity-60 w-16 text-right">23%</div>
          </div>
        </div>
      </div>

      {/* Key Findings */}
      <div className="bg-slate-50 rounded-lg p-6 border border-black/[0.06]">
        <h4 className="mb-3">Key Findings</h4>
        <div className="space-y-3">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-[14px]">
              <div className="mb-0.5">Deviation peaked in February at 4.1% but has stabilized</div>
              <div className="text-[13px] opacity-60">Recent CAPA actions showing positive effect</div>
            </div>
          </div>

          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-[14px]">
              <div className="mb-0.5">Process temperature variance is primary contributor (45%)</div>
              <div className="text-[13px] opacity-60">Recommend enhanced environmental controls</div>
            </div>
          </div>

          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-[14px]">
              <div className="mb-0.5">Still 27% above target threshold</div>
              <div className="text-[13px] opacity-60">Additional interventions may be required to reach 3.0% target</div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="border-t border-black/[0.06] pt-6">
        <h4 className="mb-3 text-[15px] opacity-60">Suggested Next Steps</h4>
        <div className="flex gap-2 flex-wrap">
          <button className="px-4 py-2 bg-white hover:bg-slate-50 rounded-lg text-[14px] border border-black/[0.08] transition-colors">
            Deep dive into temperature controls
          </button>
          <button className="px-4 py-2 bg-white hover:bg-slate-50 rounded-lg text-[14px] border border-black/[0.08] transition-colors">
            Compare material suppliers
          </button>
          <button className="px-4 py-2 bg-white hover:bg-slate-50 rounded-lg text-[14px] border border-black/[0.08] transition-colors">
            Generate improvement plan
          </button>
        </div>
      </div>
    </div>
  );
}
