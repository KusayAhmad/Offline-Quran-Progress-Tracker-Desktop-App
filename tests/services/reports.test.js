/**
 * Tests for reports service.
 * Uses a temporary in-memory database.
 */

const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const reports = require('../../src/services/reports');

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

// Helper to set progress for a student on a surah (by surah_no)
function setProgress(studentId, surahNo, status) {
  const surah = db.prepare('SELECT id FROM surahs WHERE surah_no = ?').get(surahNo);
  if (!surah) throw new Error(`Surah ${surahNo} not found`);
  db.prepare(`
    INSERT INTO progress (student_id, surah_id, status)
    VALUES (?, ?, ?)
    ON CONFLICT(student_id, surah_id) DO UPDATE SET status = excluded.status
  `).run(studentId, surah.id, status);
}

describe('Reports Service', () => {
  describe('getClassReportFiltered', () => {
    test('returns all students with totalSurahs 114 when no filter', () => {
      const student1 = addStudent('طالب أول', 1);
      const student2 = addStudent('طالب ثاني', 2);

      const result = reports.getClassReportFiltered(db, {});

      expect(result.totalSurahs).toBe(114);
      expect(result.calculationBasis).toBe('all');
      expect(result.levelName).toBeNull();
      expect(result.students.length).toBe(2);
      result.students.forEach(s => {
        expect(s.totalSurahsForCalc).toBe(114);
      });
    });

    test('returns only students in level 1 when filtered by level_id', () => {
      const student1 = addStudent('طالب مستوى أول', 1);
      const student2 = addStudent('طالب مستوى ثاني', 2);
      const student3 = addStudent('طالب آخر مستوى أول', 1);

      const result = reports.getClassReportFiltered(db, { level_id: 1 });

      expect(result.students.length).toBe(2);
      expect(result.totalStudents).toBe(2);
      expect(result.calculationBasis).toBe('level');
      expect(result.levelName).toBe('المستوى الأول');
      // Level 1 has 16 surahs (99-114)
      expect(result.totalSurahs).toBe(16);
      result.students.forEach(s => {
        expect(s.totalSurahsForCalc).toBe(16);
      });
    });

    test('calculates progressPercentage relative to level surahs', () => {
      const student1 = addStudent('طالب مستوى أول', 1);

      // Level 1 has surahs 99-114 (16 surahs). Mark 4 as MEMORIZED.
      setProgress(student1, 114, 'MEMORIZED');
      setProgress(student1, 113, 'MEMORIZED');
      setProgress(student1, 112, 'PERFECT');
      setProgress(student1, 111, 'PERFECT');

      const result = reports.getClassReportFiltered(db, { level_id: 1 });

      expect(result.totalSurahs).toBe(16);
      expect(result.students[0].memorizedTotal).toBe(4);
      // 4/16 = 25%
      expect(result.students[0].progressPercentage).toBe(25);
    });

    test('calculates progressPercentage relative to 114 surahs when no filter', () => {
      const student1 = addStudent('طالب', 1);

      // Mark 9 surahs as MEMORIZED
      for (let i = 114; i >= 106; i--) {
        setProgress(student1, i, 'MEMORIZED');
      }

      const result = reports.getClassReportFiltered(db, {});

      expect(result.totalSurahs).toBe(114);
      expect(result.students[0].memorizedTotal).toBe(9);
      // 9/114 = 8% (rounded)
      expect(result.students[0].progressPercentage).toBe(8);
    });

    test('returns empty result for non-existent level', () => {
      addStudent('طالب', 1);

      const result = reports.getClassReportFiltered(db, { level_id: 999 });

      expect(result.students).toEqual([]);
      expect(result.totalStudents).toBe(0);
    });

    test('excludes archived students', () => {
      const student1 = addStudent('طالب نشط', 1);
      const student2 = addStudent('طالب مؤرشف', 1);
      db.prepare('UPDATE students SET archived = 1 WHERE id = ?').run(student2);

      const result = reports.getClassReportFiltered(db, { level_id: 1 });

      expect(result.students.length).toBe(1);
      expect(result.students[0].name_ar).toBe('طالب نشط');
    });
  });

  describe('getLevelReport', () => {
    test('returns correct data shape', () => {
      const student1 = addStudent('طالب أول', 1);
      setProgress(student1, 114, 'MEMORIZED');
      setProgress(student1, 113, 'PERFECT');

      const result = reports.getLevelReport(db, 1);

      expect(result).not.toBeNull();
      expect(result.level).toBeDefined();
      expect(result.level.name_ar).toBe('المستوى الأول');
      expect(result.surahs).toBeDefined();
      expect(result.surahs.length).toBe(16);
      expect(result.totalSurahs).toBe(16);
      expect(result.totalStudents).toBe(1);
      expect(result.students.length).toBe(1);
      expect(result.students[0].memorizedTotal).toBe(2);
      expect(result.students[0].progressPercentage).toBe(13); // 2/16 = 12.5 -> 13
    });

    test('returns null for non-existent level', () => {
      const result = reports.getLevelReport(db, 999);
      expect(result).toBeNull();
    });

    test('only counts progress for surahs in the level', () => {
      const student1 = addStudent('طالب', 1);

      // Mark a surah NOT in level 1 (surah 50 is in level 5)
      setProgress(student1, 50, 'MEMORIZED');
      // Mark a surah IN level 1 (surah 114)
      setProgress(student1, 114, 'MEMORIZED');

      const result = reports.getLevelReport(db, 1);

      // Only surah 114 should count
      expect(result.students[0].memorizedTotal).toBe(1);
      expect(result.students[0].progressPercentage).toBe(6); // 1/16 = 6.25 -> 6
    });
  });

  describe('getClassReport', () => {
    test('returns all students with progress based on all 114 surahs', () => {
      const student1 = addStudent('طالب', 1);
      setProgress(student1, 114, 'MEMORIZED');
      setProgress(student1, 113, 'PERFECT');

      const result = reports.getClassReport(db);

      expect(result.totalSurahs).toBe(114);
      expect(result.students.length).toBe(1);
      expect(result.students[0].memorizedTotal).toBe(2);
      expect(result.students[0].progressPercentage).toBe(2); // 2/114 = 1.75 -> 2
    });
  });
});
