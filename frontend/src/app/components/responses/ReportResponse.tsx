import { Download, FileText, Share2 } from 'lucide-react';

export default function ReportResponse() {
  return (
    <div className="p-8 space-y-8">
      {/* Summary */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl mb-2">Root Cause Analysis Report</h3>
          <p className="text-[15px] opacity-60">Generated for batch rejection trend (Feb 2024)</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[14px] flex items-center gap-2 transition-colors border border-black/[0.06]">
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg text-white rounded-lg text-[14px] flex items-center gap-2 transition-all">
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-8">
        {/* Executive Summary */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 opacity-40" />
            <h4>Executive Summary</h4>
          </div>
          <div className="pl-7 space-y-3 text-[15px] leading-relaxed">
            <p>
              Analysis of 5 batch rejections in February 2024 reveals systematic quality deviations primarily driven by pH control failures and viscosity specification misses. The rejection rate increased from 6.2% to 8.3%, representing a 34% increase compared to January 2024.
            </p>
            <p className="opacity-80">
              Root cause investigation identifies three critical factors: raw material variability from Supplier B, equipment calibration drift in mixers 2 and 3, and inadequate process control monitoring during off-shift operations.
            </p>
          </div>
        </div>

        {/* Root Cause */}
        <div className="border-t border-black/[0.06] pt-8">
          <h4 className="mb-4">Root Cause Identification</h4>
          <div className="space-y-4">
            <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-[15px]">Primary Cause: Raw Material Variability</h5>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[12px]">High Impact</span>
              </div>
              <p className="text-[14px] opacity-70 leading-relaxed">
                Supplier B raw material lots showed 18% higher variability in pH and ionic composition. 4 out of 5 rejected batches used Supplier B materials. Statistical correlation coefficient: 0.87.
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-[15px]">Secondary Cause: Equipment Calibration Drift</h5>
                <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-md text-[12px]">Medium Impact</span>
              </div>
              <p className="text-[14px] opacity-70 leading-relaxed">
                Mixers 2 and 3 showed calibration drift exceeding ±2% tolerance. Viscosity failures aligned with equipment use patterns. Last calibration performed 89 days ago (spec: 60 days).
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
              <div className="flex items-start justify-between mb-2">
                <h5 className="text-[15px]">Contributing Factor: Process Monitoring Gaps</h5>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-[12px]">Low Impact</span>
              </div>
              <p className="text-[14px] opacity-70 leading-relaxed">
                3 batches processed during off-shift hours with reduced monitoring frequency. No automated alerts triggered despite parameter drift during mixing phase.
              </p>
            </div>
          </div>
        </div>

        {/* Corrective Actions */}
        <div className="border-t border-black/[0.06] pt-8">
          <h4 className="mb-4">Corrective and Preventive Actions (CAPA)</h4>
          <div className="space-y-2.5">
            <div className="flex gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white text-[13px]">
                1
              </div>
              <div className="flex-1">
                <div className="text-[15px] mb-1">Implement dual-sourcing strategy for critical raw materials</div>
                <div className="text-[13px] opacity-50">Owner: Supply Chain • Due: Mar 15, 2024</div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white text-[13px]">
                2
              </div>
              <div className="flex-1">
                <div className="text-[15px] mb-1">Immediate recalibration of all mixing equipment</div>
                <div className="text-[13px] opacity-50">Owner: Maintenance • Due: Feb 28, 2024</div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white text-[13px]">
                3
              </div>
              <div className="flex-1">
                <div className="text-[15px] mb-1">Deploy automated monitoring system with real-time alerts</div>
                <div className="text-[13px] opacity-50">Owner: Engineering • Due: Apr 1, 2024</div>
              </div>
            </div>

            <div className="flex gap-3 p-4 bg-white border border-black/[0.08] rounded-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 text-white text-[13px]">
                4
              </div>
              <div className="flex-1">
                <div className="text-[15px] mb-1">Establish enhanced incoming material testing protocol</div>
                <div className="text-[13px] opacity-50">Owner: QC Lab • Due: Mar 8, 2024</div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="border-t border-black/[0.06] pt-8">
          <h4 className="mb-4">Risk Assessment</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
              <div className="text-[13px] opacity-50 mb-1">Current Risk Level</div>
              <div className="text-2xl mb-2 text-red-600">High</div>
              <p className="text-[13px] opacity-70">Without intervention, rejection rate projected to reach 12% by March</p>
            </div>
            <div className="p-5 bg-slate-50 rounded-lg border border-black/[0.06]">
              <div className="text-[13px] opacity-50 mb-1">Post-CAPA Risk Level</div>
              <div className="text-2xl mb-2 text-green-600">Low</div>
              <p className="text-[13px] opacity-70">Expected rejection rate: 3-4% with full CAPA implementation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
