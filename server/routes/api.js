import express from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { getSetting, getAllSettings, updateSettings, updateSetting } from '../services/settingsService.js';
import { logActivity, getActivityLogs } from '../services/activityService.js';
import { getGmailConnectionStatus, getGoogleAuthUrl, handleGoogleCallback, syncGmailSubmissions, simulateIncomingSubmission } from '../services/gmailService.js';
import { reviewSubmission } from '../services/aiReviewService.js';
import { sendReviewFeedbackEmail, retryEmailDelivery, sendUpcomingReviewReminder } from '../services/emailService.js';
import { calculateNextReviewDate, scheduleNextReview, checkAndSendReminders } from '../services/schedulerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB max

// Pipeline helper: Review submission, schedule next review, and send email feedback
export async function processSubmissionPipeline(submissionId) {
  // Step 1: AI Grounded Review
  const reviewResult = await reviewSubmission(submissionId, calculateNextReviewDate);
  const { review, intern, project } = reviewResult;

  // Step 2: Automatic Next Review Scheduling
  const schedule = scheduleNextReview({
    internId: intern.id,
    projectId: project.id,
    scheduledDate: review.next_review_date,
    notes: `Scheduled following milestone evaluation [${review.status}]. Score: ${review.score}/100.`
  });

  // Step 3: Automatically Send Review Feedback Email
  const emailLog = await sendReviewFeedbackEmail(review.id);

  return {
    review,
    schedule,
    emailLog
  };
}

