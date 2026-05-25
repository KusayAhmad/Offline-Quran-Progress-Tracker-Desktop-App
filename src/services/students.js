/**
 * Students service.
 * CRUD operations, search, filter, and progress calculation for students.
 */

function getAllStudents(db, filters = {}) {
  let query = `
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.archived = 0
  `;
  const params = [];

  if (filters.level_id) {
    query += ' AND s.level_id = ?';
    params.push(filters.level_id);
  }

  if (filters.status) {
    query += ` AND s.id IN (
      SELECT DISTINCT student_id FROM progress WHERE status = ?
    )`;
    params.push(filters.status);
  }

  query += ' ORDER BY s.name_ar';
  return db.prepare(query).all(...params);
}

function getStudent(db, id) {
  return db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.id = ?
  `).get(id);
}

function addStudent(db, data) {
  const stmt = db.prepare(
    'INSERT INTO students (name_ar, name_en, level_id, notes) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(
    data.name_ar,
    data.name_en || null,
    data.level_id || null,
    data.notes || null
  );
  return { id: result.lastInsertRowid };
}

function updateStudent(db, id, data) {
  const fields = [];
  const params = [];

  if (data.name_ar !== undefined) { fields.push('name_ar = ?'); params.push(data.name_ar); }
  if (data.name_en !== undefined) { fields.push('name_en = ?'); params.push(data.name_en); }
  if (data.level_id !== undefined) { fields.push('level_id = ?'); params.push(data.level_id); }
  if (data.notes !== undefined) { fields.push('notes = ?'); params.push(data.notes); }

  if (fields.length === 0) return { success: false };

  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const stmt = db.prepare(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...params);
  return { success: true };
}

function archiveStudent(db, id) {
  db.prepare('UPDATE students SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  return { success: true };
}

function searchStudents(db, query) {
  const searchTerm = `%${query}%`;
  return db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.archived = 0
      AND (s.name_ar LIKE ? OR s.name_en LIKE ?)
    ORDER BY s.name_ar
  `).all(searchTerm, searchTerm);
}

function getStudentsByLevel(db, levelId) {
  return db.prepare(`
    SELECT s.*, l.name_ar as level_name
    FROM students s
    LEFT JOIN levels l ON s.level_id = l.id
    WHERE s.level_id = ? AND s.archived = 0
    ORDER BY s.name_ar
  `).all(levelId);
}

function getStudentProgress(db, studentId) {
  const student = getStudent(db, studentId);
  if (!student) return null;

  const progress = db.prepare('SELECT * FROM progress WHERE student_id = ?').all(studentId);

  const totalSurahs = db.prepare('SELECT COUNT(*) as count FROM surahs').get().count;

  const statusCounts = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    MEMORIZED: 0,
    REVIEW_REQUIRED: 0,
    WEAK: 0,
    PERFECT: 0
  };

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
    totalSurahs,
    statusCounts,
    progressPercentage
  };
}

module.exports = {
  getAllStudents,
  getStudent,
  addStudent,
  updateStudent,
  archiveStudent,
  searchStudents,
  getStudentsByLevel,
  getStudentProgress
};
