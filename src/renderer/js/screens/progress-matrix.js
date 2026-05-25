/**
 * Progress Matrix Screen
 * Main productivity screen with 4 views:
 * - Student View: Select student, show all their surahs with status
 * - Surah View: Select surah, show all students with status
 * - Level View: Select level, show student x surah grid
 * - Color Grid View: Full matrix with sticky headers
 */

const ProgressMatrixScreen = {
  currentView: 'level',
  selectedStudentId: null,
  selectedSurahId: null,
  selectedLevelId: null,

  async render() {
    const levels = await window.api.getLevels();
    const firstLevelId = levels.length > 0 ? levels[0].id : null;
    this.selectedLevelId = firstLevelId;

    return `
      <div class="screen-header">
        <h2 class="screen-title">مصفوفة التقدم</h2>
        <p class="screen-subtitle">متابعة تقدم الطلاب في حفظ السور</p>
      </div>

      ${this.renderLegend()}

      <div class="matrix-view-tabs">
        <button class="matrix-tab" data-view="student">عرض الطالب</button>
        <button class="matrix-tab" data-view="surah">عرض السورة</button>
        <button class="matrix-tab active" data-view="level">عرض المستوى</button>
        <button class="matrix-tab" data-view="grid">الشبكة الكاملة</button>
      </div>

      <div class="matrix-controls" id="matrix-controls"></div>
      <div class="matrix-content" id="matrix-content">
        <div class="empty-state">
          <div class="empty-state-icon">&#x1F4CB;</div>
          <p class="empty-state-text">جاري التحميل...</p>
        </div>
      </div>
    `;
  },

  attachEvents() {
    // Tab switching
    document.querySelectorAll('.matrix-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.matrix-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentView = e.target.dataset.view;
        this.renderControls();
        this.renderContent();
      });
    });

    // Initial render
    this.renderControls();
    this.renderContent();
  },

  async renderControls() {
    const controlsContainer = document.getElementById('matrix-controls');
    if (!controlsContainer) return;

    if (this.currentView === 'student') {
      const students = await window.api.getStudents();
      controlsContainer.innerHTML = `
        <div class="matrix-control-row">
          <label class="matrix-control-label">اختر الطالب:</label>
          <select id="matrix-student-select" class="matrix-select">
            <option value="">-- اختر طالب --</option>
            ${students.map(s => `<option value="${s.id}" ${s.id === this.selectedStudentId ? 'selected' : ''}>${escapeHtml(s.name_ar)}</option>`).join('')}
          </select>
        </div>
      `;
      document.getElementById('matrix-student-select').addEventListener('change', (e) => {
        this.selectedStudentId = e.target.value ? parseInt(e.target.value) : null;
        this.renderContent();
      });
    } else if (this.currentView === 'surah') {
      const surahs = await window.api.getSurahs();
      controlsContainer.innerHTML = `
        <div class="matrix-control-row">
          <label class="matrix-control-label">اختر السورة:</label>
          <select id="matrix-surah-select" class="matrix-select">
            <option value="">-- اختر سورة --</option>
            ${surahs.map(s => `<option value="${s.id}" ${s.id === this.selectedSurahId ? 'selected' : ''}>${escapeHtml(s.name_ar)}</option>`).join('')}
          </select>
        </div>
      `;
      document.getElementById('matrix-surah-select').addEventListener('change', (e) => {
        this.selectedSurahId = e.target.value ? parseInt(e.target.value) : null;
        this.renderContent();
      });
    } else if (this.currentView === 'level' || this.currentView === 'grid') {
      const levels = await window.api.getLevels();
      controlsContainer.innerHTML = `
        <div class="matrix-control-row">
          <label class="matrix-control-label">اختر المستوى:</label>
          <select id="matrix-level-select" class="matrix-select">
            <option value="">-- اختر مستوى --</option>
            ${levels.map(l => `<option value="${l.id}" ${l.id === this.selectedLevelId ? 'selected' : ''}>${escapeHtml(l.name_ar)}</option>`).join('')}
          </select>
        </div>
      `;
      document.getElementById('matrix-level-select').addEventListener('change', (e) => {
        this.selectedLevelId = e.target.value ? parseInt(e.target.value) : null;
        this.renderContent();
      });
    }
  },

  async renderContent() {
    const contentContainer = document.getElementById('matrix-content');
    if (!contentContainer) return;

    switch (this.currentView) {
      case 'student':
        await this.renderStudentView(contentContainer);
        break;
      case 'surah':
        await this.renderSurahView(contentContainer);
        break;
      case 'level':
        await this.renderLevelView(contentContainer);
        break;
      case 'grid':
        await this.renderGridView(contentContainer);
        break;
    }
  },

  async renderStudentView(container) {
    if (!this.selectedStudentId) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F464;</div><p class="empty-state-text">اختر طالب لعرض تقدمه</p></div>';
      return;
    }

    const data = await window.api.getProgressMatrixStudent(this.selectedStudentId);
    if (!data) {
      container.innerHTML = '<div class="empty-state"><p class="empty-state-text">لم يتم العثور على بيانات</p></div>';
      return;
    }

    const { student, surahs, progressMap, progressPercentage } = data;

    let html = `
      <div class="matrix-student-header">
        <h3>${escapeHtml(student.name_ar)}</h3>
        <span class="matrix-progress-badge">${progressPercentage}% مكتمل</span>
      </div>
      <div class="matrix-student-grid">
    `;

    for (const surah of surahs) {
      const entry = progressMap[surah.id];
      const status = entry ? entry.status : 'NOT_STARTED';
      html += this.renderCellHtml(student.id, surah.id, status, surah.name_ar);
    }

    html += '</div>';
    container.innerHTML = html;
    this.attachCellEvents(container);
  },

  async renderSurahView(container) {
    if (!this.selectedSurahId) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F4D6;</div><p class="empty-state-text">اختر سورة لعرض تقدم الطلاب</p></div>';
      return;
    }

    const data = await window.api.getProgressMatrixSurah(this.selectedSurahId);
    if (!data) {
      container.innerHTML = '<div class="empty-state"><p class="empty-state-text">لم يتم العثور على بيانات</p></div>';
      return;
    }

    const { surah, students, progressMap } = data;

    let html = `
      <div class="matrix-surah-header">
        <h3>${escapeHtml(surah.name_ar)}</h3>
      </div>
      <div class="matrix-surah-list">
    `;

    for (const student of students) {
      const entry = progressMap[student.id];
      const status = entry ? entry.status : 'NOT_STARTED';
      html += `
        <div class="matrix-surah-row">
          <span class="matrix-row-name">${escapeHtml(student.name_ar)}</span>
          ${this.renderCellHtml(student.id, surah.id, status)}
        </div>
      `;
    }

    html += '</div>';
    container.innerHTML = html;
    this.attachCellEvents(container);
  },

  async renderLevelView(container) {
    if (!this.selectedLevelId) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F4DA;</div><p class="empty-state-text">اختر مستوى لعرض المصفوفة</p></div>';
      return;
    }

    const data = await window.api.getProgressMatrixLevel(this.selectedLevelId);
    if (!data) {
      container.innerHTML = '<div class="empty-state"><p class="empty-state-text">لم يتم العثور على بيانات</p></div>';
      return;
    }

    container.innerHTML = this.renderMatrixTable(data);
    this.attachCellEvents(container);
  },

  async renderGridView(container) {
    if (!this.selectedLevelId) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F4CB;</div><p class="empty-state-text">اختر مستوى لعرض الشبكة الكاملة</p></div>';
      return;
    }

    const data = await window.api.getProgressMatrixLevel(this.selectedLevelId);
    if (!data) {
      container.innerHTML = '<div class="empty-state"><p class="empty-state-text">لم يتم العثور على بيانات</p></div>';
      return;
    }

    container.innerHTML = this.renderMatrixTable(data, true);
    this.attachCellEvents(container);
  },

  renderMatrixTable(data, fullGrid) {
    const { students, surahs, progressMap } = data;

    if (students.length === 0) {
      return '<div class="empty-state"><p class="empty-state-text">لا يوجد طلاب في هذا المستوى</p></div>';
    }

    if (surahs.length === 0) {
      return '<div class="empty-state"><p class="empty-state-text">لا توجد سور مسندة لهذا المستوى</p></div>';
    }

    const containerClass = fullGrid ? 'matrix-grid-container matrix-full-grid' : 'matrix-grid-container';

    let html = `<div class="${containerClass}"><div class="matrix-scroll-wrapper"><table class="matrix-table">`;

    // Header row
    html += '<thead><tr><th class="matrix-corner-cell">الطالب / السورة</th>';
    for (const surah of surahs) {
      html += `<th class="matrix-header-cell">${escapeHtml(surah.name_ar)}</th>`;
    }
    html += '</tr></thead>';

    // Body rows
    html += '<tbody>';
    for (const student of students) {
      html += `<tr><td class="matrix-name-cell">${escapeHtml(student.name_ar)}</td>`;
      for (const surah of surahs) {
        const key = `${student.id}_${surah.id}`;
        const entry = progressMap[key];
        const status = entry ? entry.status : 'NOT_STARTED';
        html += `<td class="matrix-data-cell">${this.renderCellHtml(student.id, surah.id, status)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div></div>';

    return html;
  },

  renderCellHtml(studentId, surahId, status, label) {
    const statuses = {
      NOT_STARTED: { label: 'لم يبدأ', icon: '&#x25CB;', cssClass: 'status-not-started' },
      IN_PROGRESS: { label: 'قيد الحفظ', icon: '&#x25D4;', cssClass: 'status-in-progress' },
      MEMORIZED: { label: 'تم الحفظ', icon: '&#x2713;', cssClass: 'status-memorized' },
      REVIEW_REQUIRED: { label: 'يحتاج مراجعة', icon: '&#x1F504;', cssClass: 'status-review-required' },
      WEAK: { label: 'ضعيف', icon: '&#x26A0;', cssClass: 'status-weak' },
      PERFECT: { label: 'متقن', icon: '&#x2605;', cssClass: 'status-perfect' }
    };
    const statusOrder = ['NOT_STARTED', 'IN_PROGRESS', 'MEMORIZED', 'REVIEW_REQUIRED', 'WEAK', 'PERFECT'];
    const info = statuses[status] || statuses.NOT_STARTED;

    let html = `<div class="progress-cell" data-student-id="${studentId}" data-surah-id="${surahId}" data-status="${status}">`;
    if (label) {
      html += `<span class="progress-cell-label">${escapeHtml(label)}</span>`;
    }
    html += `<span class="progress-cell-badge ${info.cssClass}"><span class="status-icon">${info.icon}</span></span>`;
    html += '<div class="progress-cell-dropdown hidden">';
    for (const s of statusOrder) {
      const sInfo = statuses[s];
      html += `<div class="progress-cell-option ${sInfo.cssClass}" data-value="${s}"><span class="status-icon">${sInfo.icon}</span> ${sInfo.label}</div>`;
    }
    html += '</div></div>';
    return html;
  },

  attachCellEvents(container) {
    container.addEventListener('click', (e) => {
      const cell = e.target.closest('.progress-cell');
      if (!cell) return;

      const option = e.target.closest('.progress-cell-option');
      if (option) {
        const newStatus = option.dataset.value;
        const studentId = parseInt(cell.dataset.studentId);
        const surahId = parseInt(cell.dataset.surahId);

        // Update visual
        cell.dataset.status = newStatus;
        const badge = cell.querySelector('.progress-cell-badge');
        const statuses = {
          NOT_STARTED: { icon: '&#x25CB;', cssClass: 'status-not-started' },
          IN_PROGRESS: { icon: '&#x25D4;', cssClass: 'status-in-progress' },
          MEMORIZED: { icon: '&#x2713;', cssClass: 'status-memorized' },
          REVIEW_REQUIRED: { icon: '&#x1F504;', cssClass: 'status-review-required' },
          WEAK: { icon: '&#x26A0;', cssClass: 'status-weak' },
          PERFECT: { icon: '&#x2605;', cssClass: 'status-perfect' }
        };
        const info = statuses[newStatus];
        badge.className = `progress-cell-badge ${info.cssClass}`;
        badge.innerHTML = `<span class="status-icon">${info.icon}</span>`;

        // Hide dropdown
        cell.querySelector('.progress-cell-dropdown').classList.add('hidden');

        // Save to backend
        window.api.updateProgress({ student_id: studentId, surah_id: surahId, status: newStatus });
        return;
      }

      // Toggle dropdown
      const dropdown = cell.querySelector('.progress-cell-dropdown');
      container.querySelectorAll('.progress-cell-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
      });
      dropdown.classList.toggle('hidden');
    });
  },

  renderLegend() {
    const statuses = {
      NOT_STARTED: { label: 'لم يبدأ', icon: '&#x25CB;', cssClass: 'status-not-started' },
      IN_PROGRESS: { label: 'قيد الحفظ', icon: '&#x25D4;', cssClass: 'status-in-progress' },
      MEMORIZED: { label: 'تم الحفظ', icon: '&#x2713;', cssClass: 'status-memorized' },
      REVIEW_REQUIRED: { label: 'يحتاج مراجعة', icon: '&#x1F504;', cssClass: 'status-review-required' },
      WEAK: { label: 'ضعيف', icon: '&#x26A0;', cssClass: 'status-weak' },
      PERFECT: { label: 'متقن', icon: '&#x2605;', cssClass: 'status-perfect' }
    };

    let html = '<div class="matrix-status-legend">';
    html += '<span class="legend-title">دليل الحالات:</span>';
    for (const [key, info] of Object.entries(statuses)) {
      html += `<span class="legend-item ${info.cssClass}"><span class="status-icon">${info.icon}</span> ${info.label}</span>`;
    }
    html += '</div>';
    return html;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressMatrixScreen;
}
