/**
 * Tests for students service.
 * Uses a temporary in-memory database.
 */

const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const students = require('../../src/services/students');

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

describe('Students Service', () => {
  describe('addStudent', () => {
    test('adds a student with required fields', () => {
      const result = students.addStudent(db, { name_ar: 'أحمد محمد' });
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('number');
    });

    test('adds a student with all fields', () => {
      const result = students.addStudent(db, {
        name_ar: 'أحمد محمد',
        name_en: 'Ahmad Muhammad',
        level_id: 1,
        notes: 'طالب مجتهد'
      });
      expect(result.id).toBeDefined();

      const student = students.getStudent(db, result.id);
      expect(student.name_ar).toBe('أحمد محمد');
      expect(student.name_en).toBe('Ahmad Muhammad');
      expect(student.level_id).toBe(1);
      expect(student.notes).toBe('طالب مجتهد');
    });
  });

  describe('getStudent', () => {
    test('returns student by id', () => {
      const { id } = students.addStudent(db, { name_ar: 'علي' });
      const student = students.getStudent(db, id);
      expect(student).toBeDefined();
      expect(student.name_ar).toBe('علي');
    });

    test('returns undefined for non-existent id', () => {
      const student = students.getStudent(db, 999);
      expect(student).toBeUndefined();
    });

    test('includes level_name via join', () => {
      const { id } = students.addStudent(db, { name_ar: 'أحمد', level_id: 1 });
      const student = students.getStudent(db, id);
      expect(student.level_name).toBe('المستوى الأول');
    });
  });

  describe('getAllStudents', () => {
    test('returns empty array when no students', () => {
      const result = students.getAllStudents(db);
      expect(result).toHaveLength(0);
    });

    test('returns all non-archived students', () => {
      students.addStudent(db, { name_ar: 'أحمد' });
      students.addStudent(db, { name_ar: 'محمد' });
      const result = students.getAllStudents(db);
      expect(result).toHaveLength(2);
    });

    test('excludes archived students', () => {
      const { id } = students.addStudent(db, { name_ar: 'أحمد' });
      students.addStudent(db, { name_ar: 'محمد' });
      students.archiveStudent(db, id);
      const result = students.getAllStudents(db);
      expect(result).toHaveLength(1);
      expect(result[0].name_ar).toBe('محمد');
    });

    test('filters by level_id', () => {
      students.addStudent(db, { name_ar: 'أحمد', level_id: 1 });
      students.addStudent(db, { name_ar: 'محمد', level_id: 2 });
      const result = students.getAllStudents(db, { level_id: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].name_ar).toBe('أحمد');
    });
  });

  describe('updateStudent', () => {
    test('updates student name', () => {
      const { id } = students.addStudent(db, { name_ar: 'أحمد' });
      students.updateStudent(db, id, { name_ar: 'أحمد محمد' });
      const student = students.getStudent(db, id);
      expect(student.name_ar).toBe('أحمد محمد');
    });

    test('updates only specified fields', () => {
      const { id } = students.addStudent(db, { name_ar: 'أحمد', notes: 'ملاحظة' });
      students.updateStudent(db, id, { name_ar: 'علي' });
      const student = students.getStudent(db, id);
      expect(student.name_ar).toBe('علي');
      expect(student.notes).toBe('ملاحظة');
    });

    test('returns success false if no fields provided', () => {
      const { id } = students.addStudent(db, { name_ar: 'أحمد' });
      const result = students.updateStudent(db, id, {});
      expect(result.success).toBe(false);
    });
  });

  describe('archiveStudent', () => {
    test('archives a student', () => {
      const { id } = students.addStudent(db, { name_ar: 'أحمد' });
      const result = students.archiveStudent(db, id);
      expect(result.success).toBe(true);

      const allStudents = students.getAllStudents(db);
      expect(allStudents).toHaveLength(0);
    });
  });

  describe('searchStudents', () => {
    test('searches by Arabic name', () => {
      students.addStudent(db, { name_ar: 'أحمد محمد' });
      students.addStudent(db, { name_ar: 'علي حسن' });
      const result = students.searchStudents(db, 'أحمد');
      expect(result).toHaveLength(1);
      expect(result[0].name_ar).toBe('أحمد محمد');
    });

    test('searches by English name', () => {
      students.addStudent(db, { name_ar: 'أحمد', name_en: 'Ahmad' });
      students.addStudent(db, { name_ar: 'علي', name_en: 'Ali' });
      const result = students.searchStudents(db, 'Ahmad');
      expect(result).toHaveLength(1);
      expect(result[0].name_en).toBe('Ahmad');
    });

    test('returns empty for no matches', () => {
      students.addStudent(db, { name_ar: 'أحمد' });
      const result = students.searchStudents(db, 'خالد');
      expect(result).toHaveLength(0);
    });
  });

  describe('getStudentsByLevel', () => {
    test('returns students for a specific level', () => {
      students.addStudent(db, { name_ar: 'أحمد', level_id: 1 });
      students.addStudent(db, { name_ar: 'محمد', level_id: 2 });
      students.addStudent(db, { name_ar: 'علي', level_id: 1 });
      const result = students.getStudentsByLevel(db, 1);
      expect(result).toHaveLength(2);
    });
  });

  describe('getStudentProgress', () => {
    test('returns null for non-existent student', () => {
      const result = students.getStudentProgress(db, 999);
      expect(result).toBeNull();
    });

    test('returns progress data for student', () => {
      const { id } = students.addStudent(db, { name_ar: 'أحمد', level_id: 1 });

      // Add some progress
      db.prepare('INSERT INTO progress (student_id, surah_id, status) VALUES (?, ?, ?)').run(id, 1, 'MEMORIZED');
      db.prepare('INSERT INTO progress (student_id, surah_id, status) VALUES (?, ?, ?)').run(id, 2, 'IN_PROGRESS');

      const result = students.getStudentProgress(db, id);
      expect(result).toBeDefined();
      expect(result.student.name_ar).toBe('أحمد');
      expect(result.totalSurahs).toBe(114);
      expect(result.statusCounts.MEMORIZED).toBe(1);
      expect(result.statusCounts.IN_PROGRESS).toBe(1);
      expect(result.statusCounts.NOT_STARTED).toBe(112);
      expect(result.progressPercentage).toBe(1); // 1/114 ~= 0.87 rounds to 1
    });
  });
});
