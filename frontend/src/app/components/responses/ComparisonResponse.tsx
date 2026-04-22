import { ArrowRight, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';

export default function ComparisonResponse() {
  return (
    <div className="p-8 space-y-8">
      {/* Summary */}
      <div>
        <h3 className="text-xl mb-2">CAPA Effectiveness Analysis</h3>
        <p className="text-[15px] opacity-60">Before vs After implementation comparison (CAPA-2024-003)</p>
      </div>

      {/* KPI Comparison */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Rejection Rate</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl line-through opacity-40">8.3%</span>
            <ArrowRight className="w-4 h-4 opacity-40" />
            <span className="text-2xl text-green-600">3.8%</span>
          </div>
          <div className="text-[13px] text-green-600 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            54% improvement
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Avg Pass Rate</div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl line-through opacity-40">91.7%</span>
            <ArrowRight className="w-4 h-4 opacity-40" />
            <span className="text-2xl text-green-600">96.2%</span>
          </div>
          <div className="text-[13px] text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            +4.5 points
          </div>
        </div>

        <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
          <div className="text-[13px] opacity-50 mb-1">Cost Avoidance</div>
          <div className="text-2xl mb-1">$142K</div>
          <div className="text-[13px] opacity-50">Per month savings</div>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div>
        <h4 className="mb-4">Performance Comparison</h4>
        <div className="grid grid-cols-2 gap-6">
          {/* Before */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-black/[0.08]">
              <div className="text-[15px] opacity-50">Before CAPA</div>
              <div className="text-sm opacity-40">Jan - Feb 2024</div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">pH Deviations</div>
                <div className="text-xl text-red-600">12 incidents</div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">Viscosity Failures</div>
                <div className="text-xl text-orange-600">8 incidents</div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">Equipment Issues</div>
                <div className="text-xl text-yellow-600">5 incidents</div>
              </div>

              <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">Total Batches</div>
                <div className="text-xl">120</div>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="space-y-4">
            <div className="pb-2 border-b border-black/[0.08]">
              <div className="text-[15px] opacity-50">After CAPA</div>
              <div className="text-sm opacity-40">Mar - Apr 2024</div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">pH Deviations</div>
                <div className="flex items-center justify-between">
                  <div className="text-xl text-green-600">3 incidents</div>
                  <div className="text-[13px] text-green-600">-75%</div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">Viscosity Failures</div>
                <div className="flex items-center justify-between">
                  <div className="text-xl text-green-600">1 incident</div>
                  <div className="text-[13px] text-green-600">-88%</div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">Equipment Issues</div>
                <div className="flex items-center justify-between">
                  <div className="text-xl text-green-600">0 incidents</div>
                  <div className="text-[13px] text-green-600">-100%</div>
                </div>
              </div>

              <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
                <div className="text-[13px] opacity-60 mb-1">Total Batches</div>
                <div className="text-xl">118</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CAPA Actions Status */}
      <div>
        <h4 className="mb-4">CAPA Implementation Status</h4>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[15px]">Dual-sourcing strategy implemented</div>
              <div className="text-[13px] opacity-50">Completed Mar 12, 2024</div>
            </div>
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-[12px]">Complete</span>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[15px]">Equipment recalibration program</div>
              <div className="text-[13px] opacity-50">Completed Feb 27, 2024</div>
            </div>
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-[12px]">Complete</span>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[15px]">Automated monitoring system deployed</div>
              <div className="text-[13px] opacity-50">Completed Mar 28, 2024</div>
            </div>
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-[12px]">Complete</span>
          </div>

          <div className="flex items-center gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[15px]">Enhanced material testing protocol</div>
              <div className="text-[13px] opacity-50">Completed Mar 5, 2024</div>
            </div>
            <span className="px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-[12px]">Complete</span>
          </div>
        </div>
      </div>

      {/* Conclusion */}
      <div className="bg-green-50 rounded-lg p-6 border border-green-100">
        <h4 className="mb-3 text-green-900">Effectiveness Summary</h4>
        <div className="space-y-2.5 text-[14px] text-green-900">
          <div className="flex gap-2">
            <span>•</span>
            <span>CAPA actions achieved 54% reduction in rejection rate, exceeding target of 40%</span>
          </div>
          <div className="flex gap-2">
            <span>•</span>
            <span>Pass rate improved from 91.7% to 96.2%, surpassing 95% target specification</span>
          </div>
          <div className="flex gap-2">
            <span>•</span>
            <span>Equipment-related failures eliminated entirely through calibration program</span>
          </div>
          <div className="flex gap-2">
            <span>•</span>
            <span>Estimated cost avoidance: $142K/month from reduced waste and rework</span>
          </div>
        </div>
      </div>
    </div>
  );
}
