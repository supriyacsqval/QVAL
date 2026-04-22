import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, TrendingUp } from 'lucide-react';

const featureImportance = [
  { feature: 'pH Value', importance: 0.34 },
  { feature: 'Raw Material Source', importance: 0.28 },
  { feature: 'Mixer Equipment', importance: 0.18 },
  { feature: 'Batch Size', importance: 0.12 },
  { feature: 'Operator Shift', importance: 0.08 },
];

export default function PredictionResponse() {
  return (
    <div className="p-8 space-y-8">
      {/* Summary */}
      <div>
        <h3 className="text-xl mb-2">Batch Risk Prediction: BT-2024-1923</h3>
        <p className="text-[15px] opacity-60">AI model prediction based on current batch parameters</p>
      </div>

      {/* Risk Assessment */}
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="text-[13px] opacity-60">Predicted Risk Level</div>
          </div>
          <div className="text-3xl mb-1 text-red-600">High</div>
          <p className="text-[14px] opacity-70">78% probability of specification failure</p>
        </div>

        <div className="p-6 bg-slate-50 rounded-xl border border-black/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 opacity-40" />
            <div className="text-[13px] opacity-60">Model Confidence</div>
          </div>
          <div className="text-3xl mb-3">92%</div>
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: '92%' }} />
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div>
        <h4 className="mb-4">Risk Factors Identified</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-red-600 mt-2 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[15px] mb-1">Critical: pH trending below specification</div>
              <p className="text-[13px] opacity-70">Current pH: 6.82 (Spec: 7.0 ± 0.2). Trending downward at -0.03/hour</p>
            </div>
            <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[12px] flex-shrink-0">Impact: 34%</span>
          </div>

          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-100 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[15px] mb-1">Warning: High-risk raw material batch detected</div>
              <p className="text-[13px] opacity-70">Supplier B material lot#7834 - historically associated with 23% rejection rate</p>
            </div>
            <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-md text-[12px] flex-shrink-0">Impact: 28%</span>
          </div>

          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-yellow-600 mt-2 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[15px] mb-1">Caution: Mixer-3 due for calibration</div>
              <p className="text-[13px] opacity-70">Equipment last calibrated 82 days ago (target: 60 days)</p>
            </div>
            <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-md text-[12px] flex-shrink-0">Impact: 18%</span>
          </div>
        </div>
      </div>

      {/* Feature Importance */}
      <div>
        <h4 className="mb-4">Prediction Feature Importance</h4>
        <p className="text-[13px] opacity-50 mb-4">Factors contributing to the risk prediction</p>
        <div className="h-[240px] -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={featureImportance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#00000008" horizontal={false} />
              <XAxis type="number" domain={[0, 0.4]} axisLine={false} tickLine={false} tick={{ fill: '#00000060', fontSize: 13 }} />
              <YAxis type="category" dataKey="feature" axisLine={false} tickLine={false} tick={{ fill: '#000000', fontSize: 14 }} width={150} />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {featureImportance.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#8b5cf6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-slate-50 rounded-lg p-6 border border-black/[0.06]">
        <h4 className="mb-3">Recommended Actions</h4>
        <div className="space-y-2.5 text-[14px]">
          <div className="flex gap-2">
            <span className="text-purple-600">1.</span>
            <span>Immediate pH adjustment: add buffer solution to increase pH to target range</span>
          </div>
          <div className="flex gap-2">
            <span className="text-purple-600">2.</span>
            <span>Consider switching to Supplier A material if available (7% lower risk)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-purple-600">3.</span>
            <span>Schedule emergency calibration for Mixer-3 before processing</span>
          </div>
          <div className="flex gap-2">
            <span className="text-purple-600">4.</span>
            <span>Increase in-process monitoring frequency to every 30 minutes</span>
          </div>
        </div>
      </div>

      {/* Model Info */}
      <div className="pt-4 border-t border-black/[0.06] text-[13px] opacity-40">
        Model: XGBoost Classifier v2.3 • Trained on 2,847 historical batches • Last updated: Feb 15, 2024
      </div>
    </div>
  );
}
