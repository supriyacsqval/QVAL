import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { getBatchTrend, getTrend, getSuggestions } from '../../services/api';

interface TrendAnalysisProps {
  onStart: () => void;
  onComplete: (analysis: any) => void;
  onError: (error: string) => void;
}

export default function TrendAnalysis({ onStart, onComplete, onError }: TrendAnalysisProps) {
  const [trendType, setTrendType] = useState<'product' | 'batch'>('product');
  const [value, setValue] = useState('');
  const [characteristic, setCharacteristic] = useState('');
  const [valueSuggestions, setValueSuggestions] = useState<string[]>([]);
  const [characteristicSuggestions, setCharacteristicSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        if (trendType === 'batch') {
          const items = await getSuggestions('batch', value, { limit: 20 });
          setValueSuggestions(items);
          setCharacteristicSuggestions([]);
          return;
        }
        const items = await getSuggestions('product', value, { limit: 20 });
        setValueSuggestions(items);
      } catch {
        setValueSuggestions([]);
      }
    };
    loadSuggestions();
  }, [trendType, value]);

  useEffect(() => {
    const loadCharacteristicSuggestions = async () => {
      if (trendType !== 'product') {
        setCharacteristicSuggestions([]);
        return;
      }
      try {
        const items = await getSuggestions('characteristic', characteristic, {
          product: value.trim() || undefined,
          limit: 20,
        });
        setCharacteristicSuggestions(items);
      } catch {
        setCharacteristicSuggestions([]);
      }
    };
    loadCharacteristicSuggestions();
  }, [trendType, value, characteristic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!value.trim()) {
      onError(`Please enter a ${trendType} name`);
      return;
    }

    onStart();
    setIsLoading(true);

    try {
      let result;
      if (trendType === 'batch') {
        result = await getBatchTrend(value);
      } else {
        result = await getTrend(value, characteristic.trim() || undefined);
      }

      onComplete({
        id: Date.now().toString(),
        mode: 'trend',
        input: { type: trendType, value, characteristic: characteristic.trim() || undefined },
        result,
        timestamp: new Date(),
      });

      setValue('');
      setCharacteristic('');
    } catch (err) {
      onError(`Trend analysis failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Trend Type Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Analyze By</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setTrendType('product');
              setValue('');
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              trendType === 'product'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-white border border-black/[0.08] hover:bg-slate-50'
            }`}
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => {
              setTrendType('batch');
              setValue('');
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-sm transition-colors ${
              trendType === 'batch'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-white border border-black/[0.08] hover:bg-slate-50'
            }`}
          >
            Batch/Tablet
          </button>
        </div>
      </div>

      {/* Input Field */}
      <div>
        <label className="block text-sm font-medium mb-1.5">
          {trendType === 'batch' ? 'Batch/Tablet Name' : 'Product Name'} *
        </label>
        <input
          list="trend-value-suggestions"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            trendType === 'batch'
              ? 'e.g., BATCH-2024-001'
              : 'e.g., Product A'
          }
          className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
        />
        <datalist id="trend-value-suggestions">
          {valueSuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      {trendType === 'product' && (
        <div>
          <label className="block text-sm font-medium mb-1.5">Characteristic (optional)</label>
          <input
            list="trend-characteristic-suggestions"
            type="text"
            value={characteristic}
            onChange={(e) => setCharacteristic(e.target.value)}
            placeholder="Type characteristic to narrow trend"
            className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <datalist id="trend-characteristic-suggestions">
            {characteristicSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
      )}

      {/* Help Text */}
      <div className="text-xs opacity-60 p-2 bg-slate-50 rounded">
        {trendType === 'batch'
          ? 'Enter the tablet/batch ID to see all measurements and results over time'
          : 'Enter the product name to see overall trend and quality metrics'}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {isLoading ? 'Loading...' : 'Get Trend Data'}
      </button>
    </form>
  );
}
