// src/components/ThreatCard.tsx
import React from 'react';

interface ThreatCardProps {
  label: string;
  count: number;
  total?: number;
  icon?: string;
  onClick?: () => void;
}

const getLabelDetails = (label: string) => {
  const details: Record<string, { color: string; bgColor: string; borderColor: string; icon: string }> = {
    Drone: {
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      icon: '🚁',
    },
    Jamming: {
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      icon: '📻',
    },
    Normal: {
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: '✅',
    },
  };
  return details[label] || {
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: '📡',
  };
};

const ThreatCard: React.FC<ThreatCardProps> = ({
  label,
  count,
  total,
  icon: customIcon,
  onClick,
}) => {
  const details = getLabelDetails(label);
  const percentage = total ? (count / total) * 100 : 0;
  const displayIcon = customIcon || details.icon;

  return (
    <div
      className={`bg-gray-900 rounded-xl p-5 border ${details.borderColor} transition-all hover:scale-[1.02] cursor-pointer`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`text-3xl ${details.color}`}>{displayIcon}</div>
        <div className={`text-2xl font-bold ${details.color}`}>{count}</div>
      </div>
      <div className="text-gray-300 font-medium mb-2">{label}</div>
      {total && (
        <>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${percentage}%`,
                backgroundColor: details.color.replace('text-', ''),
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-2">{percentage.toFixed(1)}% من الإجمالي</div>
        </>
      )}
    </div>
  );
};

export default ThreatCard;