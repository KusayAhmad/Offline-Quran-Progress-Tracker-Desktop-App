const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const { initDatabase } = require('./src/db/database');
  const db = initDatabase();

  const stats = require('./src/services/stats');

  // IPC Handlers - Students
  ipcMain.handle('getStudents', () => {
    return db.prepare('SELECT * FROM students WHERE archived = 0 ORDER BY name_ar').all();
  });

  ipcMain.handle('addStudent', (event, student) => {
    const stmt = db.prepare('INSERT INTO students (name_ar, name_en, level_id, notes) VALUES (?, ?, ?, ?)');
    const result = stmt.run(student.name_ar, student.name_en || null, student.level_id, student.notes || null);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('updateStudent', (event, student) => {
    const stmt = db.prepare('UPDATE students SET name_ar = ?, name_en = ?, level_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(student.name_ar, student.name_en, student.level_id, student.notes, student.id);
    return { success: true };
  });

  ipcMain.handle('archiveStudent', (event, studentId) => {
    const stmt = db.prepare('UPDATE students SET archived = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(studentId);
    return { success: true };
  });

  // IPC Handlers - Levels
  ipcMain.handle('getLevels', () => {
    return db.prepare('SELECT * FROM levels ORDER BY sort_order').all();
  });

  ipcMain.handle('addLevel', (event, level) => {
    const stmt = db.prepare('INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)');
    const result = stmt.run(level.name_ar, level.name_en || null, level.description || null, level.sort_order || 0);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('updateLevel', (event, level) => {
    const stmt = db.prepare('UPDATE levels SET name_ar = ?, name_en = ?, description = ?, sort_order = ? WHERE id = ?');
    stmt.run(level.name_ar, level.name_en, level.description, level.sort_order, level.id);
    return { success: true };
  });

  ipcMain.handle('deleteLevel', (event, levelId) => {
    db.prepare('DELETE FROM level_surahs WHERE level_id = ?').run(levelId);
    db.prepare('DELETE FROM levels WHERE id = ?').run(levelId);
    return { success: true };
  });

  // IPC Handlers - Surahs
  ipcMain.handle('getSurahs', () => {
    return db.prepare('SELECT * FROM surahs ORDER BY surah_no').all();
  });

  ipcMain.handle('getLevelSurahs', (event, levelId) => {
    return db.prepare(`
      SELECT s.* FROM surahs s
      INNER JOIN level_surahs ls ON s.id = ls.surah_id
      WHERE ls.level_id = ?
      ORDER BY s.surah_no DESC
    `).all(levelId);
  });

  // IPC Handlers - Progress
  ipcMain.handle('getProgress', (event, studentId) => {
    return db.prepare('SELECT * FROM progress WHERE student_id = ?').all(studentId);
  });

  ipcMain.handle('updateProgress', (event, progress) => {
    const existing = db.prepare('SELECT id FROM progress WHERE student_id = ? AND surah_id = ?').get(progress.student_id, progress.surah_id);
    if (existing) {
      const stmt = db.prepare('UPDATE progress SET status = ?, last_reviewed = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(progress.status, existing.id);
    } else {
      const stmt = db.prepare('INSERT INTO progress (student_id, surah_id, status, last_reviewed) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
      stmt.run(progress.student_id, progress.surah_id, progress.status);
    }
    return { success: true };
  });

  // IPC Handlers - Stats
  ipcMain.handle('getStats', () => {
    return stats.getOverallStats(db);
  });

  // IPC Handlers - Student Notes
  ipcMain.handle('getStudentNotes', (event, studentId) => {
    return db.prepare('SELECT * FROM student_notes WHERE student_id = ? ORDER BY created_at DESC').all(studentId);
  });

  ipcMain.handle('addStudentNote', (event, note) => {
    const stmt = db.prepare('INSERT INTO student_notes (student_id, content) VALUES (?, ?)');
    const result = stmt.run(note.student_id, note.content);
    return { id: result.lastInsertRowid };
  });

  // IPC Handlers - Profile
  ipcMain.handle('getProfile', () => {
    return db.prepare('SELECT * FROM profiles LIMIT 1').get() || null;
  });

  ipcMain.handle('updateProfile', (event, profile) => {
    const existing = db.prepare('SELECT id FROM profiles LIMIT 1').get();
    if (existing) {
      const stmt = db.prepare('UPDATE profiles SET name_ar = ?, name_en = ?, institution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(profile.name_ar, profile.name_en, profile.institution, existing.id);
    } else {
      const stmt = db.prepare('INSERT INTO profiles (name_ar, name_en, institution) VALUES (?, ?, ?)');
      stmt.run(profile.name_ar, profile.name_en, profile.institution);
    }
    return { success: true };
  });

  // IPC Handlers - Export/Import/Backup (placeholders)
  ipcMain.handle('exportExcel', () => { return { success: false, message: 'Not implemented yet' }; });
  ipcMain.handle('exportPDF', () => { return { success: false, message: 'Not implemented yet' }; });
  ipcMain.handle('exportBundle', () => { return { success: false, message: 'Not implemented yet' }; });
  ipcMain.handle('importExcel', () => { return { success: false, message: 'Not implemented yet' }; });
  ipcMain.handle('importBundle', () => { return { success: false, message: 'Not implemented yet' }; });
  ipcMain.handle('backup', () => { return { success: false, message: 'Not implemented yet' }; });
  ipcMain.handle('restore', () => { return { success: false, message: 'Not implemented yet' }; });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
