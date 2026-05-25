/**
 * Dashboard screen - displays summary statistics and quick actions.
 */

const DashboardScreen = {
  async render() {
    let stats = {
      totalStudents: 0,
      totalLevels: 0,
      totalSurahs: 0,
      weakStudents: 0,
      reviewRequired: 0
    };

    try {
      stats = await window.api.getStats();
    } catch (e) {
      console.error('Failed to load stats:', e);
    }

    return `
      <div class="screen-header">
        <h2 class="screen-title">لوحة التحكم</h2>
        <p class="screen-subtitle">نظرة عامة على تقدم الطلاب في حفظ القرآن الكريم</p>
      </div>

      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="stat-card-icon students">&#x1F464;</div>
          <div class="stat-card-info">
            <div class="stat-card-value">${stats.totalStudents}</div>
            <div class="stat-card-label">عدد الطلاب</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon levels">&#x1F4DA;</div>
          <div class="stat-card-info">
            <div class="stat-card-value">${stats.totalLevels}</div>
            <div class="stat-card-label">المستويات</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon surahs">&#x1F4D6;</div>
          <div class="stat-card-info">
            <div class="stat-card-value">${stats.totalSurahs}</div>
            <div class="stat-card-label">عدد السور</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon weak">&#x26A0;</div>
          <div class="stat-card-info">
            <div class="stat-card-value">${stats.weakStudents}</div>
            <div class="stat-card-label">طلاب ضعفاء</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon review">&#x1F504;</div>
          <div class="stat-card-info">
            <div class="stat-card-value">${stats.reviewRequired}</div>
            <div class="stat-card-label">يحتاجون مراجعة</div>
          </div>
        </div>
      </div>

      <div class="quick-actions">
        <h3 class="quick-actions-title">إجراءات سريعة</h3>
        <div class="quick-actions-grid">
          <button class="quick-action-btn" data-action="add-student">
            <span class="quick-action-icon">&#x2795;</span>
            <span>إضافة طالب</span>
          </button>
          <button class="quick-action-btn" data-action="view-progress">
            <span class="quick-action-icon">&#x1F4CB;</span>
            <span>عرض التقدم</span>
          </button>
          <button class="quick-action-btn" data-action="export-report">
            <span class="quick-action-icon">&#x1F4E4;</span>
            <span>تصدير تقرير</span>
          </button>
        </div>
      </div>

      <div class="recent-updates">
        <h3 class="recent-updates-title">آخر التحديثات</h3>
        <div class="recent-updates-empty">
          <p>لا توجد تحديثات حديثة</p>
        </div>
      </div>
    `;
  },

  attachEvents() {
    const addStudentBtn = document.querySelector('[data-action="add-student"]');
    if (addStudentBtn) {
      addStudentBtn.addEventListener('click', () => {
        if (window.AppRouter) {
          window.AppRouter.navigate('students');
        }
      });
    }

    const viewProgressBtn = document.querySelector('[data-action="view-progress"]');
    if (viewProgressBtn) {
      viewProgressBtn.addEventListener('click', () => {
        if (window.AppRouter) {
          window.AppRouter.navigate('progress-matrix');
        }
      });
    }

    const exportBtn = document.querySelector('[data-action="export-report"]');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (window.AppRouter) {
          window.AppRouter.navigate('import-export');
        }
      });
    }
  }
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardScreen;
}
