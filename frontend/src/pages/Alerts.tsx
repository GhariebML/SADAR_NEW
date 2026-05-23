// src/pages/Alerts.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import useWebSocket from '../hooks/useWebSocket';
import { getAlerts } from '../api/apiClient';
import type { Alert } from '../api/apiClient';

const Alerts: React.FC = () => {
  const { alerts: storeAlerts, fetchAlerts, isLoading } = useStore();
  const { alerts: wsAlerts, isConnected } = useWebSocket();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<number>>(new Set());

  // Combine store alerts with WebSocket alerts
  const allAlerts = useMemo(() => {
    const combined = [...storeAlerts];
    wsAlerts.forEach((wsAlert) => {
      if (!combined.some((a) => a.id === wsAlert.id)) {
        combined.unshift(wsAlert);
      }
    });
    return combined;
  }, [storeAlerts, wsAlerts]);

  // Get unique types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set(allAlerts.map((a) => a.alert_type));
    return Array.from(types);
  }, [allAlerts]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    let filtered = [...allAlerts];
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((a) => a.status === selectedStatus);
    }
    
    if (selectedType !== 'all') {
      filtered = filtered.filter((a) => a.alert_type === selectedType);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [allAlerts, selectedStatus, selectedType]);

  const acknowledgeAlert = (alertId: number) => {
    setAcknowledgedIds((prev) => new Set([...prev, alertId]));
    console.log(`Alert ${alertId} acknowledged`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      active: { color: '#ff4444', label: 'نشط' },
      acknowledged: { color: '#ff8800', label: 'تم الإقرار' },
      resolved: { color: '#00c851', label: 'تم الحل' },
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <span
        className="status-badge"
        style={{
          background: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}`,
        }}
      >
        {config.label}
      </span>
    );
  };

  // ✅ التعديل: دعم Drone, Jamming, Normal
  const getTypeBadge = (type: string) => {
    const typeConfig: Record<string, { color: string; label: string }> = {
      Drone: { color: '#ff4444', label: 'طائرة بدون طيار' },
      Jamming: { color: '#ff8800', label: 'تشويش' },
      Normal: { color: '#00c851', label: 'عادي' },
    };
    const config = typeConfig[type] || { color: '#00e5ff', label: type };
    return (
      <span
        className="type-badge"
        style={{
          background: `${config.color}20`,
          color: config.color,
          border: `1px solid ${config.color}`,
        }}
      >
        {config.label}
      </span>
    );
  };

  // ✅ التعديل: دعم Drone, Jamming, Normal
  const getAlertIcon = (type: string) => {
    const icons: Record<string, string> = {
      Drone: '🚁',
      Jamming: '📻',
      Normal: '✅',
    };
    return icons[type] || '🔔';
  };

  return (
    <div className="alerts-page">
      <div className="page-header">
        <div className="header-left">
          <h2>التنبيهات</h2>
          <p>مراقبة ورصد التنبيهات الواردة من النظام</p>
        </div>
        <div className="ws-status">
          <span>اتصال WebSocket:</span>
          <span className={isConnected ? 'connected' : 'disconnected'}>
            {isConnected ? '● متصل' : '○ غير متصل'}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">🔔</div>
          <div className="stat-info">
            <div className="stat-value">{allAlerts.length}</div>
            <div className="stat-label">إجمالي التنبيهات</div>
          </div>
        </div>
        <div className="stat-card active">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <div className="stat-value">
              {allAlerts.filter((a) => a.status === 'active').length}
            </div>
            <div className="stat-label">نشط</div>
          </div>
        </div>
        <div className="stat-card acknowledged">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">
              {allAlerts.filter((a) => a.status === 'acknowledged' || acknowledgedIds.has(a.id)).length}
            </div>
            <div className="stat-label">تم الإقرار</div>
          </div>
        </div>
        <div className="stat-card resolved">
          <div className="stat-icon">✔️</div>
          <div className="stat-info">
            <div className="stat-value">
              {allAlerts.filter((a) => a.status === 'resolved').length}
            </div>
            <div className="stat-label">تم الحل</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>الحالة:</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">الكل</option>
            <option value="active">نشط</option>
            <option value="acknowledged">تم الإقرار</option>
            <option value="resolved">تم الحل</option>
          </select>
        </div>

        <div className="filter-group">
          <label>النوع:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">الكل</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'Drone' && 'طائرة بدون طيار'}
                {type === 'Jamming' && 'تشويش'}
                {type === 'Normal' && 'عادي'}
                {!['Drone', 'Jamming', 'Normal'].includes(type) && type}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-stats">
          عرض {filteredAlerts.length} تنبيه
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-container">
        {isLoading && allAlerts.length === 0 ? (
          <div className="loading-placeholder">
            <div className="spinner"></div>
            <span>جاري تحميل التنبيهات...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔕</div>
            <div className="empty-text">لا توجد تنبيهات</div>
          </div>
        ) : (
          <div className="alerts-list">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card ${alert.status} ${
                  acknowledgedIds.has(alert.id) ? 'acknowledged' : ''
                }`}
              >
                <div className="alert-icon">{getAlertIcon(alert.alert_type)}</div>
                <div className="alert-content">
                  <div className="alert-header">
                    {/* ✅ التعديل: دعم Drone, Jamming, Normal */}
                    <div className="alert-title">
                      {alert.alert_type === 'Drone' && '🚁 اكتشاف طائرة بدون طيار'}
                      {alert.alert_type === 'Jamming' && '📻 اكتشاف تشويش'}
                      {alert.alert_type === 'Normal' && '✅ إشارة عادية'}
                      {!['Drone', 'Jamming', 'Normal'].includes(alert.alert_type) && alert.alert_type}
                    </div>
                    <div className="alert-badges">
                      {getStatusBadge(alert.status)}
                      {getTypeBadge(alert.alert_type)}
                    </div>
                  </div>
                  <div className="alert-details">
                    <div className="detail-item">
                      <span className="detail-label">رقم الإشارة:</span>
                      <span className="detail-value">{alert.signal_id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">الموقع:</span>
                      <span className="detail-value">{alert.location || 'غير محدد'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">الوقت:</span>
                      <span className="detail-value">
                        {new Date(alert.timestamp).toLocaleString('ar-EG')}
                      </span>
                    </div>
                  </div>
                  {alert.status === 'active' && !acknowledgedIds.has(alert.id) && (
                    <div className="alert-actions">
                      <button
                        className="acknowledge-btn"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        ✓ إقرار التنبيه
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .alerts-page {
          padding: 0;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-left h2 {
          margin-bottom: 4px;
        }

        .header-left p {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .ws-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .ws-status .connected {
          color: var(--success-color);
        }

        .ws-status .disconnected {
          color: var(--alert-color);
        }

        .stats-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: var(--card-bg);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          border: 1px solid var(--border-color);
        }

        .stat-icon {
          font-size: 32px;
        }

        .stat-info {
          flex: 1;
        }

        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .stat-card.active .stat-value {
          color: var(--alert-color);
        }

        .stat-card.acknowledged .stat-value {
          color: var(--warning-color);
        }

        .stat-card.resolved .stat-value {
          color: var(--success-color);
        }

        .filters-bar {
          display: flex;
          gap: 20px;
          align-items: flex-end;
          margin-bottom: 24px;
          flex-wrap: wrap;
          background: var(--card-bg);
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .filter-group select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          min-width: 150px;
        }

        .filter-stats {
          margin-left: auto;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .alerts-container {
          background: var(--card-bg);
          border-radius: 16px;
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .alerts-list {
          display: flex;
          flex-direction: column;
        }

        .alert-card {
          display: flex;
          gap: 16px;
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.2s;
        }

        .alert-card:hover {
          background: var(--bg-secondary);
        }

        .alert-card.acknowledged {
          opacity: 0.7;
        }

        .alert-icon {
          font-size: 32px;
        }

        .alert-content {
          flex: 1;
        }

        .alert-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 12px;
        }

        .alert-title {
          font-weight: 600;
          font-size: 16px;
          color: var(--text-primary);
        }

        .alert-badges {
          display: flex;
          gap: 8px;
        }

        .status-badge,
        .type-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
        }

        .alert-details {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 12px;
        }

        .detail-item {
          display: flex;
          gap: 8px;
          font-size: 13px;
        }

        .detail-label {
          color: var(--text-secondary);
        }

        .detail-value {
          color: var(--text-primary);
          font-weight: 500;
        }

        .alert-actions {
          margin-top: 8px;
        }

        .acknowledge-btn {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .acknowledge-btn:hover {
          background: var(--warning-color);
          border-color: var(--warning-color);
          color: #080f1e;
        }

        .loading-placeholder,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 60px;
          color: var(--text-secondary);
        }

        .empty-icon {
          font-size: 48px;
          opacity: 0.5;
        }

        .empty-text {
          font-size: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-color);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          .stats-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .filters-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-stats {
            margin-left: 0;
            text-align: center;
          }

          .alert-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .alert-card {
            flex-direction: column;
          }

          .alert-icon {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default Alerts;