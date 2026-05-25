/**
 * Modal Component
 * Reusable modal with open/close, title, body content, action buttons.
 */

const Modal = {
  open(options) {
    const { title, body, actions, onClose } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="modal-close" data-modal-close>&times;</button>
        </div>
        <div class="modal-body">${body}</div>
        ${actions ? `<div class="modal-footer">${actions}</div>` : ''}
      </div>
    `;

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close(overlay, onClose);
      }
    });

    // Close on X button click
    overlay.querySelector('[data-modal-close]').addEventListener('click', () => {
      this.close(overlay, onClose);
    });

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close(overlay, onClose);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(overlay);
    return overlay;
  },

  close(overlay, onClose) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      if (onClose) onClose();
    }
  },

  confirm(options) {
    const { title, message, confirmText, cancelText, onConfirm, onCancel } = options;

    const body = `<p>${message}</p>`;
    const actions = `
      <button class="btn btn-primary" data-modal-confirm>${confirmText || 'تأكيد'}</button>
      <button class="btn btn-secondary" data-modal-cancel>${cancelText || 'إلغاء'}</button>
    `;

    const overlay = this.open({ title, body, actions, onClose: onCancel });

    overlay.querySelector('[data-modal-confirm]').addEventListener('click', () => {
      this.close(overlay);
      if (onConfirm) onConfirm();
    });

    overlay.querySelector('[data-modal-cancel]').addEventListener('click', () => {
      this.close(overlay);
      if (onCancel) onCancel();
    });

    return overlay;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Modal;
}
