const Toast = {
  _container: null,

  _icons: {
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  },

  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toast-container');
    }
    return this._container;
  },

  show(message, type = 'info', duration = 3500) {
    const container = this._getContainer();
    const el = document.createElement('div');
    el.className = `toast ${type !== 'info' ? `toast-${type}` : ''}`;

    const icon = this._icons[type] || this._icons.info;
    el.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close" aria-label="Zamknij">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    `;

    const dismiss = () => {
      if (el.classList.contains('toast-out')) return;
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => el.remove());
    };

    el.querySelector('.toast-close').addEventListener('click', dismiss);

    container.appendChild(el);
    const timer = setTimeout(dismiss, duration);

    // Pause on hover
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', () => setTimeout(dismiss, 1500));
  },

  error(message)   { this.show(message, 'error', 5000); },
  success(message) { this.show(message, 'success'); },
};
