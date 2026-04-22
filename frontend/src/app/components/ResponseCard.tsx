import { motion } from 'motion/react';
import DataAnalysisResponse from './responses/DataAnalysisResponse';
import ReportResponse from './responses/ReportResponse';
import PredictionResponse from './responses/PredictionResponse';
import ComparisonResponse from './responses/ComparisonResponse';
import SummaryResponse from './responses/SummaryResponse';

interface Message {
  id: string;
  query: string;
  type: 'summary' | 'data-analysis' | 'report' | 'prediction' | 'comparison';
  timestamp: Date;
}

interface ResponseCardProps {
  message: Message;
}

export default function ResponseCard({ message }: ResponseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Query Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="text-[15px] opacity-50 mb-1">
            {message.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="text-lg">{message.query}</div>
        </div>
      </div>

      {/* Response Content */}
      <div className="bg-white border border-black/[0.08] rounded-xl overflow-hidden">
        {message.type === 'data-analysis' && <DataAnalysisResponse />}
        {message.type === 'report' && <ReportResponse />}
        {message.type === 'prediction' && <PredictionResponse />}
        {message.type === 'comparison' && <ComparisonResponse />}
        {message.type === 'summary' && <SummaryResponse />}
      </div>
    </motion.div>
  );
}
