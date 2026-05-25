/**
 * Import service.
 * Handles importing data from Excel and bundle files with merge/replace modes.
 */

const ExcelJS = require('exceljs');
const AdmZip = require('adm-zip');
const path = require('path');

/**
 * Import data from an Excel file.
 * @param {object} db - Database instance
 * @param {string} filepath - Path to .xlsx file
 * @param {string} mode - 'merge' or 'replace'
 * @returns {object} - Import summary
 */
async function importFromExcel(db, filepath, mode = 'merge') {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);

  const summary = { imported: 0, updated: 0, skipped: 0, conflicts: [] };

  const doImport = db.transaction(() => {
    if (mode === 'replace') {
      // Clear existing data (preserve surahs, clear students, progress, notes, levels)
      db.prepare('DELETE FROM student_notes').run();
      db.prepare('DELETE FROM progress').run();
      db.prepare('DELETE FROM students').run();
      db.prepare('DELETE FROM level_surahs').run();
      db.prepare('DELETE FROM levels').run();
    }

    // Import Levels
    const levelsSheet = workbook.getWorksheet('Levels');
    if (levelsSheet) {
      const levelMap = {};
      levelsSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // skip header
        const nameAr = row.getCell(2).value;
        const nameEn = row.getCell(3).value;
        const description = row.getCell(4).value;
        const sortOrder = row.getCell(5).value;

        if (!nameAr) return;

        if (mode === 'merge') {
          const existing = db.prepare('SELECT id FROM levels WHERE name_ar = ?').get(String(nameAr));
          if (existing) {
            db.prepare('UPDATE levels SET name_en = ?, description = ?, sort_order = ? WHERE id = ?')
              .run(nameEn || null, description || null, sortOrder || 0, existing.id);
            levelMap[String(nameAr)] = existing.id;
            summary.updated++;
          } else {
            const result = db.prepare('INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)')
              .run(String(nameAr), nameEn || null, description || null, sortOrder || 0);
            levelMap[String(nameAr)] = result.lastInsertRowid;
            summary.imported++;
          }
        } else {
          const result = db.prepare('INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)')
            .run(String(nameAr), nameEn || null, description || null, sortOrder || 0);
          levelMap[String(nameAr)] = result.lastInsertRowid;
          summary.imported++;
        }
      });
    }

    // Import Students
    const studentsSheet = workbook.getWorksheet('Students');
    if (studentsSheet) {
      studentsSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // skip header
        const nameAr = row.getCell(2).value;
        const nameEn = row.getCell(3).value;
        const levelName = row.getCell(4).value;
        const notes = row.getCell(5).value;

        if (!nameAr) return;

        // Find level by name
        let levelId = null;
        if (levelName) {
          const level = db.prepare('SELECT id FROM levels WHERE name_ar = ?').get(String(levelName));
          if (level) levelId = level.id;
        }

        if (mode === 'merge') {
          const existing = db.prepare('SELECT id FROM students WHERE name_ar = ? AND archived = 0').get(String(nameAr));
          if (existing) {
            db.prepare('UPDATE students SET name_en = ?, level_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(nameEn || null, levelId, notes || null, existing.id);
            summary.updated++;
          } else {
            db.prepare('INSERT INTO students (name_ar, name_en, level_id, notes) VALUES (?, ?, ?, ?)')
              .run(String(nameAr), nameEn || null, levelId, notes || null);
            summary.imported++;
          }
        } else {
          db.prepare('INSERT INTO students (name_ar, name_en, level_id, notes) VALUES (?, ?, ?, ?)')
            .run(String(nameAr), nameEn || null, levelId, notes || null);
          summary.imported++;
        }
      });
    }

    // Import Progress
    const progressSheet = workbook.getWorksheet('Progress');
    if (progressSheet) {
      progressSheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const studentName = row.getCell(1).value;
        const surahNo = row.getCell(3).value;
        const status = row.getCell(4).value;

        if (!studentName || !surahNo || !status) return;

        const student = db.prepare('SELECT id FROM students WHERE name_ar = ? AND archived = 0').get(String(studentName));
        const surah = db.prepare('SELECT id FROM surahs WHERE surah_no = ?').get(Number(surahNo));

        if (!student || !surah) {
          summary.conflicts.push(`Progress: student "${studentName}" or surah ${surahNo} not found`);
          summary.skipped++;
          return;
        }

        const existing = db.prepare('SELECT id FROM progress WHERE student_id = ? AND surah_id = ?').get(student.id, surah.id);
        if (existing) {
          db.prepare('UPDATE progress SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(String(status), existing.id);
          summary.updated++;
        } else {
          db.prepare('INSERT INTO progress (student_id, surah_id, status) VALUES (?, ?, ?)')
            .run(student.id, surah.id, String(status));
          summary.imported++;
        }
      });
    }
  });

  doImport();

  // Log import
  try {
    const totalRecords = summary.imported + summary.updated;
    db.prepare('INSERT INTO imports_history (type, filename, records_count) VALUES (?, ?, ?)')
      .run('excel', filepath, totalRecords);
  } catch (e) { /* non-critical */ }

  return summary;
}

/**
 * Import data from a bundle (zip) file.
 * @param {object} db - Database instance
 * @param {string} filepath - Path to .zip bundle
 * @param {string} mode - 'merge' or 'replace'
 * @returns {object} - Import summary
 */
