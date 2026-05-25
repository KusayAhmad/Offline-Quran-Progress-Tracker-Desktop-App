/**
 * Import/Export Screen
 * UI for all export and import operations.
 */

const ImportExportScreen = {
  async render() {
    return `
      <div class="screen-header">
        <h2 class="screen-title">استيراد / تصدير</h2>
        <p class="screen-subtitle">استيراد وتصدير البيانات</p>
      </div>

      <div class="ie-sections">
        <div class="ie-section">
          <h3 class="ie-section-title">تصدير البيانات</h3>
          <div class="ie-actions">
            <div class="ie-action-card">
              <h4>تصدير Excel</h4>
              <p>تصدير جميع البيانات إلى ملف Excel</p>
              <button class="btn btn-primary" id="btn-export-excel">تصدير Excel</button>
            </div>
            <div class="ie-action-card">
              <h4>تصدير PDF</h4>
              <p>تصدير تقرير ملخص بصيغة PDF</p>
              <button class="btn btn-primary" id="btn-export-pdf">تصدير PDF</button>
            </div>
            <div class="ie-action-card">
              <h4>تصدير حزمة كاملة</h4>
              <p>تصدير حزمة تتضمن Excel و PDF و JSON</p>
              <button class="btn btn-primary" id="btn-export-bundle">تصدير حزمة</button>
            </div>
          </div>
        </div>

        <div class="ie-section">
          <h3 class="ie-section-title">استيراد البيانات</h3>
          <div class="ie-actions">
            <div class="ie-action-card">
              <h4>استيراد من Excel</h4>
              <p>استيراد بيانات من ملف Excel</p>
              <div class="ie-mode-select">
                <label><input type="radio" name="excel-mode" value="merge" checked> دمج</label>
                <label><input type="radio" name="excel-mode" value="replace"> استبدال</label>
              </div>
              <button class="btn btn-secondary" id="btn-import-excel">استيراد Excel</button>
            </div>
            <div class="ie-action-card">
              <h4>استيراد من حزمة</h4>
              <p>استيراد بيانات من حزمة مصدرة سابقا</p>
              <div class="ie-mode-select">
                <label><input type="radio" name="bundle-mode" value="merge" checked> دمج</label>
                <label><input type="radio" name="bundle-mode" value="replace"> استبدال</label>
              </div>
              <button class="btn btn-secondary" id="btn-import-bundle">استيراد حزمة</button>
            </div>
          </div>
        </div>
      </div>

      <div id="ie-result" class="ie-result" style="display:none;"></div>
    `;
  },

  attachEvents() {
    const exportExcelBtn = document.getElementById('btn-export-excel');
    const exportPdfBtn = document.getElementById('btn-export-pdf');
    const exportBundleBtn = document.getElementById('btn-export-bundle');
    const importExcelBtn = document.getElementById('btn-import-excel');
    const importBundleBtn = document.getElementById('btn-import-bundle');

    if (exportExcelBtn) exportExcelBtn.addEventListener('click', () => this.handleExportExcel());
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => this.handleExportPDF());
    if (exportBundleBtn) exportBundleBtn.addEventListener('click', () => this.handleExportBundle());
    if (importExcelBtn) importExcelBtn.addEventListener('click', () => this.handleImportExcel());
    if (importBundleBtn) importBundleBtn.addEventListener('click', () => this.handleImportBundle());
  },

  async handleExportExcel() {
    try {
      const result = await window.api.exportExcel();
      this.showResult(result);
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  async handleExportPDF() {
    try {
      const result = await window.api.exportPDF();
      this.showResult(result);
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  async handleExportBundle() {
    try {
      const result = await window.api.exportBundle();
      this.showResult(result);
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  async handleImportExcel() {
    try {
      const mode = document.querySelector('input[name="excel-mode"]:checked').value;
      const result = await window.api.importExcel(mode);
      this.showResult(result);
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  async handleImportBundle() {
    try {
      const mode = document.querySelector('input[name="bundle-mode"]:checked').value;
      const result = await window.api.importBundle(mode);
      this.showResult(result);
    } catch (err) {
      this.showResult({ success: false, message: err.message });
    }
  },

  showResult(result) {
    const container = document.getElementById('ie-result');
    if (!container) return;
    container.style.display = 'block';
    if (result.success) {
      container.className = 'ie-result ie-result-success';
      container.innerHTML = '<p>تمت العملية بنجاح</p>';
    } else {
      container.className = 'ie-result ie-result-error';
      container.innerHTML = `<p>${result.message || 'حدث خطأ'}</p>`;
    }
  }
};
