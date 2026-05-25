/**
 * Database initialization module.
 * Opens or creates the SQLite database, runs schema and seeds.
 */

const path = require('path');
const Database = require('better-sqlite3');
const { createSchema } = require('./schema');
const { seedDatabase } = require('./seeds');

let db = null;

/**
 * Initialize the database. If dbPath is provided, use that path.
 * Otherwise, use the Electron app's userData directory.
 */
function initDatabase(dbPath) {
  if (db) return db;

  if (!dbPath) {
    try {
      const { app } = require('electron');
      const userDataPath = app.getPath('userData');
      dbPath = path.join(userDataPath, 'quran-tracker.db');
    } catch (e) {
      // Fallback for non-Electron environments (testing)
      dbPath = path.join(__dirname, '..', '..', 'quran-tracker.db');
    }
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema(db);
  seedDatabase(db);

  return db;
}

/**
 * Get the current database instance.
 */
function getDatabase() {
  return db;
}

/**
 * Close the database connection.
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDatabase, getDatabase, closeDatabase };