// 1. Dashboard Stats
router.get('/stats', (req, res) => {
  try {
    const totalInterns = db.prepare('SELECT COUNT(*) as c FROM interns').get().c;
    const submissionsReceived = db.prepare('SELECT COUNT(*) as c FROM submissions').get().c;
    const reviewsCompleted = db.prepare('SELECT COUNT(*) as c FROM reviews').get().c;
    const emailsSent = db.prepare("SELECT COUNT(*) as c FROM email_logs WHERE status = 'SENT'").get().c;
    const emailsSimulated = db.prepare("SELECT COUNT(*) as c FROM email_logs WHERE status = 'SIMULATED'").get().c;
    const emailsFailed = db.prepare("SELECT COUNT(*) as c FROM email_logs WHERE status = 'FAILED'").get().c;
    const upcomingReviews = db.prepare("SELECT COUNT(*) as c FROM review_schedules WHERE status IN ('scheduled', 'reminded')").get().c;
    const projectsInProgress = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'in_progress'").get().c;
    const projectsCompleted = db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'completed'").get().c;
    const isDemo = getSetting('DEMO_MODE', 'true') === 'true';

    res.json({
      totalInterns,
      submissionsReceived,
      reviewsCompleted,
      emailsSent: isDemo ? emailsSimulated : emailsSent,
      emailsSentLive: emailsSent,
      emailsSimulated,
      emailsFailed,
      upcomingReviews,
      projectsInProgress,
      projectsCompleted,
      isDemoMode: isDemo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Interns List & Creation
router.get('/interns', (req, res) => {
  try {
    const interns = db.prepare(`
      SELECT i.*, 
        p.id as project_id, p.title as project_title, p.status as project_status, 
        p.current_score, p.current_review_status, p.deadline as project_deadline,
        (SELECT COUNT(*) FROM submissions WHERE intern_id = i.id) as submission_count,
        (SELECT COUNT(*) FROM reviews WHERE intern_id = i.id) as review_count,
        (SELECT scheduled_date FROM review_schedules WHERE intern_id = i.id AND status IN ('scheduled', 'reminded') ORDER BY scheduled_date ASC LIMIT 1) as next_review_date
      FROM interns i
      LEFT JOIN projects p ON p.intern_id = i.id AND p.status != 'completed'
      ORDER BY i.created_at DESC
    `).all();

    res.json(interns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/interns', (req, res) => {
  try {
    const { name, email, role, department, projectTitle, projectDescription, requirements = [], deadline, reviewFrequencyDays = 7 } = req.body;
    if (!name || !email || !projectTitle) {
      return res.status(400).json({ error: 'Name, email, and project title are required.' });
    }

    const existing = db.prepare('SELECT id FROM interns WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      return res.status(400).json({ error: 'An intern with this email already exists.' });
    }

    const internId = 'int-' + crypto.randomUUID().slice(0, 8);
    const projectId = 'proj-' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();
    const colors = ['#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#f59e0b', '#06b6d4'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const formattedReqs = requirements.length > 0 ? requirements : [
      { id: 'REQ-1', title: 'Core Functionality Implementation', category: 'Functional', description: 'Implement primary user-facing features according to spec.', status: 'pending' },
      { id: 'REQ-2', title: 'Error Handling & Edge Cases', category: 'Quality', description: 'Validate input and gracefully handle failure conditions.', status: 'pending' },
      { id: 'REQ-3', title: 'Documentation & Test Suite', category: 'Testing', description: 'Include architectural readme and automated tests.', status: 'pending' }
    ];

    const projDeadline = deadline || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    db.transaction(() => {
      db.prepare(`
        INSERT INTO interns (id, name, email, role, department, avatar_color, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(internId, name.trim(), email.toLowerCase().trim(), role || 'Software Engineering Intern', department || 'Engineering', avatarColor, now);

      db.prepare(`
        INSERT INTO projects (id, intern_id, title, description, requirements, deadline, review_frequency_days, status, current_score, current_review_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'in_progress', 0, 'In Progress', ?)
      `).run(projectId, internId, projectTitle.trim(), projectDescription || '', JSON.stringify(formattedReqs), projDeadline, parseInt(reviewFrequencyDays, 10), now);

      // Create initial schedule
      const firstReviewDate = calculateNextReviewDate({ deadline: projDeadline, review_frequency_days: reviewFrequencyDays }, 'In Progress', 0);
      scheduleNextReview({ internId, projectId, scheduledDate: firstReviewDate, notes: 'Initial project milestone kickoff.' });
    })();

    logActivity('config', 'New Intern Enrolled', `Registered intern ${name} (${email}) for project "${projectTitle}".`, 'success');

    const created = db.prepare('SELECT * FROM interns WHERE id = ?').get(internId);
    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/interns/:id', (req, res) => {
  try {
    const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(req.params.id);
    if (!intern) return res.status(404).json({ error: 'Intern not found.' });

    const projects = db.prepare('SELECT * FROM projects WHERE intern_id = ? ORDER BY created_at DESC').all(intern.id);
    const submissions = db.prepare(`
      SELECT s.*, 
        (SELECT COUNT(*) FROM attachments WHERE submission_id = s.id) as attachment_count
      FROM submissions s 
      WHERE s.intern_id = ? 
      ORDER BY s.created_at DESC
    `).all(intern.id);

    const reviews = db.prepare('SELECT * FROM reviews WHERE intern_id = ? ORDER BY created_at DESC').all(intern.id);
    const schedules = db.prepare('SELECT * FROM review_schedules WHERE intern_id = ? ORDER BY scheduled_date DESC').all(intern.id);
    const emails = db.prepare('SELECT id, to_email, subject, status, sent_at, retry_count, created_at FROM email_logs WHERE intern_id = ? ORDER BY created_at DESC').all(intern.id);

    res.json({
      intern,
      projects,
      submissions,
      reviews,
      schedules,
      emails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Projects
router.get('/projects', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, i.name as intern_name, i.email as intern_email
      FROM projects p
      JOIN interns i ON p.intern_id = i.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id', (req, res) => {
  try {
    const { title, description, requirements, deadline, review_frequency_days, status } = req.body;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    db.prepare(`
      UPDATE projects 
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          requirements = COALESCE(?, requirements),
          deadline = COALESCE(?, deadline),
          review_frequency_days = COALESCE(?, review_frequency_days),
          status = COALESCE(?, status)
      WHERE id = ?
    `).run(
      title,
      description,
      requirements ? (typeof requirements === 'string' ? requirements : JSON.stringify(requirements)) : null,
      deadline,
      review_frequency_days ? parseInt(review_frequency_days, 10) : null,
      status,
      req.params.id
    );

    logActivity('config', 'Project Updated', `Updated settings/requirements for project "${project.title}".`, 'info');
    res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Submissions & Web Upload
router.get('/submissions', (req, res) => {
  try {
    const submissions = db.prepare(`
      SELECT s.*, i.name as intern_name, i.email as intern_email, p.title as project_title,
        (SELECT COUNT(*) FROM attachments WHERE submission_id = s.id) as attachment_count,
        (SELECT id FROM reviews WHERE submission_id = s.id LIMIT 1) as review_id,
        (SELECT score FROM reviews WHERE submission_id = s.id LIMIT 1) as review_score,
        (SELECT status FROM reviews WHERE submission_id = s.id LIMIT 1) as review_status
      FROM submissions s
      JOIN interns i ON s.intern_id = i.id
      JOIN projects p ON s.project_id = p.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/submissions/:id', (req, res) => {
  try {
    const submission = db.prepare(`
      SELECT s.*, i.name as intern_name, i.email as intern_email, p.title as project_title
      FROM submissions s
      JOIN interns i ON s.intern_id = i.id
      JOIN projects p ON s.project_id = p.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!submission) return res.status(404).json({ error: 'Submission not found.' });

    const attachments = db.prepare('SELECT * FROM attachments WHERE submission_id = ?').all(submission.id);
    const review = db.prepare('SELECT * FROM reviews WHERE submission_id = ?').get(submission.id);

    res.json({
      submission,
      attachments,
      review
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/submissions/upload', upload.array('files', 5), async (req, res) => {
  try {
    const { internId, subject, notes, codeSnippet } = req.body;
    if (!internId || !subject) {
      return res.status(400).json({ error: 'Intern ID and Subject are required.' });
    }

    const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(internId);
    if (!intern) return res.status(404).json({ error: 'Intern not found.' });

    const project = db.prepare("SELECT * FROM projects WHERE intern_id = ? AND status != 'completed' ORDER BY created_at DESC LIMIT 1").get(internId);
    if (!project) return res.status(400).json({ error: 'No active project found for this intern.' });

    // Duplicate check
    const contentHash = crypto.createHash('sha256').update(`${intern.id}:${subject}:${notes || ''}:${codeSnippet || ''}`).digest('hex');
    const existing = db.prepare('SELECT id FROM submissions WHERE submission_hash = ?').get(contentHash);
    if (existing) {
      return res.status(400).json({ error: 'Duplicate submission: identical content has already been submitted.' });
    }

    const submissionId = 'sub-' + crypto.randomUUID().slice(0, 8);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO submissions (id, intern_id, project_id, source, gmail_message_id, gmail_thread_id, subject, submission_notes, code_snippet, submission_hash, created_at, status)
      VALUES (?, ?, ?, 'web_upload', null, null, ?, ?, ?, ?, ?, 'received')
    `).run(submissionId, intern.id, project.id, subject.trim(), notes || '', codeSnippet || '', contentHash, now);

    // Attach uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const attId = 'att-' + crypto.randomUUID().slice(0, 8);
        let snippet = '';
        if (file.mimetype.includes('text') || file.originalname.match(/\.(js|ts|py|html|css|json|md|txt)$/i)) {
          try {
            snippet = fs.readFileSync(file.path, 'utf-8').slice(0, 1500);
          } catch (e) {}
        }

        db.prepare(`
          INSERT INTO attachments (id, submission_id, file_name, file_path, file_size, mime_type, content_snippet, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(attId, submissionId, file.originalname, `/uploads/${file.filename}`, file.size, file.mimetype, snippet, now);
      }
    }

    logActivity('submission', 'Web Portal Submission Received', `Received project submission from ${intern.name} via Web Portal.`, 'success');

    // Run pipeline automatically
    const pipelineResult = await processSubmissionPipeline(submissionId);

    res.json({
      success: true,
      submissionId,
      ...pipelineResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Reviews
router.get('/reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, i.name as intern_name, i.email as intern_email, p.title as project_title,
        s.subject as submission_subject
      FROM reviews r
      JOIN interns i ON r.intern_id = i.id
      JOIN projects p ON r.project_id = p.id
      JOIN submissions s ON r.submission_id = s.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reviews/:id', (req, res) => {
  try {
    const review = db.prepare(`
      SELECT r.*, i.name as intern_name, i.email as intern_email, p.title as project_title, p.description as project_description,
        s.subject as submission_subject, s.submission_notes, s.code_snippet
      FROM reviews r
      JOIN interns i ON r.intern_id = i.id
      JOIN projects p ON r.project_id = p.id
      JOIN submissions s ON r.submission_id = s.id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!review) return res.status(404).json({ error: 'Review not found.' });

    const attachments = db.prepare('SELECT * FROM attachments WHERE submission_id = ?').all(review.submission_id);
    const emails = db.prepare('SELECT * FROM email_logs WHERE review_id = ? ORDER BY created_at DESC').all(review.id);

    res.json({
      review,
      attachments,
      emails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reviews/run/:submissionId', async (req, res) => {
  try {
    const pipelineResult = await processSubmissionPipeline(req.params.submissionId);
    res.json({ success: true, ...pipelineResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Emails Outbox & Retry
router.get('/emails', (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT e.*, i.name as intern_name, p.title as project_title
      FROM email_logs e
      JOIN interns i ON e.intern_id = i.id
      JOIN projects p ON e.project_id = p.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE e.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY e.created_at DESC`;

    const emails = db.prepare(query).all(...params);
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/emails/:id/preview', (req, res) => {
  try {
    const email = db.prepare('SELECT * FROM email_logs WHERE id = ?').get(req.params.id);
    if (!email) return res.status(404).json({ error: 'Email record not found.' });
    res.json(email);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/emails/:id/retry', async (req, res) => {
  try {
    const updated = await retryEmailDelivery(req.params.id);
    res.json({ success: true, email: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Review Schedules
router.get('/schedules', (req, res) => {
  try {
    const schedules = db.prepare(`
      SELECT s.*, i.name as intern_name, i.email as intern_email, p.title as project_title
      FROM review_schedules s
      JOIN interns i ON s.intern_id = i.id
      JOIN projects p ON s.project_id = p.id
      ORDER BY s.scheduled_date ASC
    `).all();
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schedules/check-reminders', async (req, res) => {
  try {
    const result = await checkAndSendReminders();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Activity Logs
router.get('/activities', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    res.json(getActivityLogs(limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. System Settings & Configuration
router.get('/settings', (req, res) => {
  try {
    const settings = getAllSettings(true);
    const gmailStatus = getGmailConnectionStatus();
    res.json({ settings, gmailStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', (req, res) => {
  try {
    updateSettings(req.body);
    logActivity('config', 'System Settings Updated', 'Supervisor updated server configuration.', 'info');
    res.json({ success: true, settings: getAllSettings(true) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Gmail OAuth & Sync
router.get('/gmail/status', (req, res) => {
  try {
    res.json(getGmailConnectionStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/auth/google/url', (req, res) => {
  try {
    const url = getGoogleAuthUrl();
    res.json({ url });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error('Authorization code missing.');

    const result = await handleGoogleCallback(code);
    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #fff;">
          <h2 style="color: #38bdf8;">Google Account Connected!</h2>
          <p>Connected account: <strong>${result.email || 'Verified'}</strong></p>
          <p>You can close this tab and return to InternTrack AI.</p>
          <script>
            window.opener && window.opener.postMessage({ type: 'GMAIL_CONNECTED' }, '*');
            setTimeout(() => window.close(), 2500);
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #ef4444;">
          <h2>Connection Error</h2>
          <p>${err.message}</p>
        </body>
      </html>
    `);
  }
});

router.post('/gmail/sync', async (req, res) => {
  try {
    const result = await syncGmailSubmissions(processSubmissionPipeline);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. One-Click Demo Mode Submission Simulator
router.post('/demo/simulate-submission', async (req, res) => {
  try {
    const { internId, subject, notes, codeSnippet } = req.body;
    const targetInternId = internId || 'int-001';

    const testSubject = subject || `Milestone Submission: Dynamic Filtering & Test Suite`;
    const testNotes = notes || `Implemented dynamic date-range filtering, fixed metric aggregation calculations, and added Jest unit tests. Addressed previous comments regarding error recovery.`;
    const testCode = codeSnippet || `// Metric Pipeline Update
import { calculateAverages } from './stats';

export function processTelemetryStream(payload) {
  if (!payload || !Array.isArray(payload.data)) {
    throw new Error('Invalid telemetry payload format');
  }
  return calculateAverages(payload.data.filter(d => !isNaN(d.value)));
}`;

    const simResult = await simulateIncomingSubmission({
      internId: targetInternId,
      subject: testSubject,
      notes: testNotes,
      codeSnippet: testCode,
      files: [
        { name: 'MetricStreamFilter.js', content: testCode, mimetype: 'application/javascript', size: 1240 }
      ]
    }, processSubmissionPipeline);

    res.json({
      success: true,
      message: 'Simulated submission processed, AI review generated, and feedback email dispatched!',
      ...simResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
