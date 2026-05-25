/**
 * Tests for backup service.
 * Verifies backup creation, restoration, and listing.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const backupService = require('../../src/services/backup');

let tmpDir;
let dbPath;
let db;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-backup-test-'));
  dbPath = path.join(tmpDir, 'test.db');

  // Create a real database file
  db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  createSchema(db);
  seedDatabase(db);
  db.prepare('INSERT INTO students (name_ar) VALUES (?)').run('طالب اختبار');
});

afterEach(() => {
  if (db) {
    try { db.close(); } catch (e) { /* already closed */ }
  }
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

describe('Backup Service', () => {
  describe('createBackup', () => {
    test('creates a backup file', async () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result = await backupService.createBackup(db, backupDir);

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
      expect(result.filename).toContain('quran-tracker-backup-');
      expect(fs.existsSync(result.path)).toBe(true);
    });

    test('backup file contains same data', async () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result = await backupService.createBackup(db, backupDir);

      // Verify backup is a valid database with the same student
      const backupDb = new Database(result.path);
      const student = backupDb.prepare('SELECT * FROM students WHERE name_ar = ?').get('طالب اختبار');
      expect(student).toBeDefined();
      backupDb.close();
    });

    test('creates backup directory if it does not exist', async () => {
      const backupDir = path.join(tmpDir, 'new-backups-dir');
      expect(fs.existsSync(backupDir)).toBe(false);

      const result = await backupService.createBackup(db, backupDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(backupDir)).toBe(true);
    });

    test('returns error when db is not provided', async () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result = await backupService.createBackup(null, backupDir);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database instance not provided');
    });

    test('creates multiple backups with unique names', async () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result1 = await backupService.createBackup(db, backupDir);
      const result2 = await backupService.createBackup(db, backupDir);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.filename).not.toBe(result2.filename);

      const list = backupService.getBackupList(backupDir);
      expect(list.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('restoreBackup', () => {
    test('restores a backup file', async () => {
      const backupDir = path.join(tmpDir, 'backups');
      const backup = await backupService.createBackup(db, backupDir);

      // Modify the original DB
      db.prepare('INSERT INTO students (name_ar) VALUES (?)').run('طالب جديد');
      const countAfterModify = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
      db.close();

      // Restore
      const result = backupService.restoreBackup(backup.path, dbPath);
      expect(result.success).toBe(true);

      // Verify restored data
      const db2 = new Database(dbPath);
      const countAfterRestore = db2.prepare('SELECT COUNT(*) as count FROM students').get().count;
      db2.close();

      expect(countAfterRestore).toBeLessThan(countAfterModify);

      // Reopen for afterEach cleanup
      db = new Database(dbPath);
    });

    test('returns error when backup file not found', () => {
      const result = backupService.restoreBackup('/nonexistent/backup.db', dbPath);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Backup file not found');
    });
  });

  describe('getBackupList', () => {
    test('returns empty array when no backups exist', () => {
      const backupDir = path.join(tmpDir, 'empty-backups');
      const list = backupService.getBackupList(backupDir);
      expect(list).toEqual([]);
    });

    test('returns list of backup files', async () => {
      const backupDir = path.join(tmpDir, 'backups');
      await backupService.createBackup(db, backupDir);
      await backupService.createBackup(db, backupDir);

      const list = backupService.getBackupList(backupDir);
      expect(list.length).toBe(2);
      expect(list[0].filename).toContain('quran-tracker-backup-');
      expect(list[0].size).toBeGreaterThan(0);
      expect(list[0].created).toBeDefined();
    });

    test('returns backups sorted by date (newest first)', async () => {
      const backupDir = path.join(tmpDir, 'backups');
      await backupService.createBackup(db, backupDir);
      await backupService.createBackup(db, backupDir);

      const list = backupService.getBackupList(backupDir);
      if (list.length >= 2) {
        const date1 = new Date(list[0].created);
        const date2 = new Date(list[1].created);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });

  describe('autoBackup', () => {
    test('creates a backup using autoBackup', async () => {
      const backupDir = path.join(tmpDir, 'auto-backups');
      const result = await backupService.autoBackup(db, backupDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });
  });
});
