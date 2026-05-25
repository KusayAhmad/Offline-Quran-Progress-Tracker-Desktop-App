/**
 * Levels service.
 * CRUD operations, reorder, duplicate, and surah management for levels.
 */

function getAllLevels(db) {
  return db.prepare('SELECT * FROM levels ORDER BY sort_order').all();
}

function getLevel(db, id) {
  return db.prepare('SELECT * FROM levels WHERE id = ?').get(id);
}

function addLevel(db, data) {
  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM levels').get();
  const sortOrder = data.sort_order !== undefined ? data.sort_order : (maxOrder.max_order || 0) + 1;

  const stmt = db.prepare(
    'INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(
    data.name_ar,
    data.name_en || null,
    data.description || null,
    sortOrder
  );
  return { id: result.lastInsertRowid };
}

function updateLevel(db, id, data) {
  const fields = [];
  const params = [];

  if (data.name_ar !== undefined) { fields.push('name_ar = ?'); params.push(data.name_ar); }
  if (data.name_en !== undefined) { fields.push('name_en = ?'); params.push(data.name_en); }
  if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); params.push(data.sort_order); }

  if (fields.length === 0) return { success: false };

  params.push(id);
  db.prepare(`UPDATE levels SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return { success: true };
}

function deleteLevel(db, id) {
  const studentsCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE level_id = ? AND archived = 0').get(id).count;
  if (studentsCount > 0) {
    return { success: false, error: 'Cannot delete level with assigned students' };
  }

  db.prepare('DELETE FROM level_surahs WHERE level_id = ?').run(id);
  db.prepare('DELETE FROM levels WHERE id = ?').run(id);
  return { success: true };
}

function duplicateLevel(db, id) {
  const level = getLevel(db, id);
  if (!level) return { success: false, error: 'Level not found' };

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max_order FROM levels').get();
  const newOrder = (maxOrder.max_order || 0) + 1;

  const stmt = db.prepare(
    'INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(
    level.name_ar + ' (نسخة)',
    level.name_en ? level.name_en + ' (Copy)' : null,
    level.description,
    newOrder
  );

  const newLevelId = result.lastInsertRowid;

  // Copy surah assignments
  const surahs = db.prepare('SELECT surah_id FROM level_surahs WHERE level_id = ?').all(id);
  const insertSurah = db.prepare('INSERT INTO level_surahs (level_id, surah_id) VALUES (?, ?)');
  for (const s of surahs) {
    insertSurah.run(newLevelId, s.surah_id);
  }

  return { id: newLevelId, success: true };
}

function reorderLevels(db, orderedIds) {
  const stmt = db.prepare('UPDATE levels SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction((ids) => {
    ids.forEach((id, index) => {
      stmt.run(index + 1, id);
    });
  });
  transaction(orderedIds);
  return { success: true };
}

function getLevelSurahs(db, levelId) {
  return db.prepare(`
    SELECT s.* FROM surahs s
    INNER JOIN level_surahs ls ON s.id = ls.surah_id
    WHERE ls.level_id = ?
    ORDER BY s.surah_no
  `).all(levelId);
}

function addSurahToLevel(db, levelId, surahId) {
  try {
    db.prepare('INSERT INTO level_surahs (level_id, surah_id) VALUES (?, ?)').run(levelId, surahId);
    return { success: true };
  } catch (e) {
    if (e.message.includes('UNIQUE constraint')) {
      return { success: false, error: 'Surah already assigned to this level' };
    }
    throw e;
  }
}

function removeSurahFromLevel(db, levelId, surahId) {
  db.prepare('DELETE FROM level_surahs WHERE level_id = ? AND surah_id = ?').run(levelId, surahId);
  return { success: true };
}

function reorderLevelSurahs(db, levelId, orderedSurahIds) {
  // Since level_surahs doesn't have a sort_order column, we handle this by
  // removing and re-inserting in order (the display order is by surah_no)
  const transaction = db.transaction((surahIds) => {
    db.prepare('DELETE FROM level_surahs WHERE level_id = ?').run(levelId);
    const insert = db.prepare('INSERT INTO level_surahs (level_id, surah_id) VALUES (?, ?)');
    surahIds.forEach(surahId => {
      insert.run(levelId, surahId);
    });
  });
  transaction(orderedSurahIds);
  return { success: true };
}

module.exports = {
  getAllLevels,
  getLevel,
  addLevel,
  updateLevel,
  deleteLevel,
  duplicateLevel,
  reorderLevels,
  getLevelSurahs,
  addSurahToLevel,
  removeSurahFromLevel,
  reorderLevelSurahs
};
