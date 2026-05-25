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
  const studentsService = require('./src/services/students');
  const levelsService = require('./src/services/levels');
  const surahsService = require('./src/services/surahs');
  const notesService = require('./src/services/notes');

  // IPC Handlers - Students
  ipcMain.handle('getStudents', (event, filters) => {
    return studentsService.getAllStudents(db, filters);
  });

  ipcMain.handle('getStudent', (event, id) => {
    return studentsService.getStudent(db, id);
  });

  ipcMain.handle('addStudent', (event, student) => {
    return studentsService.addStudent(db, student);
  });

  ipcMain.handle('updateStudent', (event, student) => {
    const { id, ...data } = student;
    return studentsService.updateStudent(db, id, data);
  });

  ipcMain.handle('archiveStudent', (event, studentId) => {
    return studentsService.archiveStudent(db, studentId);
  });

  ipcMain.handle('searchStudents', (event, query) => {
    return studentsService.searchStudents(db, query);
  });

  ipcMain.handle('getStudentsByLevel', (event, levelId) => {
    return studentsService.getStudentsByLevel(db, levelId);
  });

  ipcMain.handle('getStudentProgress', (event, studentId) => {
    return studentsService.getStudentProgress(db, studentId);
  });

  // IPC Handlers - Levels
  ipcMain.handle('getLevels', () => {
    return levelsService.getAllLevels(db);
  });

  ipcMain.handle('getLevel', (event, id) => {
    return levelsService.getLevel(db, id);
  });

  ipcMain.handle('addLevel', (event, level) => {
    return levelsService.addLevel(db, level);
  });

  ipcMain.handle('updateLevel', (event, level) => {
    const { id, ...data } = level;
    return levelsService.updateLevel(db, id, data);
  });

  ipcMain.handle('deleteLevel', (event, levelId) => {
    return levelsService.deleteLevel(db, levelId);
  });

  ipcMain.handle('duplicateLevel', (event, levelId) => {
    return levelsService.duplicateLevel(db, levelId);
  });

  ipcMain.handle('reorderLevels', (event, orderedIds) => {
    return levelsService.reorderLevels(db, orderedIds);
  });

  // IPC Handlers - Level Surahs
  ipcMain.handle('getLevelSurahs', (event, levelId) => {
    return levelsService.getLevelSurahs(db, levelId);
  });

  ipcMain.handle('addSurahToLevel', (event, levelId, surahId) => {
    return levelsService.addSurahToLevel(db, levelId, surahId);
  });

  ipcMain.handle('removeSurahFromLevel', (event, levelId, surahId) => {
    return levelsService.removeSurahFromLevel(db, levelId, surahId);
  });

  ipcMain.handle('reorderLevelSurahs', (event, levelId, orderedSurahIds) => {
    return levelsService.reorderLevelSurahs(db, levelId, orderedSurahIds);
  });

  // IPC Handlers - Surahs
  ipcMain.handle('getSurahs', () => {
    return surahsService.getAllSurahs(db);
  });

  ipcMain.handle('getSurah', (event, id) => {
    return surahsService.getSurah(db, id);
  });

  ipcMain.handle('updateSurah', (event, id, data) => {
    return surahsService.updateSurah(db, id, data);
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
    return notesService.getStudentNotes(db, studentId);
  });

  ipcMain.handle('addStudentNote', (event, note) => {
    return notesService.addNote(db, note.student_id, note.content, note.created_by);
  });

  ipcMain.handle('deleteStudentNote', (event, noteId) => {
    return notesService.deleteNote(db, noteId);
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
