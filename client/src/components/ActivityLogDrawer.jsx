import React, { useState, useEffect } from 'react';
import { 
  X, Activity, RefreshCw, CheckCircle, AlertTriangle, 
  Info, Filter, Clock, ShieldCheck 
} from 'lucide-react';

export default function ActivityLogDrawer({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/activities?limit=100');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (filterCategory === 'all') return true;
    return l.category === filterCategory;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ padding: 0, justifyContent: 'flex-end' }}>
      <div 
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '640px',
          height: '100vh',
          borderRadius: '16px 0 0 16px',
          background: '#0d1322',
          borderLeft: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--accent-cyan)" />
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Supervisor Activity Audit Trail
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Real-time log of automated Gmail monitoring, AI reviews, and email dispatches.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchLogs} title="Refresh Logs">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '6px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'all', label: 'All Events' },
            { id: 'gmail_sync', label: 'Gmail Sync' },
            { id: 'submission', label: 'Submissions' },
            { id: 'ai_review', label: 'AI Review' },
            { id: 'email_send', label: 'Email Outbox' },
            { id: 'scheduler', label: 'Scheduler' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterCategory(f.id)}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: filterCategory === f.id ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.05)',
                color: filterCategory === f.id ? '#0f172a' : 'var(--text-secondary)',
                whiteSpace: 'nowrap'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Logs Timeline */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
              <p>Fetching audit trail...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLogs.map(log => {
                const isError = log.level === 'error';
                const isSuccess = log.level === 'success';
                const isWarning = log.level === 'warning';

                return (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: `3px solid ${
                        isError ? 'var(--accent-rose)' :
                        isWarning ? 'var(--accent-amber)' :
                        isSuccess ? 'var(--accent-emerald)' : 'var(--accent-cyan)'
                      }`,
                      borderRadius: '6px',
                      fontSize: '12.5px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
                          {log.category.replace('_', ' ')}
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {log.action}
                        </strong>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {log.details}
                    </div>
                  </div>
                );
              })}

              {filteredLogs.length === 0 && (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                  No activity events found in this category.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
