import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsCards from './components/StatsCards';
import InternsView from './components/InternsView';
import AIReviewStudio from './components/AIReviewStudio';
import EmailOutboxView from './components/EmailOutboxView';
import SchedulerView from './components/SchedulerView';
import InternPortalView from './components/InternPortalView';
import SubmissionSimulatorModal from './components/SubmissionSimulatorModal';
import SettingsModal from './components/SettingsModal';
import ActivityLogDrawer from './components/ActivityLogDrawer';
import EmailPreviewModal from './components/EmailPreviewModal';
import ReviewDetailModal from './components/ReviewDetailModal';
import InternDetailDrawer from './components/InternDetailDrawer';
import { 
  LayoutDashboard, Users, Sparkles, Mail, 
  Calendar, Activity, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Clock, ArrowRight, ShieldCheck 
} from 'lucide-react';

export default function App() {
  const [role, setRole] = useState('supervisor'); // 'supervisor' | 'intern'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'interns' | 'reviews' | 'emails' | 'schedules'
  
  const [stats, setStats] = useState(null);
  const [interns, setInterns] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [emails, setEmails] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [gmailStatus, setGmailStatus] = useState(null);
  const [activeInternId, setActiveInternId] = useState('int-001');

  // Modals
  const [showSimulator, setShowSimulator] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [selectedEmailId, setSelectedEmailId] = useState(null);
  const [selectedInternDetailId, setSelectedInternDetailId] = useState(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchAllData = async () => {
    try {
      const [statsRes, internsRes, reviewsRes, emailsRes, schedulesRes, gmailRes] = await Promise.all([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/interns').then(r => r.json()),
        fetch('/api/reviews').then(r => r.json()),
        fetch('/api/emails').then(r => r.json()),
        fetch('/api/schedules').then(r => r.json()),
        fetch('/api/gmail/status').then(r => r.json())
      ]);

      setStats(statsRes);
      setInterns(internsRes);
      setReviews(reviewsRes);
      setEmails(emailsRes);
      setSchedules(schedulesRes);
      setGmailStatus(gmailRes);

      if (internsRes.length > 0 && !activeInternId) {
        setActiveInternId(internsRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000); // Polling update every 10s
    return () => clearInterval(interval);
  }, []);

  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/gmail/sync', { method: 'POST' });
      const data = await res.json();
      await fetchAllData();
      alert(data.message || 'Gmail sync completed.');
    } catch (err) {
      alert('Gmail sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryEmail = async (emailId) => {
    const res = await fetch(`/api/emails/${emailId}/retry`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to retry email delivery');
    await fetchAllData();
    return data.email;
  };

  const handleReRunReview = async (submissionId) => {
    try {
      const res = await fetch(`/api/reviews/run/${submissionId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-run evaluation failed');
      alert(`Review re-evaluated successfully! New score: ${data.review.score}/100.`);
      await fetchAllData();
      setSelectedReviewId(data.review.id);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        currentRole={role}
        onRoleChange={(newRole) => {
          setRole(newRole);
          if (newRole === 'intern' && interns.length > 0 && !activeInternId) {
            setActiveInternId(interns[0].id);
          }
        }}
        interns={interns}
        activeInternId={activeInternId}
        onSelectIntern={setActiveInternId}
        onOpenSimulator={() => setShowSimulator(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenLogs={() => setShowLogs(true)}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        gmailStatus={gmailStatus}
      />

      {/* Main Body */}
      <main style={{ flex: 1, padding: '28px', maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        
        {/* INTERN PORTAL VIEW */}
        {role === 'intern' ? (
          <InternPortalView
            internId={activeInternId}
            onSelectReview={setSelectedReviewId}
            onSelectEmail={setSelectedEmailId}
          />
        ) : (
          /* SUPERVISOR VIEW */
          <div>
            
            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '10px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '28px',
              paddingBottom: '12px',
              flexWrap: 'wrap'
            }}>
              {[
                { id: 'overview', label: 'Command Center & Analytics', icon: LayoutDashboard },
                { id: 'interns', label: `Intern Directory (${interns.length})`, icon: Users },
                { id: 'reviews', label: `AI Grounded Reviews (${reviews.length})`, icon: Sparkles },
                { id: 'emails', label: `Feedback Outbox (${emails.length})`, icon: Mail },
                { id: 'schedules', label: `Milestone Scheduler (${schedules.length})`, icon: Calendar }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 18px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                      background: isActive ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)' : 'transparent',
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: OVERVIEW & ANALYTICS */}
            {activeTab === 'overview' && (
              <div>
                {/* Key KPIs */}
                <StatsCards stats={stats} onSelectView={setActiveTab} />

                {/* Two-Column Grid: Submissions & Reviews Stream + Unresolved Watchlist */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '28px' }}>
                  
                  {/* Latest AI Reviews Stream */}
                  <div className="glass-panel" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="var(--accent-cyan)" />
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Latest Grounded AI Evaluations
                        </h3>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('reviews')}>
                        View All
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {reviews.slice(0, 4).map(rev => (
                        <div
                          key={rev.id}
                          onClick={() => setSelectedReviewId(rev.id)}
                          style={{
                            padding: '14px 16px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-subtle)',
                            borderLeft: `3px solid ${
                              rev.status === 'Ready for Final Review' ? 'var(--accent-emerald)' : 
                              rev.status === 'Needs Improvement' ? 'var(--accent-rose)' : 'var(--accent-cyan)'
                            }`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                                {rev.intern_name}
                              </strong>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                ({rev.project_title})
                              </span>
                            </div>
                            <span className={`badge ${
                              rev.status === 'Ready for Final Review' ? 'badge-ready' : 
                              rev.status === 'Needs Improvement' ? 'badge-improvement' : 'badge-inprogress'
                            }`} style={{ fontSize: '10.5px' }}>
                              {rev.score}/100 • {rev.status}
                            </span>
                          </div>
                          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rev.summary}
                          </p>
                        </div>
                      ))}

                      {reviews.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No reviews recorded yet.</p>
                      )}
                    </div>
                  </div>

                  {/* Upcoming Milestone Reviews & Automated Reminders */}
                  <div className="glass-panel" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} color="var(--accent-amber)" />
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Upcoming Milestone Reviews
                        </h3>
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('schedules')}>
                        Scheduler
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {schedules.slice(0, 4).map(sch => (
                        <div
                          key={sch.id}
                          style={{
                            padding: '12px 16px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                              {sch.intern_name}
                            </strong>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {sch.project_title}
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                              Due: {sch.scheduled_date}
                            </div>
                            <div style={{ fontSize: '11px', color: sch.status === 'reminded' ? '#34d399' : 'var(--text-muted)' }}>
                              {sch.status === 'reminded' ? '✓ Reminder Sent' : 'Reminder Scheduled'}
                            </div>
                          </div>
                        </div>
                      ))}

                      {schedules.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No upcoming reviews queued.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Email Outbox Quick Stream */}
                <div className="glass-panel" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail size={18} color="var(--accent-emerald)" />
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Recent Automated Feedback Emails
                      </h3>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('emails')}>
                      View Outbox
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {emails.slice(0, 4).map(eml => (
                      <div
                        key={eml.id}
                        onClick={() => setSelectedEmailId(eml.id)}
                        style={{
                          padding: '12px 18px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            {eml.subject}
                          </strong>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Recipient: {eml.to_email} ({eml.intern_name}) • {new Date(eml.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className={`badge ${
                            eml.status === 'SENT' ? 'badge-ready' : 
                            eml.status === 'SIMULATED' ? 'badge-simulated' : 'badge-failed'
                          }`}>
                            {eml.status}
                          </span>
                          <button className="btn btn-secondary btn-sm">
                            Preview Email
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: INTERNS VIEW */}
            {activeTab === 'interns' && (
              <InternsView
                interns={interns}
                onSelectIntern={(id) => setSelectedInternDetailId(id)}
                onInternCreated={fetchAllData}
              />
            )}

            {/* TAB 3: AI REVIEWS STUDIO */}
            {activeTab === 'reviews' && (
              <AIReviewStudio
                reviews={reviews}
                onReRunReview={handleReRunReview}
                onOpenEmailPreview={(id) => setSelectedEmailId(id)}
              />
            )}

            {/* TAB 4: EMAIL OUTBOX */}
            {activeTab === 'emails' && (
              <EmailOutboxView
                emails={emails}
                onRetryEmail={handleRetryEmail}
                onRefresh={fetchAllData}
              />
            )}

            {/* TAB 5: SCHEDULER */}
            {activeTab === 'schedules' && (
              <SchedulerView
                schedules={schedules}
                onCheckReminders={fetchAllData}
                onRefresh={fetchAllData}
              />
            )}

          </div>
        )}

      </main>

      {/* MODALS */}
      {showSimulator && (
        <SubmissionSimulatorModal
          interns={interns}
          onClose={() => setShowSimulator(false)}
          onSuccess={fetchAllData}
          onOpenEmailPreview={(id) => {
            setShowSimulator(false);
            setSelectedEmailId(id);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSettingsUpdated={fetchAllData}
        />
      )}

      {showLogs && (
        <ActivityLogDrawer
          onClose={() => setShowLogs(false)}
        />
      )}

      {selectedReviewId && (
        <ReviewDetailModal
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
          onOpenEmailPreview={(id) => setSelectedEmailId(id)}
          onReRunReview={handleReRunReview}
        />
      )}

      {selectedEmailId && (
        <EmailPreviewModal
          emailId={selectedEmailId}
          onClose={() => setSelectedEmailId(null)}
          onRetryEmail={handleRetryEmail}
        />
      )}

      {selectedInternDetailId && (
        <InternDetailDrawer
          internId={selectedInternDetailId}
          onClose={() => setSelectedInternDetailId(null)}
          onSelectReview={setSelectedReviewId}
          onSelectEmail={setSelectedEmailId}
        />
      )}
    </div>
  );
}
