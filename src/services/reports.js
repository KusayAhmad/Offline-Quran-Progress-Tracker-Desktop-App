/**
 * Reports service.
 * Generates structured reports for students, classes, levels, and overall progress.
 */

/**
 * Get detailed report for a single student.
 */
function getStudentReport(db, studentId) {
  const student = db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.id = ?
  `).get(studentId);

  if (!student) return null;

  const progress = db.prepare(`
    SELECT p.*, su.name_ar as surah_name, su.surah_no
    FROM progress p
    JOIN surahs su ON p.surah_id = su.id
    WHERE p.student_id = ?
    ORDER BY su.surah_no
  `).all(studentId);

  const notes = db.prepare(
    'SELECT * FROM student_notes WHERE student_id = ? ORDER BY created_at DESC'
  ).all(studentId);

  const totalSurahs = db.prepare('SELECT COUNT(*) as count FROM surahs').get().count;

  const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, MEMORIZED: 0, REVIEW_REQUIRED: 0, WEAK: 0, PERFECT: 0 };
  progress.forEach(p => {
    if (statusCounts[p.status] !== undefined) {
      statusCounts[p.status]++;
    }
  });
  statusCounts.NOT_STARTED = totalSurahs - progress.length;

  const memorizedTotal = statusCounts.MEMORIZED + statusCounts.PERFECT;
  const progressPercentage = totalSurahs > 0 ? Math.round((memorizedTotal / totalSurahs) * 100) : 0;

  return {
    student,
    progress,
    notes,
    totalSurahs,
    statusCounts,
    progressPercentage,
    memorizedTotal
  };
}

/**
 * Get class-wide report (all active students).
 */
function getClassReport(db, profileId) {
  const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId || 1) || null;

  const students = db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.archived = 0
    ORDER BY s.name_ar
  `).all();

  const totalSurahs = db.prepare('SELECT COUNT(*) as count FROM surahs').get().count;

  const studentSummaries = students.map(student => {
    const progress = db.prepare(
      'SELECT status, COUNT(*) as count FROM progress WHERE student_id = ? GROUP BY status'
    ).all(student.id);

    const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, MEMORIZED: 0, REVIEW_REQUIRED: 0, WEAK: 0, PERFECT: 0 };
    let tracked = 0;
    progress.forEach(p => {
      statusCounts[p.status] = p.count;
      tracked += p.count;
    });
    statusCounts.NOT_STARTED = totalSurahs - tracked;

    const memorizedTotal = statusCounts.MEMORIZED + statusCounts.PERFECT;
    const progressPercentage = totalSurahs > 0 ? Math.round((memorizedTotal / totalSurahs) * 100) : 0;

    return {
      ...student,
      statusCounts,
      progressPercentage,
      memorizedTotal
    };
  });

  return {
    profile,
    students: studentSummaries,
    totalStudents: students.length,
    totalSurahs
  };
}

/**
 * Get level progress summary.
 */
