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
  const [characteristic, setCharacteristic] = useState('');
  const [quantitative, setQuantitative] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [batch, setBatch] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [characteristicSuggestions, setCharacteristicSuggestions] = useState<string[]>([]);
  const [batchSuggestions, setBatchSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
        const items = await getSuggestions('characteristic', characteristic, {
          product: product.trim() || undefined,
          limit: 20,
        });
        setCharacteristicSuggestions(items);
      } catch {
        setCharacteristicSuggestions([]);
      }
    };
    loadSuggestions();
  }, [product, characteristic]);

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

  const selectedCharacteristicMeta = useMemo(() => {
    const list = products[product] || [];
    return list.find((item) => item.characteristic === characteristic) || null;
  }, [products, product, characteristic]);

  useEffect(() => {
    if (!selectedCharacteristicMeta) {
      return;
    }
    setMinValue(String(selectedCharacteristicMeta.min_value));
    setMaxValue(String(selectedCharacteristicMeta.max_value));
  }, [selectedCharacteristicMeta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !characteristic || !quantitative || !startTime || !endTime || !minValue || !maxValue) {
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
        minValue: minValue ? parseFloat(minValue) : undefined,
        maxValue: maxValue ? parseFloat(maxValue) : undefined,
      });

      onComplete({
        id: Date.now().toString(),
        mode: 'manual',
        input: { product, characteristic, quantitative, batch },
        result,
        timestamp: new Date(),
      });

      // Reset form
      setQuantitative('');
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

      {/* Characteristic */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Characteristic *</label>
        <input
          list="manual-characteristic-suggestions"
          type="text"
          value={characteristic}
          onChange={(e) => setCharacteristic(e.target.value)}
          placeholder="Type characteristic"
          className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
          required
        />
        <datalist id="manual-characteristic-suggestions">
          {characteristicSuggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </div>

      {/* Quantitative Value */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Value *</label>
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

      {/* Spec bounds */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Min Value *</label>
          <input
            type="number"
            step="0.01"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
            placeholder="e.g., 95"
            className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max Value *</label>
          <input
            type="number"
            step="0.01"
            value={maxValue}
            onChange={(e) => setMaxValue(e.target.value)}
            placeholder="e.g., 103"
            className="w-full px-3 py-2 border border-black/[0.08] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {isLoading ? 'Analyzing...' : 'Analyze'}
      </button>
    </form>
  );
}
