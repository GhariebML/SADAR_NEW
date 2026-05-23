// src/components/SignalTable.tsx
import React from 'react';
import type { Signal } from '../api/apiClient';

interface SignalTableProps {
  signals: Signal[];
  isLoading?: boolean;
  showDetails?: boolean;
  onRowClick?: (signal: Signal) => void;
  maxHeight?: string;
}

const getLabelColor = (label: string): string => {
  const colors: Record<string, string> = {
    Drone: 'text-red-500 bg-red-500/20 border-red-500',
    Jamming: 'text-orange-500 bg-orange-500/20 border-orange-500',
    Normal: 'text-green-500 bg-green-500/20 border-green-500',
  };
  return colors[label] || 'text-cyan-500 bg-cyan-500/20 border-cyan-500';
};

const getConfidenceClass = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-green-500';
  if (confidence >= 0.6) return 'text-orange-500';
  return 'text-red-500';
};

const formatConfidence = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

const SignalTable: React.FC<SignalTableProps> = ({
  signals,
  isLoading = false,
  showDetails = true,
  onRowClick,
  maxHeight = '500px',
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <div className="w-10 h-10 border-3 border-gray-700 border-t-cyan-500 rounded-full animate-spin mb-4"></div>
        <span>جاري تحميل الإشارات...</span>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-5xl mb-4 opacity-50">📡</div>
        <p>لا توجد إشارات متاحة</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800" style={{ maxHeight }}>
      <table className="w-full text-sm">
        <thead className="bg-gray-800 sticky top-0">
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-right text-gray-400 font-medium">#</th>
            <th className="px-4 py-3 text-right text-gray-400 font-medium">النوع</th>
            <th className="px-4 py-3 text-right text-gray-400 font-medium">التردد</th>
            <th className="px-4 py-3 text-right text-gray-400 font-medium">الثقة</th>
            {showDetails && (
              <>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">SNR</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">المصدر</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">المحطة</th>
                <th className="px-4 py-3 text-right text-gray-400 font-medium">الوقت</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {signals.map((signal, index) => (
            <tr
              key={signal.id}
              className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
              onClick={() => onRowClick?.(signal)}
            >
              <td className="px-4 py-3 text-gray-400">{index + 1}</td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${getLabelColor(signal.label)}`}>
                  {signal.label}
                </span>
              </td>
              <td className="px-4 py-3 font-mono">{signal.frequency} MHz</td>
              <td className={`px-4 py-3 font-medium ${getConfidenceClass(signal.confidence)}`}>
                {formatConfidence(signal.confidence)}
              </td>
              {showDetails && (
                <>
                  <td className="px-4 py-3">{signal.snr} dB</td>
                  <td className="px-4 py-3 text-gray-400">{signal.source || '—'}</td>
                  <td className="px-4 py-3">{signal.station}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(signal.timestamp).toLocaleTimeString('ar-EG')}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SignalTable;