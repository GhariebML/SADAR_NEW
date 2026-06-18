import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

/* ─── Types ─────────────────────────────────────────────────────────── */
type SignalLabel = 'Drone' | 'Jamming' | 'Normal';
interface SentSignal {
  id: number;
  label: SignalLabel;
  confidence: number;
  frequency: number;
  snr: number;
  direction: number;
  location: string;
  timestamp: Date;
  status: 'sending' | 'success' | 'error';
}

/* ─── Constants ─────────────────────────────────────────────────────── */
const LABEL_META: Record<SignalLabel, { color: string; icon: string; arName: string }> = {
  Drone:   { color: '#e5484d', icon: '🚁', arName: 'طائرة مسيّرة' },
  Jamming: { color: '#f5a623', icon: '📡', arName: 'تشويش' },
  Normal:  { color: '#17c964', icon: '✅', arName: 'طبيعي' },
};

const LOCATIONS = [
  { name: 'مدينة نصر',       lat: 30.0511, lng: 31.3656 },
  { name: 'القاهرة الجديدة',  lat: 30.0074, lng: 31.4913 },
  { name: 'المعادي',          lat: 29.9602, lng: 31.2569 },
  { name: 'وسط البلد',       lat: 30.0444, lng: 31.2357 },
  { name: 'الدقي',           lat: 30.0384, lng: 31.2119 },
  { name: 'مطار القاهرة',    lat: 30.1219, lng: 31.4056 },
  { name: 'العاصمة الإدارية', lat: 30.0197, lng: 31.7609 },
  { name: 'حلوان',           lat: 29.8421, lng: 31.3042 },
];

const rand = (min: number, max: number) => +(min + Math.random() * (max - min)).toFixed(2);

