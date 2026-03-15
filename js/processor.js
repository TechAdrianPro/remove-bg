const Processor = {
  API_URL: '/api/remove-bg',
  worker: null,
  onnxAvailable: null, // null = unknown, true/false after first check
  MAX_CLIENT_SIZE: 2048,
  TIMEOUT_MS: 15000,
  lastMode: null, // 'onnx' | 'server'

  async removeBackground(file, image, onProgress) {
    const canTryOnnx = this.shouldTryOnnx(image);
    const isOnline = navigator.onLine;

    // Offline + can't use ONNX = dead end
    if (!isOnline && !canTryOnnx) {
      throw new Error('Ten obraz wymaga serwera. Sprawdź połączenie z internetem.');
    }

    if (canTryOnnx) {
      try {
        onProgress?.('Przetwarzanie lokalne (ONNX)...');
        const result = await this.processWithOnnx(image, onProgress);
        this.lastMode = 'onnx';
        return result;
      } catch (err) {
        console.warn('[Processor] ONNX failed:', err.message);
        if (!isOnline) {
          throw new Error('Przetwarzanie lokalne nie powiodło się. Brak połączenia z serwerem.');
        }
        onProgress?.('Przełączanie na serwer...');
      }
    }

    onProgress?.('Wysyłanie na serwer...');
    const result = await this.processOnServer(file);
    this.lastMode = 'server';
    return result;
  },

  shouldTryOnnx(image) {
    if (this.onnxAvailable === false) return false;
    if (!window.Worker) return false;
    if (!window.OffscreenCanvas) return false;

    const w = image.naturalWidth;
    const h = image.naturalHeight;
    if (w > this.MAX_CLIENT_SIZE || h > this.MAX_CLIENT_SIZE) return false;

    return true;
  },

  processWithOnnx(image, onProgress) {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        try {
          this.worker = new Worker('js/onnx-worker.js');
        } catch {
          this.onnxAvailable = false;
          reject(new Error('Web Worker niedostępny'));
          return;
        }
      }

      const timeout = setTimeout(() => {
        reject(new Error('ONNX timeout'));
      }, this.TIMEOUT_MS);

      this.worker.onmessage = (e) => {
        const { type, imageData, message, step } = e.data;

        if (type === 'progress') {
          onProgress?.(step);
        } else if (type === 'result') {
          clearTimeout(timeout);
          this.onnxAvailable = true;
          const canvas = document.createElement('canvas');
          canvas.width = imageData.width;
          canvas.height = imageData.height;
          canvas.getContext('2d').putImageData(imageData, 0, 0);
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Błąd konwersji wyniku'));
          img.src = canvas.toDataURL('image/png');
        } else if (type === 'error') {
          clearTimeout(timeout);
          this.onnxAvailable = false;
          reject(new Error(message));
        } else if (type === 'log') {
          console.log('[ONNX]', message);
        }
      };

      this.worker.onerror = () => {
        clearTimeout(timeout);
        this.onnxAvailable = false;
        reject(new Error('Worker error'));
      };

      const canvas = document.createElement('canvas');
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);

      this.worker.postMessage(
        { type: 'process', imageData: imgData, width: w, height: h },
        [imgData.data.buffer],
      );
    });
  },

  async processOnServer(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(this.API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let message = 'Przetwarzanie nie powiodło się';
      try {
        const json = JSON.parse(text);
        message = json.detail || message;
      } catch {}
      throw new Error(message);
    }

    const blob = await response.blob();
    return this.blobToImage(blob);
  },

  blobToImage(blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Nie udało się załadować wyniku'));
      };
      img.src = url;
    });
  },
};
