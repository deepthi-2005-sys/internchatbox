import { db } from '../db/index.js';
import crypto from 'crypto';

export function logActivity(category, action, details, level = 'info') {
  const id = 'act-' + crypto.randomUUID().slice(0, 8);
  const createdAt = new Date().toISOString();
  try {
    const stmt = db.prepare(`
      INSERT INTO activity_logs (id, category, action, details, level, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, category, action, typeof details === 'object' ? JSON.stringify(details) : details, level, createdAt);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

export function getActivityLogs(limit = 100) {
  return db.prepare(`
    SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}
