/**
 * Tests for progress service.
 * Uses a temporary in-memory database.
 */

const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const progress = require('../../src/services/progress');

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

// Helper to add a student
function addStudent(name_ar, level_id) {
  const result = db.prepare('INSERT INTO students (name_ar, level_id) VALUES (?, ?)').run(name_ar, level_id || null);
  return result.lastInsertRowid;
}

describe('Progress Service', () => {
  describe('updateProgress', () => {
    test('creates a new progress entry', () => {
      const studentId = addStudent('أحمد', 1);
      const result = progress.updateProgress(db, studentId, 1, { status: 'MEMORIZED' });
      expect(result.success).toBe(true);

      const entry = db.prepare('SELECT * FROM progress WHERE student_id = ? AND surah_id = ?').get(studentId, 1);
      expect(entry).toBeDefined();
      expect(entry.status).toBe('MEMORIZED');
    });

    test('updates an existing progress entry', () => {
      const studentId = addStudent('أحمد', 1);
      progress.updateProgress(db, studentId, 1, { status: 'IN_PROGRESS' });
      progress.updateProgress(db, studentId, 1, { status: 'MEMORIZED' });

      const entry = db.prepare('SELECT * FROM progress WHERE student_id = ? AND surah_id = ?').get(studentId, 1);
      expect(entry.status).toBe('MEMORIZED');
    });

    test('rejects invalid status', () => {
      const studentId = addStudent('أحمد', 1);
      const result = progress.updateProgress(db, studentId, 1, { status: 'INVALID' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid status');
    });

    test('rejects missing status', () => {
      const studentId = addStudent('أحمد', 1);
      const result = progress.updateProgress(db, studentId, 1, {});
      expect(result.success).toBe(false);
      expect(result.error).toBe('Status is required');
    });

    test('rejects null data', () => {
      const studentId = addStudent('أحمد', 1);
      const result = progress.updateProgress(db, studentId, 1, null);
      expect(result.success).toBe(false);
    });

    test('accepts all valid statuses', () => {
      const studentId = addStudent('أحمد', 1);
      for (const status of progress.VALID_STATUSES) {
        const result = progress.updateProgress(db, studentId, 1, { status });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('bulkUpdateProgress', () => {
    test('updates multiple progress entries', () => {
      const studentId = addStudent('أحمد', 1);
      const updates = [
        { student_id: studentId, surah_id: 1, status: 'MEMORIZED' },
        { student_id: studentId, surah_id: 2, status: 'IN_PROGRESS' },
        { student_id: studentId, surah_id: 3, status: 'PERFECT' }
      ];

      const result = progress.bulkUpdateProgress(db, updates);
      expect(result.success).toBe(true);
      expect(result.count).toBe(3);

      const entries = db.prepare('SELECT * FROM progress WHERE student_id = ? ORDER BY surah_id').all(studentId);
      expect(entries).toHaveLength(3);
      expect(entries[0].status).toBe('MEMORIZED');
      expect(entries[1].status).toBe('IN_PROGRESS');
      expect(entries[2].status).toBe('PERFECT');
    });

    test('rejects empty array', () => {
      const result = progress.bulkUpdateProgress(db, []);
      expect(result.success).toBe(false);
    });

    test('rejects non-array input', () => {
      const result = progress.bulkUpdateProgress(db, null);
      expect(result.success).toBe(false);
    });
  });

  describe('getStudentProgress', () => {
    test('returns null for non-existent student', () => {
      const result = progress.getStudentProgress(db, 999);
      expect(result).toBeNull();
    });

    test('returns progress data for student with level', () => {
      const studentId = addStudent('أحمد', 1);
      progress.updateProgress(db, studentId, 114, { status: 'MEMORIZED' });
      progress.updateProgress(db, studentId, 113, { status: 'IN_PROGRESS' });

      const result = progress.getStudentProgress(db, studentId);
      expect(result).toBeDefined();
      expect(result.student.name_ar).toBe('أحمد');
      expect(result.surahs.length).toBeGreaterThan(0);
      expect(result.progressMap[114]).toEqual({ status: 'MEMORIZED', last_reviewed: expect.any(String) });
      expect(result.progressMap[113]).toEqual({ status: 'IN_PROGRESS', last_reviewed: expect.any(String) });
      expect(result.statusCounts.MEMORIZED).toBe(1);
      expect(result.statusCounts.IN_PROGRESS).toBe(1);
    });

    test('returns all surahs for student without level', () => {
      const studentId = addStudent('أحمد', null);
      const result = progress.getStudentProgress(db, studentId);
      expect(result).toBeDefined();
      expect(result.surahs.length).toBe(114);
      expect(result.totalSurahs).toBe(114);
    });

    test('calculates progress percentage correctly', () => {
      const studentId = addStudent('أحمد', null);
      // Mark 2 as MEMORIZED out of 114
      progress.updateProgress(db, studentId, 1, { status: 'MEMORIZED' });
      progress.updateProgress(db, studentId, 2, { status: 'PERFECT' });

      const result = progress.getStudentProgress(db, studentId);
      expect(result.progressPercentage).toBe(Math.round((2 / 114) * 100));
    });
  });

  describe('getSurahProgress', () => {
    test('returns null for non-existent surah', () => {
      const result = progress.getSurahProgress(db, 999);
      expect(result).toBeNull();
    });

    test('returns progress data for a surah', () => {
      const student1 = addStudent('أحمد', 1);
      const student2 = addStudent('محمد', 1);

      progress.updateProgress(db, student1, 1, { status: 'MEMORIZED' });
      progress.updateProgress(db, student2, 1, { status: 'IN_PROGRESS' });

      const result = progress.getSurahProgress(db, 1);
      expect(result).toBeDefined();
      expect(result.surah).toBeDefined();
      expect(result.students.length).toBe(2);
      expect(result.progressMap[student1]).toEqual({ status: 'MEMORIZED', last_reviewed: expect.any(String) });
      expect(result.progressMap[student2]).toEqual({ status: 'IN_PROGRESS', last_reviewed: expect.any(String) });
    });

    test('returns empty progress map when no progress exists', () => {
      addStudent('أحمد', 1);
      const result = progress.getSurahProgress(db, 1);
      expect(result).toBeDefined();
      expect(result.students.length).toBe(1);
      expect(Object.keys(result.progressMap)).toHaveLength(0);
    });
  });

  describe('getLevelProgress', () => {
    test('returns null for non-existent level', () => {
      const result = progress.getLevelProgress(db, 999);
      expect(result).toBeNull();
    });

    test('returns matrix data for a level', () => {
      const student1 = addStudent('أحمد', 1);
      const student2 = addStudent('محمد', 1);

      // Level 1 includes surahs 99-114 (surah_no)
      progress.updateProgress(db, student1, 114, { status: 'MEMORIZED' });
      progress.updateProgress(db, student2, 114, { status: 'IN_PROGRESS' });

      const result = progress.getLevelProgress(db, 1);
      expect(result).toBeDefined();
      expect(result.students.length).toBe(2);
      expect(result.surahs.length).toBeGreaterThan(0);
      expect(result.progressMap).toBeDefined();
    });
  });

  describe('getProgressMatrix', () => {
    test('returns matrix data filtered by level', () => {
      const student1 = addStudent('أحمد', 1);
      const student2 = addStudent('محمد', 2);

      const result = progress.getProgressMatrix(db, { level_id: 1 });
      expect(result.students.length).toBe(1);
      expect(result.students[0].name_ar).toBe('أحمد');
      expect(result.surahs.length).toBeGreaterThan(0);
    });

    test('returns all students and surahs without filter', () => {
      addStudent('أحمد', 1);
      addStudent('محمد', 2);

      const result = progress.getProgressMatrix(db);
      expect(result.students.length).toBe(2);
      expect(result.surahs.length).toBe(114);
    });

    test('includes progress data in map', () => {
      const studentId = addStudent('أحمد', 1);
      progress.updateProgress(db, studentId, 114, { status: 'MEMORIZED' });

      const result = progress.getProgressMatrix(db, { level_id: 1 });
      const key = `${studentId}_114`;
      expect(result.progressMap[key]).toBeDefined();
      expect(result.progressMap[key].status).toBe('MEMORIZED');
    });

    test('returns empty progress map when no progress exists', () => {
      addStudent('أحمد', 1);
      const result = progress.getProgressMatrix(db, { level_id: 1 });
      expect(Object.keys(result.progressMap)).toHaveLength(0);
    });
  });

  describe('getProgressStats', () => {
    test('returns null for non-existent student', () => {
      const result = progress.getProgressStats(db, 999);
      expect(result).toBeNull();
    });

    test('returns stats for student with level', () => {
      const studentId = addStudent('أحمد', 1);
      progress.updateProgress(db, studentId, 114, { status: 'MEMORIZED' });
      progress.updateProgress(db, studentId, 113, { status: 'PERFECT' });
      progress.updateProgress(db, studentId, 112, { status: 'IN_PROGRESS' });

      const result = progress.getProgressStats(db, studentId);
      expect(result).toBeDefined();
      expect(result.student_id).toBe(studentId);
      expect(result.statusCounts.MEMORIZED).toBe(1);
      expect(result.statusCounts.PERFECT).toBe(1);
      expect(result.statusCounts.IN_PROGRESS).toBe(1);
      expect(result.memorizedTotal).toBe(2);
      expect(result.trackedCount).toBe(3);
    });

    test('returns stats for student without level (all 114 surahs)', () => {
      const studentId = addStudent('أحمد', null);
      const result = progress.getProgressStats(db, studentId);
      expect(result.totalSurahs).toBe(114);
      expect(result.statusCounts.NOT_STARTED).toBe(114);
    });

    test('calculates percentage correctly', () => {
      const studentId = addStudent('أحمد', null);
      progress.updateProgress(db, studentId, 1, { status: 'MEMORIZED' });
      progress.updateProgress(db, studentId, 2, { status: 'PERFECT' });

      const result = progress.getProgressStats(db, studentId);
      expect(result.progressPercentage).toBe(Math.round((2 / 114) * 100));
    });
  });
});
