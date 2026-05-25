/**
 * Settings service.
 * Manages application settings stored in the settings and profiles tables.
 */

/**
 * Get current settings combining the settings table and profiles table.
 */
function getSettings(db) {
  // Read language from settings table
  const langRow = db.prepare("SELECT value FROM settings WHERE key = 'language'").get();
  const language = langRow ? langRow.value : 'ar';

  // Read profile info from profiles table
  const profile = db.prepare('SELECT * FROM profiles LIMIT 1').get();

  return {
    teacher_name: profile ? (profile.name_ar || '') : '',
    school_name: profile ? (profile.institution || '') : '',
    class_name: profile ? (profile.name_en || '') : '',
    language: language,
    rtl: language === 'ar',
    backup_path: '',
    export_path: ''
  };
}

/**
 * Update settings - persists language to settings table and profile fields to profiles table.
 */
function updateSettings(db, data) {
  // Upsert language into settings table if provided
  if (data.language !== undefined) {
    const stmt = db.prepare(
      "INSERT INTO settings (key, value, updated_at) VALUES ('language', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    );
    stmt.run(data.language);
  }

  // Store profile fields in profiles table
  const existing = db.prepare('SELECT id FROM profiles LIMIT 1').get();

  if (existing) {
    const stmt = db.prepare(
      'UPDATE profiles SET name_ar = ?, name_en = ?, institution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(
      data.teacher_name || null,
      data.class_name || null,
      data.school_name || null,
      existing.id
    );
  } else {
    const stmt = db.prepare(
      'INSERT INTO profiles (name_ar, name_en, institution) VALUES (?, ?, ?)'
    );
    stmt.run(
      data.teacher_name || null,
      data.class_name || null,
      data.school_name || null
    );
  }

  return { success: true };
}

module.exports = {
  getSettings,
  updateSettings
};
