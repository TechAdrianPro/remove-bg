const Crop = {
  active: false,
  startX: 0,
  startY: 0,
  cropRect: null, // { x, y, w, h } in image coordinates
  dragging: false,
  ratio: null, // null = free

  RATIOS: [
    { label: 'Dowolny', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:4', value: 3 / 4 },
    { label: '16:9', value: 16 / 9 },
    { label: '9:16', value: 9 / 16 },
  ],

  getPanelHTML() {
    const ratios = this.RATIOS.map((r) => {
      const active = this.ratio === r.value ? ' ratio-active' : '';
      return `<button class="ratio-btn${active}" data-ratio="${r.value}">${r.label}</button>`;
    }).join('');

    return `
      <div class="bg-section">
        <label class="panel-label">Proporcje</label>
        <div class="ratio-grid">${ratios}</div>
      </div>
      <div class="bg-section">
        <p class="panel-hint">Kliknij i przeciągnij na zdjęciu, aby zaznaczyć obszar</p>
      </div>
      <div class="bg-section crop-actions">
        <button class="btn btn-accent btn-full" id="crop-apply">Zastosuj</button>
        <button class="btn btn-ghost btn-full" id="crop-cancel">Anuluj</button>
      </div>
    `;
  },

  bindPanelEvents() {
    document.querySelectorAll('.ratio-btn').forEach((el) => {
      el.addEventListener('click', () => {
        const val = el.dataset.ratio;
        this.ratio = val === 'null' ? null : parseFloat(val);
        document.querySelectorAll('.ratio-btn').forEach((b) => b.classList.remove('ratio-active'));
        el.classList.add('ratio-active');
      });
    });

    document.getElementById('crop-apply').addEventListener('click', () => this.applyCrop());
    document.getElementById('crop-cancel').addEventListener('click', () => this.cancel());

    this.enableSelection();
  },

  enableSelection() {
    this.active = true;
    this.cropRect = null;

    const viewport = document.getElementById('result-viewport');
    const canvas = App.els.canvasBefore;

    const getImageCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.max(0, Math.min(canvas.width, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(canvas.height, (clientY - rect.top) * scaleY)),
      };
    };

    this._onDown = (e) => {
      if (!this.active) return;
      e.preventDefault();
      const pos = getImageCoords(e);
      this.startX = pos.x;
      this.startY = pos.y;
      this.dragging = true;
      this.cropRect = { x: pos.x, y: pos.y, w: 0, h: 0 };
    };

    this._onMove = (e) => {
      if (!this.dragging || !this.active) return;
      e.preventDefault();
      const pos = getImageCoords(e);

      let w = pos.x - this.startX;
      let h = pos.y - this.startY;

      if (this.ratio) {
        h = Math.abs(w) / this.ratio * Math.sign(h || 1);
      }

      this.cropRect = {
        x: w >= 0 ? this.startX : this.startX + w,
        y: h >= 0 ? this.startY : this.startY + h,
        w: Math.abs(w),
        h: Math.abs(h),
      };

      this.drawOverlay();
    };

    this._onUp = () => {
      this.dragging = false;
    };

    viewport.addEventListener('mousedown', this._onDown);
    viewport.addEventListener('touchstart', this._onDown, { passive: false });
    window.addEventListener('mousemove', this._onMove);
    window.addEventListener('touchmove', this._onMove, { passive: false });
    window.addEventListener('mouseup', this._onUp);
    window.addEventListener('touchend', this._onUp);
  },

  drawOverlay() {
    let overlay = document.getElementById('crop-overlay');
    if (!overlay) {
      overlay = document.createElement('canvas');
      overlay.id = 'crop-overlay';
      overlay.className = 'crop-overlay';
      const viewport = document.getElementById('result-viewport');
      viewport.appendChild(overlay);
    }

    const canvas = App.els.canvasBefore;
    const rect = canvas.getBoundingClientRect();
    overlay.width = rect.width;
    overlay.height = rect.height;
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    const ctx = overlay.getContext('2d');
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (!this.cropRect || this.cropRect.w === 0) return;

    const cx = this.cropRect.x * scaleX;
    const cy = this.cropRect.y * scaleY;
    const cw = this.cropRect.w * scaleX;
    const ch = this.cropRect.h * scaleY;

    // Darken outside
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, overlay.width, overlay.height);
    ctx.clearRect(cx, cy, cw, ch);

    // Border
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, cy, cw, ch);
  },

  applyCrop() {
    if (!this.cropRect || this.cropRect.w < 10 || this.cropRect.h < 10) {
      Toast.error('Zaznacz obszar do wycięcia');
      return;
    }

    const { x, y, w, h } = this.cropRect;

    // Crop original
    const origCanvas = document.createElement('canvas');
    origCanvas.width = w;
    origCanvas.height = h;
    origCanvas.getContext('2d').drawImage(App.els.canvasBefore, x, y, w, h, 0, 0, w, h);

    // Crop result
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = w;
    resultCanvas.height = h;
    const rctx = resultCanvas.getContext('2d');
    rctx.drawImage(App.resultImage, x, y, w, h, 0, 0, w, h);

    // Update original canvas
    App.els.canvasBefore.width = w;
    App.els.canvasBefore.height = h;
    App.els.canvasBefore.getContext('2d').drawImage(origCanvas, 0, 0);

    // Update result image
    const img = new Image();
    img.onload = () => {
      App.resultImage = img;
      Background.apply();
      Toast.success('Zdjęcie skadrowane');
    };
    img.src = resultCanvas.toDataURL('image/png');

    this.cancel();
  },

  cancel() {
    this.active = false;
    this.dragging = false;
    this.cropRect = null;

    const overlay = document.getElementById('crop-overlay');
    if (overlay) overlay.remove();

    const viewport = document.getElementById('result-viewport');
    if (this._onDown) {
      viewport.removeEventListener('mousedown', this._onDown);
      viewport.removeEventListener('touchstart', this._onDown);
      window.removeEventListener('mousemove', this._onMove);
      window.removeEventListener('touchmove', this._onMove);
      window.removeEventListener('mouseup', this._onUp);
      window.removeEventListener('touchend', this._onUp);
    }

    App.closePanel();
  },
};
