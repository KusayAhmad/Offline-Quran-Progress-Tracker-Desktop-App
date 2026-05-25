/**
 * Backup & Restore Screen
 * Manual backup/restore and backup history.
 */

const BackupScreen = {
  async render() {
    return `
      <div class="screen-header">
        <h2 class="screen-title">النسخ الاحتياطي</h2>
        <p class="screen-subtitle">إدارة النسخ الاحتياطية واستعادة البيانات</p>
      </div>

      <div class="backup-sections">
        <div class="backup-section">
          <h3 class="backup-section-title">إنشاء نسخة احتياطية</h3>
          <p>إنشاء نسخة احتياطية من قاعدة البيانات الحالية</p>
          <button class="btn btn-primary" id="btn-backup">إنشاء نسخة احتياطية</button>
        </div>

        <div class="backup-section">
          <h3 class="backup-section-title">استعادة نسخة احتياطية</h3>
          <p>استعادة البيانات من نسخة احتياطية سابقة</p>
          <button class="btn btn-warning" id="btn-restore">استعادة نسخة</button>
        </div>

        <div class="backup-section">
          <h3 class="backup-section-title">سجل النسخ الاحتياطية</h3>
          <div id="backup-list">
            <p class="empty-state-text">جاري التحميل...</p>
          </div>
        </div>
      </div>

      <div id="backup-result" class="backup-result" style="display:none;"></div>
    `;
  },

  attachEvents() {
    const backupBtn = document.getElementById('btn-backup');
    const restoreBtn = document.getElementById('btn-restore');

    if (backupBtn) backupBtn.addEventListener('click', () => this.handleBackup());
    if (restoreBtn) restoreBtn.addEventListener('click', () => this.handleRestore());

    this.loadBackupList();
  },

  async handleBackup() {
    try {
      const result = await window.api.backup();
      this.showResult(result);
      if (result.success) this.loadBackupList();
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  async handleRestore() {
    try {
      const result = await window.api.restore();
      this.showResult(result);
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  async loadBackupList() {
    const container = document.getElementById('backup-list');
    if (!container) return;

    try {
      const backups = await window.api.getBackupList();
      if (!backups || backups.length === 0) {
        container.innerHTML = '<p class="empty-state-text">لا توجد نسخ احتياطية</p>';
        return;
      }
      const rows = backups.map(b => `
        <div class="backup-item">
          <span class="backup-name">${b.filename}</span>
          <span class="backup-date">${b.created}</span>
          <span class="backup-size">${Math.round(b.size / 1024)} KB</span>
        </div>
      `).join('');
      container.innerHTML = rows;
    } catch (err) {
      container.innerHTML = '<p class="empty-state-text">خطأ في تحميل القائمة</p>';
    }
  },

  showResult(result) {
    const container = document.getElementById('backup-result');
    if (!container) return;
    container.style.display = 'block';
    if (result.success) {
      container.className = 'backup-result backup-result-success';
      container.innerHTML = '<p>تمت العملية بنجاح</p>';
    } else {
      container.className = 'backup-result backup-result-error';
      container.innerHTML = `<p>${result.message || 'حدث خطأ'}</p>`;
    }
  }
};
