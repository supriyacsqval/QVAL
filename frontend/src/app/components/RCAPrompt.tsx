import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { predictManual, getProductOptions, getBatchTrend } from '../../services/api';

interface RCAPromptProps {
  onStart: () => void;
  onComplete: (analysis: any) => void;
  onError: (error: string) => void;
}

export default function RCAPrompt({ onStart, onComplete, onError }: RCAPromptProps) {
  const [products, setProducts] = useState<Record<string, string[]>>({});
  const [rcaType, setRcaType] = useState<'batch' | 'manual'>('batch');
  const [product, setProduct] = useState('');
  const [characteristic, setCharacteristic] = useState('');
  const [batch, setBatch] = useState('');
  const [quantitative, setQuantitative] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getProductOptions()
      .then(setProducts)
      .catch((err) => onError(`Failed to load products: ${err.message}`));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rcaType === 'batch') {
      if (!batch.trim()) {
        onError('Please enter a batch ID');
        return;
      }

      onStart();
      setIsLoading(true);

      try {
        const result = await getBatchTrend(batch);
        onComplete({
          id: Date.now().toString(),
          mode: 'rca',
          input: { type: 'batch', batch },
          result,
          timestamp: new Date(),
        });
        setBatch('');
      } catch (err) {
        onError(`RCA analysis failed: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!product || !characteristic || !quantitative || !startTime || !endTime) {
        onError('Please fill in all required fields');
        return;
      }

      onStart();
      setIsLoading(true);

      try {
        const result = await predictManual({
          product,
          characteristic,
          startTime,
          endTime,
          quantitative: parseFloat(quantitative),
          batch: batch || undefined,
        });

        onComplete({
          id: Date.now().toString(),
          mode: 'rca',
          input: { type: 'manual', product, characteristic, quantitative, batch },
          result,
          timestamp: new Date(),
        });

        setQuantitative('');
        setStartTime('');
        setEndTime('');
        setBatch('');
      } catch (err) {
        onError(`RCA analysis failed: ${(err as Error).message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const characteristics = product ? products[product] || [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* RCA Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">RCA Method</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setRcaType('batch');
              setQuantitative('');
              setStartTime('');
              setEndTime('');
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              rcaType === 'batch'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-white border border-black/[0.08] hover:bg-slate-50'
            }`}
          >
            By Batch
          </button>
          <button
            type="button"
            onClick={() => {
              setRcaType('manual');
              setBatch('');
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              rcaType === 'manual'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-white border border-black/[0.08] hover:bg-slate-50'
            }`}
          >
            By Parameters
          </button>
        </div>
      </div>

      {/* Batch RCA */}
      {rcaType === 'batch' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">Batch ID *</label>
            <input
              type="text"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g., BATCH-2024-001"
              className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>
          <p className="text-xs opacity-60">
            Analyzes all measurements for this batch to identify root causes
          </p>
        </>
      )}

      {/* Manual RCA */}
      {rcaType === 'manual' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1.5">Product *</label>
            <select
              value={product}
              onChange={(e) => {
                setProduct(e.target.value);
                setCharacteristic('');
              }}
              className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            >
              <option value="">Select product...</option>
              {Object.keys(products).map((prod) => (
                <option key={prod} value={prod}>
                  {prod}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Characteristic *</label>
            <select
              value={characteristic}
              onChange={(e) => setCharacteristic(e.target.value)}
              disabled={!product}
              className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              required
            >
              <option value="">Select characteristic...</option>
              {characteristics.map((char) => (
                <option key={char} value={char}>
                  {char}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Measured Value *</label>
            <input
              type="number"
              step="0.01"
              value={quantitative}
              onChange={(e) => setQuantitative(e.target.value)}
              placeholder="e.g., 25.5"
              className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Start Time *</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">End Time *</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Batch ID (optional)</label>
            <input
              type="text"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g., BATCH-2024-001"
              className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || (rcaType === 'batch' ? !batch.trim() : !product || !characteristic)}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {isLoading ? 'Analyzing...' : 'Generate RCA Report'}
      </button>
    </form>
  );
}
