/**
 * Reports Screen
 * Tabbed interface for viewing various reports.
 */

const ReportsScreen = {
  currentTab: 'global',
  selectedLevelId: null,

  async render() {
    return `
      <div class="screen-header">
        <h2 class="screen-title">\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631</h2>
        <p class="screen-subtitle">\u062a\u0642\u0627\u0631\u064a\u0631 \u0648\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a \u0627\u0644\u062d\u0644\u0642\u0629</p>
      </div>

      <div class="reports-filter-bar" id="reports-filter-bar">
        <label for="report-level-filter">\u062a\u0635\u0641\u064a\u0629 \u062d\u0633\u0628 \u0627\u0644\u0645\u0633\u062a\u0648\u0649:</label>
        <select id="report-level-filter" class="filter-select">
          <option value="">\u0627\u0644\u0643\u0644</option>
        </select>
      </div>

      <div class="reports-tabs">
        <button class="tab-btn active" data-tab="global">\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u0639\u0627\u0645</button>
        <button class="tab-btn" data-tab="class">\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u0644\u0642\u0629</button>
        <button class="tab-btn" data-tab="level-summary">\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062a</button>
        <button class="tab-btn" data-tab="weak">\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0636\u0639\u0641\u0627\u0621</button>
        <button class="tab-btn" data-tab="review">\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629</button>
      </div>

      <div class="reports-content" id="reports-content">
        <div class="loading-state">\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...</div>
      </div>
    `;
  },

  async attachEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTab = e.target.dataset.tab;
        this.loadTabContent(this.currentTab);
      });
    });

    // Populate level filter dropdown
    try {
      const levels = await window.api.getLevels();
      const select = document.getElementById('report-level-filter');
      if (select && levels) {
        levels.forEach(level => {
          const option = document.createElement('option');
          option.value = level.id;
          option.textContent = level.name_ar;
          select.appendChild(option);
        });

        select.addEventListener('change', (e) => {
          this.selectedLevelId = e.target.value ? parseInt(e.target.value) : null;
          this.loadTabContent(this.currentTab);
        });
      }
    } catch (err) {
      // Silently fail if levels cannot be loaded
    }

    this.loadTabContent('global');
  },

  async loadTabContent(tab) {
    const container = document.getElementById('reports-content');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...</div>';

    try {
      if (tab === 'global') {
        const stats = await window.api.getStats();
        container.innerHTML = this.renderGlobalSummary(stats);
      } else if (tab === 'class') {
        const filters = {};
        if (this.selectedLevelId) {
          filters.level_id = this.selectedLevelId;
        }
        const data = await window.api.getClassReportFiltered(filters);
        container.innerHTML = this.renderClassReport(data);
      } else if (tab === 'level-summary') {
        const levels = await window.api.getLevels();
        const levelReports = [];
        // N+1: Each getLevelReport call issues multiple SQL queries per level.
        // This is acceptable for the typical 5 levels in a halqa. For larger
        // numbers of levels, consider a batch endpoint.
        for (const level of levels) {
          const report = await window.api.getLevelReport(level.id);
          if (report) {
            levelReports.push(report);
          }
        }
        container.innerHTML = this.renderLevelSummary(levelReports);
      } else if (tab === 'weak') {
        const data = await window.api.getWeakReport();
        container.innerHTML = this.renderWeakReport(data);
      } else if (tab === 'review') {
        const data = await window.api.getReviewReport();
        container.innerHTML = this.renderReviewReport(data);
      }
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><p class="empty-state-text">\u062e\u0637\u0623 \u0641\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u062a\u0642\u0631\u064a\u0631</p></div>';
    }
  },

  renderGlobalSummary(stats) {
    return `
      <div class="report-section">
        <h3 class="report-section-title">\u0627\u0644\u0645\u0644\u062e\u0635 \u0627\u0644\u0639\u0627\u0645</h3>
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-value">${stats.totalStudents}</span><span class="stat-label">\u0639\u062f\u062f \u0627\u0644\u0637\u0644\u0627\u0628</span></div>
          <div class="stat-card"><span class="stat-value">${stats.totalLevels}</span><span class="stat-label">\u0639\u062f\u062f \u0627\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062a</span></div>
          <div class="stat-card"><span class="stat-value">${stats.memorizedCount || 0}</span><span class="stat-label">\u0645\u062d\u0641\u0648\u0638</span></div>
          <div class="stat-card"><span class="stat-value">${stats.weakStudents || 0}</span><span class="stat-label">\u0636\u0639\u064a\u0641</span></div>
          <div class="stat-card"><span class="stat-value">${stats.reviewRequired || 0}</span><span class="stat-label">\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629</span></div>
        </div>
      </div>
    `;
  },

  renderClassReport(data) {
    if (!data || !data.students) return '<div class="empty-state"><p>\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a</p></div>';

    let basisText = '';
    if (data.calculationBasis === 'level') {
      basisText = `<p class="report-calc-basis">\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632 \u0645\u062d\u0633\u0648\u0628\u0629 \u0639\u0644\u0649 \u0623\u0633\u0627\u0633 \u0627\u0644\u0633\u0648\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0648\u0627\u0644\u0645\u062a\u0642\u0646\u0629 \u0645\u0646 \u0625\u062c\u0645\u0627\u0644\u064a ${data.totalSurahs} \u0633\u0648\u0631\u0629 \u0641\u064a \u0627\u0644\u0645\u0633\u062a\u0648\u0649 (${escapeHtml(data.levelName)})</p>`;
    } else {
      basisText = `<p class="report-calc-basis">\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632 \u0645\u062d\u0633\u0648\u0628\u0629 \u0639\u0644\u0649 \u0623\u0633\u0627\u0633 \u0627\u0644\u0633\u0648\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0648\u0627\u0644\u0645\u062a\u0642\u0646\u0629 \u0645\u0646 \u0625\u062c\u0645\u0627\u0644\u064a 114 \u0633\u0648\u0631\u0629 \u0641\u064a \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064a\u0645</p>`;
    }

    const rows = data.students.map(s => `
      <tr>
        <td>${escapeHtml(s.name_ar)}</td>
        <td>${escapeHtml(s.level_name || '-')}</td>
        <td>${s.progressPercentage}% (${s.memorizedTotal} \u0645\u0646 ${s.totalSurahsForCalc || data.totalSurahs})</td>
        <td>${s.memorizedTotal}</td>
      </tr>
    `).join('');

    return `
      <div class="report-section">
        <h3 class="report-section-title">\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062d\u0644\u0642\u0629 (${data.totalStudents} \u0637\u0627\u0644\u0628)</h3>
        ${basisText}
        <table class="report-table">
          <thead><tr><th>\u0627\u0644\u0637\u0627\u0644\u0628</th><th>\u0627\u0644\u0645\u0633\u062a\u0648\u0649</th><th>\u0646\u0633\u0628\u0629 \u0627\u0644\u0625\u0646\u062c\u0627\u0632</th><th>\u0627\u0644\u0645\u062d\u0641\u0648\u0638</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  renderLevelSummary(levelReports) {
    if (!levelReports || levelReports.length === 0) {
      return '<div class="empty-state"><p class="empty-state-text">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0633\u062a\u0648\u064a\u0627\u062a</p></div>';
    }

    const rows = levelReports.map(report => {
      const avgProgress = report.totalStudents > 0
        ? Math.round(report.students.reduce((sum, s) => sum + s.progressPercentage, 0) / report.totalStudents)
        : 0;

      const weakStudents = report.students
        .filter(s => s.progressPercentage < 30)
        .slice(0, 3)
        .map(s => escapeHtml(s.name_ar))
        .join('\u060C ');

      return `
        <tr>
          <td>${escapeHtml(report.level.name_ar)}</td>
          <td>${report.totalStudents}</td>
          <td>${report.totalSurahs}</td>
          <td>${avgProgress}%</td>
          <td>${weakStudents || '-'}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="report-section">
        <h3 class="report-section-title">\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u0633\u062a\u0648\u064a\u0627\u062a</h3>
        <table class="report-table">
          <thead><tr><th>\u0627\u0644\u0645\u0633\u062a\u0648\u0649</th><th>\u0639\u062f\u062f \u0627\u0644\u0637\u0644\u0627\u0628</th><th>\u0639\u062f\u062f \u0627\u0644\u0633\u0648\u0631</th><th>\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0625\u0646\u062c\u0627\u0632</th><th>\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0623\u0636\u0639\u0641</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  renderWeakReport(data) {
    if (!data || !data.entries || data.entries.length === 0) {
      return '<div class="empty-state"><p class="empty-state-text">\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628 \u0636\u0639\u0641\u0627\u0621</p></div>';
    }

    const statusLegend = `
      <div class="report-status-legend">
        <span class="legend-title">\u062f\u0644\u064a\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a:</span>
        <span class="legend-item status-weak"><span class="status-icon">&#x26A0;</span> \u0636\u0639\u064a\u0641</span>
        <span class="legend-item status-review-required"><span class="status-icon">&#x1F504;</span> \u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629</span>
        <span class="legend-item status-memorized"><span class="status-icon">&#x2713;</span> \u062a\u0645 \u0627\u0644\u062d\u0641\u0638</span>
        <span class="legend-item status-perfect"><span class="status-icon">&#x2605;</span> \u0645\u062a\u0642\u0646</span>
      </div>
    `;

    const rows = data.entries.map(e => `
      <tr>
        <td>${escapeHtml(e.student_name)}</td>
        <td>${escapeHtml(e.surah_name)}</td>
        <td>${escapeHtml(e.level_name || '-')}</td>
      </tr>
    `).join('');

    return `
      <div class="report-section">
        <h3 class="report-section-title">\u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u0636\u0639\u0641\u0627\u0621 (${data.studentCount} \u0637\u0627\u0644\u0628 - ${data.totalEntries} \u0633\u0648\u0631\u0629)</h3>
        ${statusLegend}
        <table class="report-table">
          <thead><tr><th>\u0627\u0644\u0637\u0627\u0644\u0628</th><th>\u0627\u0644\u0633\u0648\u0631\u0629</th><th>\u0627\u0644\u0645\u0633\u062a\u0648\u0649</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  renderReviewReport(data) {
    if (!data || !data.entries || data.entries.length === 0) {
      return '<div class="empty-state"><p class="empty-state-text">\u0644\u0627 \u064a\u0648\u062c\u062f \u0637\u0644\u0627\u0628 \u064a\u062d\u062a\u0627\u062c\u0648\u0646 \u0645\u0631\u0627\u062c\u0639\u0629</p></div>';
    }

    const statusLegend = `
      <div class="report-status-legend">
        <span class="legend-title">\u062f\u0644\u064a\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a:</span>
        <span class="legend-item status-weak"><span class="status-icon">&#x26A0;</span> \u0636\u0639\u064a\u0641</span>
        <span class="legend-item status-review-required"><span class="status-icon">&#x1F504;</span> \u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629</span>
        <span class="legend-item status-memorized"><span class="status-icon">&#x2713;</span> \u062a\u0645 \u0627\u0644\u062d\u0641\u0638</span>
        <span class="legend-item status-perfect"><span class="status-icon">&#x2605;</span> \u0645\u062a\u0642\u0646</span>
      </div>
    `;

    const rows = data.entries.map(e => `
      <tr>
        <td>${escapeHtml(e.student_name)}</td>
        <td>${escapeHtml(e.surah_name)}</td>
        <td>${escapeHtml(e.level_name || '-')}</td>
      </tr>
    `).join('');

    return `
      <div class="report-section">
        <h3 class="report-section-title">\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629 (${data.studentCount} \u0637\u0627\u0644\u0628 - ${data.totalEntries} \u0633\u0648\u0631\u0629)</h3>
        ${statusLegend}
        <table class="report-table">
          <thead><tr><th>\u0627\u0644\u0637\u0627\u0644\u0628</th><th>\u0627\u0644\u0633\u0648\u0631\u0629</th><th>\u0627\u0644\u0645\u0633\u062a\u0648\u0649</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
};
