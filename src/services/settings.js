/**
 * Settings service.
 * Manages application settings stored in the profiles table.
 */

const fs = require('fs');
const path = require('path');

/**
 * Get current settings from the profiles table or defaults.
 */
function getSettings(db) {
  const profile = db.prepare('SELECT * FROM profiles LIMIT 1').get();

  const defaults = {
    teacher_name: '',
    school_name: '',
    class_name: '',
    language: 'ar',
    rtl: true,
    backup_path: '',
    export_path: ''
  };

  if (!profile) return defaults;

  return {
    teacher_name: profile.name_ar || '',
    school_name: profile.institution || '',
    class_name: profile.name_en || '',
    language: 'ar',
    rtl: true,
    backup_path: '',
    export_path: ''
  };
}

/**
 * Update settings - persists to profiles table.
 */
function updateSettings(db, data) {
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
