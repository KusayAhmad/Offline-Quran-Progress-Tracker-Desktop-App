/**
 * Tests for settings service.
 * Uses a temporary in-memory database.
 */

const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const settings = require('../../src/services/settings');

let db;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  createSchema(db);
  seedDatabase(db);
});

afterEach(() => {
  if (db) db.close();
});

describe('Settings Service', () => {
  describe('getSettings', () => {
    test('returns defaults when no settings stored', () => {
      const result = settings.getSettings(db);
      expect(result.language).toBe('ar');
      expect(result.rtl).toBe(true);
      expect(result.teacher_name).toBe('');
      expect(result.school_name).toBe('');
      expect(result.class_name).toBe('');
    });

    test('returns stored language after updateSettings', () => {
      settings.updateSettings(db, { language: 'en', teacher_name: '', school_name: '', class_name: '' });
      const result = settings.getSettings(db);
      expect(result.language).toBe('en');
      expect(result.rtl).toBe(false);
    });

    test('returns ar language after updating back to ar', () => {
      settings.updateSettings(db, { language: 'en', teacher_name: '', school_name: '', class_name: '' });
      settings.updateSettings(db, { language: 'ar', teacher_name: '', school_name: '', class_name: '' });
      const result = settings.getSettings(db);
      expect(result.language).toBe('ar');
      expect(result.rtl).toBe(true);
    });
  });

  describe('updateSettings', () => {
    test('stores and retrieves language en', () => {
      const res = settings.updateSettings(db, { language: 'en', teacher_name: '', school_name: '', class_name: '' });
      expect(res.success).toBe(true);
      const result = settings.getSettings(db);
      expect(result.language).toBe('en');
    });

    test('stores teacher_name without affecting language', () => {
      settings.updateSettings(db, { language: 'en', teacher_name: '', school_name: '', class_name: '' });
      settings.updateSettings(db, { teacher_name: 'Ahmed', school_name: '', class_name: '' });
      const result = settings.getSettings(db);
      expect(result.language).toBe('en');
      expect(result.teacher_name).toBe('Ahmed');
    });

    test('stores language without affecting teacher_name', () => {
      settings.updateSettings(db, { language: 'ar', teacher_name: 'Ahmed', school_name: 'School A', class_name: 'Class 1' });
      settings.updateSettings(db, { language: 'en', teacher_name: 'Ahmed', school_name: 'School A', class_name: 'Class 1' });
      const result = settings.getSettings(db);
      expect(result.language).toBe('en');
      expect(result.teacher_name).toBe('Ahmed');
      expect(result.school_name).toBe('School A');
      expect(result.class_name).toBe('Class 1');
    });

    test('stores profile fields correctly', () => {
      settings.updateSettings(db, {
        teacher_name: 'محمد',
        school_name: 'مدرسة النور',
        class_name: 'حلقة 1',
        language: 'ar'
      });
      const result = settings.getSettings(db);
      expect(result.teacher_name).toBe('محمد');
      expect(result.school_name).toBe('مدرسة النور');
      expect(result.class_name).toBe('حلقة 1');
    });

    test('updates existing profile on second call', () => {
      settings.updateSettings(db, { teacher_name: 'First', school_name: '', class_name: '', language: 'ar' });
      settings.updateSettings(db, { teacher_name: 'Second', school_name: 'New School', class_name: 'Class', language: 'en' });
      const result = settings.getSettings(db);
      expect(result.teacher_name).toBe('Second');
      expect(result.school_name).toBe('New School');
      expect(result.language).toBe('en');
    });
  });
});
