// src/pages/Analytics.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { useStore } from '../store/useStore';

// ── الألوان ──────────────────────────────────────────────────────────────────
const SIG_COLORS: Record<string, string> = {
  Drone:   '#E24B4A',
  Jamming: '#EF9F27',
  Normal:  '#1D9E75',
};
const getColor = (label: string) => SIG_COLORS[label] ?? '#378ADD';

// ── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--tt-bg)',
      border: '1px solid var(--tt-border)',
      borderRadius: 10,
      padding: '10px 16px',
      fontSize: 12,
      minWidth: 140,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: 'var(--tt-title)', fontSize: 13 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', gap: 16,
          color: p.color ?? 'var(--tt-text)', margin: '3px 0',
        }}>
          <span style={{ opacity: 0.85 }}>{p.name}</span>
          <span style={{ fontWeight: 700 }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── بطاقة إحصاء ──────────────────────────────────────────────────────────────
interface StatCardProps {
  value: string | number;
  label: string;
  accent: string;
  icon: React.ReactNode;
  sub?: string;
}
const StatCard: React.FC<StatCardProps> = ({ value, label, accent, icon, sub }) => (
  <div style={{
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderTop: `3px solid ${accent}`,
    borderRadius: 14,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'transform 0.18s, box-shadow 0.18s',
  }}
    onMouseEnter={e => {
      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${accent}22`;
    }}
    onMouseLeave={e => {
      (e.currentTarget as HTMLDivElement).style.transform = '';
      (e.currentTarget as HTMLDivElement).style.boxShadow = '';
    }}
  >
    <div style={{ fontSize: 20, color: accent }}>{icon}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: accent, lineHeight: 1.1 }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{sub}</div>}
  </div>
);

// ── بطاقة الشارت ─────────────────────────────────────────────────────────────
const ChartCard: React.FC<{ title: string; badge?: string; children: React.ReactNode }> = ({ title, badge, children }) => (
  <div style={{
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: 16,
    padding: '20px 24px',
    marginBottom: 24,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
      {badge && (
        <span style={{
          background: 'var(--badge-bg)',
          color: 'var(--badge-text)',
          border: '1px solid var(--border-color)',
          padding: '3px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {badge}
        </span>
      )}
    </div>
    {children}
  </div>
);

// ── الصفحة الرئيسية ───────────────────────────────────────────────────────────
const Analytics: React.FC = () => {
  const { signals, fetchSignals, fetchStatistics, isLoading } = useStore();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSignals(1000), fetchStatistics()]);
    setRefreshing(false);
  }, [fetchSignals, fetchStatistics]);

  useEffect(() => { loadData(); }, []);

  // ── فلترة ─────────────────────────────────────────────────────────────────
  const filteredSignals = useMemo(() => {
    const msMap = { '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000 };
    const cutoff = Date.now() - msMap[timeRange];
    let res = signals.filter(s => new Date(s.timestamp).getTime() >= cutoff);
    if (selectedLabel !== 'all') res = res.filter(s => s.label === selectedLabel);
    return res;
  }, [signals, timeRange, selectedLabel]);

  // ── إحصاءات ───────────────────────────────────────────────────────────────
  const labelDistribution = useMemo(() => {
    const c: Record<string, number> = {};
    filteredSignals.forEach(s => { c[s.label] = (c[s.label] ?? 0) + 1; });
    return Object.entries(c).map(([name, count]) => ({ name, count, color: getColor(name) }));
  }, [filteredSignals]);

  const confidenceOverTime = useMemo(() => {
    const g: Record<string, Record<string, { sum: number; n: number }>> = {};
    filteredSignals.forEach(s => {
      const d = new Date(s.timestamp);
      const key = timeRange === '24h'
        ? `${String(d.getHours()).padStart(2, '0')}:00`
        : `${d.getMonth() + 1}/${d.getDate()}`;
      if (!g[key]) g[key] = {};
      if (!g[key][s.label]) g[key][s.label] = { sum: 0, n: 0 };
      g[key][s.label].sum += s.confidence;
      g[key][s.label].n += 1;
    });
    return Object.entries(g)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([time, labels]) => {
        const row: Record<string, number | string> = { time };
        Object.entries(labels).forEach(([lbl, { sum, n }]) => {
          row[lbl] = +(sum / n * 100).toFixed(1);
        });
        return row;
      });
  }, [filteredSignals, timeRange]);

  const frequencyDistribution = useMemo(() => {
    const ranges = [
      { min: 0,    max: 500,   label: '0–500 MHz' },
      { min: 500,  max: 1000,  label: '500M–1 GHz' },
      { min: 1000, max: 2000,  label: '1–2 GHz' },
      { min: 2000, max: 3000,  label: '2–3 GHz' },
      { min: 3000, max: 5000,  label: '3–5 GHz' },
      { min: 5000, max: 10000, label: '5–10 GHz' },
    ];
    const counts = ranges.map(r => ({ range: r.label, count: 0 }));
    filteredSignals.forEach(s => {
      const f = s.frequency;
      if (!f) return;
      for (let i = 0; i < ranges.length; i++) {
        if (f >= ranges[i].min && f < ranges[i].max) { counts[i].count++; break; }
      }
    });
    return counts.filter(c => c.count > 0);
  }, [filteredSignals]);

  const confidenceByLabel = useMemo(() => {
    const map: Record<string, number[]> = {};
    filteredSignals.forEach(s => {
      if (!map[s.label]) map[s.label] = [];
      map[s.label].push(+(s.confidence * 100).toFixed(1));
    });
    return Object.entries(map).map(([label, vals]) => ({
      label,
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      min: Math.round(Math.min(...vals)),
      max: Math.round(Math.max(...vals)),
      color: getColor(label),
    }));
  }, [filteredSignals]);

  const topLabel = useMemo(() => {
    if (!labelDistribution.length) return '—';
    return [...labelDistribution].sort((a, b) => b.count - a.count)[0].name;
  }, [labelDistribution]);

  const avgConfidence = useMemo(() => {
    if (!filteredSignals.length) return 0;
    return Math.round(filteredSignals.reduce((s, x) => s + x.confidence, 0) / filteredSignals.length * 100);
  }, [filteredSignals]);

  const avgFrequency = useMemo(() => {
    const freqs = filteredSignals.map(s => s.frequency).filter(f => f && f > 0) as number[];
    if (!freqs.length) return 0;
    return Math.round(freqs.reduce((a, b) => a + b, 0) / freqs.length);
  }, [filteredSignals]);

  const labelOptions = useMemo(() => {
    const labels = new Set(signals.map(s => s.label));
    return ['all', ...Array.from(labels)];
  }, [signals]);

  const exportToCSV = useCallback(() => {
    const headers = ['ID', 'Label', 'Frequency (MHz)', 'Confidence (%)', 'Source', 'Station', 'Direction', 'Timestamp'];
    const rows = filteredSignals.map(s => [
      s.id, s.label, s.frequency ?? '', (s.confidence * 100).toFixed(1),
      s.source ?? '', s.station ?? '', s.direction ?? '', s.timestamp,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SDR-01_analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredSignals, timeRange]);

  const busy = isLoading || refreshing;

  return (
    <div style={{ padding: 0, direction: 'rtl' }}>

      {/* ── CSS Variables للـ Light / Dark ─────────────────────────────────── */}
      <style>{`
        :root {
          --tt-bg:      #ffffff;
          --tt-border:  #e5e7eb;
          --tt-title:   #111827;
          --tt-text:    #374151;
          --badge-bg:   #f3f4f6;
          --badge-text: #6b7280;
        }
        .dark, [data-theme="dark"] {
          --tt-bg:      #1e2130;
          --tt-border:  rgba(255,255,255,0.1);
          --tt-title:   #f9fafb;
          --tt-text:    #d1d5db;
          --badge-bg:   rgba(255,255,255,0.07);
          --badge-text: rgba(255,255,255,0.5);
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --tt-bg:      #1e2130;
            --tt-border:  rgba(255,255,255,0.1);
            --tt-title:   #f9fafb;
            --tt-text:    #d1d5db;
            --badge-bg:   rgba(255,255,255,0.07);
            --badge-text: rgba(255,255,255,0.5);
          }
        }
        .tab-btn {
          background: transparent;
          border: none;
          padding: 7px 20px;
          border-radius: 30px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: background 0.15s, color 0.15s;
          white-space: nowrap;
        }
        .tab-btn.active {
          background: var(--primary-color);
          color: #fff;
          font-weight: 700;
        }
        .tab-btn:not(.active):hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }
        .icon-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 8px 18px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .icon-btn:hover:not(:disabled) {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .icon-btn:disabled { opacity: 0.45; cursor: wait; }
        .signal-row:hover { background: var(--bg-tertiary) !important; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 800px)  { .stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 520px)  { .stats-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              الإحصائيات والتحليلات
            </h2>
            {/* SDR-01 Badge */}
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--primary-color)',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#fff',
                opacity: 0.9,
                display: 'inline-block',
                animation: 'ping 1.5s ease-in-out infinite',
              }} />
              SDR-01
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            تحليل إشارات RF — جهاز الرصد الرئيسي
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="icon-btn" onClick={loadData} disabled={busy}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {refreshing ? 'تحديث…' : 'تحديث'}
          </button>
          <button className="icon-btn" onClick={exportToCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            تصدير CSV
          </button>
        </div>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
        padding: '12px 16px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 14,
      }}>
        {/* Time tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--bg-tertiary)',
          padding: 4,
          borderRadius: 30,
        }}>
          {(['24h', '7d', '30d'] as const).map(r => (
            <button
              key={r}
              className={`tab-btn${timeRange === r ? ' active' : ''}`}
              onClick={() => setTimeRange(r)}
            >
              {r === '24h' ? '24 ساعة' : r === '7d' ? '7 أيام' : '30 يوم'}
            </button>
          ))}
        </div>

        {/* Label filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            النوع:
          </span>
          <select
            value={selectedLabel}
            onChange={e => setSelectedLabel(e.target.value)}
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {labelOptions.map(l => (
              <option key={l} value={l}>{l === 'all' ? 'الكل' : l}</option>
            ))}
          </select>

          {/* Count pill */}
          <span style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            padding: '5px 14px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            {filteredSignals.length.toLocaleString()} إشارة
          </span>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 14,
        marginBottom: 28,
      }}>
        <StatCard
          value={filteredSignals.length.toLocaleString()}
          label="إجمالي الإشارات"
          accent="var(--primary-color)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 7.76a6 6 0 0 0 0 8.49M20.49 4.51a12 12 0 0 1 0 16.97M3.51 4.51a12 12 0 0 0 0 16.97"/>
            </svg>
          }
          sub="SDR-01"
        />
        <StatCard
          value={`${avgConfidence}%`}
          label="متوسط الثقة"
          accent="#1D9E75"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          }
        />
        <StatCard
          value={labelDistribution.filter(d => d.name === 'Drone')[0]?.count ?? 0}
          label="إشارات Drone"
          accent="#E24B4A"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="12" width="4" height="8" rx="1"/><rect x="9" y="8" width="6" height="12" rx="1"/><rect x="18" y="4" width="4" height="16" rx="1"/>
            </svg>
          }
        />
        <StatCard
          value={labelDistribution.filter(d => d.name === 'Jamming')[0]?.count ?? 0}
          label="إشارات تشويش"
          accent="#EF9F27"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          }
        />
        <StatCard
          value={topLabel}
          label="الأكثر شيوعًا"
          accent={getColor(topLabel)}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          }
        />
        <StatCard
          value={avgFrequency ? `${avgFrequency} MHz` : '—'}
          label="متوسط التردد"
          accent="#378ADD"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          }
        />
      </div>

      {/* ── Loading / Empty ─────────────────────────────────────────────── */}
      {busy ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 16, padding: '80px 0', color: 'var(--text-secondary)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '3px solid var(--border-color)',
            borderTopColor: 'var(--primary-color)',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ fontSize: 14 }}>جاري تحميل بيانات SDR-01…</span>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 14, padding: '80px 0', color: 'var(--text-secondary)', textAlign: 'center',
        }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
            <circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 7.76a6 6 0 0 0 0 8.49M20.49 4.51a12 12 0 0 1 0 16.97M3.51 4.51a12 12 0 0 0 0 16.97"/>
          </svg>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            لا توجد إشارات في هذه الفترة
          </p>
          <p style={{ margin: 0, fontSize: 13 }}>جرّب توسيع النطاق الزمني</p>
          <button
            onClick={() => setTimeRange('30d')}
            style={{
              marginTop: 8, background: 'var(--card-bg)', border: '1px solid var(--primary-color)',
              color: 'var(--primary-color)', padding: '8px 24px', borderRadius: 10,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            عرض آخر 30 يوم
          </button>
        </div>
      ) : (
        <>
          {/* ── Chart 1: توزيع الإشارات ──────────────────────────────── */}
          <ChartCard title="توزيع الإشارات حسب النوع" badge={`${labelDistribution.length} نوع`}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={labelDistribution} barSize={52}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="عدد الإشارات" radius={[8, 8, 0, 0]}>
                  {labelDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14 }}>
              {labelDistribution.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                  <span style={{ fontWeight: 700, color: d.color }}>{d.count}</span>
                </div>
              ))}
            </div>
          </ChartCard>

          {/* ── Chart 2: اتجاه الثقة ─────────────────────────────────── */}
          {confidenceOverTime.length > 1 && (
            <ChartCard title="اتجاه الثقة بمرور الوقت" badge="خط زمني">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={confidenceOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  {Object.keys(SIG_COLORS).map(label => (
                    <Line
                      key={label}
                      type="monotone"
                      dataKey={label}
                      stroke={SIG_COLORS[label]}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: SIG_COLORS[label], strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      name={label}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14 }}>
                {Object.entries(SIG_COLORS).map(([lbl, clr]) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                    <span style={{ width: 20, height: 3, borderRadius: 2, background: clr, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{lbl}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {/* ── Chart 3: توزيع الترددات ──────────────────────────────── */}
          {frequencyDistribution.length > 0 && (
            <ChartCard title="توزيع نطاقات التردد — SDR-01" badge="MHz">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={frequencyDistribution}>
                  <defs>
                    <linearGradient id="freqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary-color)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--primary-color)" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="range" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="عدد الإشارات"
                    stroke="var(--primary-color)" fill="url(#freqGrad)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--primary-color)', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ── Chart 4: نطاق الثقة لكل نوع ─────────────────────────── */}
          {confidenceByLabel.length > 0 && (
            <ChartCard title="نطاق الثقة لكل نوع إشارة" badge="Min / Avg / Max">
              <ResponsiveContainer width="100%" height={Math.max(220, confidenceByLabel.length * 80)}>
                <BarChart data={confidenceByLabel} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="label" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }} tickLine={false} axisLine={false} width={75} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="min" name="أدنى ثقة" radius={[4, 0, 0, 4]}>
                    {confidenceByLabel.map((d, i) => <Cell key={i} fill={`${d.color}60`} />)}
                  </Bar>
                  <Bar dataKey="avg" name="متوسط الثقة">
                    {confidenceByLabel.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                  <Bar dataKey="max" name="أعلى ثقة" radius={[0, 4, 4, 0]}>
                    {confidenceByLabel.map((d, i) => <Cell key={i} fill={`${d.color}90`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12 }}>
                {[
                  { label: 'أدنى', opacity: '60' },
                  { label: 'متوسط', opacity: 'ff' },
                  { label: 'أعلى', opacity: '90' },
                ].map(({ label, opacity }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                    <span style={{ width: 24, height: 10, borderRadius: 3, background: `#378ADD${opacity}`, display: 'inline-block' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          )}

          {/* ── Chart 5: النسب المئوية (Donut) ───────────────────────── */}
          {labelDistribution.length > 0 && (() => {
            const total = labelDistribution.reduce((s, d) => s + d.count, 0);
            return (
              <ChartCard title="النسب المئوية لكل نوع" badge="توزيع نسبي">
                <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 260px' }}>
                    <ResponsiveContainer width={260} height={260}>
                      <PieChart>
                        <Pie
                          data={labelDistribution}
                          cx="50%" cy="50%"
                          innerRadius={72} outerRadius={110}
                          paddingAngle={4}
                          dataKey="count"
                          strokeWidth={0}
                        >
                          {labelDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Stats list */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {labelDistribution.map(d => {
                      const pct = total ? Math.round(d.count / total * 100) : 0;
                      return (
                        <div key={d.name}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: 'inline-block' }} />
                              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{d.count} إشارة</span>
                              <span style={{ fontWeight: 700, color: d.color }}>{pct}%</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{
                            height: 7, borderRadius: 4,
                            background: 'var(--bg-tertiary)',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: d.color,
                              borderRadius: 4,
                              transition: 'width 0.6s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ChartCard>
            );
          })()}
        </>
      )}

      <style>{`
        @keyframes ping {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%        { opacity: 0.4; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
