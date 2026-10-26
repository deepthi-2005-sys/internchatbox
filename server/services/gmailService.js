import { google } from 'googleapis';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from '../db/index.js';
import { getSetting, updateSetting } from './settingsService.js';
import { logActivity } from './activityService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

function getOAuthClient() {
  const clientId = getSetting('GMAIL_CLIENT_ID');
  const clientSecret = getSetting('GMAIL_CLIENT_SECRET');
  const redirectUri = getSetting('GMAIL_REDIRECT_URI', 'http://localhost:5000/api/auth/google/callback');

  if (!clientId || !clientSecret) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const refreshToken = getSetting('GMAIL_REFRESH_TOKEN');
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

export function getGoogleAuthUrl() {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) {
    throw new Error('Google OAuth Client ID and Secret are not configured yet.');
  }

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/userinfo.email'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  });
}

export async function handleGoogleCallback(code) {
  const oauth2Client = getOAuthClient();
  if (!oauth2Client) throw new Error('OAuth Client not initialized.');

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  if (tokens.refresh_token) {
    updateSetting('GMAIL_REFRESH_TOKEN', tokens.refresh_token);
  }

  // Get user's email
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    if (userInfo.data.email) {
      updateSetting('GMAIL_CONNECTED_EMAIL', userInfo.data.email);
    }
  } catch (err) {
    console.warn('Could not fetch user email info:', err.message);
  }

  updateSetting('DEMO_MODE', 'false');
  logActivity('gmail_sync', 'Google OAuth Connected', `Connected Gmail account: ${getSetting('GMAIL_CONNECTED_EMAIL') || 'Verified'}`, 'success');

  return { success: true, email: getSetting('GMAIL_CONNECTED_EMAIL') };
}

export function getGmailConnectionStatus() {
  const isDemo = getSetting('DEMO_MODE', 'true') === 'true';
  const clientId = getSetting('GMAIL_CLIENT_ID');
  const clientSecret = getSetting('GMAIL_CLIENT_SECRET');
  const refreshToken = getSetting('GMAIL_REFRESH_TOKEN');
  const connectedEmail = getSetting('GMAIL_CONNECTED_EMAIL');

  const isConfigured = Boolean(clientId && clientSecret);
  const isConnected = Boolean(isConfigured && refreshToken);

  return {
    mode: isDemo ? 'demo' : 'live',
    isDemo,
    isConfigured,
    isConnected,
    connectedEmail: connectedEmail || (isDemo ? 'demo-supervisor@interntrack.local' : 'Not Connected'),
    autoSyncEnabled: getSetting('AUTO_SYNC_ENABLED', 'true') === 'true',
    syncIntervalMinutes: parseInt(getSetting('SYNC_INTERVAL_MINUTES', '2'), 10)
  };
}

// Extract email address from RFC 5322 header like "Sarah Chen <sarah@domain.com>"
function extractEmail(headerStr) {
  if (!headerStr) return '';
  const match = headerStr.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase().trim();
  return headerStr.toLowerCase().trim();
}

// Decode base64url encoded Gmail message bodies
function decodeBase64Url(data) {
  if (!data) return '';
  const buff = Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  return buff.toString('utf-8');
}

