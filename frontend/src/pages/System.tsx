import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { useWebSocket } from '../context/WebSocketContext';
import { getHealth, getAgentHealth, getStatistics, type AgentHealth } from '../api/apiClient';
import StatusBadge from '../components/StatusBadge';

interface SystemHealth {
  api:       { status: 'online' | 'offline' | 'loading'; latency?: number };
  agent:     AgentHealth | null;
  database:  { status: 'online' | 'offline' | 'loading'; connected?: boolean };
}

const System: React.FC = () => {
  const { statistics, fetchStatistics, signals, alerts } = useStore();
  
  // ✅ استخدام WebSocket من الـ Context بدلاً من checkWebSocket
  const { isConnected: wsConnected, isApiOnline } = useWebSocket();

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    api:       { status: 'loading' },
    agent:     null,
    database:  { status: 'loading' },
  });
  const [lastPing, setLastPing]       = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      // ── API ──
      const t0  = Date.now();
      const api = await getHealth();
      const latency = Date.now() - t0;
      const apiOk = api.status === 'ok' || api.status === 'healthy';
      setSystemHealth(p => ({
        ...p,
        api: { status: apiOk ? 'online' : 'offline', latency },
      }));

      // ── Agent ──
      const agent = await getAgentHealth();
      setSystemHealth(p => ({ ...p, agent }));

      // ── Database ──
      try {
        const stats = await getStatistics();
        setSystemHealth(p => ({
          ...p,
          database: { status: stats ? 'online' : 'offline', connected: !!stats },
        }));
      } catch {
        setSystemHealth(p => ({ ...p, database: { status: 'offline', connected: false } }));
      }

      setLastPing(new Date());
    } catch {
      setSystemHealth(p => ({
        ...p,
        api:      { status: 'offline' },
        database: { status: 'offline', connected: false },
      }));
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
    checkHealth();

    // ✅ لم نعد نحتاج checkWebSocket — الـ Context يدير الاتصال
    const interval = setInterval(() => {
      checkHealth();
    }, 30_000);

    return () => { clearInterval(interval); };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkHealth();
    await fetchStatistics();
    setIsRefreshing(false);
  };

  // ✅ حالة WebSocket الحقيقية من الـ Context
  const wsStatus = wsConnected ? 'online' : 'offline';
  const apiStatus = isApiOnline ? 'online' : systemHealth.api.status;

  const getLabelColor = (label: string) => ({
    Drone: '#ff4444', Jamming: '#ff8800', Normal: '#00c851',
  }[label] ?? '#00e5ff');

  return (
    <div className="system-page">
      <div className="page-header">
        <div className="header-left">
          <h2>مراقبة النظام</h2>
          <p>حالة النظام والمكونات والأداء</p>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? '🔄 جاري التحديث...' : '🔄 تحديث'}
        </button>
      </div>

      {/* Overview */}
      <div className="stats-grid">
        {[
          { icon: '📡', value: statistics?.total_signals ?? 0,    label: 'إجمالي الإشارات' },
          { icon: '⚠️', value: statistics?.alert_count ?? 0,      label: 'التنبيهات النشطة' },
          { icon: '🎯', value: statistics?.alert_threshold ?? 0,  label: 'حد التنبيهات' },
          { icon: '🕐', value: '—',                                label: 'مدة التشغيل' },
        ].map(({ icon, value, label }) => (
          <div key={label} className="stat-card">
            <div className="stat-icon">{icon}</div>
            <div className="stat-info">
              <div className="stat-value">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Health Cards */}
      <div className="health-grid">
        <div className="health-card">
          <h3>🖥️ API Server</h3>
          <div className="health-status">
            <div className="status-row">
              <span>الحالة:</span>
              <StatusBadge status={apiStatus as any} size="medium" />
            </div>
            {systemHealth.api.latency && (
              <div className="status-row">
                <span>زمن الاستجابة:</span>
                <span className="value">{systemHealth.api.latency} ms</span>
              </div>
            )}
            <div className="status-row">
              <span>المنفذ:</span>
              <span className="value">8000</span>
            </div>
          </div>
        </div>

        <div className="health-card">
          <h3>🤖 AI Agent (Ollama)</h3>
          <div className="health-status">
            <div className="status-row">
              <span>الحالة:</span>
              <StatusBadge
                status={systemHealth.agent?.ollama?.ok ? 'online' : 'offline'}
                size="medium"
              />
            </div>
            {systemHealth.agent?.ollama?.model && (
              <div className="status-row">
                <span>النموذج:</span>
                <span className="value">{systemHealth.agent.ollama.model}</span>
              </div>
            )}
            <div className="status-row">
              <span>النية الأخيرة:</span>
              <span className="value">—</span>
            </div>
          </div>
        </div>

        <div className="health-card">
          <h3>🔌 WebSocket</h3>
          <div className="health-status">
            <div className="status-row">
              <span>الحالة:</span>
              <StatusBadge status={wsStatus as any} size="medium" />
            </div>
            <div className="status-row">
              <span>المنفذ:</span>
              <span className="value">8000</span>
            </div>
            <div className="status-row">
              <span>المسار:</span>
              <span className="value">/ws/alerts/</span>
            </div>
          </div>
        </div>

        <div className="health-card">
          <h3>💾 Database</h3>
          <div className="health-status">
            <div className="status-row">
              <span>الحالة:</span>
              <StatusBadge status={systemHealth.database.status as any} size="medium" />
            </div>
            <div className="status-row">
              <span>النوع:</span>
              <span className="value">PostgreSQL</span>
            </div>
            <div className="status-row">
              <span>متصل:</span>
              <span className="value">{systemHealth.database.connected ? 'نعم' : 'لا'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Label Breakdown */}
      <div className="breakdown-section">
        <h3>🏷️ توزيع الإشارات حسب النوع</h3>
        <div className="label-breakdown">
          {statistics?.label_counts ? (
            Object.entries(statistics.label_counts).map(([label, count]) => (
              <div key={label} className="label-card">
                <div className="label-header">
                  <span className="label-name" style={{ color: getLabelColor(label) }}>{label}</span>
                  <span className="label-count">{count}</span>
                </div>
                <div className="label-bar">
                  <div className="label-bar-fill" style={{
                    width: `${(count / (statistics.total_signals || 1)) * 100}%`,
                    backgroundColor: getLabelColor(label),
                  }} />
                </div>
                <div className="label-percent">
                  {((count / (statistics.total_signals || 1)) * 100).toFixed(1)}%
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">لا توجد بيانات كافية</div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="info-grid">
        <div className="info-card">
          <h3>📊 إحصائيات قاعدة البيانات</h3>
          <div className="info-list">
            {[
              ['إجمالي الإشارات',  statistics?.total_signals ?? 0],
              ['إجمالي التنبيهات', alerts.length],
              ['أحدث إشارة',       signals[0] ? new Date(signals[0].timestamp).toLocaleString('ar-EG') : '—'],
              ['عدد المحطات',      1],
            ].map(([label, value]) => (
              <div key={String(label)} className="info-row">
                <span>{label}</span><span>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="info-card">
          <h3>⚙️ معلومات النظام</h3>
          <div className="info-list">
            {[
              ['الإصدار',       'v1.0.0'],
              ['آخر فحص صحي',  lastPing ? lastPing.toLocaleTimeString('ar-EG') : '—'],
              ['الوضع',        'داكن'],
              ['البيئة',       'Production'],
            ].map(([label, value]) => (
              <div key={String(label)} className="info-row">
                <span>{label}</span>
                <span className={label === 'الوضع' ? 'mode-dark' : ''}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .system-page { padding: 0; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .header-left h2 { margin-bottom: 4px; }
        .header-left p  { color: var(--text-secondary); font-size: 14px; }
        .refresh-btn { background: var(--bg-tertiary); border: 1px solid var(--border-color); padding: 8px 20px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .refresh-btn:hover:not(:disabled) { background: var(--primary-color); border-color: var(--primary-color); }
        .refresh-btn:disabled { opacity: 0.6; cursor: wait; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
        .stat-card { background: var(--card-bg); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 16px; border: 1px solid var(--border-color); }
        .stat-icon { font-size: 32px; }
        .stat-info { flex: 1; }
        .stat-value { font-size: 28px; font-weight: 700; color: var(--primary-color); }
        .stat-label { font-size: 12px; color: var(--text-secondary); }
        .health-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
        .health-card { background: var(--card-bg); border-radius: 16px; padding: 20px; border: 1px solid var(--border-color); }
        .health-card h3 { font-size: 16px; margin-bottom: 16px; }
        .health-status { display: flex; flex-direction: column; gap: 12px; }
        .status-row { display: flex; justify-content: space-between; font-size: 13px; }
        .status-row span:first-child { color: var(--text-secondary); }
        .status-row .value { color: var(--text-primary); font-weight: 500; }
        .breakdown-section { background: var(--card-bg); border-radius: 16px; padding: 20px; border: 1px solid var(--border-color); margin-bottom: 24px; }
        .breakdown-section h3 { font-size: 18px; margin-bottom: 20px; }
        .label-breakdown { display: flex; flex-direction: column; gap: 16px; }
        .label-card { padding: 8px 0; }
        .label-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label-name { font-weight: 600; font-size: 14px; }
        .label-count { font-size: 14px; color: var(--text-secondary); }
        .label-bar { height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
        .label-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
        .label-percent { font-size: 11px; color: var(--text-tertiary); }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .info-card { background: var(--card-bg); border-radius: 16px; padding: 20px; border: 1px solid var(--border-color); }
        .info-card h3 { font-size: 16px; margin-bottom: 16px; }
        .info-list { display: flex; flex-direction: column; gap: 12px; }
        .info-row { display: flex; justify-content: space-between; font-size: 13px; }
        .info-row span:first-child { color: var(--text-secondary); }
        .info-row span:last-child  { color: var(--text-primary); font-weight: 500; }
        .mode-dark { color: var(--primary-color) !important; }
        .no-data { text-align: center; padding: 40px; color: var(--text-secondary); }
        @media (max-width: 1024px) { .stats-grid, .health-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px)  { .stats-grid, .health-grid, .info-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default System;