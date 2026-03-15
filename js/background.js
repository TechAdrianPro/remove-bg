const Background = {
  currentColor: null,
  currentImage: null,

  PRESETS: [
    { color: 'transparent', label: 'Brak' },
    { color: '#ffffff', label: 'Biały' },
    { color: '#000000', label: 'Czarny' },
    { color: '#ef4444', label: 'Czerwony' },
    { color: '#3b82f6', label: 'Niebieski' },
    { color: '#22c55e', label: 'Zielony' },
    { color: '#a855f7', label: 'Fioletowy' },
    { color: '#f59e0b', label: 'Żółty' },
  ],

  getPanelHTML() {
    const swatches = this.PRESETS.map((p) => {
      const style = p.color === 'transparent'
        ? 'background-image: repeating-conic-gradient(#334155 0% 25%, #1e293b 0% 50%); background-size: 8px 8px;'
        : `background: ${p.color};`;
      const active = this.currentColor === p.color ? ' swatch-active' : '';
      return `<button class="swatch${active}" data-color="${p.color}" style="${style}" title="${p.label}"></button>`;
    }).join('');

    return `
      <div class="bg-section">
        <label class="panel-label">Kolor</label>
        <div class="swatch-grid">${swatches}</div>
      </div>
      <div class="bg-section">
        <label class="panel-label">Własny kolor</label>
        <div class="color-picker-row">
          <input type="color" id="bg-color-picker" value="${this.currentColor && this.currentColor !== 'transparent' ? this.currentColor : '#ffffff'}" class="color-picker-input">
          <span class="color-picker-value" id="bg-color-value">${this.currentColor || '#ffffff'}</span>
        </div>
      </div>
      <div class="bg-section">
        <label class="panel-label">Własne zdjęcie</label>
        <button class="btn btn-ghost btn-full" id="bg-upload-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
          Wybierz obraz
        </button>
        <input type="file" id="bg-file-input" accept="image/*" hidden>
      </div>
    `;
  },

  bindPanelEvents() {
    // Swatches
    document.querySelectorAll('.swatch').forEach((el) => {
      el.addEventListener('click', () => {
        const color = el.dataset.color;
        this.currentImage = null;
        this.currentColor = color === 'transparent' ? null : color;
        this.apply();
        this.updateSwatchActive(el);
      });
    });

    // Color picker
    const picker = document.getElementById('bg-color-picker');
    const valueLabel = document.getElementById('bg-color-value');
    picker.addEventListener('input', (e) => {
      this.currentColor = e.target.value;
      this.currentImage = null;
      valueLabel.textContent = e.target.value;
      this.apply();
      this.clearSwatchActive();
    });

    // Image upload
    const uploadBtn = document.getElementById('bg-upload-btn');
    const fileInput = document.getElementById('bg-file-input');
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          this.currentColor = null;
          this.apply();
          this.clearSwatchActive();
          Toast.success('Tło zmienione');
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  updateSwatchActive(activeEl) {
    document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('swatch-active'));
    activeEl.classList.add('swatch-active');
  },

  clearSwatchActive() {
    document.querySelectorAll('.swatch').forEach((s) => s.classList.remove('swatch-active'));
  },

  apply() {
    if (!App.resultImage) return;

    const { canvasAfter } = App.els;
    const w = App.resultImage.naturalWidth;
    const h = App.resultImage.naturalHeight;
    canvasAfter.width = w;
    canvasAfter.height = h;
    const ctx = canvasAfter.getContext('2d');

    if (this.currentImage) {
      // Draw custom background image, scaled to cover
      const img = this.currentImage;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = img.naturalWidth * scale;
      const sh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
    } else if (this.currentColor) {
      ctx.fillStyle = this.currentColor;
      ctx.fillRect(0, 0, w, h);
    } else {
      App.drawCheckerboard(ctx, w, h);
    }

    ctx.drawImage(App.resultImage, 0, 0);
  },
};
