const Slider = {
  position: 0.5, // 0–1
  dragging: false,
  disabled: false,
  viewport: null,
  handle: null,
  afterClip: null,

  init() {
    this.viewport = document.getElementById('result-viewport');
    this.handle = document.getElementById('slider-handle');
    this.afterClip = document.getElementById('result-after-clip');

    // Mouse
    this.handle.addEventListener('mousedown', (e) => this.startDrag(e));
    window.addEventListener('mousemove', (e) => this.onDrag(e));
    window.addEventListener('mouseup', () => this.stopDrag());

    // Touch
    this.handle.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
    window.addEventListener('touchend', () => this.stopDrag());

    // Click on viewport to jump slider
    this.viewport.addEventListener('click', (e) => {
      if (this.disabled) return;
      if (e.target.closest('.slider-handle')) return;
      const rect = this.viewport.getBoundingClientRect();
      this.position = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.update();
    });
  },

  startDrag(e) {
    if (this.disabled) return;
    e.preventDefault();
    this.dragging = true;
    this.handle.classList.add('active');
  },

  onDrag(e) {
    if (!this.dragging || this.disabled) return;
    e.preventDefault();
    const rect = this.viewport.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    this.position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    this.update();
  },

  stopDrag() {
    this.dragging = false;
    this.handle.classList.remove('active');
  },

  update() {
    const pct = this.position * 100;
    this.handle.style.left = `${pct}%`;
    this.afterClip.style.clipPath = `inset(0 0 0 ${pct}%)`;
  },

  reset() {
    this.position = 0.5;
    this.update();
  },
};
