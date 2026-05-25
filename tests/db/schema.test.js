/**
 * Tests for database schema creation and seeding.
 * Uses a temporary in-memory database to verify schema and seed data.
 */

const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');

let db;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
});

afterEach(() => {
  if (db) {
    db.close();
  }
});

describe('Database Schema', () => {
  test('creates all required tables', () => {
    createSchema(db);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all().map(t => t.name);

    expect(tables).toContain('profiles');
    expect(tables).toContain('levels');
    expect(tables).toContain('surahs');
    expect(tables).toContain('level_surahs');
    expect(tables).toContain('students');
    expect(tables).toContain('progress');
    expect(tables).toContain('student_notes');
    expect(tables).toContain('exports_history');
    expect(tables).toContain('imports_history');
  });

  test('creates proper indexes', () => {
    createSchema(db);

    const indexes = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'"
    ).all().map(i => i.name);

    expect(indexes).toContain('idx_students_level');
    expect(indexes).toContain('idx_students_archived');
    expect(indexes).toContain('idx_progress_student');
    expect(indexes).toContain('idx_progress_surah');
    expect(indexes).toContain('idx_progress_status');
    expect(indexes).toContain('idx_level_surahs_level');
    expect(indexes).toContain('idx_level_surahs_surah');
    expect(indexes).toContain('idx_student_notes_student');
  });

  test('levels table has correct columns', () => {
    createSchema(db);

    const columns = db.prepare("PRAGMA table_info(levels)").all();
    const colNames = columns.map(c => c.name);

    expect(colNames).toContain('id');
    expect(colNames).toContain('name_ar');
    expect(colNames).toContain('name_en');
    expect(colNames).toContain('description');
    expect(colNames).toContain('sort_order');
    expect(colNames).toContain('created_at');
  });

  test('surahs table has correct columns', () => {
    createSchema(db);

    const columns = db.prepare("PRAGMA table_info(surahs)").all();
    const colNames = columns.map(c => c.name);

    expect(colNames).toContain('id');
    expect(colNames).toContain('surah_no');
    expect(colNames).toContain('name_ar');
    expect(colNames).toContain('name_en');
  });

  test('progress table has status column with default NOT_STARTED', () => {
    createSchema(db);

    const columns = db.prepare("PRAGMA table_info(progress)").all();
    const statusCol = columns.find(c => c.name === 'status');

    expect(statusCol).toBeDefined();
    expect(statusCol.dflt_value).toBe("'NOT_STARTED'");
  });

  test('students table has archived column with default 0', () => {
    createSchema(db);

    const columns = db.prepare("PRAGMA table_info(students)").all();
    const archivedCol = columns.find(c => c.name === 'archived');

    expect(archivedCol).toBeDefined();
    expect(archivedCol.dflt_value).toBe('0');
  });
});

