/**
 * Surahs screen.
 * Full list of 114 surahs with level mappings, filter by level.
 */

const SurahsScreen = {
  surahs: [],
  levels: [],
  filterLevel: '',

  async render() {
    try {
      this.surahs = await window.api.getSurahs();
      this.levels = await window.api.getLevels();
    } catch (e) {
      console.error('Failed to load surahs:', e);
    }

    return `
      <div class="screen-header">
        <h2 class="screen-title">السور</h2>
        <p class="screen-subtitle">قائمة سور القرآن الكريم وتخصيص المستويات</p>
      </div>

      <div class="surahs-toolbar">
        <select class="form-select" id="surahs-filter-level">
          <option value="">جميع المستويات</option>
          ${this.levels.map(l => `<option value="${l.id}">${escapeHtml(l.name_ar)}</option>`).join('')}
          <option value="none">بدون مستوى</option>
        </select>
      </div>

      <div id="surahs-table-container">
        ${this._renderTable(this.surahs)}
      </div>
    `;
  },

  _renderTable(surahs) {
    let html = '<div class="table-container"><table>';
    html += `
      <thead>
        <tr>
          <th>رقم السورة</th>
          <th>الاسم بالعربي</th>
          <th>الاسم بالإنجليزي</th>
          <th>المستوى</th>
          <th>تغيير المستوى</th>
        </tr>
      </thead>
      <tbody>
    `;

    surahs.forEach(surah => {
      html += `
        <tr>
          <td>${surah.surah_no}</td>
          <td><strong>${escapeHtml(surah.name_ar)}</strong></td>
          <td>${escapeHtml(surah.name_en)}</td>
          <td>${surah.level_name ? escapeHtml(surah.level_name) : '<span class="text-muted">غير مخصصة</span>'}</td>
          <td>
            <select class="form-select form-select-sm" data-action="change-level" data-surah-id="${surah.id}">
              <option value="">بدون مستوى</option>
              ${this.levels.map(l => `<option value="${l.id}" ${surah.level_id == l.id ? 'selected' : ''}>${escapeHtml(l.name_ar)}</option>`).join('')}
            </select>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    return html;
  },

  attachEvents() {
    const filterLevel = document.getElementById('surahs-filter-level');
    if (filterLevel) {
      filterLevel.addEventListener('change', (e) => {
        this.filterLevel = e.target.value;
        this._applyFilter();
      });
    }

    const container = document.getElementById('surahs-table-container');
    if (container) {
      container.addEventListener('change', (e) => {
        const select = e.target.closest('[data-action="change-level"]');
        if (select) {
          const surahId = parseInt(select.dataset.surahId);
          const levelId = select.value ? parseInt(select.value) : null;
          this._changeSurahLevel(surahId, levelId);
        }
      });
    }
  },

  _applyFilter() {
    let filtered = this.surahs;
    if (this.filterLevel === 'none') {
      filtered = this.surahs.filter(s => !s.level_id);
    } else if (this.filterLevel) {
      filtered = this.surahs.filter(s => s.level_id == this.filterLevel);
    }

    const container = document.getElementById('surahs-table-container');
    if (container) {
      container.innerHTML = this._renderTable(filtered);
    }
  },

  async _changeSurahLevel(surahId, levelId) {
    try {
      // Remove from current level first (handled by backend)
      // Then assign to new level
      if (levelId) {
        // Remove existing assignment
        const surah = this.surahs.find(s => s.id === surahId);
        if (surah && surah.level_id) {
          await window.api.removeSurahFromLevel(surah.level_id, surahId);
        }
        await window.api.addSurahToLevel(levelId, surahId);
      } else {
        const surah = this.surahs.find(s => s.id === surahId);
        if (surah && surah.level_id) {
          await window.api.removeSurahFromLevel(surah.level_id, surahId);
        }
      }
      // Reload surahs data
      this.surahs = await window.api.getSurahs();
    } catch (e) {
      console.error('Failed to change surah level:', e);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SurahsScreen;
}
