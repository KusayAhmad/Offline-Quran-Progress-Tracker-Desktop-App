/**
 * Tests for import service.
 * Verifies merge and replace import modes from Excel and bundle.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const exportService = require('../../src/services/export');
const importService = require('../../src/services/import');

let db;
let tmpDir;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  createSchema(db);
  seedDatabase(db);
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quran-import-test-'));
});

afterEach(() => {
  if (db) db.close();
  if (tmpDir && fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    files.forEach(f => {
      const fp = path.join(tmpDir, f);
      if (fs.statSync(fp).isDirectory()) {
        fs.rmSync(fp, { recursive: true });
      } else {
        fs.unlinkSync(fp);
      }
    });
    fs.rmdirSync(tmpDir);
  }
});

function addTestData() {
  db.prepare('INSERT INTO levels (name_ar, name_en, sort_order) VALUES (?, ?, ?)').run('المستوى الأول', 'Level 1', 1);
  const levelId = db.prepare('SELECT id FROM levels WHERE name_ar = ?').get('المستوى الأول').id;

  db.prepare('INSERT INTO students (name_ar, name_en, level_id) VALUES (?, ?, ?)').run('أحمد', 'Ahmed', levelId);
  db.prepare('INSERT INTO students (name_ar, name_en, level_id) VALUES (?, ?, ?)').run('محمد', 'Mohammed', levelId);

  const student1 = db.prepare('SELECT id FROM students WHERE name_ar = ?').get('أحمد').id;
  db.prepare('INSERT INTO progress (student_id, surah_id, status) VALUES (?, ?, ?)').run(student1, 114, 'MEMORIZED');
  db.prepare('INSERT INTO progress (student_id, surah_id, status) VALUES (?, ?, ?)').run(student1, 113, 'IN_PROGRESS');

  return { levelId, studentId: student1 };
}

async function createExportFile() {
  addTestData();
  const filepath = path.join(tmpDir, 'export-for-import.xlsx');
  await exportService.exportToExcel(db, filepath);
  return filepath;
}

describe('Import Service', () => {
  describe('importFromExcel - merge mode', () => {
    test('imports new records', async () => {
      const filepath = await createExportFile();

      // Create a fresh DB to import into
      const db2 = new Database(':memory:');
      db2.pragma('foreign_keys = ON');
      createSchema(db2);
      seedDatabase(db2);

      const summary = await importService.importFromExcel(db2, filepath, 'merge');

      expect(summary.imported).toBeGreaterThan(0);
      const students = db2.prepare('SELECT * FROM students WHERE archived = 0').all();
      expect(students.length).toBeGreaterThanOrEqual(2);

      db2.close();
    });

    test('updates existing records by name', async () => {
      addTestData();
      const filepath = path.join(tmpDir, 'export-for-merge.xlsx');
      await exportService.exportToExcel(db, filepath);

      // Import into same DB - should update existing
      const summary = await importService.importFromExcel(db, filepath, 'merge');

      expect(summary.updated).toBeGreaterThan(0);
    });

    test('handles empty Excel gracefully', async () => {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('Students');
      const filepath = path.join(tmpDir, 'empty.xlsx');
      await workbook.xlsx.writeFile(filepath);

      const summary = await importService.importFromExcel(db, filepath, 'merge');
      expect(summary.imported).toBe(0);
      expect(summary.updated).toBe(0);
    });
  });

  describe('importFromExcel - replace mode', () => {
    test('clears existing data and reimports', async () => {
      const filepath = await createExportFile();

      // Add extra data that should be cleared on replace
      db.prepare('INSERT INTO students (name_ar) VALUES (?)').run('طالب سيحذف');

      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE archived = 0').get().count;
      expect(beforeCount).toBeGreaterThan(2);

      const summary = await importService.importFromExcel(db, filepath, 'replace');

      expect(summary.imported).toBeGreaterThan(0);
      const afterStudents = db.prepare('SELECT * FROM students WHERE archived = 0').all();
      // Should have 2 students from the export, not 3
      expect(afterStudents.length).toBe(2);
    });
  });

  describe('importFromBundle', () => {
    test('imports data from a bundle zip file', async () => {
      addTestData();

      // Create a bundle
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();

      const allData = exportService.getAllData(db);
      zip.addFile('data.json', Buffer.from(JSON.stringify(allData, null, 2), 'utf8'));
      zip.addFile('metadata.json', Buffer.from(JSON.stringify({ version: '1.0.0' }), 'utf8'));

      const bundlePath = path.join(tmpDir, 'test-bundle.zip');
      zip.writeZip(bundlePath);

      // Import into fresh DB
      const db2 = new Database(':memory:');
      db2.pragma('foreign_keys = ON');
      createSchema(db2);
      seedDatabase(db2);

      const summary = await importService.importFromBundle(db2, bundlePath, 'merge');
      expect(summary.imported).toBeGreaterThan(0);

      const students = db2.prepare('SELECT * FROM students WHERE archived = 0').all();
      expect(students.length).toBeGreaterThanOrEqual(2);

      db2.close();
    });

    test('replace mode clears existing data', async () => {
      addTestData();

      const AdmZip = require('adm-zip');
      const zip = new AdmZip();
      const allData = exportService.getAllData(db);
      zip.addFile('data.json', Buffer.from(JSON.stringify(allData, null, 2), 'utf8'));

      const bundlePath = path.join(tmpDir, 'test-replace-bundle.zip');
      zip.writeZip(bundlePath);

      // Add extra student
      db.prepare('INSERT INTO students (name_ar) VALUES (?)').run('طالب إضافي');
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE archived = 0').get().count;
      expect(beforeCount).toBeGreaterThan(2);

      const summary = await importService.importFromBundle(db, bundlePath, 'replace');

      expect(summary.imported).toBeGreaterThan(0);
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE archived = 0').get().count;
      expect(afterCount).toBe(2);
    });

    test('returns error when data.json missing from bundle', async () => {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();
      zip.addFile('metadata.json', Buffer.from('{}', 'utf8'));

      const bundlePath = path.join(tmpDir, 'invalid-bundle.zip');
      zip.writeZip(bundlePath);

      const summary = await importService.importFromBundle(db, bundlePath, 'merge');
      expect(summary.conflicts.length).toBeGreaterThan(0);
    });

    test('logs import to imports_history', async () => {
      addTestData();
      const AdmZip = require('adm-zip');
      const zip = new AdmZip();
      const allData = exportService.getAllData(db);
      zip.addFile('data.json', Buffer.from(JSON.stringify(allData, null, 2), 'utf8'));

      const bundlePath = path.join(tmpDir, 'history-bundle.zip');
      zip.writeZip(bundlePath);

      const db2 = new Database(':memory:');
      db2.pragma('foreign_keys = ON');
      createSchema(db2);
      seedDatabase(db2);

      await importService.importFromBundle(db2, bundlePath, 'merge');

      const history = db2.prepare('SELECT * FROM imports_history').all();
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].type).toBe('bundle');

      db2.close();
    });
  });
});
