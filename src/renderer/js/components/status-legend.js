/**
 * Status Legend Component
 * Fixed legend showing all 6 statuses with color, icon, and Arabic label.
 * Always visible in matrix views.
 */

const StatusLegend = {
  statuses: {
    NOT_STARTED: { label: 'لم يبدأ', icon: '&#x25CB;', cssClass: 'status-not-started' },
    IN_PROGRESS: { label: 'قيد الحفظ', icon: '&#x25D4;', cssClass: 'status-in-progress' },
    MEMORIZED: { label: 'تم الحفظ', icon: '&#x2713;', cssClass: 'status-memorized' },
    REVIEW_REQUIRED: { label: 'يحتاج مراجعة', icon: '&#x1F504;', cssClass: 'status-review-required' },
    WEAK: { label: 'ضعيف', icon: '&#x26A0;', cssClass: 'status-weak' },
    PERFECT: { label: 'متقن', icon: '&#x2605;', cssClass: 'status-perfect' }
  },

  render() {
    let html = '<div class="matrix-status-legend">';
    html += '<span class="legend-title">دليل الحالات:</span>';
    for (const [key, info] of Object.entries(this.statuses)) {
      html += `<span class="legend-item ${info.cssClass}"><span class="status-icon">${info.icon}</span> ${info.label}</span>`;
    }
    html += '</div>';
    return html;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatusLegend;
}