function getLevelReport(db, levelId) {
  const level = db.prepare('SELECT * FROM levels WHERE id = ?').get(levelId);
  if (!level) return null;

  const students = db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.level_id = ? AND s.archived = 0
    ORDER BY s.name_ar
  `).all(levelId);

  const surahs = db.prepare(`
    SELECT su.* FROM surahs su
    INNER JOIN level_surahs ls ON su.id = ls.surah_id
    WHERE ls.level_id = ?
    ORDER BY su.surah_no
  `).all(levelId);

  const totalSurahs = surahs.length;

  const studentSummaries = students.map(student => {
    const progress = db.prepare(`
      SELECT p.status, COUNT(*) as count
      FROM progress p
      INNER JOIN level_surahs ls ON p.surah_id = ls.surah_id
      WHERE p.student_id = ? AND ls.level_id = ?
      GROUP BY p.status
    `).all(student.id, levelId);

    const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, MEMORIZED: 0, REVIEW_REQUIRED: 0, WEAK: 0, PERFECT: 0 };
    let tracked = 0;
    progress.forEach(p => {
      statusCounts[p.status] = p.count;
      tracked += p.count;
    });
    statusCounts.NOT_STARTED = totalSurahs - tracked;

    const memorizedTotal = statusCounts.MEMORIZED + statusCounts.PERFECT;
    const progressPercentage = totalSurahs > 0 ? Math.round((memorizedTotal / totalSurahs) * 100) : 0;

    return {
      ...student,
      statusCounts,
      progressPercentage,
      memorizedTotal
    };
  });

  return {
    level,
    surahs,
    students: studentSummaries,
    totalStudents: students.length,
    totalSurahs
  };
}

/**
 * Get report of students/surahs with WEAK status.
 */
function getWeakReport(db) {
  const entries = db.prepare(`
    SELECT p.*, s.name_ar as student_name, s.name_en as student_name_en,
           su.name_ar as surah_name, su.surah_no,
           l.name_ar as level_name
    FROM progress p
    JOIN students s ON p.student_id = s.id
    JOIN surahs su ON p.surah_id = su.id
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE p.status = 'WEAK' AND s.archived = 0
    ORDER BY s.name_ar, su.surah_no
  `).all();

  const studentCount = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count FROM progress p
    JOIN students s ON p.student_id = s.id
    WHERE p.status = 'WEAK' AND s.archived = 0
  `).get().count;

  return {
    entries,
    totalEntries: entries.length,
    studentCount
  };
}

/**
 * Get report of students/surahs with REVIEW_REQUIRED status.
 */
function getReviewNeededReport(db) {
  const entries = db.prepare(`
    SELECT p.*, s.name_ar as student_name, s.name_en as student_name_en,
           su.name_ar as surah_name, su.surah_no,
           l.name_ar as level_name
    FROM progress p
    JOIN students s ON p.student_id = s.id
    JOIN surahs su ON p.surah_id = su.id
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE p.status = 'REVIEW_REQUIRED' AND s.archived = 0
    ORDER BY s.name_ar, su.surah_no
  `).all();

  const studentCount = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count FROM progress p
    JOIN students s ON p.student_id = s.id
    WHERE p.status = 'REVIEW_REQUIRED' AND s.archived = 0
  `).get().count;

  return {
    entries,
    totalEntries: entries.length,
    studentCount
  };
}

/**
 * Get global summary statistics.
 */
function getGlobalSummary(db) {
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students WHERE archived = 0').get().count;
  const totalLevels = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;
  const totalSurahs = db.prepare('SELECT COUNT(*) as count FROM surahs').get().count;

  const statusDistribution = db.prepare(`
    SELECT status, COUNT(*) as count FROM progress GROUP BY status
  `).all();

  const statusCounts = { NOT_STARTED: 0, IN_PROGRESS: 0, MEMORIZED: 0, REVIEW_REQUIRED: 0, WEAK: 0, PERFECT: 0 };
  statusDistribution.forEach(row => {
    statusCounts[row.status] = row.count;
  });

  const totalProgressEntries = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const totalPossible = totalStudents * totalSurahs;
  statusCounts.NOT_STARTED = totalPossible - totalProgressEntries;

  const memorizedTotal = statusCounts.MEMORIZED + statusCounts.PERFECT;
  const overallPercentage = totalPossible > 0 ? Math.round((memorizedTotal / totalPossible) * 100) : 0;

  const levelStats = db.prepare(`
    SELECT l.id, l.name_ar, COUNT(DISTINCT s.id) as student_count
    FROM levels l
    LEFT JOIN students s ON s.level_id = l.id AND s.archived = 0
    GROUP BY l.id
    ORDER BY l.sort_order
  `).all();

  return {
    totalStudents,
    totalLevels,
    totalSurahs,
    statusCounts,
    memorizedTotal,
    overallPercentage,
    levelStats
  };
}

module.exports = {
  getStudentReport,
  getClassReport,
  getLevelReport,
  getWeakReport,
  getReviewNeededReport,
  getGlobalSummary
};
