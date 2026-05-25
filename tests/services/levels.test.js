/**
 * Tests for levels service.
 * Uses a temporary in-memory database.
 */

const Database = require('better-sqlite3');
const { createSchema } = require('../../src/db/schema');
const { seedDatabase } = require('../../src/db/seeds');
const levels = require('../../src/services/levels');

let db;

beforeEach(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  createSchema(db);
  seedDatabase(db);
});

afterEach(() => {
  if (db) db.close();
});

describe('Levels Service', () => {
  describe('getAllLevels', () => {
    test('returns all seeded levels', () => {
      const result = levels.getAllLevels(db);
      expect(result).toHaveLength(5);
      expect(result[0].sort_order).toBeLessThanOrEqual(result[1].sort_order);
    });

    test('levels are ordered by sort_order', () => {
      const result = levels.getAllLevels(db);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].sort_order).toBeGreaterThanOrEqual(result[i - 1].sort_order);
      }
    });
  });

  describe('getLevel', () => {
    test('returns level by id', () => {
      const allLevels = levels.getAllLevels(db);
      const level = levels.getLevel(db, allLevels[0].id);
      expect(level).toBeDefined();
      expect(level.name_ar).toBe('المستوى الأول');
    });

    test('returns undefined for non-existent id', () => {
      const level = levels.getLevel(db, 999);
      expect(level).toBeUndefined();
    });
  });

  describe('addLevel', () => {
    test('adds a new level', () => {
      const result = levels.addLevel(db, { name_ar: 'المستوى السادس' });
      expect(result.id).toBeDefined();

      const level = levels.getLevel(db, result.id);
      expect(level.name_ar).toBe('المستوى السادس');
    });

    test('auto-assigns sort_order if not specified', () => {
      const result = levels.addLevel(db, { name_ar: 'المستوى السادس' });
      const level = levels.getLevel(db, result.id);
      expect(level.sort_order).toBe(6); // After existing 5
    });

    test('adds level with all fields', () => {
      const result = levels.addLevel(db, {
        name_ar: 'مستوى تجريبي',
        name_en: 'Test Level',
        description: 'وصف المستوى'
      });
      const level = levels.getLevel(db, result.id);
      expect(level.name_ar).toBe('مستوى تجريبي');
      expect(level.name_en).toBe('Test Level');
      expect(level.description).toBe('وصف المستوى');
    });
  });

  describe('updateLevel', () => {
    test('updates level name', () => {
      const allLevels = levels.getAllLevels(db);
      const id = allLevels[0].id;
      levels.updateLevel(db, id, { name_ar: 'المستوى المعدل' });
      const level = levels.getLevel(db, id);
      expect(level.name_ar).toBe('المستوى المعدل');
    });

    test('updates only specified fields', () => {
      const allLevels = levels.getAllLevels(db);
      const id = allLevels[0].id;
      const originalName = allLevels[0].name_ar;
      levels.updateLevel(db, id, { description: 'وصف جديد' });
      const level = levels.getLevel(db, id);
      expect(level.name_ar).toBe(originalName);
      expect(level.description).toBe('وصف جديد');
    });

    test('returns success false if no fields provided', () => {
      const allLevels = levels.getAllLevels(db);
      const result = levels.updateLevel(db, allLevels[0].id, {});
      expect(result.success).toBe(false);
    });
  });

  describe('deleteLevel', () => {
    test('deletes a level with no students', () => {
      const { id } = levels.addLevel(db, { name_ar: 'مستوى للحذف' });
      const result = levels.deleteLevel(db, id);
      expect(result.success).toBe(true);
      expect(levels.getLevel(db, id)).toBeUndefined();
    });

    test('cannot delete a level with assigned students', () => {
      const allLevels = levels.getAllLevels(db);
      const levelId = allLevels[0].id;
      db.prepare('INSERT INTO students (name_ar, level_id) VALUES (?, ?)').run('أحمد', levelId);

      const result = levels.deleteLevel(db, levelId);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('deletes level and associated level_surahs', () => {
      const { id } = levels.addLevel(db, { name_ar: 'مستوى مع سور' });
      // Add some surahs
      levels.addSurahToLevel(db, id, 1);
      levels.addSurahToLevel(db, id, 2);

      const result = levels.deleteLevel(db, id);
      expect(result.success).toBe(true);

      const levelSurahs = levels.getLevelSurahs(db, id);
      expect(levelSurahs).toHaveLength(0);
    });
  });

  describe('duplicateLevel', () => {
    test('duplicates a level', () => {
      const allLevels = levels.getAllLevels(db);
      const originalId = allLevels[0].id;
      const result = levels.duplicateLevel(db, originalId);
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();

      const newLevel = levels.getLevel(db, result.id);
      expect(newLevel.name_ar).toContain('نسخة');
    });

    test('duplicates level surahs', () => {
      const allLevels = levels.getAllLevels(db);
      const originalId = allLevels[0].id;

      const originalSurahs = levels.getLevelSurahs(db, originalId);
      const result = levels.duplicateLevel(db, originalId);
      const newSurahs = levels.getLevelSurahs(db, result.id);

      expect(newSurahs).toHaveLength(originalSurahs.length);
    });

    test('returns error for non-existent level', () => {
      const result = levels.duplicateLevel(db, 999);
      expect(result.success).toBe(false);
    });
  });

  describe('reorderLevels', () => {
    test('reorders levels', () => {
      const allLevels = levels.getAllLevels(db);
      const reversedIds = allLevels.map(l => l.id).reverse();

      levels.reorderLevels(db, reversedIds);
      const reordered = levels.getAllLevels(db);
      expect(reordered[0].id).toBe(reversedIds[0]);
      expect(reordered[4].id).toBe(reversedIds[4]);
    });
  });

  describe('getLevelSurahs', () => {
    test('returns surahs for a level', () => {
      const allLevels = levels.getAllLevels(db);
      const surahs = levels.getLevelSurahs(db, allLevels[0].id);
      expect(surahs.length).toBeGreaterThan(0);
    });

    test('returns empty for level with no surahs', () => {
      const { id } = levels.addLevel(db, { name_ar: 'مستوى فارغ' });
      const surahs = levels.getLevelSurahs(db, id);
      expect(surahs).toHaveLength(0);
    });
  });

  describe('addSurahToLevel', () => {
    test('adds a surah to a level', () => {
      const { id } = levels.addLevel(db, { name_ar: 'مستوى جديد' });
      const result = levels.addSurahToLevel(db, id, 1);
      expect(result.success).toBe(true);

      const surahs = levels.getLevelSurahs(db, id);
      expect(surahs).toHaveLength(1);
    });

    test('returns error for duplicate assignment', () => {
      const { id } = levels.addLevel(db, { name_ar: 'مستوى جديد' });
      levels.addSurahToLevel(db, id, 1);
      const result = levels.addSurahToLevel(db, id, 1);
      expect(result.success).toBe(false);
    });
  });

  describe('removeSurahFromLevel', () => {
    test('removes a surah from a level', () => {
      const { id } = levels.addLevel(db, { name_ar: 'مستوى جديد' });
      levels.addSurahToLevel(db, id, 1);
      levels.addSurahToLevel(db, id, 2);

      levels.removeSurahFromLevel(db, id, 1);
      const surahs = levels.getLevelSurahs(db, id);
      expect(surahs).toHaveLength(1);
    });
  });

  describe('reorderLevelSurahs', () => {
    test('reorders surahs within a level', () => {
      const { id } = levels.addLevel(db, { name_ar: 'مستوى جديد' });
      levels.addSurahToLevel(db, id, 1);
      levels.addSurahToLevel(db, id, 2);
      levels.addSurahToLevel(db, id, 3);

      const result = levels.reorderLevelSurahs(db, id, [3, 1, 2]);
      expect(result.success).toBe(true);

      const surahs = levels.getLevelSurahs(db, id);
      expect(surahs).toHaveLength(3);
    });
  });
});
