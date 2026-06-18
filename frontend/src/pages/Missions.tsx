// src/pages/Missions.tsx
import React, { useState, useEffect } from 'react';

/* ─── Types ────────────────────────────────────────────────────────────────── */
interface Mission {
  id: number;
  name: string;
  nameEn: string;
  status: 'active' | 'scheduled' | 'completed' | 'paused';
  statusLabel: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityLabel: string;
  band: string;
  description: string;
  progress: number;
  startTime: string;
  elapsed: string;
  threats: number;
  icon: string;
}

/* ─── Static Data ──────────────────────────────────────────────────────────── */
const INITIAL_MISSIONS: Mission[] = [
  {
    id: 1,
    name: 'مراقبة الطائرات المسيّرة',
    nameEn: 'Drone Surveillance',
    status: 'active',
    statusLabel: 'نشطة',
    priority: 'high',
    priorityLabel: 'عالية',
    band: '2.4 GHz / 5.8 GHz',
    description: 'رصد إشارات التحكم والفيديو للطائرات المسيّرة',
    progress: 78,
    startTime: '08:15',
    elapsed: '04:52:18',
    threats: 5,
    icon: '🚁',
  },
  {
    id: 2,
    name: 'حماية GPS',
    nameEn: 'GPS Protection',
    status: 'active',
    statusLabel: 'نشطة',
    priority: 'critical',
    priorityLabel: 'حرجة',
    band: 'L1 (1575.42 MHz) / L2 (1227.6 MHz)',
    description: 'كشف محاولات التشويش على إشارات تحديد المواقع',
    progress: 92,
    startTime: '06:00',
    elapsed: '07:07:42',
    threats: 3,
    icon: '🛰️',
  },
  {
    id: 3,
    name: 'مسح الطيف الكامل',
    nameEn: 'Full Spectrum Scan',
    status: 'scheduled',
    statusLabel: 'مجدولة',
    priority: 'medium',
    priorityLabel: 'متوسطة',
    band: '70 MHz – 6 GHz',
    description: 'مسح شامل لجميع نطاقات التردد',
    progress: 0,
    startTime: '14:00',
    elapsed: 'مجدول — ١٤:٠٠',
    threats: 0,
    icon: '📡',
  },
  {
    id: 4,
    name: 'مراقبة الاتصالات',
    nameEn: 'Communications Monitoring',
    status: 'active',
    statusLabel: 'نشطة',
    priority: 'high',
    priorityLabel: 'عالية',
    band: 'VHF/UHF (136–512 MHz)',
    description: 'رصد الاتصالات اللاسلكية غير المصرح بها',
    progress: 65,
    startTime: '09:30',
    elapsed: '03:37:24',
    threats: 4,
    icon: '📻',
  },
  {
    id: 5,
    name: 'تأمين المحيط',
    nameEn: 'Perimeter Security',
    status: 'completed',
    statusLabel: 'مكتملة',
    priority: 'medium',
    priorityLabel: 'متوسطة',
    band: 'ISM 433 / 915 MHz',
    description: 'فحص أمني للمحيط الجغرافي المحدد',
    progress: 100,
    startTime: '00:00',
    elapsed: '05:45:00 ✓',
    threats: 0,
    icon: '🛡️',
  },
];

