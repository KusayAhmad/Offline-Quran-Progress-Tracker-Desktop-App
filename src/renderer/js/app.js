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
    reports: ReportsScreen,
    'import-export': ImportExportScreen,
    backup: BackupScreen,
    settings: SettingsScreen
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
