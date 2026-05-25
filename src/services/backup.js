/**
 * Backup service.
 * Handles database backup creation, restoration, and listing.
 */

const fs = require('fs');
const path = require('path');

/**
 * Create a backup of the database file.
 * @param {string} dbPath - Path to the current database file
 * @param {string} targetDir - Directory to store the backup
 * @returns {object} - Result with backup file path
 */
function createBackup(dbPath, targetDir) {
  if (!fs.existsSync(dbPath)) {
    return { success: false, error: 'Database file not found' };
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  const backupName = `quran-tracker-backup-${timestamp}-${random}.db`;
  const backupPath = path.join(targetDir, backupName);

  fs.copyFileSync(dbPath, backupPath);

  return {
    success: true,
    path: backupPath,
    filename: backupName,
    timestamp: new Date().toISOString()
  };
}

/**
 * Restore a backup by replacing the current database.
 * @param {string} backupPath - Path to the backup file
 * @param {string} dbPath - Path to the current database file
 * @returns {object} - Result
 */
function restoreBackup(backupPath, dbPath) {
  if (!fs.existsSync(backupPath)) {
    return { success: false, error: 'Backup file not found' };
  }

  fs.copyFileSync(backupPath, dbPath);

  return {
    success: true,
    restoredFrom: backupPath,
    timestamp: new Date().toISOString()
  };
}

/**
 * List available backups in a directory.
 * @param {string} backupDir - Directory containing backups
 * @returns {Array} - List of backup files with metadata
 */
function getBackupList(backupDir) {
  if (!fs.existsSync(backupDir)) {
    return [];
  }

  const files = fs.readdirSync(backupDir);
  const backups = files
    .filter(f => f.startsWith('quran-tracker-backup-') && f.endsWith('.db'))
    .map(filename => {
      const filepath = path.join(backupDir, filename);
      const stat = fs.statSync(filepath);
      return {
        filename,
        path: filepath,
        size: stat.size,
        created: stat.mtime.toISOString()
      };
    })
    .sort((a, b) => new Date(b.created) - new Date(a.created));

  return backups;
}

/**
 * Auto-backup function - creates a backup on app close.
 * @param {string} dbPath - Path to the current database file
 * @param {string} backupDir - Directory to store backups
 * @returns {object} - Result
 */
function autoBackup(dbPath, backupDir) {
  return createBackup(dbPath, backupDir);
}

module.exports = {
  createBackup,
  restoreBackup,
  getBackupList,
  autoBackup
};
