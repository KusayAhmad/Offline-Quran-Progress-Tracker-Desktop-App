/**
 * Progress Cell Component
 * Interactive cell that shows status as colored badge.
 * Click to open dropdown to change status.
 */

const ProgressCell = {
  statuses: {
    NOT_STARTED: { label: 'لم يبدأ', icon: '&#x25CB;', cssClass: 'status-not-started' },
    IN_PROGRESS: { label: 'قيد الحفظ', icon: '&#x25D4;', cssClass: 'status-in-progress' },
    MEMORIZED: { label: 'تم الحفظ', icon: '&#x2713;', cssClass: 'status-memorized' },
    REVIEW_REQUIRED: { label: 'يحتاج مراجعة', icon: '&#x1F504;', cssClass: 'status-review-required' },
    WEAK: { label: 'ضعيف', icon: '&#x26A0;', cssClass: 'status-weak' },
    PERFECT: { label: 'متقن', icon: '&#x2605;', cssClass: 'status-perfect' }
  },

  statusOrder: ['NOT_STARTED', 'IN_PROGRESS', 'MEMORIZED', 'REVIEW_REQUIRED', 'WEAK', 'PERFECT'],

  render(studentId, surahId, currentStatus) {
    const status = currentStatus || 'NOT_STARTED';
    const info = this.statuses[status];
    return `
      <div class="progress-cell" data-student-id="${studentId}" data-surah-id="${surahId}" data-status="${status}">
        <span class="progress-cell-badge ${info.cssClass}">
          <span class="status-icon">${info.icon}</span>
        </span>
        <div class="progress-cell-dropdown hidden">
          ${this.statusOrder.map(s => {
            const sInfo = this.statuses[s];
            return `<div class="progress-cell-option ${sInfo.cssClass}" data-value="${s}">
              <span class="status-icon">${sInfo.icon}</span> ${sInfo.label}
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  },

  attachEvents(container, onStatusChange) {
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
        const info = ProgressCell.statuses[newStatus];
        badge.className = `progress-cell-badge ${info.cssClass}`;
        badge.innerHTML = `<span class="status-icon">${info.icon}</span>`;

        // Hide dropdown
        const dropdown = cell.querySelector('.progress-cell-dropdown');
        dropdown.classList.add('hidden');

        // Notify callback
        if (onStatusChange) {
          onStatusChange(studentId, surahId, newStatus);
        }
        return;
      }

      // Toggle dropdown
      const dropdown = cell.querySelector('.progress-cell-dropdown');
      // Close all other dropdowns
      container.querySelectorAll('.progress-cell-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
      });
      dropdown.classList.toggle('hidden');
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.progress-cell')) {
        container.querySelectorAll('.progress-cell-dropdown').forEach(d => {
          d.classList.add('hidden');
        });
      }
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressCell;
}
