import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Upload, Settings as SettingsIcon, TrendingUp } from 'lucide-react';
import ManualInputForm from './ManualInputForm';
import CSVUpload from './CSVUpload';
import TrendAnalysis from './TrendAnalysis';

type InputMode = 'manual' | 'csv' | 'trend';

interface InputPanelProps {
  onAnalysisStart: () => void;
  onAnalysisComplete: (analysis: any) => void;
  onError: (error: string) => void;
  apiReady: boolean;
}

export default function InputPanel({
  onAnalysisStart,
  onAnalysisComplete,
  onError,
  apiReady,
}: InputPanelProps) {
  const [mode, setMode] = useState<InputMode>('manual');

  if (!apiReady) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
        API is not available. Please check your connection.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-gradient-to-r from-sky-50/80 via-white to-amber-50/90 border border-sky-900/10">
        <button
          onClick={() => setMode('manual')}
          className={`relative overflow-hidden p-3 rounded-lg text-sm transition-colors duration-200 flex flex-col items-center gap-2 ${
            mode === 'manual'
              ? 'text-teal-800 border border-teal-200'
              : 'bg-white border border-black/[0.08] hover:bg-slate-50'
          }`}
        >
          {mode === 'manual' && (
            <motion.span
              layoutId="input-mode-pill"
              className="absolute inset-0 bg-gradient-to-br from-teal-100 to-amber-50"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">
          <SettingsIcon className="w-4 h-4" />
          </span>
          <span className="relative z-10">Manual Input</span>
        </button>
        <button
          onClick={() => setMode('csv')}
          className={`relative overflow-hidden p-3 rounded-lg text-sm transition-colors duration-200 flex flex-col items-center gap-2 ${
            mode === 'csv'
              ? 'text-teal-800 border border-teal-200'
              : 'bg-white border border-black/[0.08] hover:bg-slate-50'
          }`}
        >
          {mode === 'csv' && (
            <motion.span
              layoutId="input-mode-pill"
              className="absolute inset-0 bg-gradient-to-br from-teal-100 to-amber-50"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">
          <Upload className="w-4 h-4" />
          </span>
          <span className="relative z-10">CSV Upload</span>
        </button>
        <button
          onClick={() => setMode('trend')}
          className={`relative overflow-hidden p-3 rounded-lg text-sm transition-colors duration-200 flex flex-col items-center gap-2 ${
            mode === 'trend'
              ? 'text-teal-800 border border-teal-200'
              : 'bg-white border border-black/[0.08] hover:bg-slate-50'
          }`}
        >
          {mode === 'trend' && (
            <motion.span
              layoutId="input-mode-pill"
              className="absolute inset-0 bg-gradient-to-br from-teal-100 to-amber-50"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">
          <TrendingUp className="w-4 h-4" />
          </span>
          <span className="relative z-10">Trend Analysis</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="border border-black/[0.08] rounded-lg p-4 bg-white/80 backdrop-blur-sm shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {mode === 'manual' && (
              <ManualInputForm
                onStart={onAnalysisStart}
                onComplete={onAnalysisComplete}
                onError={onError}
              />
            )}
            {mode === 'csv' && (
              <CSVUpload
                onStart={onAnalysisStart}
                onComplete={onAnalysisComplete}
                onError={onError}
              />
            )}
            {mode === 'trend' && (
              <TrendAnalysis
                onStart={onAnalysisStart}
                onComplete={onAnalysisComplete}
                onError={onError}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
