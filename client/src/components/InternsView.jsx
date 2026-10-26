import React, { useState } from 'react';
import { 
  Plus, Search, UserPlus, Calendar, CheckCircle2, 
  Clock, ArrowRight, Shield, Layers, Sparkles 
} from 'lucide-react';

export default function InternsView({ interns = [], onSelectIntern, onInternCreated }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Full Stack Engineering Intern',
    department: 'Core Engineering',
    projectTitle: '',
    projectDescription: '',
    deadline: '',
    reviewFrequencyDays: 7
  });

  const [customReqs, setCustomReqs] = useState([
    { id: 'REQ-1', title: 'Core Functionality Implementation', category: 'Functional', description: 'Implement primary user-facing features according to spec.' },
    { id: 'REQ-2', title: 'Error Handling & Edge Cases', category: 'Quality', description: 'Validate input and gracefully handle failure conditions.' },
    { id: 'REQ-3', title: 'Unit Tests & Documentation', category: 'Testing', description: 'Include architectural readme and automated tests.' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredInterns = interns.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (i.project_title && i.project_title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && i.current_review_status === statusFilter;
  });

  const handleAddRequirement = () => {
    const nextIdx = customReqs.length + 1;
    setCustomReqs([
      ...customReqs,
      { id: `REQ-${nextIdx}`, title: '', category: 'Functional', description: '' }
    ]);
  };

  const handleUpdateReq = (idx, field, val) => {
    const copy = [...customReqs];
    copy[idx][field] = val;
    setCustomReqs(copy);
  };

  const handleRemoveReq = (idx) => {
    setCustomReqs(customReqs.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.projectTitle) {
      alert('Please fill out Name, Email, and Project Title.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/interns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requirements: customReqs.filter(r => r.title.trim())
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register intern');
      }

      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        role: 'Full Stack Engineering Intern',
        department: 'Core Engineering',
        projectTitle: '',
        projectDescription: '',
        deadline: '',
        reviewFrequencyDays: 7
      });
      if (onInternCreated) onInternCreated();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Top Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search interns by name, email, or project..."
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
            <option value="In Progress">In Progress</option>
            <option value="Needs Improvement">Needs Improvement</option>
            <option value="Ready for Final Review">Ready for Final Review</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={16} />
          <span>Register New Intern</span>
        </button>
      </div>

      {/* Interns Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {filteredInterns.map(intern => (
          <div
            key={intern.id}
            className="glass-panel"
            onClick={() => onSelectIntern(intern.id)}
            style={{
              padding: '20px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              borderTop: `4px solid ${intern.avatar_color || '#3b82f6'}`
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: intern.avatar_color || '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '18px'
                }}>
                  {intern.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {intern.name}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {intern.email}
                  </div>
                </div>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '14px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Project
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
                  {intern.project_title || 'No active project'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Role: {intern.role} • {intern.department}
                </div>
              </div>

              {/* Progress & Status */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Readiness Score</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {intern.current_score || 0}/100
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '9999px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min(100, intern.current_score || 0)}%`,
                    height: '100%',
                    background: intern.current_score >= 85 ? 'var(--accent-emerald)' : 
                                intern.current_score < 60 ? 'var(--accent-rose)' : 'var(--accent-cyan)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            </div>

            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '12px'
              }}>
                <span className={`badge ${
                  intern.current_review_status === 'Ready for Final Review' ? 'badge-ready' : 
                  intern.current_review_status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                }`}>
                  {intern.current_review_status || 'In Progress'}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  <span>{intern.submission_count || 0} Submissions</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Register Intern Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Register New Intern & Project
              </h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Intern Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Liam Anderson"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Verified Email *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="liam.anderson@example.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Backend Systems Intern"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Platform Engineering"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Project Title *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Distributed Rate Limiter & Token Bucket API"
                  value={formData.projectTitle}
                  onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project Scope & Description</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Summarize the core engineering objectives..."
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Target Completion Deadline</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Review Cadence (Days)</label>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    className="form-input"
                    value={formData.reviewFrequencyDays}
                    onChange={(e) => setFormData({ ...formData, reviewFrequencyDays: e.target.value })}
                  />
                </div>
              </div>

              {/* Requirements Builder */}
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Project Requirements Checklist</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddRequirement}>
                    <Plus size={14} /> Add Requirement
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                  {customReqs.map((req, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Requirement title"
                        value={req.title}
                        onChange={(e) => handleUpdateReq(idx, 'title', e.target.value)}
                        style={{ flex: 2, padding: '6px 10px', fontSize: '12px' }}
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Description"
                        value={req.description}
                        onChange={(e) => handleUpdateReq(idx, 'description', e.target.value)}
                        style={{ flex: 3, padding: '6px 10px', fontSize: '12px' }}
                      />
                      {customReqs.length > 1 && (
                        <button type="button" onClick={() => handleRemoveReq(idx)} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Register Intern & Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
