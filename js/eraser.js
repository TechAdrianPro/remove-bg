const Eraser = {
  active: false,
  mode: 'erase', // 'erase' = remove foreground, 'restore' = bring back
  size: 30,
  painting: false,
  maskCanvas: null,
  maskCtx: null,

  getPanelHTML() {
    return `
      <div class="bg-section">
        <label class="panel-label">Tryb</label>
        <div class="eraser-modes">
          <button class="ratio-btn ratio-active" id="eraser-mode-erase">Gumka (usuń)</button>
          <button class="ratio-btn" id="eraser-mode-restore">Przywróć</button>
        </div>
      </div>
      <div class="bg-section">
        <label class="panel-label">Rozmiar: <span id="eraser-size-val">${this.size}</span>px</label>
        <input type="range" id="eraser-size" min="5" max="100" value="${this.size}" class="eraser-slider">
      </div>
      <div class="bg-section crop-actions">
        <button class="btn btn-accent btn-full" id="eraser-done">Gotowe</button>
      </div>
    `;
  },

  bindPanelEvents() {
    this.active = true;
    Slider.disabled = true;
    Slider.handle.style.display = 'none';
    // Show full after canvas over before canvas, no clipping
    Slider.afterClip.style.clipPath = 'inset(0 0 0 0)';
    // Move slider position to 0 so entire after side is visible
    Slider.position = 0;
    this.initMask();

    document.getElementById('eraser-mode-erase').addEventListener('click', (e) => {
      this.mode = 'erase';
      document.getElementById('eraser-mode-erase').classList.add('ratio-active');
      document.getElementById('eraser-mode-restore').classList.remove('ratio-active');
    });

    document.getElementById('eraser-mode-restore').addEventListener('click', (e) => {
      this.mode = 'restore';
      document.getElementById('eraser-mode-restore').classList.add('ratio-active');
      document.getElementById('eraser-mode-erase').classList.remove('ratio-active');
    });

    const sizeInput = document.getElementById('eraser-size');
    sizeInput.addEventListener('input', (e) => {
      this.size = parseInt(e.target.value);
      document.getElementById('eraser-size-val').textContent = this.size;
    });

    document.getElementById('eraser-done').addEventListener('click', () => this.finish());

    this.enablePainting();
  },

  initMask() {
    if (!App.resultImage) return;
    const w = App.resultImage.naturalWidth;
    const h = App.resultImage.naturalHeight;

    // Create mask canvas from current result alpha
    this.maskCanvas = document.createElement('canvas');
    this.maskCanvas.width = w;
    this.maskCanvas.height = h;
    this.maskCtx = this.maskCanvas.getContext('2d');
    this.maskCtx.drawImage(App.resultImage, 0, 0);
  },

  enablePainting() {
    const canvas = App.els.canvasAfter;
    const viewport = document.getElementById('result-viewport');

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    this._onDown = (e) => {
      if (!this.active) return;
      e.preventDefault();
      e.stopPropagation();
      this.painting = true;
      this.paint(getPos(e));
    };

    this._onMove = (e) => {
      if (!this.painting || !this.active) return;
      e.preventDefault();
      e.stopPropagation();
      this.paint(getPos(e));
    };

    this._onUp = () => { this.painting = false; };

    viewport.addEventListener('mousedown', this._onDown);
    viewport.addEventListener('touchstart', this._onDown, { passive: false });
    window.addEventListener('mousemove', this._onMove);
    window.addEventListener('touchmove', this._onMove, { passive: false });
    window.addEventListener('mouseup', this._onUp);
    window.addEventListener('touchend', this._onUp);
  },

  paint(pos) {
    if (!this.maskCtx) return;

    this.maskCtx.globalCompositeOperation = this.mode === 'erase'
      ? 'destination-out'
      : 'source-over';

    if (this.mode === 'restore') {
      // Draw original pixels back
      this.maskCtx.save();
      this.maskCtx.beginPath();
      this.maskCtx.arc(pos.x, pos.y, this.size / 2, 0, Math.PI * 2);
      this.maskCtx.clip();
      this.maskCtx.drawImage(App.els.canvasBefore, 0, 0);
      this.maskCtx.restore();
    } else {
      this.maskCtx.beginPath();
      this.maskCtx.arc(pos.x, pos.y, this.size / 2, 0, Math.PI * 2);
      this.maskCtx.fill();
    }

    this.maskCtx.globalCompositeOperation = 'source-over';
    this.redraw();
  },

  redraw() {
    const { canvasAfter } = App.els;
    const ctx = canvasAfter.getContext('2d');
    const w = canvasAfter.width;
    const h = canvasAfter.height;

    ctx.clearRect(0, 0, w, h);

    if (Background.currentImage) {
      const img = Background.currentImage;
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const sw = img.naturalWidth * scale;
      const sh = img.naturalHeight * scale;
      ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
    } else if (Background.currentColor) {
      ctx.fillStyle = Background.currentColor;
      ctx.fillRect(0, 0, w, h);
    } else {
      App.drawCheckerboard(ctx, w, h);
    }

    ctx.drawImage(this.maskCanvas, 0, 0);
  },

  finish() {
    // Save edited result as new resultImage
    const img = new Image();
    img.onload = () => {
      App.resultImage = img;
      Background.apply();
      Toast.success('Zmiany zapisane');
    };
    img.src = this.maskCanvas.toDataURL('image/png');

    this.cleanup();
    App.closePanel();
  },

  cleanup() {
    this.active = false;
    this.painting = false;
    Slider.disabled = false;
    Slider.handle.style.display = '';
    Slider.reset();

    const viewport = document.getElementById('result-viewport');
    if (this._onDown) {
      viewport.removeEventListener('mousedown', this._onDown);
      viewport.removeEventListener('touchstart', this._onDown);
      window.removeEventListener('mousemove', this._onMove);
      window.removeEventListener('touchmove', this._onMove);
      window.removeEventListener('mouseup', this._onUp);
      window.removeEventListener('touchend', this._onUp);
    }
  },
};
