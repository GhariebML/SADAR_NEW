// src/components/Sidebar.tsx  (v3.0 — Professional Cyberpunk UI/UX Refactor)
import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getHealth } from '../api/apiClient';

// ─── Nav items — التقارير محذوفة ─────────────────────────────────────────────
const NAV_ITEMS = [
  { path: '/',          name: 'الرئيسية',      icon: '🏠', group: 'main' },
  { path: '/realtime',  name: 'مراقبة لحظية',  icon: '📡', group: 'main' },
  { path: '/history',   name: 'سجل الإشارات',  icon: '📜', group: 'main' },
  { path: '/map',       name: 'الخريطة',        icon: '🗺️', group: 'main' },
  { path: '/alerts',    name: 'التنبيهات',      icon: '⚠️', group: 'analysis' },
  { path: '/analytics', name: 'الإحصائيات',    icon: '📊', group: 'analysis' },
  { path: '/agent',     name: 'المساعد الذكي',  icon: '🤖', group: 'analysis' },
  { path: '/missions',  name: 'المهام',          icon: '🎯', group: 'analysis' },
  { path: '/system',    name: 'مراقبة النظام',  icon: '⚙️', group: 'system' },
  { path: '/demo-lab',  name: 'مختبر العرض',    icon: '🧪', group: 'system' },
];

