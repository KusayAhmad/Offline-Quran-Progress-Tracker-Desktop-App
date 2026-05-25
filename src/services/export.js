/**
 * Export service.
 * Generates Excel (.xlsx) exports using exceljs with multiple worksheets.
 */

const ExcelJS = require('exceljs');

/**
 * Export all data to an Excel file.
 * @param {object} db - Database instance
 * @param {string} filepath - Output file path
 * @returns {object} - Result with file path and record counts
 */
async function exportToExcel(db, filepath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Quran Progress Tracker';
  workbook.created = new Date();

  // Students worksheet
  const studentsSheet = workbook.addWorksheet('Students');
  studentsSheet.views = [{ rightToLeft: true }];
  studentsSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'الاسم (عربي)', key: 'name_ar', width: 30 },
    { header: 'Name (EN)', key: 'name_en', width: 25 },
    { header: 'المستوى', key: 'level_name', width: 20 },
    { header: 'ملاحظات', key: 'notes', width: 30 },
    { header: 'تاريخ الإضافة', key: 'created_at', width: 20 }
  ];

  const students = db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.archived = 0
    ORDER BY s.name_ar
  `).all();

  students.forEach(s => {
    studentsSheet.addRow({
      id: s.id,
      name_ar: s.name_ar,
      name_en: s.name_en || '',
      level_name: s.level_name || '',
      notes: s.notes || '',
      created_at: s.created_at || ''
    });
  });

  // Levels worksheet
  const levelsSheet = workbook.addWorksheet('Levels');
  levelsSheet.views = [{ rightToLeft: true }];
  levelsSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'الاسم (عربي)', key: 'name_ar', width: 30 },
    { header: 'Name (EN)', key: 'name_en', width: 25 },
    { header: 'الوصف', key: 'description', width: 40 },
    { header: 'الترتيب', key: 'sort_order', width: 10 }
  ];

  const levels = db.prepare('SELECT * FROM levels ORDER BY sort_order').all();
  levels.forEach(l => {
    levelsSheet.addRow({
      id: l.id,
      name_ar: l.name_ar,
      name_en: l.name_en || '',
      description: l.description || '',
      sort_order: l.sort_order
    });
  });

  // Surahs worksheet
  const surahsSheet = workbook.addWorksheet('Surahs');
  surahsSheet.views = [{ rightToLeft: true }];
  surahsSheet.columns = [
    { header: 'رقم السورة', key: 'surah_no', width: 12 },
    { header: 'الاسم (عربي)', key: 'name_ar', width: 25 },
    { header: 'Name (EN)', key: 'name_en', width: 25 }
  ];

  const surahs = db.prepare('SELECT * FROM surahs ORDER BY surah_no').all();
  surahs.forEach(s => {
    surahsSheet.addRow({
      surah_no: s.surah_no,
      name_ar: s.name_ar,
      name_en: s.name_en
    });
  });

  // Progress worksheet
  const progressSheet = workbook.addWorksheet('Progress');
  progressSheet.views = [{ rightToLeft: true }];
  progressSheet.columns = [
    { header: 'الطالب', key: 'student_name', width: 25 },
    { header: 'السورة', key: 'surah_name', width: 20 },
    { header: 'رقم السورة', key: 'surah_no', width: 12 },
    { header: 'الحالة', key: 'status', width: 18 },
    { header: 'آخر مراجعة', key: 'last_reviewed', width: 20 }
  ];

  const progressData = db.prepare(`
    SELECT p.*, s.name_ar as student_name, su.name_ar as surah_name, su.surah_no
    FROM progress p
    JOIN students s ON p.student_id = s.id
    JOIN surahs su ON p.surah_id = su.id
    WHERE s.archived = 0
    ORDER BY s.name_ar, su.surah_no
  `).all();

  progressData.forEach(p => {
    progressSheet.addRow({
      student_name: p.student_name,
      surah_name: p.surah_name,
      surah_no: p.surah_no,
      status: p.status,
      last_reviewed: p.last_reviewed || ''
    });
  });

  // Notes worksheet
  const notesSheet = workbook.addWorksheet('Notes');
  notesSheet.views = [{ rightToLeft: true }];
  notesSheet.columns = [
    { header: 'الطالب', key: 'student_name', width: 25 },
    { header: 'المحتوى', key: 'content', width: 50 },
    { header: 'التاريخ', key: 'created_at', width: 20 }
  ];

  const notes = db.prepare(`
    SELECT n.*, s.name_ar as student_name
    FROM student_notes n
    JOIN students s ON n.student_id = s.id
    ORDER BY n.created_at DESC
  `).all();

  notes.forEach(n => {
    notesSheet.addRow({
      student_name: n.student_name,
      content: n.content,
      created_at: n.created_at || ''
    });
  });

  // Summary worksheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.views = [{ rightToLeft: true }];
  summarySheet.columns = [
    { header: 'البيان', key: 'label', width: 30 },
    { header: 'القيمة', key: 'value', width: 20 }
  ];

  summarySheet.addRow({ label: 'عدد الطلاب', value: students.length });
  summarySheet.addRow({ label: 'عدد المستويات', value: levels.length });
  summarySheet.addRow({ label: 'عدد السور', value: surahs.length });
  summarySheet.addRow({ label: 'إجمالي سجلات التقدم', value: progressData.length });
  summarySheet.addRow({ label: 'عدد الملاحظات', value: notes.length });
  summarySheet.addRow({ label: 'تاريخ التصدير', value: new Date().toISOString() });

  await workbook.xlsx.writeFile(filepath);

  // Log export
  try {
    db.prepare('INSERT INTO exports_history (type, filename) VALUES (?, ?)').run('excel', filepath);
  } catch (e) {
    // Non-critical
  }

  return {
    success: true,
    path: filepath,
    counts: {
      students: students.length,
      levels: levels.length,
      surahs: surahs.length,
      progress: progressData.length,
      notes: notes.length
    }
  };
}

/**
 * Get all data as a plain object for JSON export.
 */
function getAllData(db) {
  const students = db.prepare('SELECT * FROM students WHERE archived = 0 ORDER BY name_ar').all();
  const levels = db.prepare('SELECT * FROM levels ORDER BY sort_order').all();
  const surahs = db.prepare('SELECT * FROM surahs ORDER BY surah_no').all();
  const progress = db.prepare(`
    SELECT p.* FROM progress p
    JOIN students s ON p.student_id = s.id
    WHERE s.archived = 0
  `).all();
  const notes = db.prepare(`
    SELECT n.* FROM student_notes n
    JOIN students s ON n.student_id = s.id
    WHERE s.archived = 0
  `).all();
  const levelSurahs = db.prepare('SELECT * FROM level_surahs').all();
  const profile = db.prepare('SELECT * FROM profiles LIMIT 1').get() || null;

  return { students, levels, surahs, progress, notes, levelSurahs, profile };
}

module.exports = {
  exportToExcel,
  getAllData
};
