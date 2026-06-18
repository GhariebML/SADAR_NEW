// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import { WebSocketProvider } from './context/WebSocketContext';
// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
// Pages
import Home      from './pages/Home';
import Realtime  from './pages/Realtime';
import History   from './pages/History';
import Alerts    from './pages/Alerts';
import Analytics from './pages/Analytics';
import Map       from './pages/Map';
import Agent     from './pages/Agent';
import System    from './pages/System';
import Reports   from './pages/Reports';
import DemoLab   from './pages/DemoLab';
import Missions  from './pages/Missions';
import './index.css';

const App: React.FC = () => {
  const { theme, refreshAll } = useStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <WebSocketProvider>
      <Router>
        <div className="app-container">
          <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />
          {isSidebarOpen && <div className="sidebar-mobile-overlay" onClick={closeSidebar} />}
          <div className="main-container">
            <Navbar toggleSidebar={toggleSidebar} />
            <div className="content-container">
              <Routes>
                <Route path="/"          element={<Home />}      />
                <Route path="/realtime"  element={<Realtime />}  />
                <Route path="/history"   element={<History />}   />
                <Route path="/alerts"    element={<Alerts />}    />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/map"       element={<Map />}       />
                <Route path="/agent"     element={<Agent />}     />
                <Route path="/system"    element={<System />}    />
                <Route path="/reports"   element={<Reports />}   />
                <Route path="/demo-lab"  element={<DemoLab />}   />
                <Route path="/missions"  element={<Missions />}  />
                <Route path="*" element={
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '60vh', gap: '16px',
                    color: 'var(--text-secondary)', textAlign: 'center',
                  }}>
                    <span style={{ fontSize: '64px' }}>404</span>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      الصفحة غير موجودة
                    </h2>
                    <p>الرابط الذي تبحث عنه غير متوفر أو تم نقله.</p>
                    <a href="/" style={{
                      marginTop: '12px', padding: '10px 28px', borderRadius: '8px',
                      background: 'var(--primary-color)', color: '#fff',
                      textDecoration: 'none', fontWeight: 600,
                    }}>العودة للرئيسية</a>
                  </div>
                } />
              </Routes>
            </div>
          </div>
        </div>
      </Router>
    </WebSocketProvider>
  );
};

export default App;
