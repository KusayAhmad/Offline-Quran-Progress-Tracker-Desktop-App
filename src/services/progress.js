/**
 * Progress service.
 * CRUD operations for student progress tracking and matrix data retrieval.
 */

const VALID_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'MEMORIZED', 'REVIEW_REQUIRED', 'WEAK', 'PERFECT'];

/**
 * Get progress matrix for a given level (students x surahs grid).
 * Returns students, surahs, and a map of progress entries.
 */
function getProgressMatrix(db, filters = {}) {
  let students;
  let surahs;

  if (filters.level_id) {
    students = db.prepare(`
      SELECT s.id, s.name_ar, s.name_en
      FROM students s
      WHERE s.level_id = ? AND s.archived = 0
      ORDER BY s.name_ar
    `).all(filters.level_id);

    surahs = db.prepare(`
      SELECT su.id, su.surah_no, su.name_ar, su.name_en
      FROM surahs su
      INNER JOIN level_surahs ls ON su.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY su.surah_no
    `).all(filters.level_id);
  } else {
    students = db.prepare(`
      SELECT s.id, s.name_ar, s.name_en
      FROM students s
      WHERE s.archived = 0
      ORDER BY s.name_ar
    `).all();

    surahs = db.prepare(`
      SELECT id, surah_no, name_ar, name_en FROM surahs ORDER BY surah_no
    `).all();
  }

  const studentIds = students.map(s => s.id);
  const surahIds = surahs.map(s => s.id);

  let progress = [];
  if (studentIds.length > 0 && surahIds.length > 0) {
    progress = db.prepare(`
      SELECT student_id, surah_id, status, last_reviewed
      FROM progress
      WHERE student_id IN (${studentIds.map(() => '?').join(',')})
        AND surah_id IN (${surahIds.map(() => '?').join(',')})
    `).all(...studentIds, ...surahIds);
  }

  // Build a map: { "studentId_surahId": { status, last_reviewed } }
  const progressMap = {};
  for (const p of progress) {
    progressMap[`${p.student_id}_${p.surah_id}`] = {
      status: p.status,
      last_reviewed: p.last_reviewed
    };
  }

  return { students, surahs, progressMap };
}

/**
 * Get progress for a single student across all surahs (or level surahs).
 */
function getStudentProgress(db, studentId) {
  const student = db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) return null;

  let surahs;
  if (student.level_id) {
    surahs = db.prepare(`
      SELECT su.id, su.surah_no, su.name_ar, su.name_en
      FROM surahs su
      INNER JOIN level_surahs ls ON su.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY su.surah_no
    `).all(student.level_id);
  } else {
    surahs = db.prepare('SELECT id, surah_no, name_ar, name_en FROM surahs ORDER BY surah_no').all();
  }

  const progress = db.prepare('SELECT surah_id, status, last_reviewed FROM progress WHERE student_id = ?').all(studentId);
  const progressMap = {};
  for (const p of progress) {
    progressMap[p.surah_id] = { status: p.status, last_reviewed: p.last_reviewed };
  }

  const totalSurahs = surahs.length;
  const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, MEMORIZED: 0, REVIEW_REQUIRED: 0, WEAK: 0, PERFECT: 0 };

  for (const surah of surahs) {
    const entry = progressMap[surah.id];
    if (entry) {
      statusCounts[entry.status] = (statusCounts[entry.status] || 0) + 1;
    } else {
      statusCounts.NOT_STARTED++;
    }
  }

  const memorizedTotal = statusCounts.MEMORIZED + statusCounts.PERFECT;
  const progressPercentage = totalSurahs > 0 ? Math.round((memorizedTotal / totalSurahs) * 100) : 0;

  return { student, surahs, progressMap, totalSurahs, statusCounts, progressPercentage };
}

/**
 * Get progress for a single surah across all students.
 */
function getSurahProgress(db, surahId) {
  const surah = db.prepare('SELECT * FROM surahs WHERE id = ?').get(surahId);
  if (!surah) return null;

  const students = db.prepare(`
    SELECT s.id, s.name_ar, s.name_en, s.level_id
    FROM students s
    WHERE s.archived = 0
    ORDER BY s.name_ar
  `).all();

  const progress = db.prepare('SELECT student_id, status, last_reviewed FROM progress WHERE surah_id = ?').all(surahId);
  const progressMap = {};
  for (const p of progress) {
    progressMap[p.student_id] = { status: p.status, last_reviewed: p.last_reviewed };
  }

  return { surah, students, progressMap };
}

/**
 * Get progress for all students in a level.
 */
function getLevelProgress(db, levelId) {
  const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(levelId);
  if (!level) return null;

  return getProgressMatrix(db, { level_id: levelId });
}

/**
 * Update progress for a single student-surah pair.
 */
function updateProgress(db, studentId, surahId, data) {
  if (!data || !data.status) {
    return { success: false, error: 'Status is required' };
  }

  if (!VALID_STATUSES.includes(data.status)) {
    return { success: false, error: 'Invalid status' };
  }

  const existing = db.prepare('SELECT id FROM progress WHERE student_id = ? AND surah_id = ?').get(studentId, surahId);

  if (existing) {
    db.prepare(`
      UPDATE progress
      SET status = ?, last_reviewed = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.status, existing.id);
  } else {
    db.prepare(`
      INSERT INTO progress (student_id, surah_id, status, last_reviewed)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).run(studentId, surahId, data.status);
  }

  return { success: true };
}

/**
 * Bulk update progress for multiple student-surah pairs.
 */
function bulkUpdateProgress(db, updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: false, error: 'Updates array is required' };
  }

  const results = [];
  const transaction = db.transaction((items) => {
    for (const item of items) {
      const result = updateProgress(db, item.student_id, item.surah_id, { status: item.status });
      results.push(result);
    }
  });

  transaction(updates);
  return { success: true, count: results.length };
}

/**
 * Get progress statistics for a student.
 */
function getProgressStats(db, studentId) {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
  if (!student) return null;

  let totalSurahs;
  if (student.level_id) {
    totalSurahs = db.prepare('SELECT COUNT(*) as count FROM level_surahs WHERE level_id = ?').get(student.level_id).count;
  } else {
    totalSurahs = db.prepare('SELECT COUNT(*) as count FROM surahs').get().count;
  }

  const progress = db.prepare('SELECT status, COUNT(*) as count FROM progress WHERE student_id = ? GROUP BY status').all(studentId);

  const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, MEMORIZED: 0, REVIEW_REQUIRED: 0, WEAK: 0, PERFECT: 0 };
  let trackedCount = 0;

  for (const p of progress) {
    statusCounts[p.status] = p.count;
    trackedCount += p.count;
  }

  statusCounts.NOT_STARTED = Math.max(0, totalSurahs - trackedCount);

  const memorizedTotal = statusCounts.MEMORIZED + statusCounts.PERFECT;
  const progressPercentage = totalSurahs > 0 ? Math.round((memorizedTotal / totalSurahs) * 100) : 0;

  return {
    student_id: studentId,
    totalSurahs,
    statusCounts,
    progressPercentage,
    memorizedTotal,
    trackedCount
  };
}

module.exports = {
  getProgressMatrix,
  getStudentProgress,
  getSurahProgress,
  getLevelProgress,
  updateProgress,
  bulkUpdateProgress,
  getProgressStats,
  VALID_STATUSES
};
