import React, { useState } from 'react';
import { 
  Mail, Search, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, ShieldCheck, Clock, ExternalLink 
} from 'lucide-react';
import EmailPreviewModal from './EmailPreviewModal';

export default function EmailOutboxView({ emails = [], onRetryEmail, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewEmailId, setPreviewEmailId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  const filteredEmails = emails.filter(e => {
    const matchesSearch = e.to_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.intern_name && e.intern_name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && e.status === statusFilter;
  });

  const handleRetry = async (id, e) => {
    e.stopPropagation();
    try {
      setRetryingId(id);
      if (onRetryEmail) {
        await onRetryEmail(id);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div>
      {/* Verification Rule Alert Banner */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        borderLeft: '4px solid var(--accent-cyan)',
        background: 'rgba(15, 23, 42, 0.7)'
      }}>
        <ShieldCheck size={22} color="var(--accent-cyan)" />
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Strict Email Delivery Guarantee:</strong> All automated review emails are dispatched only to the intern’s verified registered email address. In Live Mode, an email is marked as <strong style={{ color: '#34d399' }}>SENT</strong> only upon cryptographic verification from Google/SMTP providers. In Demo Mode, emails are safely logged as <strong style={{ color: '#c084fc' }}>SIMULATED</strong> with identical formatting.
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search outbox by recipient, subject, or intern..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'SENT', label: 'Confirmed Sent' },
              { id: 'SIMULATED', label: 'Sandbox' },
              { id: 'FAILED', label: 'Failed' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === tab.id ? 'var(--accent-cyan)' : 'transparent',
                  color: statusFilter === tab.id ? '#0f172a' : 'var(--text-secondary)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
          <RefreshCw size={14} /> Refresh Outbox
        </button>
      </div>

      {/* Outbox Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={{ padding: '12px 18px' }}>Recipient & Intern</th>
              <th style={{ padding: '12px 18px' }}>Subject</th>
              <th style={{ padding: '12px 18px' }}>Type</th>
              <th style={{ padding: '12px 18px' }}>Delivery Status</th>
              <th style={{ padding: '12px 18px' }}>Timestamp</th>
              <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmails.map(eml => (
              <tr 
                key={eml.id} 
                onClick={() => setPreviewEmailId(eml.id)}
                style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 18px' }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block' }}>
                    {eml.intern_name || 'Intern'}
                  </strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {eml.to_email}
                  </span>
                </td>

                <td style={{ padding: '14px 18px', maxWidth: '320px' }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {eml.subject}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {eml.project_title}
                  </span>
                </td>

                <td style={{ padding: '14px 18px' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                    {eml.type === 'review_feedback' ? 'Review Feedback' : 'Milestone Reminder'}
                  </span>
                </td>

                <td style={{ padding: '14px 18px' }}>
                  <span className={`badge ${
                    eml.status === 'SENT' ? 'badge-ready' : 
                    eml.status === 'SIMULATED' ? 'badge-simulated' : 'badge-failed'
                  }`}>
                    {eml.status === 'SENT' ? 'Confirmed Sent' : 
                     eml.status === 'SIMULATED' ? 'Simulated Sandbox' : 'Delivery Failed'}
                  </span>
                  {eml.retry_count > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                      (Retries: {eml.retry_count})
                    </span>
                  )}
                </td>

                <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {eml.sent_at ? new Date(eml.sent_at).toLocaleString() : 'Pending'}
                </td>

                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '8px' }}>
                    {eml.status === 'FAILED' && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={(e) => handleRetry(eml.id, e)}
                        disabled={retryingId === eml.id}
                      >
                        <RefreshCw size={12} className={retryingId === eml.id ? 'animate-spin' : ''} />
                        Retry
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); setPreviewEmailId(eml.id); }}
                    >
                      <ExternalLink size={12} /> Preview
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredEmails.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No emails match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview Modal */}
      {previewEmailId && (
        <EmailPreviewModal
          emailId={previewEmailId}
          onClose={() => setPreviewEmailId(null)}
          onRetryEmail={onRetryEmail}
        />
      )}
    </div>
  );
}
