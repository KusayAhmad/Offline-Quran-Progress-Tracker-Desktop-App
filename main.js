const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let db;

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
  db = initDatabase();

  const stats = require('./src/services/stats');
  const studentsService = require('./src/services/students');
  const levelsService = require('./src/services/levels');
  const surahsService = require('./src/services/surahs');
  const notesService = require('./src/services/notes');
  const progressService = require('./src/services/progress');

  // IPC Handlers - Students
  ipcMain.handle('getStudents', (event, filters) => {
    return studentsService.getAllStudents(db, filters);
  });

  ipcMain.handle('getStudent', (event, id) => {
    return studentsService.getStudent(db, id);
  });

  ipcMain.handle('addStudent', (event, student) => {
    if (!student || typeof student !== 'object') {
      return { success: false, error: 'Invalid student data' };
    }
    if (!student.name_ar || typeof student.name_ar !== 'string' || student.name_ar.trim() === '') {
      return { success: false, error: 'Student name (name_ar) is required' };
    }
    return studentsService.addStudent(db, student);
  });

  ipcMain.handle('updateStudent', (event, student) => {
    if (!student || typeof student !== 'object') {
      return { success: false, error: 'Invalid student data' };
    }
    if (!student.id || typeof student.id !== 'number') {
      return { success: false, error: 'Student id is required and must be a number' };
    }
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
    if (!progress || typeof progress !== 'object') {
      return { success: false, error: 'Invalid progress data' };
    }
    if (progress.student_id == null || progress.surah_id == null || !progress.status) {
      return { success: false, error: 'student_id, surah_id, and status are required' };
    }
    return progressService.updateProgress(db, progress.student_id, progress.surah_id, { status: progress.status });
  });

  ipcMain.handle('getProgressMatrix', (event, filters) => {
    return progressService.getProgressMatrix(db, filters);
  });

  ipcMain.handle('getProgressMatrixStudent', (event, studentId) => {
    return progressService.getStudentProgress(db, studentId);
  });

  ipcMain.handle('getProgressMatrixSurah', (event, surahId) => {
    return progressService.getSurahProgress(db, surahId);
  });

  ipcMain.handle('getProgressMatrixLevel', (event, levelId) => {
    return progressService.getLevelProgress(db, levelId);
  });

  ipcMain.handle('bulkUpdateProgress', (event, updates) => {
    return progressService.bulkUpdateProgress(db, updates);
  });

  ipcMain.handle('getProgressStats', (event, studentId) => {
    return progressService.getProgressStats(db, studentId);
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

  // IPC Handlers - Export/Import/Backup
  const reportsService = require('./src/services/reports');
  const exportService = require('./src/services/export');
  const exportPdfService = require('./src/services/export-pdf');
  const exportBundleService = require('./src/services/export-bundle');
  const importService = require('./src/services/import');
  const backupService = require('./src/services/backup');
  const settingsService = require('./src/services/settings');

  // Get DB path for backup operations
  let dbPath;
  try {
    dbPath = path.join(app.getPath('userData'), 'quran-tracker.db');
  } catch (e) {
    dbPath = path.join(__dirname, 'quran-tracker.db');
  }

  let backupDir;
  try {
    backupDir = path.join(app.getPath('userData'), 'backups');
  } catch (e) {
    backupDir = path.join(__dirname, 'backups');
  }

  // Reports
  ipcMain.handle('getClassReport', () => {
    return reportsService.getClassReport(db);
  });

  ipcMain.handle('getWeakReport', () => {
    return reportsService.getWeakReport(db);
  });

  ipcMain.handle('getReviewReport', () => {
    return reportsService.getReviewNeededReport(db);
  });

  ipcMain.handle('getGlobalSummary', () => {
    return reportsService.getGlobalSummary(db);
  });

  // Settings
  ipcMain.handle('getSettings', () => {
    return settingsService.getSettings(db);
  });

  ipcMain.handle('updateSettings', (event, data) => {
    return settingsService.updateSettings(db, data);
  });

  // Backup
  ipcMain.handle('getBackupList', () => {
    return backupService.getBackupList(backupDir);
  });

  ipcMain.handle('exportExcel', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'quran-export.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      });
      if (result.canceled) return { success: false, message: 'Canceled' };
      return await exportService.exportToExcel(db, result.filePath);
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('exportPDF', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'quran-summary.pdf',
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (result.canceled) return { success: false, message: 'Canceled' };
      return await exportPdfService.exportSummaryPDF(db, result.filePath);
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('exportBundle', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'quran-bundle.zip',
        filters: [{ name: 'ZIP', extensions: ['zip'] }]
      });
      if (result.canceled) return { success: false, message: 'Canceled' };
      return await exportBundleService.exportBundle(db, result.filePath);
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('importExcel', async (event, mode) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
        properties: ['openFile']
      });
      if (result.canceled) return { success: false, message: 'Canceled' };
      const summary = await importService.importFromExcel(db, result.filePaths[0], mode || 'merge');
      return { success: true, ...summary };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('importBundle', async (event, mode) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
        properties: ['openFile']
      });
      if (result.canceled) return { success: false, message: 'Canceled' };
      const summary = await importService.importFromBundle(db, result.filePaths[0], mode || 'merge');
      return { success: true, ...summary };
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('downloadImportTemplate', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: 'import-template.xlsx',
        filters: [{ name: 'Excel', extensions: ['xlsx'] }]
      });
      if (result.canceled) return { success: false, message: 'Canceled' };
      return await importService.generateImportTemplate(result.filePath);
    } catch (e) {
      return { success: false, message: e.message };
    }
  });

  ipcMain.handle('backup', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      });
      if (result.canceled) {
        return await backupService.createBackup(db, backupDir);
      }
      return await backupService.createBackup(db, result.filePaths[0]);
    } catch (e) {
      return await backupService.createBackup(db, backupDir);
    }
  });

  ipcMain.handle('restore', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        filters: [{ name: 'Database', extensions: ['db'] }],
        properties: ['openFile']
      });
      if (result.canceled) return { success: false, message: 'Canceled' };

      // Close the current database connection before restoring
      db.close();

      const restoreResult = backupService.restoreBackup(result.filePaths[0], dbPath);

      // Reopen the database connection
      const { initDatabase, closeDatabase } = require('./src/db/database');
      closeDatabase(); // Reset the module-level singleton
      db = initDatabase(dbPath);

      return restoreResult;
    } catch (e) {
      // If restore failed, try to reopen the database
      try {
        const { initDatabase, closeDatabase } = require('./src/db/database');
        closeDatabase();
        db = initDatabase(dbPath);
      } catch (reopenErr) {
        // Critical failure
      }
      return { success: false, message: e.message };
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  try {
    const backupService = require('./src/services/backup');
    let backupDirForBackup;
    try {
      backupDirForBackup = path.join(app.getPath('userData'), 'backups');
    } catch (e) {
      backupDirForBackup = path.join(__dirname, 'backups');
    }
    if (db) {
      await backupService.autoBackup(db, backupDirForBackup);
    }
  } catch (e) {
    // Auto-backup failure should not prevent app from closing
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
