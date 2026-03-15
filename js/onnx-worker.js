importScripts('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/ort.min.js');

let session = null;
const MODEL_SIZE = 1024; // RMBG-1.4 fixed input size

async function loadModel() {
  if (session) return;

  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/';

  const providers = ['webgl', 'wasm'];
  for (const provider of providers) {
    try {
      session = await ort.InferenceSession.create('/models/modnet.onnx', {
        executionProviders: [provider],
      });
      postMessage({ type: 'log', message: `Model loaded (${provider})` });
      return;
    } catch (e) {
      // Try next provider
    }
  }
  throw new Error('Nie udało się załadować modelu ONNX');
}

function preprocessImage(imageData, srcWidth, srcHeight) {
  // Resize to 1024x1024
  const canvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
  const ctx = canvas.getContext('2d');
  const srcCanvas = new OffscreenCanvas(srcWidth, srcHeight);
  srcCanvas.getContext('2d').putImageData(imageData, 0, 0);
  ctx.drawImage(srcCanvas, 0, 0, MODEL_SIZE, MODEL_SIZE);
  const resized = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);

  // RMBG-1.4: normalize to [-0.5, 0.5] via pixel/255 - 0.5
  const pixels = MODEL_SIZE * MODEL_SIZE;
  const float32 = new Float32Array(3 * pixels);

  for (let i = 0; i < pixels; i++) {
    float32[i]             = resized.data[i * 4]     / 255 - 0.5; // R
    float32[pixels + i]    = resized.data[i * 4 + 1] / 255 - 0.5; // G
    float32[2 * pixels + i] = resized.data[i * 4 + 2] / 255 - 0.5; // B
  }

  return float32;
}

function postprocessMask(output, srcWidth, srcHeight) {
  // Output is alpha matte [1,1,1024,1024], values in [0,1]
  const maskData = output instanceof Float32Array ? output : new Float32Array(output);

  const maskCanvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
  const maskCtx = maskCanvas.getContext('2d');
  const maskImage = maskCtx.createImageData(MODEL_SIZE, MODEL_SIZE);

  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    const val = Math.round(Math.max(0, Math.min(1, maskData[i])) * 255);
    maskImage.data[i * 4]     = 255;
    maskImage.data[i * 4 + 1] = 255;
    maskImage.data[i * 4 + 2] = 255;
    maskImage.data[i * 4 + 3] = val;
  }

  maskCtx.putImageData(maskImage, 0, 0);

  // Upscale to original size
  const outCanvas = new OffscreenCanvas(srcWidth, srcHeight);
  const outCtx = outCanvas.getContext('2d');
  outCtx.drawImage(maskCanvas, 0, 0, srcWidth, srcHeight);
  return outCtx.getImageData(0, 0, srcWidth, srcHeight);
}

function applyMask(srcImageData, maskImageData) {
  const result = new ImageData(
    new Uint8ClampedArray(srcImageData.data),
    srcImageData.width,
    srcImageData.height,
  );
  for (let i = 0; i < result.data.length; i += 4) {
    result.data[i + 3] = maskImageData.data[i + 3];
  }
  return result;
}

onmessage = async (e) => {
  const { type, imageData, width, height } = e.data;

  if (type === 'process') {
    try {
      postMessage({ type: 'progress', step: 'Ładowanie modelu...' });
      await loadModel();

      postMessage({ type: 'progress', step: 'Przetwarzanie...' });
      const input = preprocessImage(imageData, width, height);
      const tensor = new ort.Tensor('float32', input, [1, 3, MODEL_SIZE, MODEL_SIZE]);
      const results = await session.run({ 'input': tensor });
      const outputData = results['output'].data;

      postMessage({ type: 'progress', step: 'Generowanie maski...' });
      const mask = postprocessMask(outputData, width, height);
      const result = applyMask(imageData, mask);

      postMessage({ type: 'result', imageData: result }, [result.data.buffer]);
    } catch (err) {
      postMessage({ type: 'error', message: err.message });
    }
  }
};
