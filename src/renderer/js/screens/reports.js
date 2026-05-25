/**
 * Reports Screen
 * Tabbed interface for viewing various reports.
 */

const ReportsScreen = {
  currentTab: 'global',

  async render() {
    return `
      <div class="screen-header">
        <h2 class="screen-title">التقارير</h2>
        <p class="screen-subtitle">تقارير وإحصائيات الحلقة</p>
      </div>

      <div class="reports-tabs">
        <button class="tab-btn active" data-tab="global">الملخص العام</button>
        <button class="tab-btn" data-tab="class">تقرير الحلقة</button>
        <button class="tab-btn" data-tab="weak">الطلاب الضعفاء</button>
        <button class="tab-btn" data-tab="review">يحتاج مراجعة</button>
      </div>

      <div class="reports-content" id="reports-content">
        <div class="loading-state">جاري التحميل...</div>
      </div>
    `;
  },

  attachEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTab = e.target.dataset.tab;
        this.loadTabContent(this.currentTab);
      });
    });
    this.loadTabContent('global');
  },

  async loadTabContent(tab) {
    const container = document.getElementById('reports-content');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">جاري التحميل...</div>';

    try {
      if (tab === 'global') {
        const stats = await window.api.getStats();
        container.innerHTML = this.renderGlobalSummary(stats);
      } else if (tab === 'class') {
        const data = await window.api.getClassReport();
        container.innerHTML = this.renderClassReport(data);
      } else if (tab === 'weak') {
        const data = await window.api.getWeakReport();
        container.innerHTML = this.renderWeakReport(data);
      } else if (tab === 'review') {
        const data = await window.api.getReviewReport();
        container.innerHTML = this.renderReviewReport(data);
      }
    } catch (err) {
      container.innerHTML = '<div class="empty-state"><p class="empty-state-text">خطأ في تحميل التقرير</p></div>';
    }
  },

  renderGlobalSummary(stats) {
    return `
      <div class="report-section">
        <h3 class="report-section-title">الملخص العام</h3>
        <div class="stats-grid">
          <div class="stat-card"><span class="stat-value">${stats.totalStudents}</span><span class="stat-label">عدد الطلاب</span></div>
          <div class="stat-card"><span class="stat-value">${stats.totalLevels}</span><span class="stat-label">عدد المستويات</span></div>
          <div class="stat-card"><span class="stat-value">${stats.memorizedCount || 0}</span><span class="stat-label">محفوظ</span></div>
          <div class="stat-card"><span class="stat-value">${stats.weakStudents || 0}</span><span class="stat-label">ضعيف</span></div>
          <div class="stat-card"><span class="stat-value">${stats.reviewRequired || 0}</span><span class="stat-label">يحتاج مراجعة</span></div>
        </div>
      </div>
    `;
  },

  renderClassReport(data) {
    if (!data || !data.students) return '<div class="empty-state"><p>لا توجد بيانات</p></div>';
    const rows = data.students.map(s => `
      <tr>
        <td>${escapeHtml(s.name_ar)}</td>
        <td>${escapeHtml(s.level_name || '-')}</td>
        <td>${s.progressPercentage}%</td>
        <td>${s.memorizedTotal}</td>
      </tr>
    `).join('');

    return `
      <div class="report-section">
        <h3 class="report-section-title">تقرير الحلقة (${data.totalStudents} طالب)</h3>
        <table class="report-table">
          <thead><tr><th>الطالب</th><th>المستوى</th><th>نسبة الإنجاز</th><th>المحفوظ</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  renderWeakReport(data) {
    if (!data || !data.entries || data.entries.length === 0) {
      return '<div class="empty-state"><p class="empty-state-text">لا يوجد طلاب ضعفاء</p></div>';
    }
    const rows = data.entries.map(e => `
      <tr>
        <td>${escapeHtml(e.student_name)}</td>
        <td>${escapeHtml(e.surah_name)}</td>
        <td>${escapeHtml(e.level_name || '-')}</td>
      </tr>
    `).join('');

    return `
      <div class="report-section">
        <h3 class="report-section-title">الطلاب الضعفاء (${data.studentCount} طالب - ${data.totalEntries} سورة)</h3>
        <table class="report-table">
          <thead><tr><th>الطالب</th><th>السورة</th><th>المستوى</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  },

  renderReviewReport(data) {
    if (!data || !data.entries || data.entries.length === 0) {
      return '<div class="empty-state"><p class="empty-state-text">لا يوجد طلاب يحتاجون مراجعة</p></div>';
    }
    const rows = data.entries.map(e => `
      <tr>
        <td>${escapeHtml(e.student_name)}</td>
        <td>${escapeHtml(e.surah_name)}</td>
        <td>${escapeHtml(e.level_name || '-')}</td>
      </tr>
    `).join('');

    return `
      <div class="report-section">
        <h3 class="report-section-title">يحتاج مراجعة (${data.studentCount} طالب - ${data.totalEntries} سورة)</h3>
        <table class="report-table">
          <thead><tr><th>الطالب</th><th>السورة</th><th>المستوى</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
};
