// src/components/Navbar.tsx  (v3.0 — Professional Cyberpunk UI/UX Refactor)
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { useWebSocket } from '../context/WebSocketContext';

interface NavbarProps {
  toggleSidebar?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const location = useLocation();
  const { theme, setTheme } = useStore();
  const { isConnected, isApiOnline, alerts } = useWebSocket();
  const [currentTime, setCurrentTime] = useState('');

  const getPageTitle = (): string => {
    switch (location.pathname) {
      case '/':          return 'الرئيسية';
      case '/realtime':  return 'المراقبة اللحظية';
      case '/history':   return 'سجل الإشارات';
      case '/alerts':    return 'التنبيهات';
      case '/analytics': return 'الإحصائيات';
      case '/map':       return 'الخريطة';
      case '/agent':     return 'المساعد الذكي';
      case '/system':    return 'مراقبة النظام';
      case '/reports':   return 'التقارير';
      case '/missions':  return 'المهام';
      case '/demo-lab':  return 'مختبر العرض';
      default:           return 'SADAR';
    }
  };

  useEffect(() => {
    const update = () => {
      setCurrentTime(new Date().toLocaleTimeString('ar-EG', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>☰</button>
        <div className="title-group">
          <span className="breadcrumb-main">رادار SADAR</span>
          <span className="breadcrumb-separator">/</span>
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>
      </div>

      <div className="navbar-right">
        <div className={`status-chip ${isApiOnline ? 'online' : 'offline'}`}>
          <span className="dot" />
          <span className="label">خادم API</span>
          <span className="value">{isApiOnline ? 'متصل' : 'غير متصل'}</span>
        </div>

        <div className={`status-chip ${isConnected ? 'online' : 'offline'}`}>
          <span className="dot" />
          <span className="label">البث المباشر</span>
          <span className="value">{isConnected ? 'نشط' : 'غير متصل'}</span>
          {alerts.length > 0 && (
            <span className="alert-pulse-badge">{alerts.length}</span>
          )}
        </div>

        <div className="time-chip">
          <span className="time-icon">🕐</span>
          <span>{currentTime}</span>
        </div>

        <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="hide-mobile">{theme === 'dark' ? 'وضع مضيء' : 'وضع ليلي'}</span>
        </button>
      </div>

      <style>{`
        .navbar {
          position: sticky; top: 0; z-index: 99;
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 28px;
          border-bottom: 1px solid var(--border-color);
          backdrop-filter: var(--glass-blur);
          background: var(--navbar-bg);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.02);
        }
        .navbar-left { display: flex; align-items: center; gap: 18px; }
        .mobile-menu-btn { display: none; background: none; border: none; font-size: 22px; color: var(--text-primary); cursor: pointer; }
        
        .title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .breadcrumb-main {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-tertiary);
        }
        .breadcrumb-separator {
          font-size: 13px;
          color: var(--text-tertiary);
          opacity: 0.5;
        }
        .page-title {
          font-size: 1.35rem; font-weight: 800; margin: 0;
          background: linear-gradient(135deg, var(--text-primary), var(--primary-color, #06b6d4));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .navbar-right { display: flex; align-items: center; gap: 14px; }

        .status-chip {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          padding: 6px 14px; border-radius: 20px;
          font-size: 12px; position: relative;
          backdrop-filter: var(--glass-blur);
          transition: all 0.2s ease;
        }
        .status-chip:hover {
          border-color: rgba(6, 182, 212, 0.25);
          background: rgba(6, 182, 212, 0.02);
        }
        .status-chip .dot {
          width: 8px; height: 8px; border-radius: 50%;
        }
        .status-chip.online .dot {
          background: var(--normal-color, #10b981);
          box-shadow: 0 0 10px var(--normal-glow);
          animation: pulse 1.6s infinite;
        }
        .status-chip.offline .dot { 
          background: var(--drone-color, #ef4444); 
          box-shadow: 0 0 10px var(--drone-glow);
        }
        .status-chip .label { color: var(--text-tertiary); font-weight: 500; }
        .status-chip.online .value { color: var(--normal-color, #10b981); font-weight: 700; }
        .status-chip.offline .value { color: var(--drone-color, #ef4444); font-weight: 700; }
        
        .alert-pulse-badge {
          position: absolute; top: -6px; right: -6px;
          background: var(--drone-color, #ef4444); color: #fff;
          font-size: 10px; font-weight: 800;
          padding: 2px 6px; border-radius: 10px; min-width: 18px; text-align: center;
          box-shadow: 0 0 12px var(--drone-glow);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .time-chip {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color);
          padding: 6px 14px; border-radius: 20px;
          font-size: 12px; font-family: monospace; color: var(--text-secondary);
          font-weight: 600;
        }
        .time-icon { font-size: 14px; }
        
        .theme-btn {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color);
          padding: 6px 14px; border-radius: 20px; cursor: pointer; font-size: 12px;
          color: var(--text-secondary); font-weight: 600;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .theme-btn:hover { 
          background: var(--primary-color, #06b6d4); 
          border-color: transparent; 
          color: #ffffff; 
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.2);
        }
        .theme-icon { font-size: 14px; }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); } 
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        @media (max-width: 1024px) {
          .navbar { padding: 12px 20px; }
          .mobile-menu-btn { display: block; }
          .page-title { font-size: 1.15rem; }
          .breadcrumb-main, .breadcrumb-separator { display: none; }
          .hide-mobile { display: none; }
          .status-chip .label { display: none; }
          .time-chip .time-icon { display: none; }
        }
      `}</style>
    </header>
  );
};

export default Navbar;
