import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, Clock, AlertTriangle, FileCode, 
  Send, RefreshCw, UploadCloud, ShieldCheck, Mail, Calendar, Paperclip 
} from 'lucide-react';

export default function InternPortalView({ internId, onSelectReview, onSelectEmail }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Submission form state
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState(null);

  const fetchInternData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/interns/${internId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load intern records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (internId) {
      setSubmissionFeedback(null);
      fetchInternData();
    }
  }, [internId]);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      alert('Please enter a submission title/subject.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionFeedback(null);

      const formData = new FormData();
      formData.append('internId', internId);
      formData.append('subject', subject);
      formData.append('notes', notes);
      formData.append('codeSnippet', codeSnippet);

      for (const f of selectedFiles) {
        formData.append('files', f);
      }

      const res = await fetch('/api/submissions/upload', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Submission failed');

      setSubmissionFeedback(result);
      setSubject('');
      setNotes('');
      setCodeSnippet('');
      setSelectedFiles([]);
      await fetchInternData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <p>Loading your project records...</p>
      </div>
    );
  }

  const intern = data?.intern;
  const project = data?.projects?.[0];
  const requirements = project?.requirements ? JSON.parse(project.requirements) : [];
  const submissions = data?.submissions || [];
  const reviews = data?.reviews || [];
  const emails = data?.emails || [];
  const schedules = data?.schedules || [];
  const latestReview = reviews[0];

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      
      {/* Welcome & Role Restriction Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        marginBottom: '24px',
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
        borderLeft: '4px solid var(--accent-cyan)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-inprogress" style={{ fontSize: '11px' }}>
              Intern Self-Service Portal
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Restricted Secure Access
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            Welcome back, {intern?.name}!
          </h1>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {intern?.role} • {intern?.department} • Verified Email: <strong style={{ color: 'var(--accent-cyan)' }}>{intern?.email}</strong>
          </div>
        </div>

        {schedules[0] && (
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '12px 18px',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            textAlign: 'right'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Milestone Due</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              {schedules[0].scheduled_date}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {schedules[0].status === 'reminded' ? 'Reminder email dispatched' : 'Automatic reminder queued'}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Project & Requirements vs Submission Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px', marginBottom: '28px' }}>
        
        {/* Left Column: Project Status & Requirements */}
        <div>
          {project && (
            <div className="glass-panel" style={{ padding: '22px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Current Milestone
                  </span>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {project.title}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {project.current_score}/100
                  </div>
                  <span className={`badge ${
                    project.current_review_status === 'Ready for Final Review' ? 'badge-ready' : 
                    project.current_review_status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                  }`}>
                    {project.current_review_status}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                {project.description}
              </p>

              {/* Requirements Checklist */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Milestone Requirements Checklist
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {requirements.map((req, i) => (
                    <div 
                      key={req.id || i}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>{req.id}</span>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{req.title}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {req.description}
                        </div>
                      </div>

                      <span className={`badge ${req.status === 'completed' ? 'badge-ready' : 'badge-improvement'}`}>
                        {req.status === 'completed' ? 'Satisfied' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Latest Review Feedback Snippet */}
          {latestReview && (
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-purple)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase' }}>
                  Supervisor Feedback Summary
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Evaluated {new Date(latestReview.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {latestReview.summary}
              </p>
              <div style={{ marginTop: '12px', textAlign: 'right' }}>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSelectReview && onSelectReview(latestReview.id)}
                >
                  Inspect Full Grounded Review
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Submit Revision Form */}
        <div>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <UploadCloud size={20} color="var(--accent-cyan)" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Submit Milestone Revision
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Submit code or notes for instant automated AI review & feedback email.
                </div>
              </div>
            </div>

            {submissionFeedback && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '14px',
                marginBottom: '16px',
                color: '#34d399',
                fontSize: '13px'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                  ✓ Milestone Successfully Reviewed!
                </div>
                <div>
                  Score: <strong>{submissionFeedback.review?.score}/100</strong> ({submissionFeedback.review?.status}).
                </div>
                <div>
                  A feedback email was dispatched to <strong>{intern?.email}</strong>. Next review scheduled for: <strong>{submissionFeedback.review?.next_review_date}</strong>.
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Submission Title / Milestone Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Milestone 3 Revision — Unit Tests and Exception Handling"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">What changes or fixes did you implement?</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '90px' }}
                  placeholder="Describe your progress, requirements addressed, or resolved items from earlier feedback..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Code Excerpt / Patch</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '120px', fontFamily: 'var(--font-mono)', fontSize: '12px', background: '#090d16' }}
                  placeholder="// Paste your updated code or test assertions..."
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Attach Project Files / Documentation</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="form-input"
                  style={{ padding: '8px' }}
                  disabled={submitting}
                />
                {selectedFiles.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                    {selectedFiles.length} file(s) selected: {selectedFiles.map(f => f.name).join(', ')}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px' }}
                disabled={submitting}
              >
                <Send size={15} />
                <span>{submitting ? 'Submitting & Evaluating...' : 'Submit Revision for AI Review'}</span>
              </button>
            </form>
          </div>
        </div>

      </div>

      {/* Submission & Email History */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Your Submission & Feedback History
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {submissions.map((sub, idx) => {
            const correspondingReview = reviews.find(r => r.submission_id === sub.id);
            const correspondingEmail = emails.find(e => e.review_id === correspondingReview?.id);

            return (
              <div 
                key={sub.id || idx}
                style={{
                  padding: '14px 18px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                      {sub.subject}
                    </strong>
                    <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                      {sub.source}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    Submitted: {new Date(sub.created_at).toLocaleString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {correspondingReview && (
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${
                        correspondingReview.status === 'Ready for Final Review' ? 'badge-ready' : 
                        correspondingReview.status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                      }`}>
                        {correspondingReview.status} ({correspondingReview.score}/100)
                      </span>
                    </div>
                  )}

                  {correspondingEmail && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectEmail && onSelectEmail(correspondingEmail.id)}
                    >
                      <Mail size={12} /> View Feedback Email
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {submissions.length === 0 && (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
              No submissions recorded yet. Use the form above to submit your first milestone.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
