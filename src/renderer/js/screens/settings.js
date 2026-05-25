/**
 * Settings Screen
 * Application settings form.
 */

const SettingsScreen = {
  async render() {
    return `
      <div class="screen-header">
        <h2 class="screen-title">الإعدادات</h2>
        <p class="screen-subtitle">إعدادات التطبيق</p>
      </div>

      <div class="settings-form" id="settings-form">
        <div class="settings-group">
          <h3 class="settings-group-title">معلومات المعلم</h3>
          <div class="form-field">
            <label for="teacher-name">اسم المعلم</label>
            <input type="text" id="teacher-name" class="form-input" placeholder="اسم المعلم" />
          </div>
          <div class="form-field">
            <label for="school-name">اسم المدرسة / المسجد</label>
            <input type="text" id="school-name" class="form-input" placeholder="اسم المدرسة أو المسجد" />
          </div>
          <div class="form-field">
            <label for="class-name">اسم الحلقة</label>
            <input type="text" id="class-name" class="form-input" placeholder="اسم الحلقة" />
          </div>
        </div>

        <div class="settings-group">
          <h3 class="settings-group-title">الواجهة</h3>
          <div class="form-field">
            <label for="language-select">اللغة</label>
            <select id="language-select" class="form-input">
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn btn-primary" id="btn-save-settings">حفظ الإعدادات</button>
        </div>
      </div>

      <div id="settings-result" class="settings-result" style="display:none;"></div>
    `;
  },

  attachEvents() {
    const saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) saveBtn.addEventListener('click', () => this.saveSettings());
    this.loadSettings();
  },

  async loadSettings() {
    try {
      const settings = await window.api.getSettings();
      if (settings) {
        const teacherInput = document.getElementById('teacher-name');
        const schoolInput = document.getElementById('school-name');
        const classInput = document.getElementById('class-name');
        const langSelect = document.getElementById('language-select');

        if (teacherInput) teacherInput.value = settings.teacher_name || '';
        if (schoolInput) schoolInput.value = settings.school_name || '';
        if (classInput) classInput.value = settings.class_name || '';
        if (langSelect) langSelect.value = settings.language || 'ar';
      }
    } catch (err) {
      // Settings load failed silently
    }
  },

  async saveSettings() {
    const data = {
      teacher_name: document.getElementById('teacher-name').value,
      school_name: document.getElementById('school-name').value,
      class_name: document.getElementById('class-name').value,
      language: document.getElementById('language-select').value
    };

    try {
      const result = await window.api.updateSettings(data);
      if (result.success) {
        // Apply language change immediately
        const lang = data.language || 'ar';
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Update cached settings in AppRouter
        if (window.AppRouter && window.AppRouter.settings) {
          window.AppRouter.settings.language = data.language;
          window.AppRouter.settings.teacher_name = data.teacher_name;
          window.AppRouter.settings.school_name = data.school_name;
          window.AppRouter.settings.class_name = data.class_name;
        }
      }
      this.showResult(result, data.language);
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  showResult(result, language) {
    const container = document.getElementById('settings-result');
    if (!container) return;
    container.style.display = 'block';
    if (result.success) {
      container.className = 'settings-result settings-result-success';
      const msg = language === 'en' ? 'Settings saved successfully' : '\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0628\u0646\u062c\u0627\u062d';
      container.innerHTML = `<p>${msg}</p>`;
    } else {
      container.className = 'settings-result settings-result-error';
      container.innerHTML = `<p>${result.message || '\u062e\u0637\u0623 \u0641\u064a \u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a'}</p>`;
    }
    setTimeout(() => { container.style.display = 'none'; }, 3000);
  }
};