async function importFromBundle(db, filepath, mode = 'merge') {
  const zip = new AdmZip(filepath);
  const summary = { imported: 0, updated: 0, skipped: 0, conflicts: [] };

  // Read data.json
  const dataEntry = zip.getEntry('data.json');
  if (!dataEntry) {
    return { ...summary, conflicts: ['data.json not found in bundle'] };
  }

  const data = JSON.parse(dataEntry.getData().toString('utf8'));

  const doImport = db.transaction(() => {
    if (mode === 'replace') {
      db.prepare('DELETE FROM student_notes').run();
      db.prepare('DELETE FROM progress').run();
      db.prepare('DELETE FROM students').run();
      db.prepare('DELETE FROM level_surahs').run();
      db.prepare('DELETE FROM levels').run();
    }

    // Import Levels
    const levelIdMap = {};
    if (data.levels && data.levels.length > 0) {
      for (const level of data.levels) {
        if (mode === 'merge') {
          const existing = db.prepare('SELECT id FROM levels WHERE name_ar = ?').get(level.name_ar);
          if (existing) {
            db.prepare('UPDATE levels SET name_en = ?, description = ?, sort_order = ? WHERE id = ?')
              .run(level.name_en || null, level.description || null, level.sort_order || 0, existing.id);
            levelIdMap[level.id] = existing.id;
            summary.updated++;
          } else {
            const result = db.prepare('INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)')
              .run(level.name_ar, level.name_en || null, level.description || null, level.sort_order || 0);
            levelIdMap[level.id] = result.lastInsertRowid;
            summary.imported++;
          }
        } else {
          const result = db.prepare('INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)')
            .run(level.name_ar, level.name_en || null, level.description || null, level.sort_order || 0);
          levelIdMap[level.id] = result.lastInsertRowid;
          summary.imported++;
        }
      }
    }

    // Import Level-Surahs mappings
    if (data.levelSurahs && data.levelSurahs.length > 0) {
      for (const ls of data.levelSurahs) {
        const newLevelId = levelIdMap[ls.level_id];
        if (!newLevelId) continue;
        const surah = db.prepare('SELECT id FROM surahs WHERE id = ?').get(ls.surah_id);
        if (!surah) continue;

        try {
          db.prepare('INSERT OR IGNORE INTO level_surahs (level_id, surah_id) VALUES (?, ?)')
            .run(newLevelId, ls.surah_id);
        } catch (e) { /* duplicate - ignore */ }
      }
    }

    // Import Students
    const studentIdMap = {};
    if (data.students && data.students.length > 0) {
      for (const student of data.students) {
        const newLevelId = student.level_id ? (levelIdMap[student.level_id] || null) : null;

        if (mode === 'merge') {
          const existing = db.prepare('SELECT id FROM students WHERE name_ar = ? AND archived = 0').get(student.name_ar);
          if (existing) {
            db.prepare('UPDATE students SET name_en = ?, level_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
              .run(student.name_en || null, newLevelId, student.notes || null, existing.id);
            studentIdMap[student.id] = existing.id;
            summary.updated++;
          } else {
            const result = db.prepare('INSERT INTO students (name_ar, name_en, level_id, notes) VALUES (?, ?, ?, ?)')
              .run(student.name_ar, student.name_en || null, newLevelId, student.notes || null);
            studentIdMap[student.id] = result.lastInsertRowid;
            summary.imported++;
          }
        } else {
          const result = db.prepare('INSERT INTO students (name_ar, name_en, level_id, notes) VALUES (?, ?, ?, ?)')
            .run(student.name_ar, student.name_en || null, newLevelId, student.notes || null);
          studentIdMap[student.id] = result.lastInsertRowid;
          summary.imported++;
        }
      }
    }

    // Import Progress
    if (data.progress && data.progress.length > 0) {
      for (const p of data.progress) {
        const newStudentId = studentIdMap[p.student_id];
        if (!newStudentId) {
          summary.skipped++;
          continue;
        }

        const existing = db.prepare('SELECT id FROM progress WHERE student_id = ? AND surah_id = ?').get(newStudentId, p.surah_id);
        if (existing) {
          db.prepare('UPDATE progress SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(p.status, existing.id);
          summary.updated++;
        } else {
          db.prepare('INSERT INTO progress (student_id, surah_id, status, last_reviewed) VALUES (?, ?, ?, ?)')
            .run(newStudentId, p.surah_id, p.status, p.last_reviewed || null);
          summary.imported++;
        }
      }
    }

    // Import Notes
    if (data.notes && data.notes.length > 0) {
      for (const note of data.notes) {
        const newStudentId = studentIdMap[note.student_id];
        if (!newStudentId) {
          summary.skipped++;
          continue;
        }
        db.prepare('INSERT INTO student_notes (student_id, content) VALUES (?, ?)')
          .run(newStudentId, note.content);
        summary.imported++;
      }
    }

    // Import Profile
    if (data.profile) {
      const existing = db.prepare('SELECT id FROM profiles LIMIT 1').get();
      if (existing) {
        db.prepare('UPDATE profiles SET name_ar = ?, name_en = ?, institution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(data.profile.name_ar || null, data.profile.name_en || null, data.profile.institution || null, existing.id);
      } else {
        db.prepare('INSERT INTO profiles (name_ar, name_en, institution) VALUES (?, ?, ?)')
          .run(data.profile.name_ar || null, data.profile.name_en || null, data.profile.institution || null);
      }
    }
  });

  doImport();

  // Log import
  try {
    const totalRecords = summary.imported + summary.updated;
    db.prepare('INSERT INTO imports_history (type, filename, records_count) VALUES (?, ?, ?)')
      .run('bundle', filepath, totalRecords);
  } catch (e) { /* non-critical */ }

  return summary;
}

module.exports = {
  importFromExcel,
  importFromBundle
};
