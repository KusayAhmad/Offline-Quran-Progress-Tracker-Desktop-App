/**
 * Main Application Router
 * Handles navigation between screens and manages sidebar active states.
 */

const AppRouter = {
  currentScreen: 'dashboard',
  currentParams: null,

  screens: {
    dashboard: DashboardScreen,
    students: StudentsScreen,
    levels: LevelsScreen,
    surahs: SurahsScreen,
    'student-profile': StudentProfileScreen,
    'progress-matrix': ProgressMatrixScreen,
    reports: { render: () => '<div class="screen-header"><h2 class="screen-title">التقارير</h2><p class="screen-subtitle">تقارير وإحصائيات</p></div><div class="empty-state"><div class="empty-state-icon">&#x1F4C8;</div><p class="empty-state-text">قريبا - شاشة التقارير</p></div>' },
    'import-export': { render: () => '<div class="screen-header"><h2 class="screen-title">استيراد / تصدير</h2><p class="screen-subtitle">استيراد وتصدير البيانات</p></div><div class="empty-state"><div class="empty-state-icon">&#x1F4E5;</div><p class="empty-state-text">قريبا - شاشة الاستيراد والتصدير</p></div>' },
    backup: { render: () => '<div class="screen-header"><h2 class="screen-title">النسخ الاحتياطي</h2><p class="screen-subtitle">إدارة النسخ الاحتياطية</p></div><div class="empty-state"><div class="empty-state-icon">&#x1F4BE;</div><p class="empty-state-text">قريبا - شاشة النسخ الاحتياطي</p></div>' },
    settings: { render: () => '<div class="screen-header"><h2 class="screen-title">الإعدادات</h2><p class="screen-subtitle">إعدادات التطبيق</p></div><div class="empty-state"><div class="empty-state-icon">&#x2699;</div><p class="empty-state-text">قريبا - شاشة الإعدادات</p></div>' }
  },

  async navigate(screenName, params) {
    if (!this.screens[screenName]) {
      console.error(`Screen "${screenName}" not found`);
      return;
    }

    this.currentScreen = screenName;
    this.currentParams = params || null;
    this.updateSidebar(screenName);
    await this.renderScreen(screenName);
  },

  updateSidebar(screenName) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.screen === screenName) {
        item.classList.add('active');
      }
    });
  },

  async renderScreen(screenName) {
    const container = document.getElementById('screen-container');
    const screen = this.screens[screenName];

    if (screen && screen.render) {
      const html = await screen.render(this.currentParams);
      container.innerHTML = html;

      // Attach events if the screen has an attachEvents method
      if (screen.attachEvents) {
        screen.attachEvents();
      }
    }
  },

  init() {
    // Setup navigation click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = item.dataset.screen;
        if (screen) {
          this.navigate(screen);
        }
      });
    });

    // Render initial screen
    this.navigate('dashboard');
  }
};

// Make router globally accessible
window.AppRouter = AppRouter;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  AppRouter.init();
});
