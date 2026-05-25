/**
 * Database seeding module.
 * Seeds default levels, all 114 surahs, and level-surah mappings.
 */

const path = require('path');
const surahs = require('../data/surahs.json');

const DEFAULT_LEVELS = [
  { name_ar: 'المستوى الأول', name_en: 'Level 1', description: 'سور من الناس إلى الزلزلة', sort_order: 1 },
  { name_ar: 'المستوى الثاني', name_en: 'Level 2', description: 'سور من البينة إلى الأعلى', sort_order: 2 },
  { name_ar: 'المستوى الثالث', name_en: 'Level 3', description: 'سور من الطارق إلى الانفطار', sort_order: 3 },
  { name_ar: 'المستوى الرابع', name_en: 'Level 4', description: 'سور من التكوير إلى النبأ', sort_order: 4 },
  { name_ar: 'المستوى الخامس', name_en: 'Level 5', description: 'سور من المرسلات إلى الفاتحة', sort_order: 5 }
];

/**
 * Level-surah mappings based on surah numbers:
 * Level 1: Surahs 114 (An-Nas) down to 99 (Az-Zalzalah) = 16 surahs
 * Level 2: Surahs 98 (Al-Bayyinah) down to 87 (Al-A'la) = 12 surahs
 * Level 3: Surahs 86 (At-Tariq) down to 82 (Al-Infitar) = 5 surahs
 * Level 4: Surahs 81 (At-Takwir) down to 78 (An-Naba) = 4 surahs
 * Level 5: Surahs 77 (Al-Mursalat) down to 1 (Al-Fatihah) = 77 surahs
 */
const LEVEL_SURAH_RANGES = [
  { levelIndex: 0, from: 99, to: 114 },
  { levelIndex: 1, from: 87, to: 98 },
  { levelIndex: 2, from: 82, to: 86 },
  { levelIndex: 3, from: 78, to: 81 },
  { levelIndex: 4, from: 1, to: 77 }
];

function seedDatabase(db) {
  const levelsCount = db.prepare('SELECT COUNT(*) as count FROM levels').get().count;
  if (levelsCount > 0) {
    return; // Already seeded
  }

  const insertLevel = db.prepare('INSERT INTO levels (name_ar, name_en, description, sort_order) VALUES (?, ?, ?, ?)');
  const insertSurah = db.prepare('INSERT INTO surahs (surah_no, name_ar, name_en) VALUES (?, ?, ?)');
  const insertLevelSurah = db.prepare('INSERT INTO level_surahs (level_id, surah_id) VALUES (?, ?)');

  const seedTransaction = db.transaction(() => {
    // Seed levels
    const levelIds = [];
    for (const level of DEFAULT_LEVELS) {
      const result = insertLevel.run(level.name_ar, level.name_en, level.description, level.sort_order);
      levelIds.push(result.lastInsertRowid);
    }

    // Seed surahs
    const surahIdMap = {};
    for (const surah of surahs) {
      const result = insertSurah.run(surah.surah_no, surah.name_ar, surah.name_en);
      surahIdMap[surah.surah_no] = result.lastInsertRowid;
    }

    // Seed level-surah mappings
    for (const mapping of LEVEL_SURAH_RANGES) {
      const levelId = levelIds[mapping.levelIndex];
      for (let surahNo = mapping.from; surahNo <= mapping.to; surahNo++) {
        const surahId = surahIdMap[surahNo];
        if (surahId) {
          insertLevelSurah.run(levelId, surahId);
        }
      }
    }
  });

  seedTransaction();
}

module.exports = { seedDatabase, DEFAULT_LEVELS, LEVEL_SURAH_RANGES };