/* ─── Color Maps ───────────────────────────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  active: '#17c964',
  scheduled: '#f5a623',
  completed: '#3291ff',
  paused: '#a1a1aa',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#e5484d',
  high: '#f5a623',
  medium: '#3291ff',
  low: '#17c964',
};

/* ─── Component ────────────────────────────────────────────────────────────── */
const Missions: React.FC = () => {
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMission = (id: number) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (m.status === 'active') return { ...m, status: 'paused' as const, statusLabel: 'متوقفة' };
        if (m.status === 'paused') return { ...m, status: 'active' as const, statusLabel: 'نشطة' };
        if (m.status === 'scheduled') return { ...m, status: 'active' as const, statusLabel: 'نشطة', progress: 5 };
        return m;
      }),
    );
  };

  /* ── Computed stats ── */
  const totalMissions = missions.length;
  const activeMissions = missions.filter((m) => m.status === 'active').length;
  const scheduledMissions = missions.filter((m) => m.status === 'scheduled').length;
  const completedMissions = missions.filter((m) => m.status === 'completed').length;
  const totalThreats = missions.reduce((s, m) => s + m.threats, 0);

  const getButtonLabel = (status: string) => {
    if (status === 'active') return '⏸ إيقاف';
    if (status === 'paused') return '▶ استئناف';
    if (status === 'scheduled') return '▶ بدء';
    return '✓ مكتملة';
  };

  return (
    <div className="missions-page grid-pattern">
      {/* ── Header ── */}
      <div className="m-page-header">
        <div>
          <h2 className="m-title-glow">المهام</h2>
          <p className="m-subtitle">Missions — لوحة إدارة مهام الرصد والمراقبة</p>
        </div>
        <div className="m-header-meta">
          <span className="m-live-indicator">
            <span className="m-live-dot" />
            LIVE
          </span>
          <span className="m-clock">{now.toLocaleTimeString('ar-EG')}</span>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="m-stats-bar">
        {[
          { icon: '🎯', label: 'إجمالي المهام', value: totalMissions, color: '#3291ff' },
          { icon: '⚡', label: 'نشطة', value: activeMissions, color: '#17c964' },
          { icon: '🕐', label: 'مجدولة', value: scheduledMissions, color: '#f5a623' },
          { icon: '✅', label: 'مكتملة', value: completedMissions, color: '#3291ff' },
          { icon: '🚨', label: 'تهديدات مكتشفة', value: totalThreats, color: '#e5484d' },
        ].map((s) => (
          <div key={s.label} className="m-stat-item" style={{ '--stat-color': s.color } as React.CSSProperties}>
            <span className="m-stat-icon">{s.icon}</span>
            <div className="m-stat-text">
              <span className="m-stat-value">{s.value}</span>
              <span className="m-stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Mission Cards Grid ── */}
      <div className="m-grid">
        {missions.map((mission, idx) => {
          const statusColor = STATUS_COLORS[mission.status];
          const priorityColor = PRIORITY_COLORS[mission.priority];
          const isDisabled = mission.status === 'completed';

          return (
            <div
              key={mission.id}
              className={`m-card card ${mission.status === 'active' ? 'm-card-active' : ''}`}
              style={{
                animationDelay: `${idx * 0.08}s`,
                '--m-status': statusColor,
              } as React.CSSProperties}
            >
              {/* Scan‑line overlay for active missions */}
              {mission.status === 'active' && <div className="m-scan-line" />}

              {/* Top row: icon + badges */}
              <div className="m-card-top">
                <div className="m-card-icon-wrap">
                  <span className="m-card-icon">{mission.icon}</span>
                </div>
                <div className="m-badges">
                  <span
                    className="m-badge m-status-badge"
                    style={{
                      background: `${statusColor}18`,
                      color: statusColor,
                      borderColor: `${statusColor}40`,
                    }}
                  >
                    <span className="m-badge-dot" style={{ background: statusColor }} />
                    {mission.statusLabel}
                  </span>
                  <span
                    className="m-badge m-priority-badge"
                    style={{
                      background: `${priorityColor}18`,
                      color: priorityColor,
                      borderColor: `${priorityColor}40`,
                    }}
                  >
                    {mission.priorityLabel}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h3 className="m-card-title">{mission.name}</h3>
              <span className="m-card-title-en">({mission.nameEn})</span>

              {/* Description */}
              <p className="m-card-desc">{mission.description}</p>

              {/* Frequency band */}
              <div className="m-freq-row">
                <span className="m-freq-label">النطاق:</span>
                <span className="m-freq-value">{mission.band}</span>
              </div>

              {/* Progress */}
              <div className="m-progress-section">
                <div className="m-progress-header">
                  <span className="m-progress-label">التقدم</span>
                  <span className="m-progress-pct" style={{ color: statusColor }}>{mission.progress}%</span>
                </div>
                <div className="m-progress-track">
                  <div
                    className={`m-progress-fill ${mission.status === 'active' ? 'm-progress-animated' : ''}`}
                    style={{
                      width: `${mission.progress}%`,
                      background: `linear-gradient(90deg, ${statusColor}90, ${statusColor})`,
                      boxShadow: `0 0 12px ${statusColor}60`,
                    }}
                  />
                </div>
              </div>

              {/* Footer: time + threats + button */}
              <div className="m-card-footer">
                <div className="m-footer-info">
                  <div className="m-time-row">
                    <span className="m-time-icon">⏱</span>
                    <span className="m-time-value">{mission.elapsed}</span>
                  </div>
                  {mission.threats > 0 && (
                    <div className="m-threats-row">
                      <span className="m-threats-icon">⚠️</span>
                      <span className="m-threats-value">{mission.threats} تهديد</span>
                    </div>
                  )}
                </div>
                <button
                  className={`m-action-btn ${mission.status}`}
                  disabled={isDisabled}
                  onClick={() => toggleMission(mission.id)}
                  style={{
                    '--btn-color': isDisabled ? '#a1a1aa' : statusColor,
                  } as React.CSSProperties}
                >
                  {getButtonLabel(mission.status)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Inline Styles ── */}
      <style>{`
        .missions-page {
          padding: 12px;
          position: relative;
        }

        /* ── Header ─────────────────────────────── */
        .m-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          flex-wrap: wrap;
          gap: 16px;
        }
        .m-title-glow {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 4px;
          background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
          -webkit-background-clip: text;
          background-clip: text;
        }
        .m-subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
        }
        .m-header-meta {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .m-live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
          color: #17c964;
          background: rgba(23, 201, 100, 0.08);
          border: 1px solid rgba(23, 201, 100, 0.2);
          padding: 5px 14px;
          border-radius: 20px;
        }
        .m-live-dot {
          width: 7px;
          height: 7px;
          background: #17c964;
          border-radius: 50%;
          animation: m-pulse 1.5s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(23, 201, 100, 0.6);
        }
        .m-clock {
          font-size: 12px;
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
          font-family: monospace;
        }

        /* ── Stats Bar ──────────────────────────── */
        .m-stats-bar {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        .m-stat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          padding: 16px 18px;
          backdrop-filter: var(--glass-blur);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .m-stat-item::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(to right, transparent, var(--stat-color), transparent);
          opacity: 0.7;
        }
        .m-stat-item:hover {
          transform: translateY(-3px);
          border-color: var(--stat-color);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }
        .m-stat-icon {
          font-size: 24px;
        }
        .m-stat-text {
          display: flex;
          flex-direction: column;
        }
        .m-stat-value {
          font-size: 26px;
          font-family: 'Outfit', sans-serif;
          font-weight: 900;
          color: var(--stat-color);
          line-height: 1.1;
        }
        .m-stat-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        /* ── Card Grid ──────────────────────────── */
        .m-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 22px;
        }

        .m-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: relative;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .m-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2), 0 0 30px rgba(50, 145, 255, 0.08);
          border-color: var(--m-status);
        }
        .m-card-active {
          border-color: rgba(23, 201, 100, 0.25);
        }

        /* Scan‑line effect */
        .m-scan-line {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            transparent 45%,
            rgba(23, 201, 100, 0.06) 50%,
            transparent 55%,
            transparent 100%
          );
          animation: m-scanline 3.5s linear infinite;
        }

        /* ── Card Top ── */
        .m-card-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .m-card-icon-wrap {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(50, 145, 255, 0.06);
          border: 1px solid rgba(50, 145, 255, 0.12);
          border-radius: 14px;
          flex-shrink: 0;
        }
        .m-card-icon {
          font-size: 24px;
        }
        .m-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .m-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          border: 1px solid;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          letter-spacing: 0.01em;
        }
        .m-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .m-status-badge .m-badge-dot {
          animation: m-pulse 1.5s ease-in-out infinite;
        }

        /* ── Card Content ── */
        .m-card-title {
          font-size: 17px;
          font-weight: 800;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
          line-height: 1.2;
          margin: 0;
        }
        .m-card-title-en {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-tertiary);
          font-style: italic;
          margin-top: -8px;
        }
        .m-card-desc {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        /* ── Frequency row ── */
        .m-freq-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(50, 145, 255, 0.04);
          border: 1px solid rgba(50, 145, 255, 0.1);
          border-radius: 10px;
          padding: 8px 14px;
        }
        .m-freq-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
        }
        .m-freq-value {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--primary-color);
          font-family: 'Outfit', monospace;
          letter-spacing: 0.04em;
        }

        /* ── Progress ── */
        .m-progress-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .m-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .m-progress-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
        }
        .m-progress-pct {
          font-size: 14px;
          font-weight: 900;
          font-family: 'Outfit', sans-serif;
        }
        .m-progress-track {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }
        .m-progress-fill {
          height: 100%;
          border-radius: 6px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .m-progress-animated::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.25) 50%,
            transparent 100%
          );
          animation: m-shimmer 2s ease-in-out infinite;
        }

        /* ── Card Footer ── */
        .m-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid var(--border-color);
        }
        .m-footer-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .m-time-row,
        .m-threats-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .m-time-icon {
          font-size: 13px;
        }
        .m-time-value {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
          font-family: monospace;
        }
        .m-threats-icon {
          font-size: 12px;
        }
        .m-threats-value {
          font-size: 12px;
          font-weight: 700;
          color: #e5484d;
        }

        /* ── Action Button ── */
        .m-action-btn {
          padding: 8px 20px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--btn-color);
          background: transparent;
          color: var(--btn-color);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          font-family: inherit;
        }
        .m-action-btn:not(:disabled):hover {
          background: var(--btn-color);
          color: #000;
          box-shadow: 0 4px 20px color-mix(in srgb, var(--btn-color) 35%, transparent);
          transform: scale(1.04);
        }
        .m-action-btn:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .m-action-btn.active {
          border-color: #e5484d;
          color: #e5484d;
          --btn-color: #e5484d;
        }
        .m-action-btn.paused {
          border-color: #17c964;
          color: #17c964;
          --btn-color: #17c964;
        }
        .m-action-btn.scheduled {
          border-color: #f5a623;
          color: #f5a623;
          --btn-color: #f5a623;
        }

        /* ── Animations ─────────────────────────── */
        @keyframes m-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes m-scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes m-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        /* ── Responsive ─────────────────────────── */
        @media (max-width: 1280px) {
          .m-stats-bar {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 1024px) {
          .m-stats-bar {
            grid-template-columns: repeat(2, 1fr);
          }
          .m-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .m-stats-bar {
            grid-template-columns: 1fr;
          }
          .m-page-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default Missions;
