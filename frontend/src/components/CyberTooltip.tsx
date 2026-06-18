import React from 'react';

interface CyberTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  suffix?: string;
  valueFormatter?: (value: any) => string;
}

const CyberTooltip: React.FC<CyberTooltipProps> = ({ active, payload, label, suffix = '', valueFormatter }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(10, 10, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05) inset',
        minWidth: '160px',
        pointerEvents: 'none', // Prevents tooltip from blocking clicks
        transform: 'translate(-50%, -100%)', // Adjusts placement to be above the cursor
        marginTop: '-16px', // Offset from cursor
      }}>
        {label && (
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '6px'
          }}>
            {label}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {payload.map((entry: any, index: number) => {
            const val = valueFormatter ? valueFormatter(entry.value) : entry.value;
            const color = entry.color || 'var(--primary-color)';
            
            return (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 6px ${color}` }}></span>
                  <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>{entry.name}</span>
                </div>
                <span style={{ color: color, fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit, sans-serif' }}>
                  {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val}{suffix}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default CyberTooltip;