export async function syncGmailSubmissions(processSubmissionReviewCallback) {
  const status = getGmailConnectionStatus();
  if (status.isDemo || !status.isConnected) {
    logActivity('gmail_sync', 'Gmail Sync Skipped', 'System is operating in Demo Mode or Gmail OAuth is not yet completed.', 'info');
    return {
      status: 'demo_mode',
      message: 'Running in Demo Mode. Use the Test Submission Simulator to simulate live submissions.',
      processedCount: 0
    };
  }

  const oauth2Client = getOAuthClient();
  if (!oauth2Client) throw new Error('Cannot initialize Gmail OAuth client.');

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Get all registered interns
  const interns = db.prepare("SELECT id, name, email FROM interns WHERE status = 'active'").all();
  if (!interns.length) {
    return { status: 'no_interns', message: 'No registered interns found.', processedCount: 0 };
  }

  const internEmailMap = new Map();
  interns.forEach(i => internEmailMap.set(i.email.toLowerCase(), i));

  // Search unread messages
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults: 20
  });

  const messages = listRes.data.messages || [];
  let processedCount = 0;

  for (const msgRef of messages) {
    try {
      // Check duplicate message ID before fetching full payload
      const existing = db.prepare('SELECT id FROM submissions WHERE gmail_message_id = ?').get(msgRef.id);
      if (existing) {
        // Mark as read so we don't re-check
        await gmail.users.messages.modify({
          userId: 'me',
          id: msgRef.id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        });
        continue;
      }

      const msgRes = await gmail.users.messages.get({
        userId: 'me',
        id: msgRef.id,
        format: 'full'
      });

      const msg = msgRes.data;
      const headers = msg.payload?.headers || [];
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
      const senderEmail = extractEmail(fromHeader);

      // Check if sender is registered intern
      const matchedIntern = internEmailMap.get(senderEmail);
      if (!matchedIntern) {
        // Email is not from a registered intern, leave or ignore
        continue;
      }

      // Find active project for this intern
      const project = db.prepare(`
        SELECT * FROM projects 
        WHERE intern_id = ? AND status != 'completed' 
        ORDER BY created_at DESC LIMIT 1
      `).get(matchedIntern.id);

      if (!project) {
        logActivity('submission', 'Unassigned Submission Ignored', `Received email from intern ${matchedIntern.name} (${matchedIntern.email}) but no active project was found.`, 'warning');
        continue;
      }

      // Parse body & attachments
      let textBody = '';
      const attachmentList = [];

      function parseParts(parts) {
        if (!parts) return;
        for (const part of parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            textBody += decodeBase64Url(part.body.data) + '\n';
          } else if (part.filename && part.body?.attachmentId) {
            attachmentList.push(part);
          }
          if (part.parts) parseParts(part.parts);
        }
      }

      if (msg.payload?.parts) {
        parseParts(msg.payload.parts);
      } else if (msg.payload?.body?.data) {
        textBody = decodeBase64Url(msg.payload.body.data);
      }

      const submissionId = 'sub-' + crypto.randomUUID().slice(0, 8);
      const submissionHash = crypto.createHash('sha256').update(`${matchedIntern.id}:${subjectHeader}:${textBody}`).digest('hex');

      // Duplicate content check
      const dupContent = db.prepare('SELECT id FROM submissions WHERE submission_hash = ?').get(submissionHash);
      if (dupContent) {
        logActivity('submission', 'Duplicate Submission Prevented', `Identical submission already exists for ${matchedIntern.name}.`, 'warning');
        await gmail.users.messages.modify({
          userId: 'me',
          id: msgRef.id,
          requestBody: { removeLabelIds: ['UNREAD'] }
        });
        continue;
      }

      // Insert submission
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO submissions (id, intern_id, project_id, source, gmail_message_id, gmail_thread_id, subject, submission_notes, code_snippet, submission_hash, created_at, status)
        VALUES (?, ?, ?, 'gmail', ?, ?, ?, ?, ?, ?, ?, 'received')
      `).run(submissionId, matchedIntern.id, project.id, msg.id, msg.threadId, subjectHeader, textBody, '', submissionHash, now);

      // Download attachments
      for (const att of attachmentList) {
        try {
          const attRes = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: msg.id,
            id: att.body.attachmentId
          });

          const fileData = Buffer.from(attRes.data.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
          const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
          const attId = 'att-' + crypto.randomUUID().slice(0, 8);
          const savePath = path.join(UPLOADS_DIR, `${attId}-${safeName}`);
          fs.writeFileSync(savePath, fileData);

          let snippet = '';
          if (att.mimeType?.includes('text') || att.mimeType?.includes('json') || safeName.match(/\.(js|ts|py|html|css|json|md|txt)$/i)) {
            snippet = fileData.toString('utf-8', 0, 1500);
          }

          db.prepare(`
            INSERT INTO attachments (id, submission_id, file_name, file_path, file_size, mime_type, content_snippet, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(attId, submissionId, att.filename, `/uploads/${attId}-${safeName}`, fileData.length, att.mimeType || 'application/octet-stream', snippet, now);
        } catch (attErr) {
          console.error(`Failed to download attachment ${att.filename}:`, attErr);
        }
      }

      // Mark message as read
      await gmail.users.messages.modify({
        userId: 'me',
        id: msgRef.id,
        requestBody: { removeLabelIds: ['UNREAD'] }
      });

      logActivity('submission', 'Submission Received via Gmail', `Received project submission from ${matchedIntern.name}: "${subjectHeader}".`, 'success');

      // Trigger automatic review
      if (typeof processSubmissionReviewCallback === 'function') {
        await processSubmissionReviewCallback(submissionId);
      }

      processedCount++;
    } catch (msgErr) {
      console.error(`Error processing Gmail message ${msgRef.id}:`, msgErr);
      logActivity('gmail_sync', 'Error Processing Email', `Failed to process message ${msgRef.id}: ${msgErr.message}`, 'error');
    }
  }

  return {
    status: 'success',
    processedCount,
    message: `Processed ${processedCount} new submission(s) from Gmail.`
  };
}

