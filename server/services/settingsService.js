import { db } from '../db/index.js';

export function getSetting(key, defaultValue = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

export function getAllSettings(maskSecrets = true) {
  const rows = db.prepare('SELECT key, value, updated_at FROM settings').all();
  const settings = {};
  for (const r of rows) {
    if (maskSecrets && ['GEMINI_API_KEY', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'SMTP_PASS'].includes(r.key)) {
      settings[r.key] = r.value ? (r.value.length > 8 ? `••••••••${r.value.slice(-4)}` : '••••••••') : '';
      settings[`${r.key}_CONFIGURED`] = Boolean(r.value);
    } else {
      settings[r.key] = r.value;
    }
  }
  return settings;
}

export function updateSetting(key, value) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, now);
}

export function updateSettings(settingsObj) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const transaction = db.transaction((entries) => {
    for (const [k, v] of entries) {
      if (v !== undefined && v !== null) {
        // Do not overwrite with masked values
        if (typeof v === 'string' && v.startsWith('••••••••')) continue;
        stmt.run(k, String(v), now);
      }
    }
  });

  transaction(Object.entries(settingsObj));
}