const GROUP_LABELS: Record<string, string> = {
  main:     'الرصد',
  analysis: 'التحليل',
  system:   'النظام',
};

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [currentTime, setCurrentTime] = useState(new Date());

  const checkApiHealth = async () => {
    try {
      await getHealth();
      setApiStatus('online');
    } catch {
      setApiStatus('offline');
    }
  };

  useEffect(() => {
    checkApiHealth();
    const healthInterval = setInterval(checkApiHealth, 30000);
    const clockInterval  = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(healthInterval); clearInterval(clockInterval); };
  }, []);

  const statusColor = { online: '#10b981', offline: '#ef4444', loading: '#f97316' }[apiStatus];
  const statusText  = { online: 'الخادم متصل', offline: 'الخادم غير متصل', loading: 'جاري الاتصال...' }[apiStatus];

  const groups = ['main', 'analysis', 'system'];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>

      {/* ── Logo ── */}
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <div className="logo-row">
            <div className="logo-icon-wrap">
              <span className="logo-pulse-ring" />
              <span className="logo-icon">📡</span>
            </div>
            <div>
              <div className="logo-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                SADAR
                <span style={{ fontSize: '9px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', letterSpacing: '1px', border: '1px solid rgba(239, 68, 68, 0.5)', display: 'flex', alignItems: 'center', gap: '4px', animation: 'pulse 2s infinite' }}>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                  LIVE
                </span>
              </div>
              <div className="logo-sub">نظام رصد إشارات RF</div>
            </div>
          </div>
          <button className="mobile-close-btn" onClick={closeSidebar}>×</button>
        </div>

        {/* ساعة */}
        <div className="sidebar-clock">
          <span className="clock-time">
            {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="clock-date">
            {currentTime.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="sidebar-nav">
        {groups.map((group) => {
          const items = NAV_ITEMS.filter((i) => i.group === group);
          return (
            <div key={group} className="nav-group">
              <div className="nav-group-label">{GROUP_LABELS[group]}</div>
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className="sidebar-icon">{item.icon}</span>
                  <span className="sidebar-name">{item.name}</span>
                  <span className="link-arrow">›</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <div className="status-card">
          <div className="status-row">
            <span className="status-dot" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span className="status-text">{statusText}</span>
            <span className="api-ver">API v1</span>
          </div>

          <div className="mini-stats">
            <div className="mini-stat">
              <span className="mini-stat-val" style={{ color: statusColor }}>
                {apiStatus === 'online' ? '✓' : apiStatus === 'offline' ? '✗' : '…'}
              </span>
              <span className="mini-stat-lbl">الخادم</span>
            </div>
            <div className="mini-stat-sep" />
            <div className="mini-stat">
              <span className="mini-stat-val" style={{ color: '#06b6d4' }}>SDR-01</span>
              <span className="mini-stat-lbl">المحطة</span>
            </div>
            <div className="mini-stat-sep" />
            <div className="mini-stat">
              <span className="mini-stat-val" style={{ color: '#10b981' }}>نشط</span>
              <span className="mini-stat-lbl">الحالة</span>
            </div>
          </div>
        </div>

        <div className="report-hint">
          <span className="report-hint-icon">📄</span>
          <span className="report-hint-text">
            لإنشاء تقرير: اضغط 📄 في سجل الإشارات
          </span>
        </div>
      </div>

      <style>{`
        .sidebar {
          position: fixed;
          top: 0; right: 0; left: auto;
          width: 240px;
          height: 100vh;
          background: var(--sidebar-bg);
          border-left: 1px solid var(--primary-color);
          border-right: none;
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
          box-shadow: -4px 0 30px rgba(50, 145, 255, 0.1), inset 4px 0 20px rgba(50, 145, 255, 0.05);
          backdrop-filter: var(--glass-blur);
        }

        .sidebar-header {
          padding: 24px 20px 16px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .logo-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon-wrap {
          position: relative;
          width: 40px; height: 40px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          background: rgba(6, 182, 212, 0.08);
          border-radius: 12px;
          border: 1px solid rgba(6, 182, 212, 0.15);
        }

        .logo-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 16px;
          border: 1.5px solid rgba(6, 182, 212, 0.35);
          animation: logo-pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes logo-pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.2; }
          50%       { transform: scale(1.15); opacity: 0.8; }
        }

        .logo-icon { font-size: 20px; position: relative; z-index: 1; }

        .logo-text {
          font-family: 'Outfit', sans-serif;
          font-size: 22px;
          font-weight: 900;
          background: linear-gradient(135deg, var(--primary-color, #06b6d4), #0891b2);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          letter-spacing: 0.08em;
          line-height: 1;
        }

        .logo-sub {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--text-tertiary);
          margin-top: 3px;
        }

        .sidebar-clock {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(6, 182, 212, 0.03);
          border: 1px solid rgba(6, 182, 212, 0.08);
          border-radius: 12px;
          padding: 8px 14px;
          gap: 2px;
        }

        .clock-time {
          font-size: 18px;
          font-weight: 700;
          color: var(--primary-color, #06b6d4);
          letter-spacing: 0.08em;
          font-variant-numeric: tabular-nums;
          font-family: monospace;
          text-shadow: 0 0 8px rgba(6, 182, 212, 0.2);
        }

        .clock-date {
          font-size: 10px;
          font-weight: 500;
          color: var(--text-tertiary);
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow-y: auto;
        }

        .nav-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }

        .nav-group-label {
          font-family: 'Outfit', sans-serif;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-tertiary);
          padding: 4px 12px 6px;
          opacity: 0.8;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 12px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-size: 13.5px;
          font-weight: 500;
          position: relative;
          border: 1px solid transparent;
        }

        .sidebar-link:hover {
          background: rgba(6, 182, 212, 0.04);
          color: var(--text-primary);
          border-color: rgba(6, 182, 212, 0.08);
          transform: translateX(-4px);
        }

        .sidebar-link:hover .link-arrow { opacity: 1; transform: translateX(2px); }

        .sidebar-link.active {
          background: linear-gradient(135deg, var(--primary-color, #06b6d4), #0891b2);
          color: #ffffff;
          border-color: transparent;
          font-weight: 700;
          box-shadow: 0 4px 20px rgba(6, 182, 212, 0.25);
        }

        .sidebar-link.active .link-arrow { color: #ffffff; opacity: 1; }

        .sidebar-icon { font-size: 18px; width: 22px; text-align: center; flex-shrink: 0; }
        .sidebar-name { flex: 1; }
        .link-arrow   { font-size: 15px; opacity: 0; transition: all 0.2s ease; color: var(--text-tertiary); }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: rgba(0, 0, 0, 0.02);
        }

        .status-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .status-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          animation: status-pulse 1.8s ease-in-out infinite;
        }

        @keyframes status-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(0.9); }
        }

        .status-text { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); flex: 1; }
        .api-ver     { font-size: 9px; font-weight: 700; color: var(--text-tertiary); letter-spacing: 0.05em; }

        .mini-stats {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid var(--border-color);
        }

        .mini-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          flex: 1;
        }

        .mini-stat-val { font-size: 11.5px; font-weight: 800; }
        .mini-stat-lbl { font-size: 9px; font-weight: 500; color: var(--text-tertiary); }
        .mini-stat-sep { width: 1px; height: 22px; background: var(--border-color); }

        .report-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(6, 182, 212, 0.03);
          border: 1px solid rgba(6, 182, 212, 0.08);
          border-radius: 10px;
          padding: 8px 12px;
        }

        .report-hint-icon { font-size: 14px; flex-shrink: 0; }
        .report-hint-text { font-size: 9.5px; font-weight: 500; color: var(--text-tertiary); line-height: 1.5; }

        @media (max-width: 1024px) {
          .sidebar { transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .sidebar.open { transform: translateX(0); }
          .mobile-close-btn { display: block; background: none; border: none; font-size: 28px; color: var(--text-secondary); cursor: pointer; line-height: 1; }
        }
        @media (min-width: 1025px) {
          .mobile-close-btn { display: none; }
        }
        .sidebar-header-top { display: flex; justify-content: space-between; align-items: flex-start; }
      `}</style>
    </aside>
  );
};

export default Sidebar;
