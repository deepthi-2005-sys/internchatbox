import React from 'react';
import { 
  CheckCircle, AlertCircle, Clock, Send, Users, 
  FileText, ArrowUpRight, ShieldCheck, Mail, Sparkles 
} from 'lucide-react';

export default function StatsCards({ stats, onSelectView }) {
  if (!stats) return null;

  const cards = [
    {
      title: 'Registered Interns',
      value: stats.totalInterns,
      icon: Users,
      color: 'var(--accent-indigo)',
      sub: `${stats.projectsInProgress} active projects`,
      view: 'interns'
    },
    {
      title: 'Submissions Received',
      value: stats.submissionsReceived,
      icon: FileText,
      color: 'var(--accent-cyan)',
      sub: 'Email & portal submissions',
      view: 'submissions'
    },
    {
      title: 'AI Reviews Completed',
      value: stats.reviewsCompleted,
      icon: Sparkles,
      color: 'var(--accent-purple)',
      sub: 'Grounded evidence-backed',
      view: 'reviews'
    },
    {
      title: 'Feedback Emails',
      value: stats.isDemoMode ? stats.emailsSimulated : stats.emailsSentLive,
      icon: Send,
      color: 'var(--accent-emerald)',
      sub: stats.isDemoMode ? `${stats.emailsSimulated} simulated in sandbox` : `${stats.emailsSentLive} confirmed live sent`,
      view: 'emails'
    },
    {
      title: 'Failed Deliveries',
      value: stats.emailsFailed,
      icon: AlertCircle,
      color: stats.emailsFailed > 0 ? 'var(--accent-rose)' : 'var(--text-muted)',
      sub: stats.emailsFailed > 0 ? 'Retry required' : '0 errors logged',
      alert: stats.emailsFailed > 0,
      view: 'emails'
    },
    {
      title: 'Upcoming Reviews',
      value: stats.upcomingReviews,
      icon: Clock,
      color: 'var(--accent-amber)',
      sub: 'Automated reminders queued',
      view: 'schedules'
    },
    {
      title: 'Projects In Progress',
      value: stats.projectsInProgress,
      icon: ArrowUpRight,
      color: 'var(--accent-cyan)',
      sub: 'Actively tracking milestones',
      view: 'interns'
    },
    {
      title: 'Final Sign-offs Ready',
      value: stats.projectsCompleted,
      icon: ShieldCheck,
      color: 'var(--accent-emerald)',
      sub: 'Milestones completed',
      view: 'interns'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '16px',
      marginBottom: '28px'
    }}>
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div 
            key={i}
            className="glass-panel"
            onClick={() => onSelectView && onSelectView(c.view)}
            style={{
              padding: '18px 20px',
              cursor: 'pointer',
              borderLeft: `4px solid ${c.color}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {c.title}
              </span>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `rgba(255, 255, 255, 0.05)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: c.color
              }}>
                <Icon size={18} />
              </div>
            </div>

            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              {c.value}
            </div>

            <div style={{ fontSize: '12px', color: c.alert ? '#fca5a5' : 'var(--text-muted)', marginTop: '4px' }}>
              {c.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
