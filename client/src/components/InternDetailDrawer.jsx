import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, Clock, AlertTriangle, FileCode, Mail, 
  Sparkles, Calendar, ArrowRight, Shield, RefreshCw, Send, Paperclip
} from 'lucide-react';

export default function InternDetailDrawer({ internId, onClose, onSelectReview, onSelectEmail, onTriggerPipeline }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requirements'); // 'requirements', 'submissions', 'reviews', 'emails'

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/interns/${internId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load intern details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (internId) fetchDetail();
  }, [internId]);

  if (!internId) return null;

  const intern = data?.intern;
  const project = data?.projects?.[0];
  const requirements = project?.requirements ? JSON.parse(project.requirements) : [];
  const submissions = data?.submissions || [];
  const reviews = data?.reviews || [];
  const emails = data?.emails || [];
  const schedules = data?.schedules || [];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ padding: '0', justifyContent: 'flex-end' }}>
      <div 
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '750px',
          height: '100vh',
          borderRadius: '16px 0 0 16px',
          background: '#0d1322',
          borderLeft: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: intern?.avatar_color || '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '20px',
              fontWeight: 800
            }}>
              {intern?.name?.charAt(0) || 'I'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {intern?.name || 'Loading...'}
                </h2>
                <span className="badge badge-inprogress">
                  {intern?.department}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {intern?.email} • {intern?.role}
              </div>
            </div>
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p>Loading intern records...</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            
            {/* Project Overview Card */}
            {project && (
              <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', borderLeft: '4px solid var(--accent-cyan)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Assigned Project
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {project.title}
                    </h3>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
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

                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
                  {project.description}
                </p>

                <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div>
                    <strong>Target Deadline:</strong> {project.deadline}
                  </div>
                  <div>
                    <strong>Review Frequency:</strong> Every {project.review_frequency_days} days
                  </div>
                  <div>
                    <strong>Next Scheduled:</strong> {schedules[0]?.scheduled_date || 'None'}
                  </div>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              paddingBottom: '8px'
            }}>
              {[
                { id: 'requirements', label: `Requirements (${requirements.length})` },
                { id: 'submissions', label: `Submissions (${submissions.length})` },
                { id: 'reviews', label: `AI Reviews (${reviews.length})` },
                { id: 'emails', label: `Feedback Outbox (${emails.length})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    background: activeTab === t.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: activeTab === t.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    border: activeTab === t.id ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Requirements Checklist */}
            {activeTab === 'requirements' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {requirements.map((req, idx) => (
                  <div 
                    key={req.id || idx}
                    className="glass-panel"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '14px',
                      borderLeft: `3px solid ${req.status === 'completed' ? 'var(--accent-emerald)' : 'var(--accent-amber)'}`
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {req.id}
                        </span>
                        <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                          {req.title}
                        </strong>
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          {req.category}
                        </span>
                      </div>
                      <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                        {req.description}
                      </p>
                    </div>

                    <span className={`badge ${req.status === 'completed' ? 'badge-ready' : 'badge-improvement'}`} style={{ whiteSpace: 'nowrap' }}>
                      {req.status === 'completed' ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Submissions */}
            {activeTab === 'submissions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {submissions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>No submissions recorded yet.</p>
                ) : (
                  submissions.map(sub => (
                    <div key={sub.id} className="glass-panel" style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                            {sub.source === 'gmail' ? 'Via Gmail API' : sub.source === 'web_upload' ? 'Via Portal' : 'Simulated Sandbox'}
                          </span>
                          <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {sub.subject}
                          </h4>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(sub.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {sub.submission_notes && (
                        <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', marginBottom: '8px' }}>
                          {sub.submission_notes}
                        </p>
                      )}

                      {sub.code_snippet && (
                        <pre style={{
                          background: '#090d16',
                          color: '#38bdf8',
                          padding: '10px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontFamily: 'var(--font-mono)',
                          overflowX: 'auto',
                          marginBottom: '8px'
                        }}>
                          {sub.code_snippet.slice(0, 300)}...
                        </pre>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <div>
                          <Paperclip size={13} style={{ display: 'inline', marginRight: '4px' }} />
                          {sub.attachment_count || 0} attachment(s)
                        </div>
                        <span className={`badge ${sub.status === 'reviewed' ? 'badge-ready' : 'badge-inprogress'}`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Reviews */}
            {activeTab === 'reviews' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {reviews.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>No reviews completed yet.</p>
                ) : (
                  reviews.map(rev => (
                    <div 
                      key={rev.id} 
                      className="glass-panel"
                      onClick={() => onSelectReview && onSelectReview(rev.id)}
                      style={{ padding: '18px', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                            {rev.score}/100
                          </span>
                          <span className={`badge ${
                            rev.status === 'Ready for Final Review' ? 'badge-ready' : 
                            rev.status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                          }`}>
                            {rev.status}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                        {rev.summary}
                      </p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '12px', color: 'var(--accent-cyan)' }}>
                        <span>Next Milestone: {rev.next_review_date}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          Inspect Grounded Review <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Emails */}
            {activeTab === 'emails' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {emails.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>No emails sent to this intern yet.</p>
                ) : (
                  emails.map(eml => (
                    <div 
                      key={eml.id} 
                      className="glass-panel"
                      onClick={() => onSelectEmail && onSelectEmail(eml.id)}
                      style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <Mail size={14} color="var(--accent-cyan)" />
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            {eml.subject}
                          </strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Sent to: {eml.to_email} • {new Date(eml.created_at).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`badge ${
                          eml.status === 'SENT' ? 'badge-ready' : 
                          eml.status === 'SIMULATED' ? 'badge-simulated' : 'badge-failed'
                        }`}>
                          {eml.status}
                        </span>
                        <button className="btn btn-secondary btn-sm">
                          Preview
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
