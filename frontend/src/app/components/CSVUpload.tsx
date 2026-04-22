import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { predictBatchFile } from '../../services/api';

interface CSVUploadProps {
  onStart: () => void;
  onComplete: (analysis: any) => void;
  onError: (error: string) => void;
}

export default function CSVUpload({ onStart, onComplete, onError }: CSVUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        onError('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      onError('Please select a CSV file');
      return;
    }

    onStart();
    setIsLoading(true);

    try {
      const result = await predictBatchFile(file);

      onComplete({
        id: Date.now().toString(),
        mode: 'csv',
        input: { filename: file.name, size: file.size },
        result,
        timestamp: new Date(),
      });

      setFile(null);
    } catch (err) {
      onError(`Upload failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File Input */}
      <div>
        <label className="block text-sm font-medium mb-2">CSV File</label>
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isLoading}
            className="hidden"
            id="csv-file"
          />
          <label
            htmlFor="csv-file"
            className="flex items-center justify-center w-full p-6 border-2 border-dashed border-black/[0.08] rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          >
            <div className="text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">
                {file ? file.name : 'Click to select or drag CSV file'}
              </p>
              {file && (
                <p className="text-xs opacity-60 mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* File Info */}
      {file && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">
            <p className="font-medium">{file.name}</p>
            <p className="text-xs opacity-75">{(file.size / 1024).toFixed(2)} KB</p>
          </div>
        </div>
      )}

      {/* Expected Format */}
      <div className="text-xs opacity-60 space-y-1 p-3 bg-slate-50 rounded-lg">
        <p className="font-medium">Expected columns:</p>
        <ul className="list-disc list-inside">
          <li>Batch / UniqueID</li>
          <li>Product / ProductDescription</li>
          <li>Characteristic / CharacteristicDesc</li>
          <li>Value / Quantative</li>
          <li>Status / Valuation</li>
        </ul>
      </div>

      {/* Progress */}
      {isLoading && uploadProgress > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!file || isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        <Upload className="w-4 h-4" />
        {isLoading ? 'Processing...' : 'Upload & Analyze'}
      </button>
    </form>
  );
}
