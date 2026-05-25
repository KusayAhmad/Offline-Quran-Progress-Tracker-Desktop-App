const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Students
  getStudents: (filters) => ipcRenderer.invoke('getStudents', filters),
  getStudent: (id) => ipcRenderer.invoke('getStudent', id),
  addStudent: (student) => ipcRenderer.invoke('addStudent', student),
  updateStudent: (student) => ipcRenderer.invoke('updateStudent', student),
  archiveStudent: (studentId) => ipcRenderer.invoke('archiveStudent', studentId),
  searchStudents: (query) => ipcRenderer.invoke('searchStudents', query),
  getStudentsByLevel: (levelId) => ipcRenderer.invoke('getStudentsByLevel', levelId),
  getStudentProgress: (studentId) => ipcRenderer.invoke('getStudentProgress', studentId),

  // Levels
  getLevels: () => ipcRenderer.invoke('getLevels'),
  getLevel: (id) => ipcRenderer.invoke('getLevel', id),
  addLevel: (level) => ipcRenderer.invoke('addLevel', level),
  updateLevel: (level) => ipcRenderer.invoke('updateLevel', level),
  deleteLevel: (levelId) => ipcRenderer.invoke('deleteLevel', levelId),
  duplicateLevel: (levelId) => ipcRenderer.invoke('duplicateLevel', levelId),
  reorderLevels: (orderedIds) => ipcRenderer.invoke('reorderLevels', orderedIds),

  // Level Surahs
  getLevelSurahs: (levelId) => ipcRenderer.invoke('getLevelSurahs', levelId),
  addSurahToLevel: (levelId, surahId) => ipcRenderer.invoke('addSurahToLevel', levelId, surahId),
  removeSurahFromLevel: (levelId, surahId) => ipcRenderer.invoke('removeSurahFromLevel', levelId, surahId),
  reorderLevelSurahs: (levelId, orderedSurahIds) => ipcRenderer.invoke('reorderLevelSurahs', levelId, orderedSurahIds),

  // Surahs
  getSurahs: () => ipcRenderer.invoke('getSurahs'),
  getSurah: (id) => ipcRenderer.invoke('getSurah', id),
  updateSurah: (id, data) => ipcRenderer.invoke('updateSurah', id, data),

  // Progress
  getProgress: (studentId) => ipcRenderer.invoke('getProgress', studentId),
  updateProgress: (progress) => ipcRenderer.invoke('updateProgress', progress),
  getProgressMatrix: (filters) => ipcRenderer.invoke('getProgressMatrix', filters),
  getProgressMatrixStudent: (studentId) => ipcRenderer.invoke('getProgressMatrixStudent', studentId),
  getProgressMatrixSurah: (surahId) => ipcRenderer.invoke('getProgressMatrixSurah', surahId),
  getProgressMatrixLevel: (levelId) => ipcRenderer.invoke('getProgressMatrixLevel', levelId),
  bulkUpdateProgress: (updates) => ipcRenderer.invoke('bulkUpdateProgress', updates),
  getProgressStats: (studentId) => ipcRenderer.invoke('getProgressStats', studentId),

  // Stats
  getStats: () => ipcRenderer.invoke('getStats'),

  // Student Notes
  getStudentNotes: (studentId) => ipcRenderer.invoke('getStudentNotes', studentId),
  addStudentNote: (note) => ipcRenderer.invoke('addStudentNote', note),
  deleteStudentNote: (noteId) => ipcRenderer.invoke('deleteStudentNote', noteId),

  // Export/Import/Backup
  exportExcel: () => ipcRenderer.invoke('exportExcel'),
  exportPDF: () => ipcRenderer.invoke('exportPDF'),
  exportBundle: () => ipcRenderer.invoke('exportBundle'),
  importExcel: (mode) => ipcRenderer.invoke('importExcel', mode),
  importBundle: (mode) => ipcRenderer.invoke('importBundle', mode),
  downloadImportTemplate: () => ipcRenderer.invoke('downloadImportTemplate'),
  backup: () => ipcRenderer.invoke('backup'),
  restore: () => ipcRenderer.invoke('restore'),
  getBackupList: () => ipcRenderer.invoke('getBackupList'),

  // Reports
  getClassReport: () => ipcRenderer.invoke('getClassReport'),
  getClassReportFiltered: (filters) => ipcRenderer.invoke('getClassReportFiltered', filters),
  getLevelReport: (levelId) => ipcRenderer.invoke('getLevelReport', levelId),
  getWeakReport: () => ipcRenderer.invoke('getWeakReport'),
  getReviewReport: () => ipcRenderer.invoke('getReviewReport'),
  getGlobalSummary: () => ipcRenderer.invoke('getGlobalSummary'),

  // Settings
  getSettings: () => ipcRenderer.invoke('getSettings'),
  updateSettings: (data) => ipcRenderer.invoke('updateSettings', data),

  // Profile
  getProfile: () => ipcRenderer.invoke('getProfile'),
  updateProfile: (profile) => ipcRenderer.invoke('updateProfile', profile)
});
