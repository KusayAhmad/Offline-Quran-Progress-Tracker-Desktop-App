const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Students
  getStudents: () => ipcRenderer.invoke('getStudents'),
  addStudent: (student) => ipcRenderer.invoke('addStudent', student),
  updateStudent: (student) => ipcRenderer.invoke('updateStudent', student),
  archiveStudent: (studentId) => ipcRenderer.invoke('archiveStudent', studentId),

  // Levels
  getLevels: () => ipcRenderer.invoke('getLevels'),
  addLevel: (level) => ipcRenderer.invoke('addLevel', level),
  updateLevel: (level) => ipcRenderer.invoke('updateLevel', level),
  deleteLevel: (levelId) => ipcRenderer.invoke('deleteLevel', levelId),

  // Surahs
  getSurahs: () => ipcRenderer.invoke('getSurahs'),
  getLevelSurahs: (levelId) => ipcRenderer.invoke('getLevelSurahs', levelId),

  // Progress
  getProgress: (studentId) => ipcRenderer.invoke('getProgress', studentId),
  updateProgress: (progress) => ipcRenderer.invoke('updateProgress', progress),

  // Stats
  getStats: () => ipcRenderer.invoke('getStats'),

  // Export/Import/Backup
  exportExcel: () => ipcRenderer.invoke('exportExcel'),
  exportPDF: () => ipcRenderer.invoke('exportPDF'),
  exportBundle: () => ipcRenderer.invoke('exportBundle'),
  importExcel: () => ipcRenderer.invoke('importExcel'),
  importBundle: () => ipcRenderer.invoke('importBundle'),
  backup: () => ipcRenderer.invoke('backup'),
  restore: () => ipcRenderer.invoke('restore'),

  // Profile
  getProfile: () => ipcRenderer.invoke('getProfile'),
  updateProfile: (profile) => ipcRenderer.invoke('updateProfile', profile),

  // Student Notes
  getStudentNotes: (studentId) => ipcRenderer.invoke('getStudentNotes', studentId),
  addStudentNote: (note) => ipcRenderer.invoke('addStudentNote', note)
});
