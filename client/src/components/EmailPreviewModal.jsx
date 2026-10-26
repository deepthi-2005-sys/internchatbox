import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Send, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function EmailPreviewModal({ emailId, onClose, onRetryEmail }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchEmail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/emails/${emailId}/preview`);
      const data = await res.json();
      setEmail(data);
    } catch (err) {
      console.error('Failed to load email preview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emailId) fetchEmail();
  }, [emailId]);

  if (!emailId) return null;

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      if (onRetryEmail) {
        await onRetryEmail(emailId);
        await fetchEmail();
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '780px', height: '90vh', display: 'flex', flexDirection: 'column' }}
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`badge ${
                email?.status === 'SENT' ? 'badge-ready' : 
                email?.status === 'SIMULATED' ? 'badge-simulated' : 'badge-failed'
              }`}>
                {email?.status === 'SENT' ? 'Confirmed Sent (Live Provider)' : 
                 email?.status === 'SIMULATED' ? 'Sandbox Simulation' : 'Delivery Failed'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Retry Count: {email?.retry_count || 0}
              </span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              {email?.subject || 'Email Preview'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              To: <strong>{email?.to_email}</strong> • Sent: {email?.sent_at ? new Date(email.sent_at).toLocaleString() : 'Pending'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {email?.status === 'FAILED' && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
                <span>{isRetrying ? 'Retrying...' : 'Safe Retry'}</span>
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Diagnostic info if failed */}
        {email?.error_message && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#fca5a5' }}>
            <ShieldAlert size={16} />
            <div>
              <strong>Delivery Failure Diagnostic:</strong> {email.error_message}
            </div>
          </div>
        )}

        {/* Email Body Iframe / Container */}
        <div style={{ flex: 1, background: '#ffffff', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <p>Rendering email...</p>
            </div>
          ) : (
            <iframe
              title="Email Feedback Preview"
              srcDoc={email?.html_content || '<p>No content</p>'}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#ffffff'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
