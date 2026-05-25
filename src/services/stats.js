/**
 * Statistics service.
 * Provides overall stats, recent updates, and filtered student lists.
 */

function getOverallStats(db) {
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students WHERE archived = 0').get().count;
  const totalLevels = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;
  const totalSurahs = db.prepare('SELECT COUNT(*) as count FROM surahs').get().count;

  const weakStudents = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count FROM progress WHERE status = 'WEAK'
  `).get().count;

  const reviewRequired = db.prepare(`
    SELECT COUNT(DISTINCT student_id) as count FROM progress WHERE status = 'REVIEW_REQUIRED'
  `).get().count;

  const memorizedCount = db.prepare(`
    SELECT COUNT(*) as count FROM progress WHERE status = 'MEMORIZED'
  `).get().count;

  const perfectCount = db.prepare(`
    SELECT COUNT(*) as count FROM progress WHERE status = 'PERFECT'
  `).get().count;

  return {
    totalStudents,
    totalLevels,
    totalSurahs,
    weakStudents,
    reviewRequired,
    memorizedCount,
    perfectCount
  };
}

function getRecentUpdates(db, limit = 10) {
  return db.prepare(`
    SELECT p.*, s.name_ar as student_name, su.name_ar as surah_name
    FROM progress p
    JOIN students s ON p.student_id = s.id
    JOIN surahs su ON p.surah_id = su.id
    ORDER BY p.updated_at DESC
    LIMIT ?
  `).all(limit);
}

function getWeakStudents(db) {
  return db.prepare(`
    SELECT DISTINCT s.* FROM students s
    JOIN progress p ON s.id = p.student_id
    WHERE p.status = 'WEAK' AND s.archived = 0
    ORDER BY s.name_ar
  `).all();
}

function getReviewRequiredStudents(db) {
  return db.prepare(`
    SELECT DISTINCT s.* FROM students s
    JOIN progress p ON s.id = p.student_id
    WHERE p.status = 'REVIEW_REQUIRED' AND s.archived = 0
    ORDER BY s.name_ar
  `).all();
}

module.exports = { getOverallStats, getRecentUpdates, getWeakStudents, getReviewRequiredStudents };
