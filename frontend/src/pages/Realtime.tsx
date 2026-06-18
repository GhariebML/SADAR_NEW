// src/pages/Realtime.tsx  (v3.0 — Professional Cyberpunk UI/UX Refactor)
import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useStore } from '../store/useStore';
import useWebSocket from '../hooks/useWebSocket';
import StatusBadge from '../components/StatusBadge';
import CyberTooltip from '../components/CyberTooltip';

const COLORS = {
  Drone: 'var(--drone-color, #e5484d)',
  Jamming: 'var(--jamming-color, #f5a623)',
  Normal: 'var(--normal-color, #17c964)',
  default: 'var(--info-color, #3291ff)',
};

const getLabelColor = (label: string) =>
  COLORS[label as keyof typeof COLORS] || COLORS.default;


const Realtime: React.FC = () => {
  const { signals, fetchSignals, isLoading } = useStore();
  const { isConnected, lastMessage } = useWebSocket();
  const [refreshInterval, setRefreshInterval] = useState<number>(5);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [confidenceHistory, setConfidenceHistory] = useState<any[]>([]);
  const [alertVisible, setAlertVisible] = useState(false);
  const [prevMessage, setPrevMessage] = useState<any>(null);

  const refreshData = useCallback(async () => {
    await fetchSignals(100);
    setLastUpdate(new Date());
  }, [fetchSignals]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, refreshData]);

  useEffect(() => {
    if (signals.length > 0) {
      const history = signals.slice(0, 20).map((signal) => ({
        time: new Date(signal.timestamp).toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        confidence: signal.confidence * 100,
        label: signal.label,
      }));
      setConfidenceHistory(history.reverse());
    }
  }, [signals]);

  useEffect(() => {
    if (lastMessage && lastMessage !== prevMessage) {
      setPrevMessage(lastMessage);
      setAlertVisible(true);
      const t = setTimeout(() => setAlertVisible(false), 6000);
      return () => clearTimeout(t);
    }
  }, [lastMessage]);

  const labelDistribution = signals.reduce((acc, signal) => {
    acc[signal.label] = (acc[signal.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(labelDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  const total = pieData.reduce((s, d) => s + d.value, 0);

  const getConfidenceStyle = (confidence: number): React.CSSProperties => {
    if (confidence >= 80) return { color: 'var(--normal-color)', fontWeight: 700 };
    if (confidence >= 60) return { color: 'var(--warning-color)', fontWeight: 700 };
    return { color: 'var(--alert-color)', fontWeight: 700 };
  };

  return (
    <div className="realtime-page grid-pattern">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h2 className="title-glow">المراقبة اللحظية</h2>
          <p>شاشة الرصد التكتيكية وتحليل النبضات في الوقت الفعلي</p>
        </div>

        <div className="header-actions">
          {/* Refresh controls */}
          <div className="action-control">
            <span className="control-label">دورة التحديث:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="control-select"
            >
              <option value={1}>1 ثانية</option>
              <option value={2}>2 ثانية</option>
              <option value={5}>5 ثوانٍ</option>
              <option value={10}>10 ثوانٍ</option>
              <option value={30}>30 ثانية</option>
            </select>
          </div>

          {/* WebSocket status indicator */}
          <div className="action-control">
            <span className="control-label">WebSocket:</span>
            <span className="status-indicator-dot" style={{
              background: isConnected ? 'var(--normal-color)' : 'var(--alert-color)',
              boxShadow: isConnected ? '0 0 10px var(--normal-glow)' : '0 0 10px var(--drone-glow)',
            }} />
            <span className="control-value" style={{ color: isConnected ? 'var(--normal-color)' : 'var(--alert-color)' }}>
              {isConnected ? 'نشط' : 'منقطع'}
            </span>
          </div>

          <span className="time-badge">تزامن: {lastUpdate.toLocaleTimeString('ar-EG')}</span>
        </div>
      </div>

      {/* ── Stats Telemetry Grid ── */}
      <div className="telemetry-grid">
        {(['Normal', 'Drone', 'Jamming'] as const).map((type) => {
          const count = labelDistribution[type] || 0;
          const pct = total ? Math.round((count / total) * 100) : 0;
          return (
            <div key={type} className="telemetry-card card card-radar-sweep" style={{ '--accent-color': getLabelColor(type) } as React.CSSProperties}>
              <div className="accent-bar" />
              <p className="telemetry-label">
                {type === 'Normal' ? '✅ إشارات طبيعية' : type === 'Drone' ? '🚁 طائرات مسيّرة' : '📡 تشويش نشط'}
              </p>
              <p className="telemetry-value" style={{ color: getLabelColor(type) }}>
                {count}
              </p>
              <p className="telemetry-sub">
                {pct}% من الموجات الملتقطة
              </p>
            </div>
          );
        })}
        
        <div className="telemetry-card card card-radar-sweep" style={{ '--accent-color': 'var(--primary-color)' } as React.CSSProperties}>
          <div className="accent-bar" />
          <p className="telemetry-label">📻 إجمالي الموجات</p>
          <p className="telemetry-value" style={{ color: 'var(--primary-color)' }}>
            {total}
          </p>
          <p className="telemetry-sub">
            آخر {signals.length} نبضة ممسوحة
          </p>
        </div>
      </div>

      {/* ── Charts section ── */}
      <div className="charts-grid">
        {/* Real-time pulse flow */}
        <div className="chart-wrapper card" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-cyber">
            <h3>نبضات الثقة — آخر 20 إشارة ممسوحة</h3>
            <span className="tech-badge">REAL-TIME TELEMETRY</span>
          </div>
          <div style={{ flex: 1, minHeight: 260, marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={confidenceHistory} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.25} vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--text-secondary)"
                tick={{ fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--text-secondary)"
                tick={{ fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CyberTooltip />} cursor={{ fill: 'transparent' }} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="var(--primary-color)"
                strokeWidth={3}
                dot={{ fill: 'var(--primary-color)', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 1.5 }}
                name="الثقة"
              />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Spectrum Distribution */}
        <div className="chart-wrapper card" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header-cyber">
            <h3>توزيع الطيف الترددي</h3>
            <span className="tech-badge">SPECTRUM SPLIT</span>
          </div>
          <div className="donut-container" style={{ flex: 1, marginTop: '20px' }}>
            <div className="donut-chart-wrap">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart margin={{ top: 10, bottom: 10 }}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getLabelColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip content={<CyberTooltip />} cursor={{ fill: 'transparent' }} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center-label">
                <div className="val">{total}</div>
                <div className="lbl">إشارة</div>
              </div>
            </div>

            <div className="donut-legend">
              {pieData.map((entry) => (
                <div key={entry.name} className="legend-item">
                  <span className="legend-bullet" style={{ background: getLabelColor(entry.name) }} />
                  <span className="legend-name">{entry.name}</span>
                  <span className="legend-val" style={{ color: getLabelColor(entry.name) }}>
                    {total ? Math.round((entry.value / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table view ── */}
      <div className="table-wrapper-card card">
        <div className="card-header-cyber">
          <h3>سجل الرصد اللحظي</h3>
          <span className="table-counter-badge">{signals.slice(0, 50).length} نبضة نشطة</span>
        </div>

        {isLoading ? (
          <div className="loading-placeholder">
            <div className="loading-spinner mx-auto mb-2" />
            جاري تهيئة قنوات رصد الإشارات...
          </div>
        ) : (
          <div className="table-responsive-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>نوع الإشارة</th>
                  <th>التردد (MHz)</th>
                  <th>نسبة الثقة</th>
                  <th>SNR (dB)</th>
                  <th>قوة الإشارة</th>
                  <th>المصدر</th>
                  <th>المحطة</th>
                  <th>الاتجاه</th>
                  <th>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {signals.slice(0, 50).map((signal, index) => (
                  <tr key={signal.id}>
                    <td className="row-number">{index + 1}</td>
                    <td>
                      <span className="label-badge" style={{
                        background: `${getLabelColor(signal.label)}15`,
                        color: getLabelColor(signal.label),
                        border: `1px solid ${getLabelColor(signal.label)}30`,
                      }}>{signal.label === 'Drone' ? '🚁 Drone' : signal.label === 'Jamming' ? '📡 Jamming' : '✅ Normal'}</span>
                    </td>
                    <td className="mono font-semibold">{signal.frequency}</td>
                    <td>
                      <span style={getConfidenceStyle(signal.confidence * 100)}>
                        {Math.round(signal.confidence * 100)}%
                      </span>
                    </td>
                    <td className="font-medium">{signal.snr}</td>
                    <td className="font-medium">{signal.strength}</td>
                    <td className="source-col font-medium">{signal.source || '—'}</td>
                    <td className="font-semibold">{signal.station}</td>
                    <td className="source-col font-medium">{signal.direction || '—'}</td>
                    <td className="time-col">{new Date(signal.timestamp).toLocaleTimeString('ar-EG')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Alert Toast Banner ── */}
      {alertVisible && lastMessage && (
        <div className="alert-toast-banner card">
          <div className="toast-left">
            <span className="toast-icon">🚨</span>
            <div className="toast-body">
              <p className="toast-title">إنذار رصد طيف مبكر</p>
              <div className="toast-details">
                <span>النوع: {lastMessage.alert_type === 'Drone' ? '🚁 طائرة مسيرة' : lastMessage.alert_type === 'Jamming' ? '📡 تشويش' : lastMessage.alert_type || 'موجة مجهولة'}</span>
                <span>المحطة: {lastMessage.location || 'القاهرة'}</span>
                <span>توقيت: {lastMessage.timestamp ? new Date(lastMessage.timestamp).toLocaleTimeString('ar-EG') : 'فوري'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setAlertVisible(false)} className="toast-close-btn">×</button>
        </div>
      )}

      <style>{`
        .realtime-page { padding: 12px; direction: rtl; }
        
        .page-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 36px; border-bottom: 1px solid var(--border-color);
          padding-bottom: 20px; flex-wrap: wrap; gap: 16px;
        }
        .page-header h2 { margin-bottom: 6px; font-size: 1.8rem; font-weight: 800; }
        .title-glow {
          background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
          -webkit-background-clip: text; background-clip: text;
        }
        .page-header p { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
        
        .header-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        
        .action-control {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color);
          border-radius: 12px; padding: 6px 14px; font-size: 12.5px;
          font-weight: 600;
        }
        .control-label { color: var(--text-secondary); }
        .control-select {
          background: transparent; color: var(--text-primary); border: none;
          font-weight: 700; cursor: pointer; outline: none;
        }
        .status-indicator-dot { width: 8px; height: 8px; border-radius: 50%; }
        .control-value { font-weight: 700; }
        
        .time-badge {
          background: rgba(50, 145, 255, 0.08); border: 1px solid rgba(50, 145, 255, 0.2);
          padding: 6px 14px; border-radius: 20px; color: var(--primary-color);
          font-size: 12px; font-weight: 700;
        }

        .telemetry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 28px; }
        .telemetry-card {
          position: relative; overflow: hidden; padding: 18px 22px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .telemetry-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0,0,0,0.12); }
        .accent-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: var(--accent-color);
        }
        .telemetry-label { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; }
        .telemetry-value { font-size: 30px; font-family: 'Outfit', sans-serif; font-weight: 900; line-height: 1.1; margin-bottom: 4px; }
        .telemetry-sub { font-size: 10px; color: var(--text-tertiary); font-weight: 500; }

        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
        .chart-wrapper { min-height: 400px; }
        .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; }
        .chart-header h3 { font-size: 15px; font-weight: 800; color: var(--text-primary); }
        .tech-badge {
          font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 800;
          color: var(--primary-color); background: rgba(50, 145, 255, 0.08);
          border: 1px solid rgba(50, 145, 255, 0.2); border-radius: 6px; padding: 3px 8px;
          letter-spacing: 0.05em;
        }

        .donut-container { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
        .donut-chart-wrap { position: relative; flex: 1; min-width: 180px; }
        .donut-center-label {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          text-align: center; pointer-events: none;
        }
        .donut-center-label .val { font-size: 24px; font-weight: 900; color: var(--text-primary); line-height: 1; }
        .donut-center-label .lbl { font-size: 10.5px; font-weight: 600; color: var(--text-tertiary); margin-top: 3px; }
        
        .donut-legend { display: flex; flex-direction: column; gap: 10px; min-width: 140px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 600; }
        .legend-bullet { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .legend-name { color: var(--text-secondary); flex: 1; }
        .legend-val { font-weight: 800; }

        .chart-tooltip-cyber {
          background: var(--bg-tertiary); border: 1px solid var(--border-color);
          border-radius: 12px; padding: 10px 14px; font-size: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }
        .tooltip-time { color: var(--text-tertiary); margin-bottom: 4px; font-weight: 500; }
        .tooltip-conf { color: var(--primary-color); font-weight: 800; font-size: 13px; }
        .tooltip-label { margin-top: 4px; font-weight: 700; }

        .table-wrapper-card { margin-bottom: 28px; }
        .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .table-header h3 { font-size: 15px; font-weight: 800; color: var(--text-primary); }
        .table-counter-badge {
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);
          border-radius: 20px; padding: 4px 14px; font-size: 11.5px; font-weight: 700;
          color: var(--text-secondary);
        }
        .table-responsive-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th { padding: 12px 14px; text-align: center; color: var(--text-secondary); font-weight: 600; font-size: 12px; border-bottom: 2px solid var(--border-color); }
        tbody td { padding: 12px 14px; border-bottom: 1px solid var(--border-color); text-align: center; vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr { transition: background-color 0.2s ease; }
        tbody tr:hover { background: rgba(50, 145, 255, 0.03); }
        .row-number { font-size: 12px; color: var(--text-tertiary); font-weight: 600; }
        .label-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-block; }
        .mono { font-family: monospace; color: var(--primary-color); letter-spacing: 0.05em; }
        .source-col { color: var(--text-secondary); }
        .time-col { color: var(--text-tertiary); font-size: 12px; font-weight: 500; }

        .alert-toast-banner {
          position: fixed; bottom: 28px; left: 28px;
          background: rgba(10, 10, 15, 0.9); backdrop-filter: blur(16px);
          border: 1px solid rgba(229, 72, 77, 0.5); border-right: 4px solid var(--alert-color);
          padding: 16px 20px; display: flex; align-items: flex-start; gap: 14px;
          box-shadow: 0 12px 40px rgba(229, 72, 77, 0.2), inset 0 0 20px rgba(229, 72, 77, 0.1); 
          z-index: 1000; max-width: 380px; width: calc(100% - 56px);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
        }
        .alert-toast-banner::before {
          content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
          background: conic-gradient(transparent, transparent, transparent, rgba(229, 72, 77, 0.15));
          animation: rotate-radar 4s linear infinite; pointer-events: none;
        }
        .alert-toast-banner::after {
          content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 200%;
          background: linear-gradient(to bottom, transparent 40%, rgba(229, 72, 77, 0.2) 50%, transparent 60%);
          animation: scanline 2.5s linear infinite; pointer-events: none;
        }
        .toast-left { display: flex; gap: 14px; flex: 1; }
        .toast-icon { font-size: 20px; flex-shrink: 0; filter: drop-shadow(0 0 8px var(--drone-glow)); }
        .toast-title { margin: 0 0 6px; font-weight: 800; font-size: 14.5px; color: var(--drone-color); }
        .toast-details { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: var(--text-secondary); font-weight: 500; }
        .toast-close-btn {
          background: none; border: none; cursor: pointer; color: var(--text-secondary);
          font-size: 22px; line-height: 1; padding: 0; margin-right: auto;
          transition: color 0.15s ease;
        }
        .toast-close-btn:hover { color: var(--text-primary); }

        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes rotate-radar { 100% { transform: rotate(360deg); } }
        @keyframes scanline { 0% { transform: translateY(-50%); } 100% { transform: translateY(0); } }

        @media (max-width: 1280px) {
          .telemetry-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1024px) {
          .charts-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .telemetry-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default Realtime;