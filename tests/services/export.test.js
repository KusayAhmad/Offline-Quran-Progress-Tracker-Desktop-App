/**
 * Tests for export service.
 * Verifies Excel file generation with proper worksheets and data.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const exportService = require('../../src/services/export');

let db;
let tmpDir;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  createSchema(db);
  seedDatabase(db);
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-export-test-'));
});

afterEach(() => {
  if (db) db.close();
  // Cleanup temp files
  if (tmpDir && fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    files.forEach(f => fs.unlinkSync(path.join(tmpDir, f)));
    fs.rmdirSync(tmpDir);
  }
});

// Helper to add test data
function addTestData() {
  const levelResult = db.prepare('INSERT INTO levels (name_ar, name_en, sort_order) VALUES (?, ?, ?)').run('مستوى اختبار', 'Test Level', 1);
  const levelId = levelResult.lastInsertRowid;

  db.prepare('INSERT INTO level_surahs (level_id, surah_id) VALUES (?, ?)').run(levelId, 114);
  db.prepare('INSERT INTO level_surahs (level_id, surah_id) VALUES (?, ?)').run(levelId, 113);

  const studentResult = db.prepare('INSERT INTO students (name_ar, name_en, level_id) VALUES (?, ?, ?)').run('طالب اختبار', 'Test Student', levelId);
  const studentId = studentResult.lastInsertRowid;

  db.prepare('INSERT INTO progress (student_id, surah_id, status) VALUES (?, ?, ?)').run(studentId, 114, 'MEMORIZED');
  db.prepare('INSERT INTO progress (student_id, surah_id, status) VALUES (?, ?, ?)').run(studentId, 113, 'IN_PROGRESS');

  db.prepare('INSERT INTO student_notes (student_id, content) VALUES (?, ?)').run(studentId, 'ملاحظة اختبار');

  return { levelId, studentId };
}

describe('Export Service', () => {
  describe('exportToExcel', () => {
    test('creates a valid .xlsx file', async () => {
      addTestData();
      const filepath = path.join(tmpDir, 'test-export.xlsx');

      const result = await exportService.exportToExcel(db, filepath);

      expect(result.success).toBe(true);
      expect(result.path).toBe(filepath);
      expect(fs.existsSync(filepath)).toBe(true);
    });

    test('returns correct record counts', async () => {
      addTestData();
      const filepath = path.join(tmpDir, 'test-export-counts.xlsx');

      const result = await exportService.exportToExcel(db, filepath);

      expect(result.counts.students).toBeGreaterThanOrEqual(1);
      expect(result.counts.surahs).toBe(114);
      expect(result.counts.progress).toBeGreaterThanOrEqual(2);
      expect(result.counts.notes).toBeGreaterThanOrEqual(1);
    });

    test('creates file with proper worksheets', async () => {
      addTestData();
      const filepath = path.join(tmpDir, 'test-worksheets.xlsx');
      await exportService.exportToExcel(db, filepath);

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filepath);

      const sheetNames = workbook.worksheets.map(ws => ws.name);
      expect(sheetNames).toContain('Students');
      expect(sheetNames).toContain('Levels');
      expect(sheetNames).toContain('Surahs');
      expect(sheetNames).toContain('Progress');
      expect(sheetNames).toContain('Notes');
      expect(sheetNames).toContain('Summary');
    });

    test('students worksheet contains student data', async () => {
      addTestData();
      const filepath = path.join(tmpDir, 'test-students-sheet.xlsx');
      await exportService.exportToExcel(db, filepath);

      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filepath);

      const sheet = workbook.getWorksheet('Students');
      expect(sheet.rowCount).toBeGreaterThan(1); // header + data rows
    });

    test('exports with no data does not throw', async () => {
      const filepath = path.join(tmpDir, 'test-empty-export.xlsx');
      const result = await exportService.exportToExcel(db, filepath);
      expect(result.success).toBe(true);
      expect(fs.existsSync(filepath)).toBe(true);
    });

    test('logs export to exports_history', async () => {
      addTestData();
      const filepath = path.join(tmpDir, 'test-history.xlsx');
      await exportService.exportToExcel(db, filepath);

      const history = db.prepare('SELECT * FROM exports_history WHERE type = ?').all('excel');
      expect(history.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getAllData', () => {
    test('returns all data as structured object', () => {
      addTestData();
      const data = exportService.getAllData(db);

      expect(data.students).toBeDefined();
      expect(data.students.length).toBeGreaterThanOrEqual(1);
      expect(data.levels).toBeDefined();
      expect(data.surahs).toBeDefined();
      expect(data.surahs.length).toBe(114);
      expect(data.progress).toBeDefined();
      expect(data.notes).toBeDefined();
      expect(data.levelSurahs).toBeDefined();
    });

    test('returns empty arrays when no data', () => {
      const data = exportService.getAllData(db);
      expect(data.students).toEqual([]);
      expect(data.progress).toEqual([]);
      expect(data.notes).toEqual([]);
    });
  });
});
