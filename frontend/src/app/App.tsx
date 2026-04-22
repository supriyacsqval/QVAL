import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Settings as SettingsIcon } from 'lucide-react';
import AnalysisResult from './components/AnalysisResult';
import InputPanel from './components/InputPanel';
import { checkHealth } from '../services/api';

interface Analysis {
  id: string;
  mode: 'manual' | 'csv' | 'trend';
  input: Record<string, any>;
  result: Record<string, any>;
  timestamp: Date;
}

export default function App() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = useCallback(async (showError: boolean) => {
    try {
      await checkHealth();
      setApiReady(true);
      setError(null);
    } catch (err) {
      setApiReady(false);
      if (showError) {
        setError(`API unavailable: ${(err as Error).message}`);
      }
    }
  }, []);

  useEffect(() => {
    runHealthCheck(true);

    const intervalId = window.setInterval(() => {
      runHealthCheck(false);
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [runHealthCheck]);

  const handleAnalysis = (analysis: Analysis) => {
    setIsProcessing(false);
    setAnalyses(prev => [...prev, analysis]);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setIsProcessing(false);
  };

  return (
    <div className="relative h-screen flex flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.22),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#f1f5f9_100%)]">
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.1, ease: 'easeOut' }}
        className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl"
      />
      {/* Header */}
      <header className="z-10 flex-shrink-0 border-b border-black/10 bg-white/70 backdrop-blur-xl">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl tracking-tight text-slate-900">Qval Insight</h1>
            {apiReady ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full shadow-sm"
              >
                Connected
              </motion.span>
            ) : (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded-full shadow-sm"
              >
                Disconnected
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm tracking-wide opacity-60">QUALITY ANALYSIS</span>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/80 rounded-lg transition-colors">
              <SettingsIcon className="w-[18px] h-[18px]" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center hover:bg-white/80 rounded-lg transition-colors">
              <User className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="z-10 flex-1 overflow-y-auto flex p-4 md:p-5 gap-4">
        {/* Input Panel */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-80 rounded-2xl border border-black/10 bg-white/70 backdrop-blur-lg shadow-[0_10px_30px_rgba(2,6,23,0.08)] overflow-y-auto"
        >
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-6">Analysis</h2>
            <InputPanel 
              onAnalysisStart={() => setIsProcessing(true)}
              onAnalysisComplete={handleAnalysis}
              onError={handleError}
              apiReady={apiReady}
            />
          </div>
        </motion.div>

        {/* Results Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto rounded-2xl border border-black/10 bg-white/70 backdrop-blur-lg shadow-[0_10px_30px_rgba(2,6,23,0.08)]"
        >
          <div className="max-w-4xl mx-auto px-6 py-12">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
              >
                {error}
                <button
                  onClick={() => runHealthCheck(true)}
                  className="ml-4 underline"
                >
                  Retry
                </button>
                <button onClick={() => setError(null)} className="ml-4 underline">
                  Dismiss
                </button>
              </motion.div>
            )}

            {analyses.length === 0 && !isProcessing ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center opacity-50">
                  <p className="text-lg">No analyses yet</p>
                  <p className="text-sm">Use the input panel to start an analysis</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <AnimatePresence>
                  {analyses.map((analysis) => (
                    <AnalysisResult 
                      key={analysis.id} 
                      analysis={analysis}
                      onDelete={() => setAnalyses(prev => prev.filter(a => a.id !== analysis.id))}
                    />
                  ))}
                </AnimatePresence>

                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/85 border border-black/[0.08] rounded-xl p-8 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-500 to-amber-500 animate-pulse" />
                      <span className="text-[15px] opacity-60">Processing analysis...</span>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
