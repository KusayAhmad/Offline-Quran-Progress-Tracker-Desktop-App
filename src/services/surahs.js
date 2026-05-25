/**
 * Surahs service.
 * List, update, and level mapping operations for surahs.
 */

function getAllSurahs(db) {
  return db.prepare(`
    SELECT s.*, ls.level_id, l.name_ar as level_name
    FROM surahs s
    LEFT JOIN level_surahs ls ON s.id = ls.surah_id
    LEFT JOIN levels l ON ls.level_id = l.id
    ORDER BY s.surah_no
  `).all();
}

function getSurah(db, id) {
  return db.prepare(`
    SELECT s.*, ls.level_id, l.name_ar as level_name
    FROM surahs s
    LEFT JOIN level_surahs ls ON s.id = ls.surah_id
    LEFT JOIN levels l ON ls.level_id = l.id
    WHERE s.id = ?
  `).get(id);
}

function updateSurah(db, id, data) {
  const fields = [];
  const params = [];

  if (data.name_ar !== undefined) { fields.push('name_ar = ?'); params.push(data.name_ar); }
  if (data.name_en !== undefined) { fields.push('name_en = ?'); params.push(data.name_en); }

  if (fields.length > 0) {
    params.push(id);
    db.prepare(`UPDATE surahs SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  }

  // Update level assignment if provided
  if (data.level_id !== undefined) {
    // Remove existing level assignment
    db.prepare('DELETE FROM level_surahs WHERE surah_id = ?').run(id);
    // Add new level assignment if level_id is not null
    if (data.level_id) {
      db.prepare('INSERT INTO level_surahs (level_id, surah_id) VALUES (?, ?)').run(data.level_id, id);
    }
  }

  return { success: true };
}

function getSurahsByLevel(db, levelId) {
  return db.prepare(`
    SELECT s.* FROM surahs s
    INNER JOIN level_surahs ls ON s.id = ls.surah_id
    WHERE ls.level_id = ?
    ORDER BY s.surah_no
  `).all(levelId);
}

module.exports = {
  getAllSurahs,
  getSurah,
  updateSurah,
  getSurahsByLevel
};
