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

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-backup-test-'));
  dbPath = path.join(tmpDir, 'test.db');

  // Create a real database file
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  createSchema(db);
  seedDatabase(db);
  db.prepare('INSERT INTO students (name_ar) VALUES (?)').run('طالب اختبار');
  db.close();
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

describe('Backup Service', () => {
  describe('createBackup', () => {
    test('creates a backup file', () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result = backupService.createBackup(dbPath, backupDir);

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();
      expect(result.filename).toContain('quran-tracker-backup-');
      expect(fs.existsSync(result.path)).toBe(true);
    });

    test('backup file contains same data', () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result = backupService.createBackup(dbPath, backupDir);

      const originalSize = fs.statSync(dbPath).size;
      const backupSize = fs.statSync(result.path).size;
      expect(backupSize).toBe(originalSize);
    });

    test('creates backup directory if it does not exist', () => {
      const backupDir = path.join(tmpDir, 'new-backups-dir');
      expect(fs.existsSync(backupDir)).toBe(false);

      const result = backupService.createBackup(dbPath, backupDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(backupDir)).toBe(true);
    });

    test('returns error when DB file not found', () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result = backupService.createBackup('/nonexistent/path.db', backupDir);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database file not found');
    });

    test('creates multiple backups with unique names', () => {
      const backupDir = path.join(tmpDir, 'backups');
      const result1 = backupService.createBackup(dbPath, backupDir);
      const result2 = backupService.createBackup(dbPath, backupDir);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.filename).not.toBe(result2.filename);

      const list = backupService.getBackupList(backupDir);
      expect(list.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('restoreBackup', () => {
    test('restores a backup file', () => {
      const backupDir = path.join(tmpDir, 'backups');
      const backup = backupService.createBackup(dbPath, backupDir);

      // Modify the original DB
      const db = new Database(dbPath);
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

    test('returns list of backup files', () => {
      const backupDir = path.join(tmpDir, 'backups');
      backupService.createBackup(dbPath, backupDir);
      backupService.createBackup(dbPath, backupDir);

      const list = backupService.getBackupList(backupDir);
      expect(list.length).toBe(2);
      expect(list[0].filename).toContain('quran-tracker-backup-');
      expect(list[0].size).toBeGreaterThan(0);
      expect(list[0].created).toBeDefined();
    });

    test('returns backups sorted by date (newest first)', () => {
      const backupDir = path.join(tmpDir, 'backups');
      backupService.createBackup(dbPath, backupDir);
      backupService.createBackup(dbPath, backupDir);

      const list = backupService.getBackupList(backupDir);
      if (list.length >= 2) {
        const date1 = new Date(list[0].created);
        const date2 = new Date(list[1].created);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });

  describe('autoBackup', () => {
    test('creates a backup using autoBackup', () => {
      const backupDir = path.join(tmpDir, 'auto-backups');
      const result = backupService.autoBackup(dbPath, backupDir);

      expect(result.success).toBe(true);
      expect(fs.existsSync(result.path)).toBe(true);
    });
  });
});