/* ─── Component ─────────────────────────────────────────────────────── */
const DemoLab: React.FC = () => {
  /* State */
  const [frequency, setFrequency] = useState(2437.5);
  const [confidence, setConfidence] = useState(82);
  const [snr, setSnr] = useState(18);
  const [direction, setDirection] = useState(225);
  const [locationIdx, setLocationIdx] = useState(0);
  const [feed, setFeed] = useState<SentSignal[]>([]);
  const [totalSent, setTotalSent] = useState(0);
  const [autoDemo, setAutoDemo] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [scenarioActive, setScenarioActive] = useState<string | null>(null);

  const autoDemoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idCounter = useRef(0);

  /* ── Core send function ─────────────────────────────────────────── */
  const sendSignal = useCallback(async (
    label: SignalLabel,
    overrides?: Partial<{ confidence: number; frequency: number; snr: number; direction: number; locationIdx: number }>
  ) => {
    const id = ++idCounter.current;
    const loc = LOCATIONS[overrides?.locationIdx ?? locationIdx];
    const conf = (overrides?.confidence ?? confidence) / 100;
    const freq = overrides?.frequency ?? frequency;
    const sigSnr = overrides?.snr ?? snr;
    const dir = overrides?.direction ?? direction;

    const entry: SentSignal = {
      id, label, confidence: conf, frequency: freq,
      snr: sigSnr, direction: dir,
      location: loc.name, timestamp: new Date(), status: 'sending',
    };

    setFeed(prev => [entry, ...prev].slice(0, 30));
    setSendingId(id);

    try {
      await axios.post('http://localhost:8000/api/v1/mock-signal', {
        label,
        confidence: conf,
        frequency: freq,
        snr: sigSnr,
        strength: rand(-70, -25),
        direction: dir,
        location: loc.name,
        lat: loc.lat,
        lng: loc.lng,
      });
      setFeed(prev => prev.map(s => s.id === id ? { ...s, status: 'success' } : s));
      setTotalSent(prev => prev + 1);
    } catch {
      setFeed(prev => prev.map(s => s.id === id ? { ...s, status: 'error' } : s));
    } finally {
      setSendingId(null);
    }
  }, [frequency, confidence, snr, direction, locationIdx]);

  /* ── Scenario runners ───────────────────────────────────────────── */
  const runScenario = useCallback(async (name: string, signals: { label: SignalLabel; delay: number }[]) => {
    setScenarioActive(name);
    for (const sig of signals) {
      await sendSignal(sig.label, {
        confidence: rand(75, 92) * 100,
        frequency: sig.label === 'Drone' ? rand(2400, 5800) : sig.label === 'Jamming' ? rand(1500, 1600) : rand(88, 108),
        snr: rand(8, 35),
        direction: rand(0, 360),
        locationIdx: Math.floor(Math.random() * LOCATIONS.length),
      });
      if (sig.delay > 0) await new Promise(r => setTimeout(r, sig.delay));
    }
    setScenarioActive(null);
  }, [sendSignal]);

  const scenarios = [
    {
      id: 'drone',   icon: '🎯', name: 'كشف درون',    nameEn: 'Drone Detection',
      color: '#e5484d',
      run: () => runScenario('drone', [
        { label: 'Drone', delay: 400 }, { label: 'Drone', delay: 400 }, { label: 'Drone', delay: 0 },
      ]),
    },
    {
      id: 'jamming', icon: '📡', name: 'تشويش GPS',    nameEn: 'GPS Jamming',
      color: '#f5a623',
      run: () => runScenario('jamming', [
        { label: 'Jamming', delay: 500 }, { label: 'Jamming', delay: 0 },
      ]),
    },
    {
      id: 'normal',  icon: '✅', name: 'بيئة طبيعية',  nameEn: 'Normal Environment',
      color: '#17c964',
      run: () => runScenario('normal', [
        { label: 'Normal', delay: 300 }, { label: 'Normal', delay: 300 },
        { label: 'Normal', delay: 300 }, { label: 'Normal', delay: 300 }, { label: 'Normal', delay: 0 },
      ]),
    },
    {
      id: 'combined', icon: '⚡', name: 'هجوم مركب',   nameEn: 'Combined Attack',
      color: '#a78bfa',
      run: () => runScenario('combined', [
        { label: 'Drone', delay: 350 }, { label: 'Jamming', delay: 350 },
        { label: 'Drone', delay: 350 }, { label: 'Jamming', delay: 350 },
        { label: 'Drone', delay: 0 },
      ]),
    },
  ];

  /* ── Auto-Demo ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (autoDemo) {
      const labels: SignalLabel[] = ['Drone', 'Jamming', 'Normal'];
      autoDemoRef.current = setInterval(() => {
        const label = labels[Math.floor(Math.random() * labels.length)];
        sendSignal(label, {
          confidence: rand(65, 95) * 100,
          frequency: rand(88, 5800),
          snr: rand(5, 40),
          direction: rand(0, 360),
          locationIdx: Math.floor(Math.random() * LOCATIONS.length),
        });
      }, rand(2000, 3000));
    } else {
      if (autoDemoRef.current) clearInterval(autoDemoRef.current);
    }
    return () => { if (autoDemoRef.current) clearInterval(autoDemoRef.current); };
  }, [autoDemo, sendSignal]);

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="demolab-page grid-pattern">

      {/* ▸ Header */}
      <div className="dl-page-header">
        <div>
          <h2 className="dl-title">مختبر العرض التوضيحي</h2>
          <p className="dl-subtitle">Demo Lab — لوحة تحكم العرض المباشر لمسابقة ITC Egypt 2026</p>
        </div>
        <div className="dl-header-meta">
          <span className="dl-counter-badge">
            📊 إجمالي الإشارات المرسلة: <strong>{totalSent}</strong>
          </span>
          <span className={`dl-auto-indicator ${autoDemo ? 'active' : ''}`}>
            {autoDemo ? '🔴 LIVE' : '⏸️ IDLE'}
          </span>
        </div>
      </div>

      {/* ▸ Top row: Injection + Scenarios */}
      <div className="dl-top-row">

        {/* Signal Injection Panel */}
        <div className="dl-card card">
          <div className="card-header-cyber">
            <h3>🎛️ إرسال إشارات مباشرة — Signal Injection</h3>
            <span className="chart-decorator" />
          </div>
          <div className="dl-inject-grid">
            {(['Normal', 'Drone', 'Jamming'] as SignalLabel[]).map(label => {
              const meta = LABEL_META[label];
              return (
                <button
                  key={label}
                  className="dl-inject-btn"
                  style={{ '--btn-color': meta.color } as React.CSSProperties}
                  onClick={() => sendSignal(label)}
                  disabled={!!scenarioActive}
                >
                  <span className="dl-inject-icon">{meta.icon}</span>
                  <span className="dl-inject-label">{meta.arName}</span>
                  <span className="dl-inject-en">{label} Signal</span>
                  <span className="dl-inject-pulse" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Scenarios */}
        <div className="dl-card card">
          <div className="card-header-cyber">
            <h3>⚡ سيناريوهات جاهزة — Quick Scenarios</h3>
            <span className="chart-decorator" />
          </div>
          <div className="dl-scenario-grid">
            {scenarios.map(sc => (
              <button
                key={sc.id}
                className={`dl-scenario-btn ${scenarioActive === sc.id ? 'running' : ''}`}
                style={{ '--sc-color': sc.color } as React.CSSProperties}
                onClick={sc.run}
                disabled={!!scenarioActive}
              >
                <span className="dl-sc-icon">{sc.icon}</span>
                <span className="dl-sc-name">{sc.name}</span>
                <span className="dl-sc-en">{sc.nameEn}</span>
                {scenarioActive === sc.id && <span className="dl-sc-spinner" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ▸ Middle row: Config + Auto-Demo */}
      <div className="dl-mid-row">

        {/* Signal Configuration */}
        <div className="dl-card card">
          <div className="card-header-cyber">
            <h3>🔧 إعدادات الإشارة — Signal Configuration</h3>
            <span className="chart-decorator" />
          </div>
          <div className="dl-config-grid">
            {/* Frequency */}
            <div className="dl-slider-group">
              <div className="dl-slider-header">
                <label>التردد — Frequency</label>
                <span className="dl-slider-val">{frequency.toFixed(1)} MHz</span>
              </div>
              <input type="range" min="70" max="6000" step="0.5" value={frequency}
                onChange={e => setFrequency(+e.target.value)} className="dl-slider" />
              <div className="dl-slider-ticks">
                <span>70 MHz</span><span>2.4 GHz</span><span>5.8 GHz</span><span>6 GHz</span>
              </div>
            </div>

            {/* Confidence */}
            <div className="dl-slider-group">
              <div className="dl-slider-header">
                <label>نسبة الثقة — Confidence</label>
                <span className="dl-slider-val">{confidence}%</span>
              </div>
              <input type="range" min="50" max="95" step="1" value={confidence}
                onChange={e => setConfidence(+e.target.value)} className="dl-slider" />
              <div className="dl-slider-ticks"><span>50%</span><span>72%</span><span>95%</span></div>
            </div>

            {/* SNR */}
            <div className="dl-slider-group">
              <div className="dl-slider-header">
                <label>نسبة الإشارة للضوضاء — SNR</label>
                <span className="dl-slider-val">{snr} dB</span>
              </div>
              <input type="range" min="5" max="40" step="0.5" value={snr}
                onChange={e => setSnr(+e.target.value)} className="dl-slider" />
              <div className="dl-slider-ticks"><span>5 dB</span><span>20 dB</span><span>40 dB</span></div>
            </div>

            {/* Direction */}
            <div className="dl-slider-group">
              <div className="dl-slider-header">
                <label>الاتجاه — Direction</label>
                <span className="dl-slider-val">{direction}°</span>
              </div>
              <input type="range" min="0" max="360" step="1" value={direction}
                onChange={e => setDirection(+e.target.value)} className="dl-slider" />
              <div className="dl-slider-ticks"><span>N 0°</span><span>E 90°</span><span>S 180°</span><span>W 270°</span></div>
            </div>

            {/* Location dropdown */}
            <div className="dl-slider-group">
              <div className="dl-slider-header">
                <label>الموقع — Location</label>
                <span className="dl-slider-val">{LOCATIONS[locationIdx].name}</span>
              </div>
              <select
                className="dl-select"
                value={locationIdx}
                onChange={e => setLocationIdx(+e.target.value)}
              >
                {LOCATIONS.map((loc, i) => (
                  <option key={i} value={i}>{loc.name} ({loc.lat.toFixed(2)}, {loc.lng.toFixed(2)})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Auto-Demo Panel */}
        <div className="dl-card card dl-auto-card">
          <div className="card-header-cyber">
            <h3>🤖 وضع العرض التلقائي — Auto-Demo</h3>
            <span className="chart-decorator" />
          </div>
          <div className="dl-auto-body">
            <div className="dl-auto-desc">
              تفعيل الإرسال التلقائي للإشارات المختلطة كل ٢-٣ ثوانٍ
              <br />
              <span className="dl-auto-desc-en">Automatically sends mixed signals every 2-3 seconds for competition video recording</span>
            </div>
            <button
              className={`dl-auto-toggle ${autoDemo ? 'on' : ''}`}
              onClick={() => setAutoDemo(p => !p)}
            >
              <span className="dl-toggle-track">
                <span className="dl-toggle-thumb" />
              </span>
              <span className="dl-toggle-label">
                {autoDemo ? '🔴 إيقاف العرض التلقائي' : '▶️ تشغيل العرض التلقائي'}
              </span>
            </button>
            {autoDemo && (
              <div className="dl-auto-live-indicator">
                <span className="dl-live-dot" />
                <span>العرض التلقائي نشط — يتم إرسال إشارات مختلطة...</span>
              </div>
            )}

            {/* Session stats */}
            <div className="dl-session-stats">
              <div className="dl-sess-stat">
                <span className="dl-sess-val" style={{ color: '#e5484d' }}>
                  {feed.filter(f => f.label === 'Drone').length}
                </span>
                <span className="dl-sess-lbl">🚁 Drone</span>
              </div>
              <div className="dl-sess-sep" />
              <div className="dl-sess-stat">
                <span className="dl-sess-val" style={{ color: '#f5a623' }}>
                  {feed.filter(f => f.label === 'Jamming').length}
                </span>
                <span className="dl-sess-lbl">📡 Jamming</span>
              </div>
              <div className="dl-sess-sep" />
              <div className="dl-sess-stat">
                <span className="dl-sess-val" style={{ color: '#17c964' }}>
                  {feed.filter(f => f.label === 'Normal').length}
                </span>
                <span className="dl-sess-lbl">✅ Normal</span>
              </div>
              <div className="dl-sess-sep" />
              <div className="dl-sess-stat">
                <span className="dl-sess-val" style={{ color: '#3291ff' }}>
                  {feed.filter(f => f.status === 'error').length}
                </span>
                <span className="dl-sess-lbl">❌ Errors</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ▸ Live Feed */}
      <div className="dl-card card dl-feed-card">
        <div className="card-header-cyber">
          <h3>📋 البث المباشر للإشارات المرسلة — Live Feed</h3>
          <div className="dl-feed-actions">
            <span className="dl-feed-count">{feed.length} إشارة</span>
            <button className="dl-clear-btn" onClick={() => setFeed([])}>مسح</button>
          </div>
        </div>
        {feed.length === 0 ? (
          <div className="dl-feed-empty">
            لم يتم إرسال أي إشارات بعد — استخدم الأزرار أعلاه للبدء
          </div>
        ) : (
          <div className="dl-feed-table-wrap">
            <table className="dl-feed-table">
              <thead>
                <tr>
                  <th>الحالة</th>
                  <th>النوع</th>
                  <th>الثقة</th>
                  <th>التردد</th>
                  <th>SNR</th>
                  <th>الاتجاه</th>
                  <th>الموقع</th>
                  <th>الوقت</th>
                </tr>
              </thead>
              <tbody>
                {feed.map(sig => {
                  const meta = LABEL_META[sig.label];
                  return (
                    <tr key={sig.id} className={`dl-feed-row ${sig.status} ${sendingId === sig.id ? 'flash' : ''}`}>
                      <td>
                        <span className={`dl-status-dot ${sig.status}`} />
                      </td>
                      <td>
                        <span className="dl-feed-badge" style={{
                          background: `${meta.color}15`,
                          color: meta.color,
                          border: `1px solid ${meta.color}30`,
                        }}>
                          {meta.icon} {sig.label}
                        </span>
                      </td>
                      <td className="mono">{(sig.confidence * 100).toFixed(0)}%</td>
                      <td className="mono">{sig.frequency.toFixed(1)}</td>
                      <td className="mono">{sig.snr.toFixed(1)} dB</td>
                      <td className="mono">{sig.direction.toFixed(0)}°</td>
                      <td>{sig.location}</td>
                      <td className="dl-feed-time">{sig.timestamp.toLocaleTimeString('ar-EG')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Styles ─────────────────────────────────────────────────── */}
      <style>{`
        .demolab-page { padding: 12px; position: relative; }

        /* ── Header ── */
        .dl-page-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
          padding-bottom: 20px; border-bottom: 1px solid var(--border-color);
        }
        .dl-title {
          font-size: 1.8rem; font-weight: 800; margin-bottom: 6px;
          background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .dl-subtitle { color: var(--text-secondary); font-size: 14px; font-weight: 500; }
        .dl-header-meta { display: flex; align-items: center; gap: 14px; }
        .dl-counter-badge {
          background: rgba(50, 145, 255, 0.08); border: 1px solid rgba(50, 145, 255, 0.2);
          padding: 6px 16px; border-radius: 20px; color: var(--primary-color);
          font-size: 13px; font-weight: 600;
        }
        .dl-counter-badge strong { font-weight: 900; font-family: 'Outfit', monospace; }
        .dl-auto-indicator {
          padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
          letter-spacing: 0.08em;
          background: rgba(113, 113, 122, 0.1); border: 1px solid rgba(113, 113, 122, 0.2);
          color: var(--text-tertiary);
        }
        .dl-auto-indicator.active {
          background: rgba(229, 72, 77, 0.12); border-color: rgba(229, 72, 77, 0.3);
          color: #e5484d; animation: live-pulse 1.5s ease-in-out infinite;
        }
        @keyframes live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* ── Card Base ── */
        .dl-card { margin-bottom: 0; }

        /* ── Top Row ── */
        .dl-top-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }

        /* ── Inject Buttons ── */
        .dl-inject-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .dl-inject-btn {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding: 24px 16px; border-radius: 16px; cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
          border: 1.5px solid var(--border-color);
          color: var(--text-primary);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dl-inject-btn:hover:not(:disabled) {
          border-color: var(--btn-color);
          background: color-mix(in srgb, var(--btn-color) 8%, transparent);
          transform: translateY(-3px);
          box-shadow: 0 8px 30px color-mix(in srgb, var(--btn-color) 20%, transparent);
        }
        .dl-inject-btn:active:not(:disabled) { transform: translateY(0) scale(0.97); }
        .dl-inject-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .dl-inject-icon { font-size: 32px; filter: drop-shadow(0 2px 8px color-mix(in srgb, var(--btn-color) 30%, transparent)); }
        .dl-inject-label { font-size: 15px; font-weight: 700; color: var(--btn-color); }
        .dl-inject-en { font-size: 11px; font-weight: 500; color: var(--text-tertiary); letter-spacing: 0.04em; }
        .dl-inject-pulse {
          position: absolute; inset: 0; border-radius: 16px;
          background: radial-gradient(circle at center, var(--btn-color), transparent 70%);
          opacity: 0; transition: opacity 0.3s;
          pointer-events: none;
        }
        .dl-inject-btn:active .dl-inject-pulse { opacity: 0.12; }

        /* ── Scenario Buttons ── */
        .dl-scenario-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .dl-scenario-btn {
          position: relative; display: flex; flex-direction: column; align-items: center;
          gap: 6px; padding: 20px 14px; border-radius: 14px; cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
          border: 1.5px solid var(--border-color);
          color: var(--text-primary);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dl-scenario-btn:hover:not(:disabled) {
          border-color: var(--sc-color);
          background: color-mix(in srgb, var(--sc-color) 6%, transparent);
          transform: translateY(-2px);
          box-shadow: 0 6px 24px color-mix(in srgb, var(--sc-color) 15%, transparent);
        }
        .dl-scenario-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .dl-scenario-btn.running {
          border-color: var(--sc-color);
          background: color-mix(in srgb, var(--sc-color) 10%, transparent);
          animation: scenario-run 0.8s ease-in-out infinite alternate;
        }
        @keyframes scenario-run {
          from { box-shadow: 0 0 8px color-mix(in srgb, var(--sc-color) 20%, transparent); }
          to   { box-shadow: 0 0 24px color-mix(in srgb, var(--sc-color) 40%, transparent); }
        }
        .dl-sc-icon { font-size: 26px; }
        .dl-sc-name { font-size: 14px; font-weight: 700; color: var(--sc-color); }
        .dl-sc-en { font-size: 10px; font-weight: 500; color: var(--text-tertiary); }
        .dl-sc-spinner {
          position: absolute; top: 8px; left: 8px;
          width: 14px; height: 14px; border-radius: 50%;
          border: 2px solid transparent; border-top-color: var(--sc-color);
          animation: spin 0.6s linear infinite;
        }

        /* ── Mid Row ── */
        .dl-mid-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; margin-bottom: 24px; }

        /* ── Config Sliders ── */
        .dl-config-grid { display: flex; flex-direction: column; gap: 22px; }
        .dl-slider-group { display: flex; flex-direction: column; gap: 8px; }
        .dl-slider-header {
          display: flex; justify-content: space-between; align-items: center;
        }
        .dl-slider-header label {
          font-size: 13px; font-weight: 600; color: var(--text-secondary);
        }
        .dl-slider-val {
          font-size: 13px; font-weight: 800; color: var(--primary-color);
          font-family: 'Outfit', monospace; letter-spacing: 0.03em;
          background: rgba(50, 145, 255, 0.08); padding: 2px 10px; border-radius: 8px;
        }
        .dl-slider {
          -webkit-appearance: none; appearance: none; width: 100%; height: 6px;
          background: var(--bg-tertiary); border-radius: 3px; outline: none;
          transition: background 0.2s;
        }
        .dl-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--primary-color); cursor: pointer;
          box-shadow: 0 0 10px var(--primary-glow);
          transition: transform 0.15s;
        }
        .dl-slider::-webkit-slider-thumb:hover { transform: scale(1.25); }
        .dl-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%; border: none;
          background: var(--primary-color); cursor: pointer;
          box-shadow: 0 0 10px var(--primary-glow);
        }
        .dl-slider-ticks {
          display: flex; justify-content: space-between;
          font-size: 10px; color: var(--text-tertiary); font-weight: 500;
        }

        /* ── Select ── */
        .dl-select {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          background: var(--bg-tertiary); border: 1px solid var(--border-color);
          color: var(--text-primary); font-size: 13px; font-weight: 500;
          outline: none; cursor: pointer;
          transition: border-color 0.2s;
        }
        .dl-select:focus { border-color: var(--primary-color); }
        .dl-select option { background: var(--bg-secondary); color: var(--text-primary); }

        /* ── Auto-Demo Card ── */
        .dl-auto-card { display: flex; flex-direction: column; }
        .dl-auto-body { display: flex; flex-direction: column; gap: 20px; flex: 1; justify-content: center; }
        .dl-auto-desc {
          font-size: 13px; font-weight: 500; color: var(--text-secondary);
          line-height: 1.7; text-align: center;
        }
        .dl-auto-desc-en { font-size: 11px; color: var(--text-tertiary); }

        .dl-auto-toggle {
          display: flex; align-items: center; justify-content: center; gap: 14px;
          padding: 16px 24px; border-radius: 14px; cursor: pointer;
          font-size: 14px; font-weight: 700;
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid var(--border-color);
          color: var(--text-primary);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dl-auto-toggle:hover {
          border-color: var(--primary-color);
          background: rgba(50, 145, 255, 0.06);
        }
        .dl-auto-toggle.on {
          border-color: #e5484d;
          background: rgba(229, 72, 77, 0.08);
        }
        .dl-toggle-track {
          width: 44px; height: 24px; border-radius: 12px; position: relative;
          background: var(--bg-tertiary); transition: background 0.3s;
          flex-shrink: 0;
        }
        .dl-auto-toggle.on .dl-toggle-track { background: #e5484d; }
        .dl-toggle-thumb {
          position: absolute; top: 3px; right: 3px;
          width: 18px; height: 18px; border-radius: 50%;
          background: white; transition: transform 0.3s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
        }
        .dl-auto-toggle.on .dl-toggle-thumb { transform: translateX(-20px); }

        .dl-auto-live-indicator {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          padding: 12px 20px; border-radius: 10px;
          background: rgba(229, 72, 77, 0.06); border: 1px solid rgba(229, 72, 77, 0.15);
          font-size: 12px; font-weight: 600; color: #e5484d;
          animation: live-pulse 1.5s ease-in-out infinite;
        }
        .dl-live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #e5484d; flex-shrink: 0;
          animation: status-pulse 1s ease-in-out infinite;
        }
        @keyframes status-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        /* ── Session Stats ── */
        .dl-session-stats {
          display: flex; align-items: center; justify-content: center;
          padding: 16px; border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          gap: 4px;
        }
        .dl-sess-stat {
          display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;
        }
        .dl-sess-val { font-size: 22px; font-weight: 900; font-family: 'Outfit', sans-serif; }
        .dl-sess-lbl { font-size: 10px; font-weight: 600; color: var(--text-tertiary); }
        .dl-sess-sep { width: 1px; height: 32px; background: var(--border-color); }

        /* ── Live Feed ── */
        .dl-feed-card { margin-bottom: 24px; }
        .dl-feed-actions { display: flex; align-items: center; gap: 12px; }
        .dl-feed-count {
          font-size: 12px; color: var(--text-tertiary); font-weight: 600;
        }
        .dl-clear-btn {
          padding: 4px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;
          background: rgba(229, 72, 77, 0.08); border: 1px solid rgba(229, 72, 77, 0.2);
          color: #e5484d; cursor: pointer; transition: all 0.2s;
        }
        .dl-clear-btn:hover { background: rgba(229, 72, 77, 0.15); }
        .dl-feed-empty {
          text-align: center; padding: 48px 20px; color: var(--text-tertiary);
          font-size: 14px; font-weight: 500;
        }
        .dl-feed-table-wrap { overflow-x: auto; max-height: 360px; overflow-y: auto; }
        .dl-feed-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dl-feed-table thead th {
          padding: 10px 12px; text-align: right; font-size: 11px; font-weight: 700;
          color: var(--text-tertiary); border-bottom: 2px solid var(--border-color);
          letter-spacing: 0.03em; text-transform: uppercase;
          position: sticky; top: 0; background: var(--card-bg); z-index: 2;
          backdrop-filter: var(--glass-blur);
        }
        .dl-feed-table tbody td {
          padding: 10px 12px; border-bottom: 1px solid var(--border-color);
          vertical-align: middle;
        }
        .dl-feed-table tbody tr:last-child td { border-bottom: none; }
        .dl-feed-table tbody tr { transition: background 0.2s; }
        .dl-feed-table tbody tr:hover { background: rgba(50, 145, 255, 0.04); }
        .dl-feed-row.flash { animation: row-flash 0.6s ease-out; }
        @keyframes row-flash {
          0% { background: rgba(50, 145, 255, 0.15); }
          100% { background: transparent; }
        }

        .dl-status-dot {
          display: inline-block; width: 10px; height: 10px; border-radius: 50%;
        }
        .dl-status-dot.sending {
          background: var(--warning-color);
          animation: status-pulse 0.6s ease-in-out infinite;
        }
        .dl-status-dot.success { background: var(--success-color); }
        .dl-status-dot.error { background: var(--alert-color); }

        .dl-feed-badge {
          padding: 3px 10px; border-radius: 16px; font-size: 11px;
          font-weight: 700; white-space: nowrap;
        }
        .dl-feed-time { color: var(--text-tertiary); font-size: 12px; font-weight: 500; }
        .mono { font-family: monospace; color: var(--primary-color); letter-spacing: 0.05em; font-weight: 600; }

        /* ── Responsive ── */
        @media (max-width: 1280px) {
          .dl-top-row { grid-template-columns: 1fr; }
          .dl-mid-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .dl-inject-grid { grid-template-columns: 1fr; }
          .dl-scenario-grid { grid-template-columns: 1fr; }
          .dl-session-stats { flex-wrap: wrap; }
        }

        /* ── Spin keyframe (reuse) ── */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default DemoLab;
