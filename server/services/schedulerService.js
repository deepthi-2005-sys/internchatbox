import crypto from 'crypto';
import { db } from '../db/index.js';
import { getSetting } from './settingsService.js';
import { logActivity } from './activityService.js';
import { sendUpcomingReviewReminder } from './emailService.js';
import { syncGmailSubmissions } from './gmailService.js';

export function calculateNextReviewDate(project, reviewStatus, currentScore) {
  const now = new Date();
  const deadline = new Date(project.deadline);
  const configuredFrequency = project.review_frequency_days || 7;

  let daysToAdd = configuredFrequency;

  if (reviewStatus === 'Needs Improvement') {
    // Critical issues need quicker turnaround
    daysToAdd = Math.max(2, Math.min(3, Math.floor(configuredFrequency / 2)));
  } else if (reviewStatus === 'Ready for Final Review') {
    // Ready for final check-in or presentation
    daysToAdd = Math.max(3, Math.min(5, configuredFrequency));
  } else {
    // In progress
    daysToAdd = configuredFrequency;
  }

  let candidateDate = new Date(now.getTime() + daysToAdd * 86400000);

  // If candidate date exceeds project deadline, set to project deadline
  if (candidateDate > deadline) {
    candidateDate = deadline;
  }

  // Ensure next review date is at least tomorrow
  if (candidateDate <= now) {
    candidateDate = new Date(now.getTime() + 1 * 86400000);
  }

  return candidateDate.toISOString().split('T')[0];
}

export function scheduleNextReview({ internId, projectId, scheduledDate, notes }) {
  // Close any prior pending schedules for this project
  db.prepare(`
    UPDATE review_schedules 
    SET status = 'submitted' 
    WHERE project_id = ? AND status IN ('scheduled', 'reminded')
  `).run(projectId);

  const id = 'sch-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO review_schedules (id, intern_id, project_id, scheduled_date, reminder_sent_at, status, notes, created_at)
    VALUES (?, ?, ?, ?, null, 'scheduled', ?, ?)
  `).run(id, internId, projectId, scheduledDate, notes || 'Scheduled milestone review', now);

  logActivity('scheduler', 'Next Review Scheduled', `Scheduled next milestone check for ${scheduledDate}.`, 'info');

  return db.prepare('SELECT * FROM review_schedules WHERE id = ?').get(id);
}

export async function checkAndSendReminders() {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 3600000).toISOString().split('T')[0];

  const upcomingSchedules = db.prepare(`
    SELECT s.*, p.status as project_status 
    FROM review_schedules s
    JOIN projects p ON s.project_id = p.id
    WHERE s.status = 'scheduled' 
      AND s.scheduled_date <= ?
      AND p.status != 'completed'
  `).all(in48Hours);

  let sentCount = 0;
  for (const sched of upcomingSchedules) {
    try {
      await sendUpcomingReviewReminder(sched.id);
      sentCount++;
    } catch (err) {
      console.error(`Failed to send reminder for schedule ${sched.id}:`, err);
    }
  }

  return {
    checkedAt: now.toISOString(),
    sentCount,
    upcomingCount: upcomingSchedules.length
  };
}

let backgroundTimer = null;

export function startBackgroundWorker(processReviewCallback) {
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
  }

  const runCycle = async () => {
    try {
      const autoSync = getSetting('AUTO_SYNC_ENABLED', 'true') === 'true';
      if (autoSync) {
        await syncGmailSubmissions(processReviewCallback);
      }
      await checkAndSendReminders();
    } catch (err) {
      console.error('Background worker cycle error:', err);
    }
  };

  // Run initial cycle
  setTimeout(runCycle, 5000);

  // Poll every 60 seconds (1 minute interval)
  backgroundTimer = setInterval(runCycle, 60 * 1000);
  console.log('Automated background monitoring loop active (1 minute interval).');
}
