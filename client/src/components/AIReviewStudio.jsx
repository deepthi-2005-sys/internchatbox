import React, { useState } from 'react';
import { 
  Sparkles, Search, ArrowRight, ShieldCheck, 
  AlertCircle, CheckCircle, Mail, Calendar, RefreshCw 
} from 'lucide-react';
import ReviewDetailModal from './ReviewDetailModal';

export default function AIReviewStudio({ reviews = [], onReRunReview, onOpenEmailPreview }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReviewId, setSelectedReviewId] = useState(null);

  const filteredReviews = reviews.filter(r => {
    const matchesSearch = r.intern_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.summary.toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && r.status === statusFilter;
  });

  return (
    <div>
      {/* Search and Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search reviews by intern, project, or review findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">All Statuses</option>
            <option value="Ready for Final Review">Ready for Final Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Needs Improvement">Needs Improvement</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredReviews.length}</strong> evaluations
        </div>
      </div>

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredReviews.map(rev => (
          <div
            key={rev.id}
            className="glass-panel"
            onClick={() => setSelectedReviewId(rev.id)}
            style={{
              padding: '20px 24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              transition: 'all 0.2s ease',
              borderLeft: `4px solid ${
                rev.status === 'Ready for Final Review' ? 'var(--accent-emerald)' :
                rev.status === 'Needs Improvement' ? 'var(--accent-rose)' : 'var(--accent-cyan)'
              }`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {rev.intern_name}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {rev.intern_email}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                    {rev.ai_model}
                  </span>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {rev.project_title}
                </h3>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-heading)' }}>
                    {rev.score}<span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/100</span>
                  </span>
                  <span className={`badge ${
                    rev.status === 'Ready for Final Review' ? 'badge-ready' :
                    rev.status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                  }`}>
                    {rev.status}
                  </span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {new Date(rev.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Summary preview */}
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {rev.summary}
            </p>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '10px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '12px',
              color: 'var(--text-muted)'
            }}>
              <div>
                <Calendar size={13} style={{ display: 'inline', marginRight: '5px' }} />
                Next Review Scheduled: <strong style={{ color: 'var(--text-primary)' }}>{rev.next_review_date}</strong>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                <span>Inspect Evidence & Corrections</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        ))}

        {filteredReviews.length === 0 && (
          <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Sparkles size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p>No evaluations found matching the search criteria.</p>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedReviewId && (
        <ReviewDetailModal
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
          onOpenEmailPreview={onOpenEmailPreview}
          onReRunReview={onReRunReview}
        />
      )}
    </div>
  );
}
