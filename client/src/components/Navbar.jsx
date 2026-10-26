import React, { useState } from 'react';
import { 
  Sparkles, RefreshCw, Send, Settings, User, 
  Activity, Shield, CheckCircle2, AlertTriangle, Layers
} from 'lucide-react';

export default function Navbar({ 
  currentRole, 
  onRoleChange, 
  interns = [], 
  activeInternId, 
  onSelectIntern, 
  onOpenSimulator, 
  onOpenSettings, 
  onOpenLogs, 
  isSyncing, 
  onTriggerSync, 
  gmailStatus 
}) {
  return (
    <header style={{
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0284c7 0%, #6366f1 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(56, 189, 248, 0.35)',
          color: '#ffffff'
        }}>
          <Sparkles size={22} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontFamily: 'var(--font-heading)', 
              fontSize: '18px', 
              fontWeight: 800, 
              letterSpacing: '-0.3px', 
              color: 'var(--text-primary)' 
            }}>
              InternTrack <span style={{ color: 'var(--accent-cyan)' }}>AI</span>
            </span>
            <span style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              textTransform: 'uppercase'
            }}>
              Automated Review System
            </span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Gmail OAuth Detection • Grounded AI Reviews • Automated Feedback Emails
          </div>
        </div>
      </div>

      {/* Middle: System Integration Status Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div 
          onClick={onOpenSettings}
          title="Click to configure Gmail OAuth and AI engine"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: gmailStatus?.isDemo ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${gmailStatus?.isDemo ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: gmailStatus?.isDemo ? '#f59e0b' : '#10b981',
            boxShadow: `0 0 8px ${gmailStatus?.isDemo ? '#f59e0b' : '#10b981'}`
          }} />
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: gmailStatus?.isDemo ? '#fbbf24' : '#34d399'
          }}>
            {gmailStatus?.isDemo ? 'Demo Mode (Sandbox Active)' : `Gmail Connected (${gmailStatus?.connectedEmail || 'Live'})`}
          </span>
        </div>

        {/* Sync Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onTriggerSync}
          disabled={isSyncing}
          title="Poll Gmail for new intern submissions"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? 'Polling...' : 'Sync Gmail'}</span>
        </button>

        {/* Simulator Button */}
        <button
          className="btn btn-accent btn-sm"
          onClick={onOpenSimulator}
          title="Simulate incoming intern submission and test AI review & feedback email"
        >
          <Send size={14} />
          <span>Test Simulator</span>
        </button>
      </div>

      {/* Right: Role Switcher & Settings */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Role toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => onRoleChange('supervisor')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: currentRole === 'supervisor' ? 'var(--accent-indigo)' : 'transparent',
              color: currentRole === 'supervisor' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Supervisor View
          </button>
          <button
            onClick={() => onRoleChange('intern')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              background: currentRole === 'intern' ? 'var(--accent-cyan)' : 'transparent',
              color: currentRole === 'intern' ? '#0f172a' : 'var(--text-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            Intern Portal
          </button>
        </div>

        {/* If intern view, select which intern is logged in */}
        {currentRole === 'intern' && (
          <select
            className="form-select"
            value={activeInternId}
            onChange={(e) => onSelectIntern(e.target.value)}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              width: '180px',
              background: '#1e293b'
            }}
          >
            {interns.map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        )}

        {/* Activity Logs trigger */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenLogs}
          title="Supervisor Activity Audit Trail"
        >
          <Activity size={15} />
          <span>Audit Log</span>
        </button>

        {/* Settings button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={onOpenSettings}
          title="Configure Google OAuth, Gemini API, and SMTP"
        >
          <Settings size={15} />
        </button>

      </div>
    </header>
  );
}
