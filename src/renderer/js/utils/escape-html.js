/**
 * HTML escaping utility to prevent XSS via user-provided content.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;'
};

const ESCAPE_RE = /[&<>"']/g;

/**
 * Escape HTML special characters in a string.
 * @param {*} str - The value to escape (converted to string)
 * @returns {string} - The escaped string safe for HTML interpolation
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(ESCAPE_RE, function (ch) {
    return ESCAPE_MAP[ch];
  });
}

// Expose globally for renderer scripts
window.escapeHtml = escapeHtml;