describe('Database Seeding', () => {
  beforeEach(() => {
    createSchema(db);
  });

  test('seeds 5 default levels', () => {
    seedDatabase(db);

    const levels = db.prepare('SELECT * FROM levels ORDER BY sort_order').all();
    expect(levels).toHaveLength(5);
    expect(levels[0].name_ar).toBe('المستوى الأول');
    expect(levels[0].name_en).toBe('Level 1');
    expect(levels[4].name_ar).toBe('المستوى الخامس');
    expect(levels[4].name_en).toBe('Level 5');
  });

  test('seeds all 114 surahs', () => {
    seedDatabase(db);

    const surahs = db.prepare('SELECT * FROM surahs ORDER BY surah_no').all();
    expect(surahs).toHaveLength(114);
    expect(surahs[0].surah_no).toBe(1);
    expect(surahs[0].name_ar).toBe('الفاتحة');
    expect(surahs[0].name_en).toBe('Al-Fatihah');
    expect(surahs[113].surah_no).toBe(114);
    expect(surahs[113].name_ar).toBe('الناس');
    expect(surahs[113].name_en).toBe('An-Nas');
  });

  test('creates correct level-surah mappings for Level 1 (16 surahs)', () => {
    seedDatabase(db);

    const level1 = db.prepare('SELECT id FROM levels WHERE sort_order = 1').get();
    const level1Surahs = db.prepare(`
      SELECT s.surah_no FROM surahs s
      JOIN level_surahs ls ON s.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY s.surah_no
    `).all(level1.id);

    expect(level1Surahs).toHaveLength(16);
    expect(level1Surahs[0].surah_no).toBe(99);
    expect(level1Surahs[15].surah_no).toBe(114);
  });

  test('creates correct level-surah mappings for Level 2 (12 surahs)', () => {
    seedDatabase(db);

    const level2 = db.prepare('SELECT id FROM levels WHERE sort_order = 2').get();
    const level2Surahs = db.prepare(`
      SELECT s.surah_no FROM surahs s
      JOIN level_surahs ls ON s.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY s.surah_no
    `).all(level2.id);

    expect(level2Surahs).toHaveLength(12);
    expect(level2Surahs[0].surah_no).toBe(87);
    expect(level2Surahs[11].surah_no).toBe(98);
  });

  test('creates correct level-surah mappings for Level 3 (5 surahs)', () => {
    seedDatabase(db);

    const level3 = db.prepare('SELECT id FROM levels WHERE sort_order = 3').get();
    const level3Surahs = db.prepare(`
      SELECT s.surah_no FROM surahs s
      JOIN level_surahs ls ON s.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY s.surah_no
    `).all(level3.id);

    expect(level3Surahs).toHaveLength(5);
    expect(level3Surahs[0].surah_no).toBe(82);
    expect(level3Surahs[4].surah_no).toBe(86);
  });

  test('creates correct level-surah mappings for Level 4 (4 surahs)', () => {
    seedDatabase(db);

    const level4 = db.prepare('SELECT id FROM levels WHERE sort_order = 4').get();
    const level4Surahs = db.prepare(`
      SELECT s.surah_no FROM surahs s
      JOIN level_surahs ls ON s.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY s.surah_no
    `).all(level4.id);

    expect(level4Surahs).toHaveLength(4);
    expect(level4Surahs[0].surah_no).toBe(78);
    expect(level4Surahs[3].surah_no).toBe(81);
  });

  test('creates correct level-surah mappings for Level 5 (77 surahs)', () => {
    seedDatabase(db);

    const level5 = db.prepare('SELECT id FROM levels WHERE sort_order = 5').get();
    const level5Surahs = db.prepare(`
      SELECT s.surah_no FROM surahs s
      JOIN level_surahs ls ON s.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY s.surah_no
    `).all(level5.id);

    expect(level5Surahs).toHaveLength(77);
    expect(level5Surahs[0].surah_no).toBe(1);
    expect(level5Surahs[76].surah_no).toBe(77);
  });

  test('total level-surah mappings cover all 114 surahs', () => {
    seedDatabase(db);

    const totalMappings = db.prepare('SELECT COUNT(*) as count FROM level_surahs').get().count;
    expect(totalMappings).toBe(114);
  });

  test('does not re-seed if data already exists', () => {
    seedDatabase(db);
    seedDatabase(db); // Call again

    const levels = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;
    expect(levels).toBe(5);
  });
});

describe('Stats Service', () => {
  const stats = require('../../src/services/stats');

  beforeEach(() => {
    createSchema(db);
    seedDatabase(db);
  });

  test('getOverallStats returns correct initial values', () => {
    const result = stats.getOverallStats(db);

    expect(result.totalStudents).toBe(0);
    expect(result.totalLevels).toBe(5);
    expect(result.totalSurahs).toBe(114);
    expect(result.weakStudents).toBe(0);
    expect(result.reviewRequired).toBe(0);
    expect(result.memorizedCount).toBe(0);
    expect(result.perfectCount).toBe(0);
  });

  test('getOverallStats reflects added students', () => {
    db.prepare('INSERT INTO students (name_ar, level_id) VALUES (?, ?)').run('أحمد', 1);
    db.prepare('INSERT INTO students (name_ar, level_id) VALUES (?, ?)').run('محمد', 2);

    const result = stats.getOverallStats(db);
    expect(result.totalStudents).toBe(2);
  });

  test('getRecentUpdates returns empty list initially', () => {
    const updates = stats.getRecentUpdates(db);
    expect(updates).toHaveLength(0);
  });

  test('getWeakStudents returns empty list initially', () => {
    const weak = stats.getWeakStudents(db);
    expect(weak).toHaveLength(0);
  });

  test('getReviewRequiredStudents returns empty list initially', () => {
    const review = stats.getReviewRequiredStudents(db);
    expect(review).toHaveLength(0);
  });
});
