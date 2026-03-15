const App = {
  state: 'drop', // 'drop' | 'processing' | 'result'
  originalImage: null, // HTMLImageElement of loaded image
  originalFile: null,  // File object

  els: {},

  init() {
    this.els = {
      dropzone: document.getElementById('dropzone'),
      fileInput: document.getElementById('file-input'),
      processing: document.getElementById('processing'),
      processingText: document.getElementById('processing-text'),
      result: document.getElementById('result'),
      canvasBefore: document.getElementById('canvas-before'),
      canvasAfter: document.getElementById('canvas-after'),
      btnNew: document.getElementById('btn-new'),
      btnBackground: document.getElementById('btn-background'),
      btnCrop: document.getElementById('btn-crop'),
      btnDownload: document.getElementById('btn-download'),
      sidePanel: document.getElementById('side-panel'),
      panelClose: document.getElementById('panel-close'),
    };

    this.bindEvents();
    Slider.init();
  },

  bindEvents() {
    const { dropzone, fileInput, btnNew, panelClose } = this.els;

    // Drop zone click
    dropzone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', (e) => {
      // Only remove class if leaving the dropzone itself
      if (!dropzone.contains(e.relatedTarget)) {
        dropzone.classList.remove('drag-over');
      }
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.handleFile(file);
    });

    // Prevent browser default drop behavior on window
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => e.preventDefault());

    // Paste from clipboard
    document.addEventListener('paste', (e) => {
      if (this.state !== 'drop') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) this.handleFile(file);
          return;
        }
      }
    });

    // New image button
    btnNew.addEventListener('click', () => this.reset());

    // Download button
    this.els.btnDownload.addEventListener('click', () => this.downloadResult());

    // Background panel
    this.els.btnBackground.addEventListener('click', () => {
      this.openPanel('Zmień tło', Background.getPanelHTML());
      Background.bindPanelEvents();
    });

    // Eraser panel
    this.els.btnEraser = document.getElementById('btn-eraser');
    this.els.btnEraser.addEventListener('click', () => {
      this.openPanel('Gumka', Eraser.getPanelHTML());
      Eraser.bindPanelEvents();
    });

    // Crop panel
    this.els.btnCrop.addEventListener('click', () => {
      this.openPanel('Kadrowanie', Crop.getPanelHTML());
      Crop.bindPanelEvents();
    });

    // Panel close
    panelClose.addEventListener('click', () => {
      if (Crop.active) Crop.cancel();
      this.closePanel();
    });
  },

  handleFile(file) {
    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      Toast.error('Obsługiwane formaty: JPEG, PNG, WebP');
      return;
    }

    // Validate size (20MB)
    if (file.size > 20 * 1024 * 1024) {
      Toast.error('Maksymalny rozmiar pliku: 20 MB');
      return;
    }

    this.originalFile = file;
    this.setState('processing');
    this.setProcessingText('Ładowanie zdjęcia...');

    this.loadImage(file);
  },

  loadImage(file) {
    const reader = new FileReader();

    reader.onerror = () => {
      Toast.error('Nie udało się wczytać pliku');
      this.reset();
    };

    reader.onload = (e) => {
      const img = new Image();

      img.onerror = () => {
        Toast.error('Plik nie jest prawidłowym obrazem');
        this.reset();
      };

      img.onload = () => {
        this.originalImage = img;
        this.drawOriginal();
        this.processImage();
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  },

  drawOriginal() {
    const { canvasBefore } = this.els;
    const ctx = canvasBefore.getContext('2d');
    const img = this.originalImage;

    canvasBefore.width = img.naturalWidth;
    canvasBefore.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
  },

  async processImage() {
    this.setProcessingText('Usuwanie tła...');

    try {
      const resultImg = await Processor.removeBackground(
        this.originalFile,
        this.originalImage,
        (step) => this.setProcessingText(step),
      );
      this.showResult(resultImg);
    } catch (err) {
      console.error('[App] Processing failed:', err);
      const serverDown = err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError');
      if (serverDown) {
        Toast.error('Serwer niedostępny. Uruchom backend: cd server && uvicorn main:app --port 8000');
      } else {
        Toast.error(err.message || 'Przetwarzanie nie powiodło się. Spróbuj ponownie.');
      }
      this.reset();
    }
  },

  drawResult(resultImg) {
    const { canvasAfter } = this.els;
    const w = resultImg.naturalWidth;
    const h = resultImg.naturalHeight;
    canvasAfter.width = w;
    canvasAfter.height = h;
    const ctx = canvasAfter.getContext('2d');

    // Checkerboard behind transparent areas
    this.drawCheckerboard(ctx, w, h);
    ctx.drawImage(resultImg, 0, 0);
  },

  drawCheckerboard(ctx, w, h) {
    const size = 16;
    const c1 = '#1e293b';
    const c2 = '#334155';
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? c1 : c2;
        ctx.fillRect(x, y, size, size);
      }
    }
  },

  showResult(resultImg) {
    this.resultImage = resultImg;
    this.drawResult(resultImg);
    Slider.reset();
    this.setState('result');
    const mode = Processor.lastMode === 'onnx' ? '(lokalnie)' : '(serwer)';
    Toast.success(`Tło usunięte ${mode}`);
  },

  setState(newState) {
    this.state = newState;
    const { dropzone, processing, result, btnNew, btnBackground, btnCrop, btnDownload } = this.els;

    dropzone.hidden = newState !== 'drop';
    processing.hidden = newState !== 'processing';
    result.hidden = newState !== 'result';

    const showTools = newState === 'result';
    btnNew.hidden = !showTools;
    btnBackground.hidden = !showTools;
    if (this.els.btnEraser) this.els.btnEraser.hidden = !showTools;
    btnCrop.hidden = !showTools;
    btnDownload.hidden = !showTools;
  },

  setProcessingText(text) {
    this.els.processingText.textContent = text;
  },

  reset() {
    this.els.fileInput.value = '';
    this.originalImage = null;
    this.originalFile = null;
    this.closePanel();
    this.setState('drop');
  },

  closePanel() {
    this.els.sidePanel.classList.remove('open');
  },

  downloadResult() {
    if (!this.resultImage) return;

    // Use the "after" canvas which includes background changes
    this.els.canvasAfter.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = (this.originalFile?.name || 'image').replace(/\.[^.]+$/, '');
      a.download = `${baseName}-no-bg.png`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.success('Pobieranie rozpoczęte');
    }, 'image/png');
  },

  openPanel(title, contentHtml) {
    const { sidePanel } = this.els;
    document.getElementById('panel-title').textContent = title;
    document.getElementById('panel-body').innerHTML = contentHtml;
    sidePanel.hidden = false;
    sidePanel.offsetHeight;
    sidePanel.classList.add('open');
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
