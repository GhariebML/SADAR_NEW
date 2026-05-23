// src/pages/Map.tsx — v2.0 Real-time
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import useWebSocket from '../hooks/useWebSocket';
import MapView from '../components/MapView';
import type { Signal } from '../api/apiClient';

const SDR_STATIONS = [
  { id: 1, name: 'SIM-SDR-1', location: 'Cairo', lat: 30.0444, lng: 31.2357, status: 'online' as const },
];

// ألوان الإشارات على الخريطة
const SIGNAL_COLORS: Record<string, string> = {
  Drone:   '#FF0000',   // أحمر
  Jamming: '#FF8C00',   // برتقالي
  Normal:  '#00CC44',   // أخضر
};

const getSignalColor = (label: string) =>
  SIGNAL_COLORS[label] || '#00E5FF';

const Map: React.FC = () => {
  const { signals, fetchSignals, isLoading } = useStore();
  const { isConnected, lastMessage }         = useWebSocket();
  const [refreshInterval, setRefreshInterval] = useState<number>(3);
  const [lastUpdate, setLastUpdate]           = useState<Date>(new Date());
  const [selectedSignal, setSelectedSignal]   = useState<Signal | null>(null);
  const [alertFlash, setAlertFlash]           = useState(false);
  const isFirstLoad                           = useRef(true);
  const intervalRef                           = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── جلب البيانات ──────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    await fetchSignals(200);
    setLastUpdate(new Date());
    isFirstLoad.current = false;
  }, [fetchSignals]);

  // ── تحديث دوري ────────────────────────────────────────────────
  useEffect(() => {
    refreshData();
    intervalRef.current = setInterval(refreshData, refreshInterval * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshInterval, refreshData]);

  // ── WebSocket — تحديث فوري لما تيجي إشارة جديدة ──────────────
  useEffect(() => {
    if (lastMessage) {
      // جيب البيانات فوراً بدون انتظار الـ interval
      refreshData();

      // فلاش لو alert
      if (lastMessage.alert_type) {
        setAlertFlash(true);
        setTimeout(() => setAlertFlash(false), 2000);
      }
    }
  }, [lastMessage, refreshData]);

  // ── إحصائيات سريعة ────────────────────────────────────────────
  const counts = signals.reduce((acc, s) => {
    acc[s.label] = (acc[s.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="map-page">

      {/* ── Header ── */}
      <div className="page-header">
        <div className="header-left">
          <h2 style={{ margin: 0 }}>الخريطة الجغرافية</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            عرض مواقع إشارات RF في الوقت الفعلي
          </p>
        </div>

        <div className="header-right">
          {/* WebSocket status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 10, padding: '6px 14px', fontSize: 13,
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>WebSocket</span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isConnected ? '#00CC44' : '#FF4444',
              boxShadow: isConnected ? '0 0 6px #00CC44' : '0 0 6px #FF4444',
            }} />
            <span style={{
              fontWeight: 600, fontSize: 12,
              color: isConnected ? '#00CC44' : '#FF4444',
            }}>
              {isConnected ? 'متصل' : 'منقطع'}
            </span>
          </div>

          {/* Refresh interval */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 10, padding: '6px 12px',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>تحديث كل</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{
                background: 'transparent', color: 'var(--text-primary)',
                border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <option value={1}>1 ث</option>
              <option value={2}>2 ث</option>
              <option value={3}>3 ث</option>
              <option value={5}>5 ث</option>
              <option value={10}>10 ث</option>
            </select>
          </div>

          <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-EG')}
          </span>
        </div>
      </div>

      {/* ── Stats + Legend ── */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 12,
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* Legend */}
        <div style={{
          display: 'flex', gap: 16,
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 12, padding: '8px 16px',
          alignItems: 'center',
        }}>
          {[
            { label: 'محطة SDR', color: '#00E5FF', glow: true },
            { label: 'Drone',    color: '#FF0000' },
            { label: 'Jamming',  color: '#FF8C00' },
            { label: 'Normal',   color: '#00CC44' },
          ].map(({ label, color, glow }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: color,
                boxShadow: glow ? `0 0 6px ${color}` : undefined,
                display: 'inline-block',
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              {counts[label] !== undefined && (
                <span style={{ fontWeight: 700, color }}>{counts[label]}</span>
              )}
            </div>
          ))}
        </div>

        {/* إجمالي */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 12, padding: '8px 16px',
          fontSize: 13,
        }}>
          <span style={{ color: 'var(--text-secondary)' }}>إجمالي: </span>
          <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
            {signals.length}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}> إشارة</span>
        </div>

        {/* Alert flash */}
        {alertFlash && (
          <div style={{
            background: '#FF000020',
            border: '1px solid #FF4444',
            borderRadius: 12, padding: '8px 16px',
            fontSize: 13, color: '#FF4444', fontWeight: 700,
            animation: 'pulse 0.5s ease infinite',
          }}>
            🚨 تنبيه جديد!
          </div>
        )}
      </div>

      {/* ── الخريطة ── */}
      <MapView
        stations={SDR_STATIONS}
        signals={signals}
        center={[26.8206, 30.8025]}
        zoom={6}
        onSignalClick={setSelectedSignal}
        height="calc(100vh - 240px)"
        isLoading={isLoading}
        lastUpdate={lastUpdate}
        onRefresh={refreshData}
      />

      {/* ── Signal Detail Panel ── */}
      {selectedSignal && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, width: 300,
          background: 'var(--card-bg)',
          border: `2px solid ${getSignalColor(selectedSignal.label)}60`,
          borderRadius: 16,
          boxShadow: `0 4px 24px ${getSignalColor(selectedSignal.label)}30`,
          zIndex: 1000,
          animation: 'slideIn 0.3s ease',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                fontSize: 12, fontWeight: 700,
                background: `${getSignalColor(selectedSignal.label)}20`,
                color: getSignalColor(selectedSignal.label),
                border: `1px solid ${getSignalColor(selectedSignal.label)}50`,
              }}>
                {selectedSignal.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>تفاصيل الإشارة</span>
            </div>
            <button
              onClick={() => setSelectedSignal(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: 20, lineHeight: 1,
                width: 28, height: 28, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>

          <div style={{ padding: 16 }}>
            {[
              ['الثقة',   `${Math.round(selectedSignal.confidence * 100)}%`],
              ['التردد',  `${selectedSignal.frequency} MHz`],
              ['القوة',   `${selectedSignal.strength} dBm`],
              ['SNR',     `${selectedSignal.snr} dB`],
              ['المحطة',  selectedSignal.station],
              ['الاتجاه', selectedSignal.direction || '—'],
              ['الوقت',   new Date(selectedSignal.timestamp).toLocaleTimeString('ar-EG')],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '7px 0', borderBottom: '1px solid var(--border-color)',
                fontSize: 13,
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .map-page {
          padding: 0;
          height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

export default Map;
