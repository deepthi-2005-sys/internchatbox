import React, { useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, Send, AlertTriangle, 
  RefreshCw, BellRing, User, ShieldCheck 
} from 'lucide-react';

export default function SchedulerView({ schedules = [], onCheckReminders, onRefresh }) {
  const [checking, setChecking] = useState(false);
  const [resultMsg, setResultMsg] = useState(null);

  const handleRunReminders = async () => {
    try {
      setChecking(true);
      setResultMsg(null);
      const res = await fetch('/api/schedules/check-reminders', { method: 'POST' });
      const data = await res.json();
      setResultMsg(`Automated reminder sweep complete. Sent ${data.result.sentCount} reminder(s) for upcoming milestones.`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to check reminders: ' + err.message);
    } finally {
      setChecking(false);
    }
  };

  const getDaysRemaining = (targetDateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div>
      {/* Policy Explainer */}
      <div className="glass-panel" style={{
        padding: '18px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        borderLeft: '4px solid var(--accent-amber)',
        background: 'rgba(15, 23, 42, 0.7)',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '300px' }}>
          <Clock size={24} color="var(--accent-amber)" />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Dynamic Cadence Engine:</strong> Next review dates are automatically calculated using the intern's progress score and unresolved issue count. Submissions rated <em>Needs Improvement</em> get an accelerated 2-3 day follow-up, while <em>In Progress</em> milestones follow the configured 5-7 day cadence.
          </div>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={handleRunReminders}
          disabled={checking}
        >
          <BellRing size={14} className={checking ? 'animate-spin' : ''} />
          <span>{checking ? 'Checking...' : 'Check & Send Reminders Now'}</span>
        </button>
      </div>

      {resultMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '12px 18px', color: '#34d399', fontSize: '13px', marginBottom: '20px' }}>
          {resultMsg}
        </div>
      )}

      {/* Schedules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {schedules.map(item => {
          const daysLeft = getDaysRemaining(item.scheduled_date);
          const isUrgent = daysLeft <= 2 && daysLeft >= 0;
          const isOverdue = daysLeft < 0;

          return (
            <div
              key={item.id}
              className="glass-panel"
              style={{
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                borderLeft: `4px solid ${
                  isOverdue ? 'var(--accent-rose)' :
                  isUrgent ? 'var(--accent-amber)' : 'var(--accent-cyan)'
                }`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  textAlign: 'center',
                  minWidth: '80px'
                }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {new Date(item.scheduled_date).toLocaleString('default', { month: 'short' })}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {new Date(item.scheduled_date).getDate()}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                      {item.intern_name}
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      ({item.intern_email})
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Project: {item.project_title}
                  </div>
                  {item.notes && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Milestone Notes: {item.notes}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '6px' }}>
                  <span className={`badge ${
                    isOverdue ? 'badge-failed' :
                    isUrgent ? 'badge-improvement' : 'badge-inprogress'
                  }`}>
                    {isOverdue ? `${Math.abs(daysLeft)} days overdue` : 
                     daysLeft === 0 ? 'Due Today' : 
                     daysLeft === 1 ? 'Due Tomorrow' : `${daysLeft} days remaining`}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {item.reminder_sent_at ? (
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      <CheckCircle2 size={13} /> Reminder Dispatched
                    </span>
                  ) : (
                    <span>Reminder auto-scheduled 24h prior</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {schedules.length === 0 && (
          <div className="glass-panel" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p>No active milestone schedules found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
