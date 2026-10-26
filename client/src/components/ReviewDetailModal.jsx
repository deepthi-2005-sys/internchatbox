import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, Sparkles, Mail, 
  Calendar, ArrowRight, ShieldCheck, RefreshCw, FileCode 
} from 'lucide-react';

export default function ReviewDetailModal({ reviewId, onClose, onOpenEmailPreview, onReRunReview }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reviews/${reviewId}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to load review details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reviewId) fetchDetail();
  }, [reviewId]);

  if (!reviewId) return null;

  const review = data?.review;
  const strengths = review?.strengths ? JSON.parse(review.strengths) : [];
  const issues = review?.issues ? JSON.parse(review.issues) : [];
  const suggestions = review?.actionable_suggestions ? JSON.parse(review.actionable_suggestions) : [];
  const unresolvedTracked = review?.unresolved_issues_tracked ? JSON.parse(review.unresolved_issues_tracked) : [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '800px' }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.7)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-simulated" style={{ fontSize: '10.5px' }}>
                Review ID: {review?.id}
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                Model: {review?.ai_model}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
              Grounded AI Review: {review?.project_title}
            </h2>
            <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Intern: {review?.intern_name} ({review?.intern_email}) • Evaluated {review?.created_at ? new Date(review.created_at).toLocaleString() : ''}
            </div>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
            <p>Loading evaluation records...</p>
          </div>
        ) : (
          <div style={{ padding: '28px' }}>
            
            {/* Score & Status Banner */}
            <div className="glass-panel" style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
              borderLeft: `4px solid ${
                review.status === 'Ready for Final Review' ? 'var(--accent-emerald)' : 
                review.status === 'Needs Improvement' ? 'var(--accent-rose)' : 'var(--accent-cyan)'
              }`
            }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Milestone Evaluation
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)' }}>
                    {review.score}<span style={{ fontSize: '18px', color: 'var(--text-muted)' }}>/100</span>
                  </span>
                  <span className={`badge ${
                    review.status === 'Ready for Final Review' ? 'badge-ready' : 
                    review.status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                  }`} style={{ fontSize: '13px', padding: '6px 14px' }}>
                    {review.status}
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Next Review Due</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {review.next_review_date}
                </div>
                {data?.emails?.[0] && (
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onOpenEmailPreview && onOpenEmailPreview(data.emails[0].id)}
                    style={{ marginTop: '6px' }}
                  >
                    <Mail size={13} /> View Feedback Email
                  </button>
                )}
              </div>
            </div>

            {/* Executive Summary */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Executive Review Summary
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                {review.summary}
              </p>
            </div>

            {/* Strengths & Citations */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} /> Strengths & Completed Requirements
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {strengths.map((s, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '12px 16px', borderLeft: '3px solid var(--accent-emerald)' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{s.title}</strong>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 6px 0' }}>{s.detail}</p>
                    <div style={{ fontSize: '11.5px', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                      Evidence: {s.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Identified Deficiencies & Specific Corrections */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-rose)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} /> Identified Mistakes & Concrete Corrections
              </h3>
              {issues.length === 0 ? (
                <p style={{ color: 'var(--accent-emerald)', fontSize: '13px', fontStyle: 'italic' }}>
                  No deficiencies or missing requirements identified.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {issues.map((iss, idx) => (
                    <div key={iss.id || idx} className="glass-panel" style={{ padding: '14px 18px', borderLeft: `3px solid ${iss.severity === 'High' ? 'var(--accent-rose)' : 'var(--accent-amber)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {iss.id} — {iss.title}
                        </strong>
                        <span className={`badge ${iss.severity === 'High' ? 'badge-failed' : 'badge-improvement'}`} style={{ fontSize: '10.5px' }}>
                          {iss.severity} Priority
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 6px 0' }}>{iss.detail}</p>
                      
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '4px', marginBottom: '8px' }}>
                        <strong>Grounded Evidence:</strong> {iss.evidence}
                      </div>

                      {iss.correction && (
                        <div>
                          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                            Actionable Code Correction:
                          </div>
                          <pre style={{
                            background: '#090d16',
                            color: '#e2e8f0',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontFamily: 'var(--font-mono)',
                            overflowX: 'auto',
                            margin: 0,
                            border: '1px solid var(--border-subtle)'
                          }}>
                            {iss.correction}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unresolved Issues Tracking */}
            {unresolvedTracked.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} /> Unresolved Issues History Tracking
                </h3>
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: '10px 14px' }}>Issue ID & Title</th>
                        <th style={{ padding: '10px 14px' }}>Status</th>
                        <th style={{ padding: '10px 14px' }}>Audit Evaluation Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unresolvedTracked.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {item.title}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span className={`badge ${item.current_status === 'RESOLVED' ? 'badge-ready' : 'badge-failed'}`}>
                              {item.current_status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            {item.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actionable Suggestions */}
            {suggestions.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Actionable Recommendations
                </h3>
                <ul style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => onReRunReview && onReRunReview(review.submission_id)}
              >
                <RefreshCw size={14} /> Re-evaluate Submission
              </button>
              <button className="btn btn-primary" onClick={onClose}>
                Close
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
