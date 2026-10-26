import React, { useState, useEffect } from 'react';
import { 
  X, Save, RefreshCw, Key, Mail, Sparkles, 
  CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink 
} from 'lucide-react';

export default function SettingsModal({ onClose, onSettingsUpdated }) {
  const [settings, setSettings] = useState({});
  const [gmailStatus, setGmailStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('gmail'); // 'gmail', 'ai', 'email', 'automation'

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings || {});
      setGmailStatus(data.gmailStatus || {});
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      alert('Settings saved successfully!');
      if (onSettingsUpdated) onSettingsUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.open(data.url, 'google_oauth', 'width=600,height=700');
    } catch (err) {
      alert('Could not start Google OAuth: ' + err.message + '\n\nPlease ensure Client ID and Client Secret are saved first.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '680px' }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.8)'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              System Integrations & Settings
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Configure Gmail OAuth, Gemini AI, email delivery transport, and automation schedules.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(0, 0, 0, 0.2)',
          padding: '0 28px'
        }}>
          {[
            { id: 'gmail', label: 'Gmail OAuth' },
            { id: 'ai', label: 'AI Review Engine' },
            { id: 'email', label: 'Email Outbound' },
            { id: 'automation', label: 'Automation & Scheduler' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === t.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: activeTab === t.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
            <p>Loading settings...</p>
          </div>
        ) : (
          <div style={{ padding: '24px 28px' }}>
            
            {/* Tab 1: Gmail OAuth */}
            {activeTab === 'gmail' && (
              <div>
                {/* Mode toggle card */}
                <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>System Operation Mode</strong>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {settings.DEMO_MODE === 'true' ? 'Running in Demo/Sandbox Mode (simulation enabled)' : 'Running in Live Mode with Gmail API connection'}
                      </div>
                    </div>
                    <select
                      className="form-select"
                      style={{ width: '160px' }}
                      value={settings.DEMO_MODE || 'true'}
                      onChange={(e) => handleChange('DEMO_MODE', e.target.value)}
                    >
                      <option value="true">Demo / Sandbox</option>
                      <option value="false">Live Gmail</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Google OAuth Client ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="xxxxxxxxxxxx.apps.googleusercontent.com"
                    value={settings.GMAIL_CLIENT_ID || ''}
                    onChange={(e) => handleChange('GMAIL_CLIENT_ID', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Google OAuth Client Secret</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="GOCSPX-xxxxxxxxxxxxxxxx"
                    value={settings.GMAIL_CLIENT_SECRET || ''}
                    onChange={(e) => handleChange('GMAIL_CLIENT_SECRET', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">OAuth Redirect URI</label>
                  <input
                    type="text"
                    className="form-input"
                    value={settings.GMAIL_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'}
                    onChange={(e) => handleChange('GMAIL_REDIRECT_URI', e.target.value)}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Add this exact redirect URI to your Google Cloud Console OAuth 2.0 Credentials.
                  </span>
                </div>

                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Connection Status</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: gmailStatus?.isConnected ? '#34d399' : '#fbbf24' }}>
                      {gmailStatus?.isConnected ? `Connected: ${gmailStatus.connectedEmail}` : 'Not connected (Demo Mode active)'}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleConnectGoogle}
                  >
                    <ExternalLink size={14} /> Connect Google Account
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: AI Review Engine */}
            {activeTab === 'ai' && (
              <div>
                <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', borderLeft: '4px solid var(--accent-purple)' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Dual-Mode Grounded Evaluation:</strong> The system automatically uses Google Gemini when a key is provided. If no key is set or during network outages, our grounded heuristic evaluator executes with full evidence citations and code diffs so the system always operates without errors.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Gemini API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="AIzaSy..."
                    value={settings.GEMINI_API_KEY || ''}
                    onChange={(e) => handleChange('GEMINI_API_KEY', e.target.value)}
                  />
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Server-side secret. Will never be leaked to client browsers.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Gemini Model</label>
                  <select
                    className="form-select"
                    value={settings.AI_MODEL || 'gemini-1.5-flash'}
                    onChange={(e) => handleChange('AI_MODEL', e.target.value)}
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Ultra-fast & grounded)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep complex code analysis)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Next-gen reasoning)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Tab 3: Email Outbound */}
            {activeTab === 'email' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Email Dispatch Transport</label>
                  <select
                    className="form-select"
                    value={settings.EMAIL_PROVIDER || 'demo'}
                    onChange={(e) => handleChange('EMAIL_PROVIDER', e.target.value)}
                  >
                    <option value="demo">Demo Sandbox (Simulate & log in Outbox)</option>
                    <option value="gmail_oauth">Gmail OAuth Transport</option>
                    <option value="smtp">Custom SMTP / App Password</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Sender Display Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={settings.SENDER_NAME || 'InternTrack AI Supervisor'}
                      onChange={(e) => handleChange('SENDER_NAME', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sender Email Address</label>
                    <input
                      type="email"
                      className="form-input"
                      value={settings.SENDER_EMAIL || 'reviews@interntrack.ai'}
                      onChange={(e) => handleChange('SENDER_EMAIL', e.target.value)}
                    />
                  </div>
                </div>

                {settings.EMAIL_PROVIDER === 'smtp' && (
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">SMTP Host</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="smtp.gmail.com"
                          value={settings.SMTP_HOST || ''}
                          onChange={(e) => handleChange('SMTP_HOST', e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Port</label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="587"
                          value={settings.SMTP_PORT || '587'}
                          onChange={(e) => handleChange('SMTP_PORT', e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">SMTP Username</label>
                        <input
                          type="text"
                          className="form-input"
                          value={settings.SMTP_USER || ''}
                          onChange={(e) => handleChange('SMTP_USER', e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">SMTP Password</label>
                        <input
                          type="password"
                          className="form-input"
                          value={settings.SMTP_PASS || ''}
                          onChange={(e) => handleChange('SMTP_PASS', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Automation & Scheduler */}
            {activeTab === 'automation' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Automated Email Monitoring Poller</label>
                  <select
                    className="form-select"
                    value={settings.AUTO_SYNC_ENABLED || 'true'}
                    onChange={(e) => handleChange('AUTO_SYNC_ENABLED', e.target.value)}
                  >
                    <option value="true">Enabled (Background worker actively polls for submissions)</option>
                    <option value="false">Disabled (Manual trigger only)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Polling Cadence (Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    className="form-input"
                    value={settings.SYNC_INTERVAL_MINUTES || '2'}
                    onChange={(e) => handleChange('SYNC_INTERVAL_MINUTES', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
