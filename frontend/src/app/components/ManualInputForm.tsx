import { useState, useEffect, useMemo } from 'react';
import { Send } from 'lucide-react';
import { predictManual, getProductOptionsDetail, getSuggestions } from '../../services/api';

interface ManualInputFormProps {
  onStart: () => void;
  onComplete: (analysis: any) => void;
  onError: (error: string) => void;
}

export default function ManualInputForm({ onStart, onComplete, onError }: ManualInputFormProps) {
  const [products, setProducts] = useState<Record<string, Array<{ characteristic: string; min_value: number; max_value: number; target: number }>>>({});
  const [product, setProduct] = useState('');
  const [characteristics, setCharacteristics] = useState<Record<string, string>>({});
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [batch, setBatch] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [batchSuggestions, setBatchSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const CHARACTERISTICS = [
    'Potency',
    'PH Level',
    'Impurities',
    'Dissolution Rate - 15 Mins',
    'Dissolution Rate - 30 Mins',
    'Dissolution Rate - 40 Mins',
    'Process Temp',
  ];

  useEffect(() => {
    getProductOptionsDetail()
      .then((data) => setProducts(data.products || {}))
      .catch((err) => onError(`Failed to load products: ${err.message}`));
  }, []);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const items = await getSuggestions('product', product, { limit: 20 });
        setProductSuggestions(items);
      } catch {
        setProductSuggestions([]);
      }
    };
    loadSuggestions();
  }, [product]);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const items = await getSuggestions('batch', batch, { limit: 20 });
        setBatchSuggestions(items);
      } catch {
        setBatchSuggestions([]);
      }
    };
    loadSuggestions();
  }, [batch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !startTime || !endTime) {
      onError('Please fill in all required fields');
      return;
    }

    // Check if at least one characteristic is filled
    const filledCharacteristics = Object.fromEntries(
      Object.entries(characteristics).filter(([_, value]) => value.trim() !== '')
    );
    if (Object.keys(filledCharacteristics).length === 0) {
      onError('Please provide values for at least one characteristic');
      return;
    }

    onStart();
    setIsLoading(true);

    try {
      const parsedCharacteristics = Object.fromEntries(
        Object.entries(filledCharacteristics).map(([key, value]) => [key, parseFloat(value)])
      );

      const result = await predictManual({
        product,
        characteristics: parsedCharacteristics,
        startTime,
        endTime,
        batch: batch || undefined,
      });

      onComplete({
        id: Date.now().toString(),
        mode: 'manual',
        input: { product, characteristics: parsedCharacteristics, batch },
        result,
        timestamp: new Date(),
      });

      // Reset form
      setCharacteristics({});
      setStartTime('');
      setEndTime('');
      setBatch('');
    } catch (err) {
      onError(`Prediction failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Product */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Product *</label>
        <input
          list="manual-product-suggestions"
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          placeholder="Type product name"
          className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          required
        />
        <datalist id="manual-product-suggestions">
          {productSuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      {/* Characteristics */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Characteristics (provide values for all or at least one)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CHARACTERISTICS.map((char) => (
            <div key={char}>
              <label className="block text-xs font-medium mb-1">{char}</label>
              <input
                type="number"
                step="0.01"
                value={characteristics[char] || ''}
                onChange={(e) => setCharacteristics(prev => ({ ...prev, [char]: e.target.value }))}
                placeholder={`Value for ${char}`}
                className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Start Time */}
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

      {/* End Time */}
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

      {/* Batch ID */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Batch/Tablet ID</label>
        <input
          list="manual-batch-suggestions"
          type="text"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="e.g., BATCH-2024-001"
          className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <datalist id="manual-batch-suggestions">
          {batchSuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-sky-600 to-teal-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:from-sky-700 hover:to-teal-700 transition-colors disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {isLoading ? 'Analyzing...' : 'Analyze'}
      </button>
    </form>
  );
}
