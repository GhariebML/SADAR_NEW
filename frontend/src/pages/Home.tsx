import React, { useEffect, useState, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { useStore } from '../store/useStore';
import { useWebSocket } from '../context/WebSocketContext';
import StatusBadge from '../components/StatusBadge';
import { getAgentHealth, getHealth } from '../api/apiClient';

interface HealthState {
  api:       'online' | 'offline' | 'loading';
  agent:     'online' | 'offline' | 'loading';
  database:  'online' | 'offline' | 'loading';
  model:     string;
  latency:   number | null;
}

const LABEL_COLORS: Record<string, string> = {
  Drone: '#e5484d', Jamming: '#f5a623', Normal: '#17c964', default: '#3291ff',
};
const getLabelColor = (label: string) => LABEL_COLORS[label] ?? LABEL_COLORS.default;
const getConfidenceClass = (c: number) =>
  c >= 0.8 ? 'conf-high' : c >= 0.6 ? 'conf-med' : 'conf-low';

const KPICard = ({ title, value, color, icon, sub }: {
  title: string; value: string | number; color: string; icon: string; sub?: string;
}) => (
  <div className="kpi-card card-radar-sweep" style={{ '--accent': color, '--accent-glow': `${color}1a` } as React.CSSProperties}>
    <div className="kpi-radar-bg" />
    <div className="kpi-top">
      <span className="kpi-icon">{icon}</span>
      <span className="kpi-title">{title}</span>
    </div>
    <div className="kpi-value-wrap">
      <div className="kpi-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
    <div className="kpi-accent-glow" />
  </div>
);

const Home: React.FC = () => {
  const { statistics, signals, fetchStatistics, fetchSignals, isLoading } = useStore();
  const { isConnected: wsConnected, isApiOnline: wsApiOnline } = useWebSocket();

  const [health, setHealth] = useState<HealthState>({
    api: 'loading', agent: 'loading',
    database: 'loading',
    model: '', latency: null,
  });

  const checkHealth = useCallback(async () => {
    try {
      const t0  = Date.now();
      const api = await getHealth();
      const latency = Date.now() - t0;
      const apiOk = api.status === 'ok' || api.status === 'healthy';
      setHealth(p => ({
        ...p,
        api:      apiOk ? 'online' : 'offline',
        database: apiOk ? 'online' : 'offline',
        latency,
      }));
      const agent   = await getAgentHealth();
      const agentOk = agent?.ollama?.ok === true;
      setHealth(p => ({
        ...p,
        agent: agentOk ? 'online' : 'offline',
        model: agent?.ollama?.model ?? '',
      }));
    } catch {
      setHealth(p => ({ ...p, api: 'offline', agent: 'offline', database: 'offline' }));
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
    fetchSignals(50);
    checkHealth();

    const interval = setInterval(() => {
      checkHealth();
    }, 30_000);

    return () => { clearInterval(interval); };
  }, []);

  const total   = statistics?.total_signals              ?? 0;
  const alerts  = statistics?.alert_count                ?? 0;
  const drones  = statistics?.label_counts?.['Drone']   ?? 0;
  const jamming = statistics?.label_counts?.['Jamming'] ?? 0;
  const normal  = statistics?.label_counts?.['Normal']  ?? 0;
  const labelDist = statistics?.label_counts
    ? Object.entries(statistics.label_counts).map(([name, value]) => ({ name, value }))
    : [];
  const recentSignals = signals.slice(0, 6);

  const wsStatus = wsConnected ? 'online' : 'offline';
  const apiStatus = wsApiOnline ? 'online' : health.api;

  return (
    <div className="home-page grid-pattern">
      <div className="page-header">
        <div>
          <h2 className="title-glow">لوحة التحكم الرئيسية</h2>
          <p>نظرة عامة على نظام رصد وتحليل إشارات الطيف الترددي</p>
        </div>
        <div className="header-meta">
          {health.latency !== null && (
            <span className="latency-badge">⚡ {health.latency} ms</span>
          )}
          <span className="update-time">تحديث فوري: {new Date().toLocaleTimeString('ar-EG')}</span>
        </div>
      </div>

      <div className="kpi-grid">
        <KPICard icon="📡" title="إجمالي الإشارات"  value={total}   color="#3291ff" />
        <KPICard icon="🚁" title="إشارات الطائرات"  value={drones}  color="#e5484d"
          sub={total ? `${((drones  / total) * 100).toFixed(1)}% من الإجمالي` : undefined} />
        <KPICard icon="✅" title="إشارات طبيعية"   value={normal}  color="#17c964"
          sub={total ? `${((normal  / total) * 100).toFixed(1)}% من الإجمالي` : undefined} />
        <KPICard icon="📻" title="إشارات تشويش"    value={jamming} color="#f5a623"
          sub={total ? `${((jamming / total) * 100).toFixed(1)}% من الإجمالي` : undefined} />
        <KPICard icon="⚠️" title="التنبيهات النشطة" value={alerts}  color="#e5484d" />
        <KPICard icon="🎯" title="حد التنبيهات"    value={statistics?.alert_threshold ?? 0} color="#a78bfa" />
      </div>

      <div className="charts-row">
        <div className="chart-card card">
          <div className="card-header-cyber">
            <h3>توزيع الإشارات حسب النوع</h3>
            <span className="chart-decorator" />
          </div>
          {labelDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={labelDist} cx="50%" cy="50%" outerRadius={85} innerRadius={50}
                  dataKey="value" paddingAngle={4} labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {labelDist.map((e, i) => <Cell key={i} fill={getLabelColor(e.name)} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(v: any) => [`${v} إشارة`, 'العدد']} 
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="empty-chart">لا توجد بيانات كافية للرسم البياني</div>}
        </div>

        <div className="chart-card card">
          <div className="card-header-cyber">
            <h3>مقارنة كثافة الإشارات</h3>
            <span className="chart-decorator" />
          </div>
          {labelDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={labelDist} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="var(--primary-color)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  formatter={(v: any) => [`${v} إشارة`, 'العدد']} 
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={50}>
                  {labelDist.map((e, i) => <Cell key={i} fill={getLabelColor(e.name)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-chart">لا توجد بيانات كافية للرسم البياني</div>}
        </div>
      </div>

      <div className="table-card card">
        <div className="card-header-cyber">
          <h3>📋 أحدث الإشارات التي تم رصدها</h3>
          <span className="chart-decorator" />
        </div>
        {isLoading ? (
          <div className="loading-placeholder">
            <div className="loading-spinner mx-auto mb-2" />
            جاري استرجاع البيانات من المستودع...
          </div>
        ) : recentSignals.length === 0 ? (
          <div className="loading-placeholder">لا توجد إشارات نشطة في الوقت الحالي</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>نوع الإشارة</th><th>التردد (MHz)</th>
                  <th>نسبة الثقة</th><th>مصدر البيانات</th><th>وقت الرصد</th>
                </tr>
              </thead>
              <tbody>
                {recentSignals.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <span className="label-badge" style={{
                        background: `${getLabelColor(s.label)}15`,
                        color: getLabelColor(s.label),
                        border: `1px solid ${getLabelColor(s.label)}30`,
                      }}>{s.label === 'Drone' ? '🚁 Drone' : s.label === 'Jamming' ? '📡 Jamming' : '✅ Normal'}</span>
                    </td>
                    <td className="mono font-semibold">{s.frequency ?? '—'}</td>
                    <td>
                      <span className={`${getConfidenceClass(s.confidence)} font-bold`}>
                        {Math.round(s.confidence * 100)}%
                      </span>
                    </td>
                    <td className="source-cell font-medium">{s.source || 'غير معروف'}</td>
                    <td className="time-cell">
                      {new Date(s.timestamp).toLocaleTimeString('ar-EG')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bottom-row">
        <div className="status-card card">
          <div className="card-header-cyber">
            <h3>🖥️ تشخيص وحالة النظام</h3>
            <span className="chart-decorator" />
          </div>
          <div className="status-items">
            {([
              ['API Server',        apiStatus],
              ['AI Agent (Ollama)', health.agent],
              ['WebSocket',         wsStatus],
              ['Database',          health.database],
            ] as [string, any][]).map(([name, status]) => (
              <div key={name} className="status-item">
                <span className="font-semibold text-sm">{name}</span>
                <StatusBadge status={status} size="small" />
              </div>
            ))}
          </div>
        </div>

        <div className="info-card card">
          <div className="card-header-cyber">
            <h3>ℹ️ تفاصيل المحطة الحالية</h3>
            <span className="chart-decorator" />
          </div>
          <div className="info-items">
            {[
              ['نموذج AI المستخدم',        health.model || 'ensemble-v3.0-pytorch'],
              ['حد إطلاق التنبيهات',    statistics?.alert_threshold ? `${statistics.alert_threshold * 100}%` : '75%'],
              ['زمن استجابة الشبكة', health.latency ? `${health.latency} ms` : '—'],
              ['توقيت النظام',       new Date().toLocaleString('ar-EG')],
            ].map(([label, value]) => (
              <div key={String(label)} className="info-item">
                <span className="info-label font-semibold text-sm">{label}</span>
                <span className="info-value font-bold">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .home-page { padding: 12px; position: relative; }
        .page-header {
          display: flex; justify-content: space-between;
          align-items: flex-start; margin-bottom: 36px; flex-wrap: wrap; gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        .page-header h2 { margin-bottom: 6px; font-size: 1.8rem; font-weight: 800; }
        .title-glow {
          background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
          -webkit-background-clip: text; background-clip: text;
        }
        .page-header p  { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
        .header-meta { display: flex; align-items: center; gap: 14px; font-size: 12px; color: var(--text-secondary); }
        .latency-badge {
          background: rgba(50, 145, 255, 0.08); border: 1px solid rgba(50, 145, 255, 0.2);
          padding: 4px 12px; border-radius: 20px; color: var(--primary-color); font-weight: 700;
        }
        
        /* KPI Cards redesign with premium tech grids */
        .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 18px; margin-bottom: 28px; }
        .kpi-card {
          background: var(--card-bg); border-radius: 20px; padding: 20px;
          border: 1px solid var(--border-color); position: relative; overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: var(--glass-blur);
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .kpi-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 12px 30px rgba(0,0,0,0.15); 
          border-color: var(--accent);
        }
        .kpi-radar-bg {
          position: absolute; inset: 0; opacity: 0.02; pointer-events: none;
          background-image: radial-gradient(circle, var(--accent) 1px, transparent 1px);
          background-size: 12px 12px;
        }
        .kpi-top { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; position: relative; z-index: 1; }
        .kpi-icon  { font-size: 22px; filter: drop-shadow(0 2px 8px var(--accent-glow)); }
        .kpi-title { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.02em; }
        .kpi-value-wrap { position: relative; z-index: 1; }
        .kpi-value { font-size: 28px; font-family: 'Outfit', sans-serif; font-weight: 900; color: var(--accent, var(--text-primary)); line-height: 1.1; margin-bottom: 6px; }
        .kpi-sub   { font-size: 10px; color: var(--text-tertiary); font-weight: 500; }
        .kpi-accent-glow {
          position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(to right, transparent, var(--accent), transparent);
          opacity: 0.8;
        }

        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
        .chart-card { min-height: 360px; }
        .chart-card-header {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
        }
        .chart-card-header h3 { font-size: 15px; font-weight: 800; color: var(--text-primary); }
        .chart-decorator { width: 12px; height: 12px; border-radius: 3px; background: var(--primary-color); opacity: 0.5; }
        .empty-chart { height: 280px; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 13.5px; font-weight: 500; }
        
        .table-card { margin-bottom: 28px; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th { padding: 12px 14px; text-align: right; color: var(--text-secondary); font-weight: 600; font-size: 12px; border-bottom: 2px solid var(--border-color); }
        tbody td { padding: 12px 14px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr { transition: background-color 0.2s ease; }
        tbody tr:hover { background: rgba(50, 145, 255, 0.05); }
        .label-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.01em; }
        .mono        { font-family: monospace; color: var(--primary-color); letter-spacing: 0.05em; }
        .source-cell { color: var(--text-secondary); }
        .time-cell   { color: var(--text-tertiary); font-size: 12px; font-weight: 500; }
        
        .conf-high   { color: var(--normal-color); text-shadow: 0 0 10px rgba(23, 201, 100, 0.15); }
        .conf-med    { color: var(--jamming-color); }
        .conf-low    { color: var(--drone-color); text-shadow: 0 0 10px rgba(229, 72, 77, 0.15); }
        
        .loading-placeholder { text-align: center; padding: 56px; color: var(--text-secondary); font-weight: 500; }
        
        .bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .status-items, .info-items { display: flex; flex-direction: column; }
        .status-item, .info-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
        .status-item:last-child, .info-item:last-child { border-bottom: none; }
        .info-label { color: var(--text-secondary); }
        .info-value { color: var(--primary-color); font-weight: 600; }
        
        @media (max-width: 1440px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 1024px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .charts-row { grid-template-columns: 1fr; } .bottom-row { grid-template-columns: 1fr; } }
        @media (max-width: 640px)  { .kpi-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default Home;