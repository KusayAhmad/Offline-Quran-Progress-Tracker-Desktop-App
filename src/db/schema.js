/**
 * Database schema creation module.
 * Creates all required tables and indexes for the Quran Progress Tracker.
 */

function createSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT,
      name_en TEXT,
      institution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS surahs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      surah_no INTEGER NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS level_surahs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_id INTEGER NOT NULL,
      surah_id INTEGER NOT NULL,
      FOREIGN KEY (level_id) REFERENCES levels(id),
      FOREIGN KEY (surah_id) REFERENCES surahs(id),
      UNIQUE(level_id, surah_id)
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_ar TEXT NOT NULL,
      name_en TEXT,
      level_id INTEGER,
      notes TEXT,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (level_id) REFERENCES levels(id)
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      surah_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      last_reviewed DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (surah_id) REFERENCES surahs(id),
      UNIQUE(student_id, surah_id)
    );

    CREATE TABLE IF NOT EXISTS student_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS exports_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS imports_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      filename TEXT,
      records_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_students_level ON students(level_id);
    CREATE INDEX IF NOT EXISTS idx_students_archived ON students(archived);
    CREATE INDEX IF NOT EXISTS idx_progress_student ON progress(student_id);
    CREATE INDEX IF NOT EXISTS idx_progress_surah ON progress(surah_id);
    CREATE INDEX IF NOT EXISTS idx_progress_status ON progress(status);
    CREATE INDEX IF NOT EXISTS idx_level_surahs_level ON level_surahs(level_id);
    CREATE INDEX IF NOT EXISTS idx_level_surahs_surah ON level_surahs(surah_id);
    CREATE INDEX IF NOT EXISTS idx_student_notes_student ON student_notes(student_id);
  `);
}

module.exports = { createSchema };
