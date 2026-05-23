// src/pages/History.tsx  (v3.0 — Professional Cyberpunk UI/UX Refactor)
import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { Signal } from '../api/apiClient';

const History: React.FC = () => {
  const navigate = useNavigate();
  const { signals, isLoading } = useStore();
  const [filteredSignals, setFilteredSignals] = useState<Signal[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<keyof Signal>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const uniqueLabels = useMemo(() => {
    const labels = new Set(signals.map((s) => s.label));
    return Array.from(labels);
  }, [signals]);

  useEffect(() => {
    let filtered = [...signals];

    if (selectedLabel !== 'all') {
      filtered = filtered.filter((s) => s.label === selectedLabel);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.source?.toLowerCase().includes(term) ||
          s.station?.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (sortField === 'timestamp') {
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredSignals(filtered);
    setCurrentPage(1);
  }, [signals, selectedLabel, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
  const paginatedSignals = filteredSignals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: keyof Signal) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: keyof Signal) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getConfidenceClass = (confidence: number) => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  };

  const getLabelColor = (label: string) => {
    const colors: Record<string, string> = {
      Drone: '#ef4444',
      Jamming: '#f97316',
      Normal: '#10b981',
    };
    return colors[label] || '#06b6d4';
  };

  const handleGenerateReport = (signal: Signal) => {
    const text = `اكتب تقرير تحليل RF تفصيلي عن إشارة ${signal.label === 'Drone' ? 'موجة طائرة مسيرة Drone' : signal.label === 'Jamming' ? 'تشويش نشط Jamming' : 'موجة طبيعية Normal'} الممسوحة بتردد ${signal.frequency} MHz في محطة ${signal.station || 'القاهرة'} بقوة ${signal.strength || '—'} dB وبنسبة ثقة ${Math.round(signal.confidence * 100)}%`;
    sessionStorage.setItem('sadar_pending_report', text);
    navigate('/agent');
  };

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Label',
      'Confidence',
      'Frequency (MHz)',
      'SNR (dB)',
      'Strength',
      'Source',
      'Station',
      'Direction',
      'Inference Time (ms)',
      'Model Version',
      'Timestamp',
    ];

    const rows = filteredSignals.map((signal) => [
      signal.id,
      signal.label,
      signal.confidence,
      signal.frequency,
      signal.snr,
      signal.strength,
      signal.source || '',
      signal.station,
      signal.direction || '',
      signal.inference_time_ms,
      signal.model_version,
      new Date(signal.timestamp).toLocaleString('ar-EG'),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `sadar_history_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="history-page grid-pattern">
      <div className="page-header">
        <div className="header-left">
          <h2 className="title-glow">سجل الإشارات المكتشفة</h2>
          <p>استعراض وتحليل إحصائي لكافة الإشارات والنبضات المخزنة في النظام</p>
        </div>
        <button className="export-csv-btn" onClick={exportToCSV}>
          📥 تصدير CSV
        </button>
      </div>

      {/* Filters */}
      <div className="filters-cyber-bar card">
        <div className="filter-group">
          <label>نوع الموجة:</label>
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="filter-select"
          >
            <option value="all">الكل</option>
            {uniqueLabels.map((label) => (
              <option key={label} value={label}>
                {label === 'Drone' ? '🚁 Drone' : label === 'Jamming' ? '📡 Jamming' : '✅ Normal'}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>البحث السريع:</label>
          <input
            type="text"
            placeholder="ابحث عن محطة أو مصدر..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-stats">
          رصد <span className="highlight-text">{filteredSignals.length}</span> موجة في المحطة الحالية
        </div>
      </div>

      {/* Table Workspace */}
      <div className="table-workspace-card card">
        <div className="card-header-cyber">
          <h3>📋 مستودع النبضات</h3>
          <span className="chart-decorator" />
        </div>

        {isLoading ? (
          <div className="loading-placeholder">
            <div className="loading-spinner mx-auto mb-2" />
            جاري استرجاع مستودع الإشارات...
          </div>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')}># {getSortIcon('id')}</th>
                  <th onClick={() => handleSort('label')}>النوع {getSortIcon('label')}</th>
                  <th onClick={() => handleSort('confidence')}>الثقة {getSortIcon('confidence')}</th>
                  <th onClick={() => handleSort('frequency')}>التردد (MHz) {getSortIcon('frequency')}</th>
                  <th onClick={() => handleSort('snr')}>SNR {getSortIcon('snr')}</th>
                  <th onClick={() => handleSort('source')}>المصدر {getSortIcon('source')}</th>
                  <th onClick={() => handleSort('station')}>المحطة {getSortIcon('station')}</th>
                  <th onClick={() => handleSort('direction')}>الاتجاه {getSortIcon('direction')}</th>
                  <th onClick={() => handleSort('timestamp')}>الوقت {getSortIcon('timestamp')}</th>
                  <th>تقرير AI</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSignals.map((signal) => (
                  <tr key={signal.id}>
                    <td className="row-number">{signal.id}</td>
                    <td>
                      <span
                        className="label-badge"
                        style={{
                          background: `${getLabelColor(signal.label)}15`,
                          color: getLabelColor(signal.label),
                          border: `1px solid ${getLabelColor(signal.label)}30`,
                        }}
                      >
                        {signal.label === 'Drone' ? '🚁 Drone' : signal.label === 'Jamming' ? '📡 Jamming' : '✅ Normal'}
                      </span>
                    </td>
                    <td>
                      <span className={`${getConfidenceClass(signal.confidence)} font-bold`}>
                        {formatConfidence(signal.confidence)}
                      </span>
                    </td>
                    <td className="mono font-semibold">{signal.frequency}</td>
                    <td className="font-semibold">{signal.snr}</td>
                    <td className="source-col font-medium">{signal.source || '—'}</td>
                    <td className="font-semibold">{signal.station}</td>
                    <td className="source-col font-medium">{signal.direction || '—'}</td>
                    <td className="time-col">{new Date(signal.timestamp).toLocaleString('ar-EG')}</td>
                    <td>
                      <button
                        onClick={() => handleGenerateReport(signal)}
                        className="action-report-btn"
                        title="إنشاء تقرير حادثة تلقائي عبر المساعد الذكي"
                      >
                        📄 تقرير
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ⟪
            </button>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ‹
            </button>
            <span className="pagination-page-info">
              صفحة {currentPage} من {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              ⟫
            </button>
          </div>
        )}
      </div>

      <style>{`
        .history-page { padding: 0; direction: rtl; }
        
        .page-header {
          display: flex; justify-content: space-between; align-items: flex-start;
          margin-bottom: 28px; border-bottom: 1px solid var(--border-color);
          padding-bottom: 14px; flex-wrap: wrap; gap: 16px;
        }
        .page-header h2 { margin-bottom: 6px; font-size: 1.8rem; font-weight: 800; }
        .title-glow {
          background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
          -webkit-background-clip: text; background-clip: text;
        }
        .page-header p { color: var(--text-secondary); font-size: 14px; font-weight: 500; }

        .export-csv-btn {
          background: linear-gradient(135deg, var(--primary-color, #06b6d4), #0891b2);
          border: none; padding: 8px 20px; border-radius: 12px; font-size: 13px;
          font-weight: 700; color: #ffffff; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.2);
        }
        .export-csv-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(6, 182, 212, 0.35);
        }

        .filters-cyber-bar {
          display: flex; gap: 24px; align-items: flex-end;
          margin-bottom: 28px; flex-wrap: wrap; padding: 18px 24px !important;
        }

        .filter-group { display: flex; flex-direction: column; gap: 8px; }
        .filter-group label { font-size: 12px; font-weight: 700; color: var(--text-secondary); }

        .filter-select, .filter-input {
          padding: 8px 14px; border-radius: 10px; border: 1px solid var(--border-color);
          background: rgba(255,255,255,0.01); color: var(--text-primary);
          min-width: 180px; font-size: 13px; font-weight: 600; outline: none;
          transition: border-color 0.2s ease;
        }
        .filter-select:focus, .filter-input:focus { border-color: var(--primary-color, #06b6d4); }

        .filter-stats {
          margin-right: auto; margin-left: 0; color: var(--text-secondary);
          font-size: 13.5px; font-weight: 600; padding-bottom: 8px;
        }
        .highlight-text { color: var(--primary-color); font-weight: 800; }

        .table-workspace-card { margin-bottom: 28px; }
        .table-responsive-wrapper { overflow-x: auto; }

        .history-table { width: 100%; font-size: 13px; border-collapse: collapse; }
        .history-table th, .history-table td { padding: 12px 14px; text-align: right; white-space: nowrap; }
        
        .history-table th {
          background: rgba(0, 0, 0, 0.05); font-weight: 700; cursor: pointer;
          user-select: none; transition: background 0.2s; border-bottom: 2px solid var(--border-color);
        }
        .history-table th:hover { background: rgba(6, 182, 212, 0.05); color: var(--primary-color); }
        .history-table tr { transition: background-color 0.15s ease; }
        .history-table tr:hover { background: rgba(6, 182, 212, 0.03); }

        .row-number { font-size: 12px; color: var(--text-tertiary); font-weight: 600; }
        .label-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; display: inline-block; }
        .mono { font-family: monospace; color: var(--primary-color); letter-spacing: 0.05em; }
        .source-col { color: var(--text-secondary); }
        .time-col { color: var(--text-tertiary); font-size: 12px; font-weight: 500; }

        .confidence-high { color: var(--normal-color); }
        .confidence-medium { color: var(--warning-color); }
        .confidence-low { color: var(--drone-color); }

        .action-report-btn {
          background: rgba(6, 182, 212, 0.06); border: 1px solid rgba(6, 182, 212, 0.2);
          color: var(--primary-color); padding: 4px 12px; border-radius: 8px;
          font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;
        }
        .action-report-btn:hover {
          background: var(--primary-color); border-color: transparent; color: #ffffff;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
        }

        .pagination-bar {
          display: flex; justify-content: center; align-items: center; gap: 12px;
          padding: 20px; border-top: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.02);
        }

        .pagination-btn {
          background: rgba(255,255,255,0.02); border: 1px solid var(--border-color);
          padding: 6px 12px; border-radius: 8px; cursor: pointer; transition: all 0.2s ease;
          color: var(--text-secondary); font-weight: 600; font-size: 13px;
        }
        .pagination-btn:hover:not(:disabled) {
          background: var(--primary-color); border-color: transparent; color: #ffffff;
          box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
        }
        .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination-page-info { color: var(--text-secondary); font-size: 13px; font-weight: 600; }

        .loading-placeholder { text-align: center; padding: 56px; color: var(--text-secondary); font-weight: 500; }

        @media (max-width: 768px) {
          .filters-cyber-bar { flex-direction: column; align-items: stretch; }
          .filter-stats { margin-right: 0; text-align: center; }
          .filter-select, .filter-input { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default History;