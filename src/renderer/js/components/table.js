/**
 * Table Component
 * Reusable sortable table with headers, rows, sorting, and row click handler.
 */

const Table = {
  render(options) {
    const { columns, rows, onRowClick, emptyMessage } = options;

    if (!rows || rows.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">&#x1F4CB;</div>
          <p class="empty-state-text">${emptyMessage || 'لا توجد بيانات'}</p>
        </div>
      `;
    }

    let html = '<div class="table-container"><table>';

    // Headers
    html += '<thead><tr>';
    columns.forEach(col => {
      html += `<th data-sort="${col.key || ''}">${col.label}</th>`;
    });
    html += '</tr></thead>';

    // Body
    html += '<tbody>';
    rows.forEach((row, index) => {
      const clickAttr = onRowClick ? `data-row-index="${index}"` : '';
      const clickClass = onRowClick ? 'clickable-row' : '';
      html += `<tr class="${clickClass}" ${clickAttr}>`;
      columns.forEach(col => {
        const value = col.render ? col.render(row) : (row[col.key] || '');
        html += `<td>${value}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
  },

  attachSorting(container, columns, rows, rerenderFn) {
    const headers = container.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
      const key = header.dataset.sort;
      if (!key) return;

      header.style.cursor = 'pointer';
      header.addEventListener('click', () => {
        const currentDir = header.dataset.sortDir || 'asc';
        const newDir = currentDir === 'asc' ? 'desc' : 'asc';

        // Clear other headers
        headers.forEach(h => { h.dataset.sortDir = ''; });
        header.dataset.sortDir = newDir;

        rows.sort((a, b) => {
          const aVal = a[key] || '';
          const bVal = b[key] || '';
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return newDir === 'asc' ? aVal - bVal : bVal - aVal;
          }
          return newDir === 'asc'
            ? String(aVal).localeCompare(String(bVal), 'ar')
            : String(bVal).localeCompare(String(aVal), 'ar');
        });

        if (rerenderFn) rerenderFn(rows);
      });
    });
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Table;
}
