/**
 * Notes service.
 * CRUD operations for student notes.
 */

function getStudentNotes(db, studentId) {
  return db.prepare(
    'SELECT * FROM student_notes WHERE student_id = ? ORDER BY created_at DESC'
  ).all(studentId);
}

function addNote(db, studentId, content, createdBy) {
  const stmt = db.prepare(
    'INSERT INTO student_notes (student_id, content) VALUES (?, ?)'
  );
  const result = stmt.run(studentId, content);
  return { id: result.lastInsertRowid };
}

function deleteNote(db, noteId) {
  db.prepare('DELETE FROM student_notes WHERE id = ?').run(noteId);
  return { success: true };
}

module.exports = {
  getStudentNotes,
  addNote,
  deleteNote
};
