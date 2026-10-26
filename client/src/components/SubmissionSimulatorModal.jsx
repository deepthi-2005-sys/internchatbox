import React, { useState } from 'react';
import { 
  Send, Sparkles, CheckCircle, RefreshCw, 
  FileCode, Mail, Calendar, ArrowRight, ShieldCheck 
} from 'lucide-react';

export default function SubmissionSimulatorModal({ interns = [], onClose, onSuccess, onOpenEmailPreview }) {
  const [selectedInternId, setSelectedInternId] = useState(interns[0]?.id || 'int-001');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  
  const [isRunning, setIsRunning] = useState(false);
  const [step, setStep] = useState(0); // 0: idle, 1: receiving, 2: ai review, 3: scheduling, 4: email dispatch, 5: complete
  const [result, setResult] = useState(null);

  const presets = [
    {
      label: 'Sarah Chen: Milestone 3 (WebSocket Resilience)',
      internId: 'int-001',
      subject: 'Milestone 3 Submission — WebSocket Reconnection Backoff & Jest Tests',
      notes: 'Added exponential backoff loop for lost WebSocket telemetry connections. Wrote 4 Jest unit tests for metricAggregator covering NaN payloads and clock-skew timestamps as requested in the previous review.',
      codeSnippet: `// WebSocket Telemetry Client Reconnect
export function connectTelemetry(token, attempt = 0) {
  const ws = new WebSocket('wss://api.cloudmetrics.internal/v1/stream?token=' + token);
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateMetrics(data);
  };
  ws.onclose = () => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    console.info(\`Reconnecting in \${delay}ms (attempt \${attempt + 1})\`);
    setTimeout(() => connectTelemetry(token, attempt + 1), delay);
  };
}`
    },
    {
      label: 'Alex Rivera: Milestone 2 (Idempotency Middleware)',
      internId: 'int-002',
      subject: 'Milestone 2 Submission — Idempotency Key Middleware & Redis Store',
      notes: 'Implemented idempotency middleware storing client tokens in Redis cache with 24h TTL. All checkout API requests with identical Idempotency-Key headers return cached results without double charging.',
      codeSnippet: `// Idempotency Middleware
export async function idempotencyGuard(req, res, next) {
  const key = req.headers['idempotency-key'];
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header is required' });

  const cached = await redis.get(\`idemp:\${key}\`);
  if (cached) {
    return res.status(200).json(JSON.parse(cached));
  }
  res.sendResponse = res.json;
  res.json = (body) => {
    redis.setex(\`idemp:\${key}\`, 86400, JSON.stringify(body));
    res.sendResponse(body);
  };
  next();
}`
    },
    {
      label: 'Maya Patel: Final Capstone (HIPAA AES-GCM)',
      internId: 'int-003',
      subject: 'Capstone Submission — AES-GCM PHI Encryption & Offline Sync Queue',
      notes: 'Final capstone milestone: completed AES-256-GCM encryption for all offline SQLite symptom caches. Background sync queue securely synchronizes on network reconnect with audit trail logging.',
      codeSnippet: `// AES-GCM PHI Encrypted Cache
import crypto from 'crypto';

export function encryptPHI(plaintext, secretKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey, iv);
  let enc = cipher.update(JSON.stringify(plaintext), 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), data: enc, tag: authTag };
}`
    }
  ];

  const applyPreset = (preset) => {
    setSelectedInternId(preset.internId);
    setSubject(preset.subject);
    setNotes(preset.notes);
    setCodeSnippet(preset.codeSnippet);
  };

  const handleSimulate = async () => {
    if (!subject.trim()) {
      alert('Please provide a submission subject line.');
      return;
    }

    try {
      setIsRunning(true);
      setStep(1); // Receiving

      await new Promise(r => setTimeout(r, 600));
      setStep(2); // AI Review

      const res = await fetch('/api/demo/simulate-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internId: selectedInternId,
          subject,
          notes,
          codeSnippet
        })
      });

      setStep(3); // Scheduling
      await new Promise(r => setTimeout(r, 500));

      setStep(4); // Email dispatch
      const data = await res.json();
      await new Promise(r => setTimeout(r, 500));

      if (!res.ok) throw new Error(data.error || 'Simulation failed');

      setStep(5); // Complete
      setResult(data);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.message);
      setStep(0);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '720px' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-simulated">
                Automated Pipeline Sandbox
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              Test Submission & Review Simulator
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Test email receipt, AI grounded review, next milestone scheduling, and email dispatch in real-time.
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          
          {/* Preset Buttons */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Quick Scenario Presets</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => applyPreset(p)}
                  disabled={isRunning}
                  style={{ fontSize: '12px' }}
                >
                  <Sparkles size={12} color="var(--accent-cyan)" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Target Intern</label>
              <select
                className="form-select"
                value={selectedInternId}
                onChange={(e) => setSelectedInternId(e.target.value)}
                disabled={isRunning}
              >
                {interns.map(i => (
                  <option key={i.id} value={i.id}>{i.name} ({i.role})</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Email Submission Subject</label>
              <input
                type="text"
                className="form-input"
                placeholder="[InternTrack] Submission Milestone..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={isRunning}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Submission Notes / Email Body</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '80px' }}
              placeholder="Describe what was built, requirements tackled, and unresolved items fixed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isRunning}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Code Excerpt / Revised Implementation</label>
            <textarea
              className="form-textarea"
              style={{ minHeight: '110px', fontFamily: 'var(--font-mono)', fontSize: '12px', background: '#090d16' }}
              placeholder="// Paste submitted code or test file here..."
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              disabled={isRunning}
            />
          </div>

          {/* Live Pipeline Visualizer */}
          {isRunning && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-medium)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Automated Pipeline Execution
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: step >= 1 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {step > 1 ? <CheckCircle size={16} color="var(--accent-emerald)" /> : <RefreshCw size={16} className="animate-spin" />}
                  <span>1. Detecting and parsing email submission...</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: step >= 2 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {step > 2 ? <CheckCircle size={16} color="var(--accent-emerald)" /> : step === 2 ? <RefreshCw size={16} className="animate-spin" /> : <div style={{ width: 16 }} />}
                  <span>2. Generating grounded AI review & unresolved issue tracking...</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: step >= 3 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {step > 3 ? <CheckCircle size={16} color="var(--accent-emerald)" /> : step === 3 ? <RefreshCw size={16} className="animate-spin" /> : <div style={{ width: 16 }} />}
                  <span>3. Dynamically scheduling next milestone review date...</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: step >= 4 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                  {step > 4 ? <CheckCircle size={16} color="var(--accent-emerald)" /> : step === 4 ? <RefreshCw size={16} className="animate-spin" /> : <div style={{ width: 16 }} />}
                  <span>4. Sending formatted review feedback email to verified intern address...</span>
                </div>
              </div>
            </div>
          )}

          {/* Result Card */}
          {result && !isRunning && (
            <div className="glass-panel" style={{
              padding: '18px 22px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={20} color="var(--accent-emerald)" />
                  <strong style={{ color: '#34d399', fontSize: '15px' }}>
                    Automated Workflow Completed Successfully!
                  </strong>
                </div>
                <span className={`badge ${
                  result.review?.review?.status === 'Ready for Final Review' ? 'badge-ready' : 
                  result.review?.review?.status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                }`}>
                  {result.review?.review?.status} ({result.review?.review?.score}/100)
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 12px 0' }}>
                Next milestone review scheduled for <strong>{result.review?.review?.next_review_date}</strong>. Automated feedback email dispatched to <strong>{result.intern?.email}</strong>.
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                {result.review?.emailLog && (
                  <button 
                    className="btn btn-accent btn-sm"
                    onClick={() => onOpenEmailPreview && onOpenEmailPreview(result.review.emailLog.id)}
                  >
                    <Mail size={13} /> Preview Dispatched Feedback Email
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isRunning}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSimulate}
              disabled={isRunning || !subject.trim()}
            >
              <Send size={15} />
              <span>{isRunning ? 'Processing...' : 'Run Automated Review Pipeline'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
