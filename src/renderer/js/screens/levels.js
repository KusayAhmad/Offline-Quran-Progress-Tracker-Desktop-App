/**
 * Levels Management screen.
 * CRUD for levels, reordering, surah assignment panel.
 */

const LevelsScreen = {
  levels: [],
  surahs: [],
  selectedLevelId: null,

  async render() {
    try {
      this.levels = await window.api.getLevels();
      this.surahs = await window.api.getSurahs();
    } catch (e) {
      console.error('Failed to load levels:', e);
    }

    return `
      <div class="screen-header">
        <h2 class="screen-title">المستويات</h2>
        <p class="screen-subtitle">إدارة مستويات الحفظ وتخصيص السور</p>
      </div>

      <div class="levels-toolbar">
        <button class="btn btn-primary" id="btn-add-level">
          <span>&#x2795;</span>
          <span>إضافة مستوى</span>
        </button>
      </div>

      <div class="levels-layout">
        <div class="levels-list-panel">
          <h3 class="panel-title">قائمة المستويات</h3>
          <div id="levels-list">
            ${this._renderLevelsList()}
          </div>
        </div>
        <div class="levels-surahs-panel">
          <h3 class="panel-title">السور المخصصة</h3>
          <div id="level-surahs-container">
            <div class="empty-state">
              <p class="text-muted">اختر مستوى لعرض السور المخصصة</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  _renderLevelsList() {
    if (this.levels.length === 0) {
      return '<div class="empty-state"><p class="text-muted">لا توجد مستويات</p></div>';
    }

    let html = '<div class="levels-cards">';
    this.levels.forEach((level, index) => {
      const isSelected = level.id === this.selectedLevelId;
      html += `
        <div class="level-card ${isSelected ? 'level-card-active' : ''}" data-level-id="${level.id}">
          <div class="level-card-header">
            <div class="level-card-order">${level.sort_order}</div>
            <div class="level-card-info">
              <div class="level-card-name">${escapeHtml(level.name_ar)}</div>
              ${level.description ? `<div class="level-card-desc text-muted">${escapeHtml(level.description)}</div>` : ''}
            </div>
          </div>
          <div class="level-card-actions">
            <button class="btn btn-sm btn-secondary" data-action="move-up" data-id="${level.id}" ${index === 0 ? 'disabled' : ''}>&#x2191;</button>
            <button class="btn btn-sm btn-secondary" data-action="move-down" data-id="${level.id}" ${index === this.levels.length - 1 ? 'disabled' : ''}>&#x2193;</button>
            <button class="btn btn-sm btn-secondary" data-action="edit-level" data-id="${level.id}">تعديل</button>
            <button class="btn btn-sm btn-secondary" data-action="duplicate-level" data-id="${level.id}">نسخ</button>
            <button class="btn btn-sm btn-danger" data-action="delete-level" data-id="${level.id}">حذف</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  },

  async _renderSurahsPanel(levelId) {
    let levelSurahs = [];
    try {
      levelSurahs = await window.api.getLevelSurahs(levelId);
    } catch (e) {
      console.error('Failed to load level surahs:', e);
    }

    const assignedIds = new Set(levelSurahs.map(s => s.id));
    const availableSurahs = this.surahs.filter(s => !assignedIds.has(s.id));

    let html = `
      <div class="surahs-assignment">
        <div class="surahs-assigned">
          <h4>السور المخصصة (${levelSurahs.length})</h4>
          <div class="surahs-chips">
    `;

    if (levelSurahs.length === 0) {
      html += '<p class="text-muted">لا توجد سور مخصصة</p>';
    } else {
      levelSurahs.forEach(s => {
        html += `
          <div class="surah-chip">
            <span>${escapeHtml(s.name_ar)}</span>
            <button class="surah-chip-remove" data-action="remove-surah" data-surah-id="${s.id}" data-level-id="${levelId}">&times;</button>
          </div>
        `;
      });
    }

    html += `
          </div>
        </div>
        <div class="surahs-available">
          <h4>السور المتاحة</h4>
          <select class="form-select" id="available-surahs-select">
            <option value="">اختر سورة لإضافتها...</option>
            ${availableSurahs.map(s => `<option value="${s.id}">${s.surah_no}. ${escapeHtml(s.name_ar)}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-primary mt-md" id="btn-add-surah-to-level">إضافة</button>
        </div>
      </div>
    `;

    return html;
  },

  attachEvents() {
    // Add level button
    const addBtn = document.getElementById('btn-add-level');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._showAddLevelModal());
    }

    // Level cards and actions
    const levelsList = document.getElementById('levels-list');
    if (levelsList) {
      levelsList.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (btn) {
          const action = btn.dataset.action;
          const id = parseInt(btn.dataset.id);
          this._handleLevelAction(action, id);
          return;
        }

        const card = e.target.closest('.level-card');
        if (card) {
          const levelId = parseInt(card.dataset.levelId);
          this._selectLevel(levelId);
        }
      });
    }

    // Surahs panel events
    const surahsContainer = document.getElementById('level-surahs-container');
    if (surahsContainer) {
      surahsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="remove-surah"]');
        if (btn) {
          const surahId = parseInt(btn.dataset.surahId);
          const levelId = parseInt(btn.dataset.levelId);
          this._removeSurahFromLevel(levelId, surahId);
        }

        const addBtn = e.target.closest('#btn-add-surah-to-level');
        if (addBtn) {
          this._addSurahToLevel();
        }
      });
    }
  },

  async _selectLevel(levelId) {
    this.selectedLevelId = levelId;

    // Update cards active state
    document.querySelectorAll('.level-card').forEach(card => {
      card.classList.toggle('level-card-active', parseInt(card.dataset.levelId) === levelId);
    });

    // Render surahs panel
    const container = document.getElementById('level-surahs-container');
    if (container) {
      container.innerHTML = await this._renderSurahsPanel(levelId);
    }
  },

  _handleLevelAction(action, id) {
    switch (action) {
      case 'edit-level': this._showEditLevelModal(id); break;
      case 'delete-level': this._confirmDeleteLevel(id); break;
      case 'duplicate-level': this._duplicateLevel(id); break;
      case 'move-up': this._moveLevel(id, -1); break;
      case 'move-down': this._moveLevel(id, 1); break;
    }
  },

  _showAddLevelModal() {
    const body = `
      <div class="form-group">
        <label class="form-label" for="level-name-ar">اسم المستوى (عربي) *</label>
        <input type="text" class="form-input" id="level-name-ar" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="level-name-en">اسم المستوى (إنجليزي)</label>
        <input type="text" class="form-input" id="level-name-en" />
      </div>
      <div class="form-group">
        <label class="form-label" for="level-description">الوصف</label>
        <textarea class="form-textarea" id="level-description"></textarea>
      </div>
    `;
    const actions = `
      <button class="btn btn-primary" id="modal-save-level">حفظ</button>
      <button class="btn btn-secondary" data-modal-close>إلغاء</button>
    `;

    const overlay = Modal.open({ title: 'إضافة مستوى جديد', body, actions });

    overlay.querySelector('#modal-save-level').addEventListener('click', async () => {
      const nameAr = overlay.querySelector('#level-name-ar').value.trim();
      const nameEn = overlay.querySelector('#level-name-en').value.trim();
      const description = overlay.querySelector('#level-description').value.trim();

      if (!nameAr) { alert('يرجى إدخال اسم المستوى'); return; }

      try {
        await window.api.addLevel({ name_ar: nameAr, name_en: nameEn || null, description: description || null });
        Modal.close(overlay);
        await this._reload();
      } catch (e) {
        console.error('Failed to add level:', e);
      }
    });
  },

  _showEditLevelModal(id) {
    const level = this.levels.find(l => l.id === id);
    if (!level) return;

    const body = `
      <div class="form-group">
        <label class="form-label" for="level-name-ar">اسم المستوى (عربي) *</label>
        <input type="text" class="form-input" id="level-name-ar" value="${escapeHtml(level.name_ar)}" required />
      </div>
      <div class="form-group">
        <label class="form-label" for="level-name-en">اسم المستوى (إنجليزي)</label>
        <input type="text" class="form-input" id="level-name-en" value="${escapeHtml(level.name_en || '')}" />
      </div>
      <div class="form-group">
        <label class="form-label" for="level-description">الوصف</label>
        <textarea class="form-textarea" id="level-description">${escapeHtml(level.description || '')}</textarea>
      </div>
    `;
    const actions = `
      <button class="btn btn-primary" id="modal-save-level">تحديث</button>
      <button class="btn btn-secondary" data-modal-close>إلغاء</button>
    `;

    const overlay = Modal.open({ title: 'تعديل المستوى', body, actions });

    overlay.querySelector('#modal-save-level').addEventListener('click', async () => {
      const nameAr = overlay.querySelector('#level-name-ar').value.trim();
      const nameEn = overlay.querySelector('#level-name-en').value.trim();
      const description = overlay.querySelector('#level-description').value.trim();

      if (!nameAr) { alert('يرجى إدخال اسم المستوى'); return; }

      try {
        await window.api.updateLevel({ id, name_ar: nameAr, name_en: nameEn || null, description: description || null, sort_order: level.sort_order });
        Modal.close(overlay);
        await this._reload();
      } catch (e) {
        console.error('Failed to update level:', e);
      }
    });
  },

  _confirmDeleteLevel(id) {
    const level = this.levels.find(l => l.id === id);
    if (!level) return;

    Modal.confirm({
      title: 'حذف المستوى',
      message: `هل أنت متأكد من حذف المستوى "${escapeHtml(level.name_ar)}"؟ لا يمكن حذف مستوى به طلاب.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      onConfirm: async () => {
        try {
          const result = await window.api.deleteLevel(id);
          if (result && result.success === false) {
            alert(result.error || 'لا يمكن حذف هذا المستوى');
          } else {
            await this._reload();
          }
        } catch (e) {
          console.error('Failed to delete level:', e);
        }
      }
    });
  },

  async _duplicateLevel(id) {
    try {
      await window.api.duplicateLevel(id);
      await this._reload();
    } catch (e) {
      console.error('Failed to duplicate level:', e);
    }
  },

  async _moveLevel(id, direction) {
    const idx = this.levels.findIndex(l => l.id === id);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= this.levels.length) return;

    const ordered = [...this.levels];
    const [moved] = ordered.splice(idx, 1);
    ordered.splice(newIdx, 0, moved);

    const orderedIds = ordered.map(l => l.id);
    try {
      await window.api.reorderLevels(orderedIds);
      await this._reload();
    } catch (e) {
      console.error('Failed to reorder levels:', e);
    }
  },

  async _addSurahToLevel() {
    const select = document.getElementById('available-surahs-select');
    if (!select || !select.value || !this.selectedLevelId) return;

    try {
      await window.api.addSurahToLevel(this.selectedLevelId, parseInt(select.value));
      const container = document.getElementById('level-surahs-container');
      if (container) {
        this.surahs = await window.api.getSurahs();
        container.innerHTML = await this._renderSurahsPanel(this.selectedLevelId);
      }
    } catch (e) {
      console.error('Failed to add surah to level:', e);
    }
  },

  async _removeSurahFromLevel(levelId, surahId) {
    try {
      await window.api.removeSurahFromLevel(levelId, surahId);
      const container = document.getElementById('level-surahs-container');
      if (container) {
        this.surahs = await window.api.getSurahs();
        container.innerHTML = await this._renderSurahsPanel(levelId);
      }
    } catch (e) {
      console.error('Failed to remove surah from level:', e);
    }
  },

  async _reload() {
    const container = document.getElementById('screen-container');
    container.innerHTML = await this.render();
    this.attachEvents();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LevelsScreen;
}