export async function simulateIncomingSubmission({ internId, subject, notes, codeSnippet, files = [] }, processSubmissionReviewCallback) {
  const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(internId);
  if (!intern) throw new Error('Intern not found.');

  const project = db.prepare(`
    SELECT * FROM projects 
    WHERE intern_id = ? AND status != 'completed' 
    ORDER BY created_at DESC LIMIT 1
  `).get(internId);

  if (!project) throw new Error(`No active project found for ${intern.name}.`);

  const submissionId = 'sub-' + crypto.randomUUID().slice(0, 8);
  const now = new Date().toISOString();
  const submissionHash = crypto.createHash('sha256').update(`${intern.id}:${subject}:${notes}:${codeSnippet}`).digest('hex');

  // Prevent duplicate
  const dup = db.prepare('SELECT id FROM submissions WHERE submission_hash = ?').get(submissionHash);
  if (dup) {
    throw new Error('Duplicate submission detected: identical notes and code have already been submitted.');
  }

  const dummyMsgId = 'demo-msg-' + crypto.randomUUID().slice(0, 10);

  db.prepare(`
    INSERT INTO submissions (id, intern_id, project_id, source, gmail_message_id, gmail_thread_id, subject, submission_notes, code_snippet, submission_hash, created_at, status)
    VALUES (?, ?, ?, 'demo_simulation', ?, ?, ?, ?, ?, ?, ?, 'received')
  `).run(submissionId, intern.id, project.id, dummyMsgId, 'demo-thread', subject || `Project Update - ${project.title}`, notes || '', codeSnippet || '', submissionHash, now);

  // Attach files if any
  for (const f of files) {
    const attId = 'att-' + crypto.randomUUID().slice(0, 8);
    const safeName = f.originalname || f.name || 'submission_file.txt';
    const filePath = f.path ? `/uploads/${path.basename(f.path)}` : `/uploads/${attId}-${safeName}`;
    const snippet = f.content ? f.content.slice(0, 1500) : (f.snippet || '');

    db.prepare(`
      INSERT INTO attachments (id, submission_id, file_name, file_path, file_size, mime_type, content_snippet, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(attId, submissionId, safeName, filePath, f.size || 1024, f.mimetype || 'text/plain', snippet, now);
  }

  logActivity('submission', 'Simulated Submission Received', `Simulated new email submission from ${intern.name}: "${subject}".`, 'success');

  let reviewResult = null;
  if (typeof processSubmissionReviewCallback === 'function') {
    reviewResult = await processSubmissionReviewCallback(submissionId);
  }

  return {
    submissionId,
    intern,
    project,
    review: reviewResult
  };
}
