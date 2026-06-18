// src/components/StatusBadge.tsx
import React from 'react';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'loading';
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showDot?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'medium',
  showDot = true,
  className = '',
}) => {
  const getStatusText = (): string => {
    if (label) return label;
    switch (status) {
      case 'online':
        return 'متصل';
      case 'offline':
        return 'غير متصل';
      case 'loading':
        return 'جاري الاتصال...';
      default:
        return 'غير معروف';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'online':
        return '#00c851';
      case 'offline':
        return '#ff4444';
      case 'loading':
        return '#ff8800';
      default:
        return '#9ca3af';
    }
  };

  const getSizeStyles = (): { padding: string; fontSize: string; gap: string } => {
    switch (size) {
      case 'small':
        return { padding: '2px 8px', fontSize: '10px', gap: '4px' };
      case 'large':
        return { padding: '8px 16px', fontSize: '14px', gap: '8px' };
      default:
        return { padding: '4px 12px', fontSize: '12px', gap: '6px' };
    }
  };

  const getDotSize = (): number => {
    switch (size) {
      case 'small':
        return 6;
      case 'large':
        return 10;
      default:
        return 8;
    }
  };

  const sizeStyles = getSizeStyles();
  const dotSize = getDotSize();
  const statusColor = getStatusColor();

  return (
    <div
      className={`status-badge status-badge-${status} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeStyles.gap,
        padding: sizeStyles.padding,
        borderRadius: '20px',
        background: `rgba(${parseInt(statusColor.slice(1, 3), 16)}, ${parseInt(statusColor.slice(3, 5), 16)}, ${parseInt(statusColor.slice(5, 7), 16)}, 0.15)`,
        border: `1px solid ${statusColor}`,
        fontSize: sizeStyles.fontSize,
        fontWeight: 500,
        color: statusColor,
      }}
    >
      {showDot && (
        <span
          className="status-badge-dot"
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: statusColor,
            animation: status === 'loading' ? 'statusPulse 1.5s infinite' : 'none',
            boxShadow: status === 'online' ? `0 0 4px ${statusColor}` : 'none',
          }}
        />
      )}
      <span className="status-badge-text">{getStatusText()}</span>

      <style>{`
        @keyframes statusPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default StatusBadge;