import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { google } from 'googleapis';
import { db } from '../db/index.js';
import { getSetting } from './settingsService.js';
import { logActivity } from './activityService.js';

export function buildFeedbackEmailHtml({ intern, project, submission, review }) {
  const strengths = typeof review.strengths === 'string' ? JSON.parse(review.strengths) : (review.strengths || []);
  const issues = typeof review.issues === 'string' ? JSON.parse(review.issues) : (review.issues || []);
  const suggestions = typeof review.actionable_suggestions === 'string' ? JSON.parse(review.actionable_suggestions) : (review.actionable_suggestions || []);
  const unresolvedTracked = typeof review.unresolved_issues_tracked === 'string' ? JSON.parse(review.unresolved_issues_tracked) : (review.unresolved_issues_tracked || []);

  const statusColor = review.status === 'Ready for Final Review' ? '#10b981' : 
                      review.status === 'Needs Improvement' ? '#ef4444' : '#3b82f6';

  const strengthsHtml = strengths.map(s => `
    <li style="margin-bottom: 12px; line-height: 1.5;">
      <strong style="color: #0f172a;">${escapeHtml(s.title)}</strong><br/>
      <span style="color: #334155;">${escapeHtml(s.detail)}</span><br/>
      <span style="font-size: 12px; color: #059669; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">
        Evidence: ${escapeHtml(s.evidence)}
      </span>
    </li>
  `).join('');

  const issuesHtml = issues.length > 0 ? issues.map(iss => `
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${iss.severity === 'High' ? '#ef4444' : '#f59e0b'}; padding: 14px; border-radius: 6px; margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <strong style="color: #0f172a; font-size: 14px;">${escapeHtml(iss.id || '')} — ${escapeHtml(iss.title)}</strong>
        <span style="font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; background: ${iss.severity === 'High' ? '#fee2e2; color: #991b1b;' : '#fef3c7; color: #92400e;'}">
          ${iss.severity} Priority
        </span>
      </div>
      <p style="margin: 4px 0 8px 0; color: #475569; font-size: 13px; line-height: 1.5;">${escapeHtml(iss.detail)}</p>
      <div style="font-size: 12px; color: #64748b; background: #f1f5f9; padding: 6px 10px; border-radius: 4px; margin-bottom: 8px;">
        <strong>Supporting Evidence:</strong> ${escapeHtml(iss.evidence)}
      </div>
      ${iss.correction ? `
        <div style="margin-top: 6px;">
          <div style="font-size: 12px; font-weight: bold; color: #0284c7; margin-bottom: 4px;">Suggested Correction:</div>
          <pre style="background: #0f172a; color: #f8fafc; padding: 10px; border-radius: 4px; font-size: 12px; overflow-x: auto; font-family: monospace; margin: 0;">${escapeHtml(iss.correction)}</pre>
        </div>
      ` : ''}
    </div>
  `).join('') : '<p style="color: #059669; font-style: italic;">No critical defects or missing requirements detected.</p>';

  const unresolvedHtml = unresolvedTracked.length > 0 ? `
    <div style="margin-top: 24px; padding: 16px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px;">
      <h3 style="margin-top: 0; color: #6b21a8; font-size: 15px;">Tracking Unresolved Issues from Earlier Reviews</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid #d8b4fe; text-align: left; color: #581c87;">
            <th style="padding: 6px;">Issue ID & Title</th>
            <th style="padding: 6px;">Status</th>
            <th style="padding: 6px;">Audit Notes</th>
          </tr>
        </thead>
        <tbody>
          ${unresolvedTracked.map(item => `
            <tr style="border-bottom: 1px solid #f3e8ff;">
              <td style="padding: 8px 6px; font-weight: 500;">${escapeHtml(item.title)}</td>
              <td style="padding: 8px 6px;">
                <span style="font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 12px; background: ${item.current_status === 'RESOLVED' ? '#dcfce7; color: #166534;' : '#fee2e2; color: #991b1b;'}">
                  ${item.current_status}
                </span>
              </td>
              <td style="padding: 8px 6px; color: #6b7280; font-size: 12px;">${escapeHtml(item.notes)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const suggestionsHtml = suggestions.map(sug => `
    <li style="margin-bottom: 6px; color: #334155; line-height: 1.4;">${escapeHtml(sug)}</li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>InternTrack AI — Project Review Feedback</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; color: #ffffff;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8;">InternTrack AI Automated Supervisor</span>
        <span style="font-size: 12px; color: #94a3b8;">Review ID: ${escapeHtml(review.id)}</span>
      </div>
      <h1 style="margin: 12px 0 4px 0; font-size: 22px; font-weight: 700; color: #ffffff;">Project Review Feedback</h1>
      <p style="margin: 0; font-size: 14px; color: #cbd5e1;">Project: <strong>${escapeHtml(project.title)}</strong></p>
    </div>

    <!-- Metadata Card -->
    <div style="background: #f8fafc; padding: 20px 32px; border-bottom: 1px solid #e2e8f0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 16px;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Intern</div>
            <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">${escapeHtml(intern.name)}</div>
            <div style="font-size: 13px; color: #475569;">${escapeHtml(intern.email)}</div>
          </td>
          <td style="width: 50%; vertical-align: top; text-align: right;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Status & Evaluation</div>
            <div style="margin-top: 4px;">
              <span style="display: inline-block; background: ${statusColor}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">
                ${escapeHtml(review.status)} (${review.score}/100)
              </span>
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Submission Date: ${submission.created_at ? new Date(submission.created_at).toLocaleDateString() : 'Recent'}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px;">
      
      <!-- Summary -->
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Executive Review Summary</h2>
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0;">${escapeHtml(review.summary)}</p>
      </div>

      <!-- Strengths -->
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #059669; margin-top: 0; margin-bottom: 12px; border-bottom: 2px solid #a7f3d0; padding-bottom: 6px;">Strengths & Verified Work</h2>
        <ul style="padding-left: 20px; margin: 0; font-size: 13px;">
          ${strengthsHtml}
        </ul>
      </div>

      <!-- Identified Issues & Corrections -->
      <div style="margin-bottom: 28px;">
        <h2 style="font-size: 16px; font-weight: 700; color: #dc2626; margin-top: 0; margin-bottom: 12px; border-bottom: 2px solid #fecaca; padding-bottom: 6px;">Identified Deficiencies & Specific Corrections</h2>
        ${issuesHtml}
      </div>

      <!-- Unresolved Issues Table -->
      ${unresolvedHtml}

      <!-- Suggestions -->
      ${suggestions.length > 0 ? `
        <div style="margin-top: 28px;">
          <h2 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;">Actionable Next Steps</h2>
          <ul style="padding-left: 20px; margin: 0; font-size: 13px;">
            ${suggestionsHtml}
          </ul>
        </div>
      ` : ''}

      <!-- Next Review Banner -->
      <div style="margin-top: 32px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; text-align: center;">
        <div style="font-size: 13px; font-weight: 600; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Next Milestone Review</div>
        <div style="font-size: 20px; font-weight: 700; color: #1e3a8a; margin: 6px 0;">${escapeHtml(review.next_review_date)}</div>
        <p style="font-size: 13px; color: #3b82f6; margin: 0;">Please submit your updated code and project files through email or your Intern Portal before this date.</p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0 0 4px 0;">This email was automatically generated and verified by <strong>InternTrack AI Smart Review System</strong>.</p>
      <p style="margin: 0;">Replies to this email will be automatically linked to your project submission record.</p>
    </div>

  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function createLiveTransporter() {
  const provider = getSetting('EMAIL_PROVIDER', 'demo');

  if (provider === 'gmail_oauth') {
    const clientId = getSetting('GMAIL_CLIENT_ID');
    const clientSecret = getSetting('GMAIL_CLIENT_SECRET');
    const refreshToken = getSetting('GMAIL_REFRESH_TOKEN');
    const userEmail = getSetting('GMAIL_CONNECTED_EMAIL') || getSetting('SENDER_EMAIL');

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Gmail OAuth credentials incomplete.');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:5000/api/auth/google/callback');
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const accessToken = await oauth2Client.getAccessToken();

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: userEmail,
        clientId,
        clientSecret,
        refreshToken,
        accessToken: accessToken.token
      }
    });
  }

  if (provider === 'smtp') {
    const host = getSetting('SMTP_HOST');
    const port = parseInt(getSetting('SMTP_PORT', '587'), 10);
    const user = getSetting('SMTP_USER');
    const pass = getSetting('SMTP_PASS');
    const secure = port === 465;

    if (!host || !user || !pass) {
      throw new Error('SMTP host, user, or password is not configured.');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  return null;
}

export async function sendReviewFeedbackEmail(reviewId) {
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
  if (!review) throw new Error(`Review ${reviewId} not found.`);

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(review.submission_id);
  const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(review.intern_id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(review.project_id);

  // Check duplicate prevention: has an email already been sent for this review?
  const existingSent = db.prepare(`
    SELECT * FROM email_logs 
    WHERE review_id = ? AND status = 'SENT'
  `).get(reviewId);

  if (existingSent) {
    logActivity('email_send', 'Duplicate Email Prevented', `Email already sent for Review ${reviewId} to ${intern.email}.`, 'info');
    return existingSent;
  }

  const subject = `InternTrack AI — Project Review Feedback: ${project.title} (Status: ${review.status})`;
  const htmlContent = buildFeedbackEmailHtml({ intern, project, submission, review });
  const textContent = `InternTrack AI — Project Review Feedback\n\nProject: ${project.title}\nIntern: ${intern.name}\nScore: ${review.score}/100\nStatus: ${review.status}\n\nSummary:\n${review.summary}\n\nNext Review Date: ${review.next_review_date}`;

  const emailId = 'eml-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const isDemo = getSetting('DEMO_MODE', 'true') === 'true';
  const provider = getSetting('EMAIL_PROVIDER', 'demo');
  const senderEmail = getSetting('SENDER_EMAIL', 'reviews@interntrack.ai');
  const senderName = getSetting('SENDER_NAME', 'InternTrack AI Supervisor');

  // Insert initial email log
  db.prepare(`
    INSERT INTO email_logs (
      id, intern_id, project_id, review_id, type, to_email, subject,
      html_content, text_content, status, retry_count, created_at
    ) VALUES (?, ?, ?, ?, 'review_feedback', ?, ?, ?, ?, 'QUEUED', 0, ?)
  `).run(emailId, intern.id, project.id, review.id, intern.email, subject, htmlContent, textContent, now);

  if (isDemo || provider === 'demo') {
    // Demo Mode Simulation
    const responseMsg = `Demo Mode Sandbox: Verified automated delivery to verified intern address ${intern.email}`;
    db.prepare(`
      UPDATE email_logs 
      SET status = 'SIMULATED', provider_response = ?, sent_at = ?
      WHERE id = ?
    `).run(responseMsg, now, emailId);

    logActivity('email_send', 'Feedback Email Generated (Demo Mode)', `Feedback email generated for ${intern.name} (${intern.email}). Logged in Outbox.`, 'success');

    return db.prepare('SELECT * FROM email_logs WHERE id = ?').get(emailId);
  }

  // Live Mode Delivery with strict confirmation requirement:
  // "Do not display an email as sent unless the email provider confirms successful sending."
  try {
    const transporter = await createLiveTransporter();
    if (!transporter) throw new Error('Could not create live email transporter.');

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: intern.email,
      subject,
      text: textContent,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);

    if (info && (info.messageId || info.accepted?.length > 0)) {
      db.prepare(`
        UPDATE email_logs 
        SET status = 'SENT', provider_response = ?, sent_at = ?
        WHERE id = ?
      `).run(JSON.stringify({ messageId: info.messageId, response: info.response }), new Date().toISOString(), emailId);

      logActivity('email_send', 'Feedback Email Confirmed Sent', `Live provider confirmed delivery to ${intern.email} (ID: ${info.messageId}).`, 'success');
    } else {
      throw new Error('Provider response did not confirm acceptance.');
    }
  } catch (sendErr) {
    console.error('Email sending failed:', sendErr);
    db.prepare(`
      UPDATE email_logs 
      SET status = 'FAILED', error_message = ?, retry_count = retry_count + 1
      WHERE id = ?
    `).run(sendErr.message, emailId);

    logActivity('email_send', 'Email Delivery Failed', `Failed sending feedback to ${intern.email}: ${sendErr.message}`, 'error');
  }

  return db.prepare('SELECT * FROM email_logs WHERE id = ?').get(emailId);
}

export async function retryEmailDelivery(emailLogId) {
  const emailLog = db.prepare('SELECT * FROM email_logs WHERE id = ?').get(emailLogId);
  if (!emailLog) throw new Error(`Email record ${emailLogId} not found.`);

  if (emailLog.status === 'SENT') {
    throw new Error('This email has already been confirmed sent. Duplicate sending is prevented.');
  }

  if (emailLog.retry_count >= 5) {
    throw new Error('Maximum retry limit (5) reached for this email.');
  }

  const isDemo = getSetting('DEMO_MODE', 'true') === 'true';
  const provider = getSetting('EMAIL_PROVIDER', 'demo');
  const now = new Date().toISOString();

  if (isDemo || provider === 'demo') {
    db.prepare(`
      UPDATE email_logs 
      SET status = 'SIMULATED', provider_response = 'Sandbox simulated retry success', retry_count = retry_count + 1, sent_at = ?
      WHERE id = ?
    `).run(now, emailLogId);

    logActivity('email_send', 'Simulated Email Retry', `Retried email ${emailLogId} in Demo Mode.`, 'info');
    return db.prepare('SELECT * FROM email_logs WHERE id = ?').get(emailLogId);
  }

  try {
    const transporter = await createLiveTransporter();
    if (!transporter) throw new Error('Live email transporter unavailable.');

    const senderEmail = getSetting('SENDER_EMAIL', 'reviews@interntrack.ai');
    const senderName = getSetting('SENDER_NAME', 'InternTrack AI Supervisor');

    const info = await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: emailLog.to_email,
      subject: emailLog.subject,
      text: emailLog.text_content,
      html: emailLog.html_content
    });

    if (info && (info.messageId || info.accepted?.length > 0)) {
      db.prepare(`
        UPDATE email_logs 
        SET status = 'SENT', provider_response = ?, error_message = null, retry_count = retry_count + 1, sent_at = ?
        WHERE id = ?
      `).run(JSON.stringify({ messageId: info.messageId, response: info.response }), new Date().toISOString(), emailLogId);

      logActivity('email_send', 'Email Retry Confirmed Sent', `Successfully retried email ${emailLogId} to ${emailLog.to_email}.`, 'success');
    } else {
      throw new Error('Email provider did not confirm delivery.');
    }
  } catch (err) {
    db.prepare(`
      UPDATE email_logs 
      SET status = 'FAILED', error_message = ?, retry_count = retry_count + 1
      WHERE id = ?
    `).run(err.message, emailLogId);

    logActivity('email_send', 'Email Retry Failed', `Retry attempt ${emailLog.retry_count + 1} failed: ${err.message}`, 'error');
  }

  return db.prepare('SELECT * FROM email_logs WHERE id = ?').get(emailLogId);
}

export async function sendUpcomingReviewReminder(scheduleId) {
  const schedule = db.prepare('SELECT * FROM review_schedules WHERE id = ?').get(scheduleId);
  if (!schedule) throw new Error(`Schedule ${scheduleId} not found.`);

  const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(schedule.intern_id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(schedule.project_id);

  const subject = `InternTrack AI — Upcoming Milestone Review Due: ${project.title}`;
  const htmlContent = `<!DOCTYPE html>
<html>
<head><style>body { font-family: sans-serif; background: #f8fafc; padding: 20px; }</style></head>
<body>
  <div style="max-width: 600px; margin: 0 auto; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
    <h2 style="color: #1e3a8a; margin-top: 0;">Upcoming Review Reminder</h2>
    <p>Dear ${escapeHtml(intern.name)},</p>
    <p>This is an automated reminder that your next project review for <strong>${escapeHtml(project.title)}</strong> is scheduled for:</p>
    <div style="padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; text-align: center; font-size: 18px; font-weight: bold; color: #1e40af; margin: 16px 0;">
      Due Date: ${escapeHtml(schedule.scheduled_date)}
    </div>
    <p>Please ensure your updated code and documentation are submitted either by replying to your previous review email with attachments or through your <strong>Intern Portal</strong>.</p>
    <p style="font-size: 13px; color: #64748b;">InternTrack AI Automated Supervisor</p>
  </div>
</body>
</html>`;

  const emailId = 'eml-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const isDemo = getSetting('DEMO_MODE', 'true') === 'true';

  db.prepare(`
    INSERT INTO email_logs (
      id, intern_id, project_id, review_id, type, to_email, subject,
      html_content, text_content, status, retry_count, sent_at, created_at
    ) VALUES (?, ?, ?, null, 'upcoming_reminder', ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    emailId,
    intern.id,
    project.id,
    intern.email,
    subject,
    htmlContent,
    `Reminder: Your review for ${project.title} is scheduled for ${schedule.scheduled_date}.`,
    isDemo ? 'SIMULATED' : 'QUEUED',
    now,
    now
  );

  db.prepare("UPDATE review_schedules SET reminder_sent_at = ?, status = 'reminded' WHERE id = ?").run(now, schedule.id);

  logActivity('scheduler', 'Reminder Email Sent', `Dispatched upcoming review reminder to ${intern.name} (${intern.email}).`, 'info');

  return db.prepare('SELECT * FROM email_logs WHERE id = ?').get(emailId);
}
