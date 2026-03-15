# Remove BG — Design Spec

Web app for intelligent background removal from photos with hybrid processing (client-side + server-side).

## Architecture

### Frontend
- Vanilla HTML/CSS/JS — no frameworks, minimal bundle
- ONNX Runtime Web for client-side inference

### Backend
- Python + FastAPI
- `rembg` library with U2Net model for server-side processing
- Single endpoint: `POST /api/remove-bg` accepting image upload, returning PNG with transparency

### Hybrid Processing Strategy
- **Client-side (primary):** ONNX Runtime Web + lightweight segmentation model (MODNet or SINet). Used for images under ~2048px on capable devices.
- **Server-side (fallback):** `rembg` with U2Net. Used when:
  - Image exceeds client-side size threshold
  - Client-side processing fails or times out (>10s)
  - Device doesn't support WebGL/WASM adequately
- Decision logic lives in frontend JS — tries client-side first, falls back to server automatically.

## UI Design

### Layout: Fullscreen Canvas
Single-page app with three states:

1. **Drop state:** Centered drop zone with drag & drop + click to upload. Subtle border animation on hover.
2. **Processing state:** Progress indicator with current step ("Analyzing image...", "Removing background...")
3. **Result state:** Full-canvas image view with interactive before/after slider (draggable divider)

### Toolbar (top bar)
- Left: App logo/name "Remove BG"
- Right: action buttons — "New image", "Change background", "Crop", "Download"

### Side panel (slide-out, triggered by toolbar buttons)
- **Change background:** Color picker, preset color swatches (white, black, common colors), upload custom background image
- **Crop:** Simple crop tool with aspect ratio presets (free, 1:1, 4:3, 16:9)

### Before/After Slider
- Vertical divider line with handle, draggable left-right
- Left side: original image
- Right side: processed result (transparent checkerboard or selected background)
- Touch-friendly handle for mobile

### Download
- PNG with transparency (default)
- PNG with selected background color/image baked in
- Quality/size options not needed for MVP

## Visual Style — Slate & Green

### Colors
- Background gradient: `#0c1220` → `#1a2332`
- Surface primary: `#1e293b`
- Surface secondary: `#334155`
- Text primary: `#e2e8f0`
- Text secondary: `#94a3b8`
- Accent: `#10b981` (emerald green)
- Accent hover: `#059669`
- Error: `#ef4444`

### Typography
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Clean, readable sizes

### Styling
- Border radius: 8px for cards/panels, 4px for buttons/inputs
- Subtle box shadows with low opacity
- Smooth transitions (200ms ease)
- Checkerboard pattern for transparency preview: alternating `#1e293b` and `#334155` squares

## User Flow

1. User lands on page → sees centered drop zone with instructions
2. Drags/clicks to upload image (validated: JPEG, PNG, WebP; max 20MB)
3. App checks image size and device capability
4. Tries client-side ONNX processing first with progress indicator
5. If client-side fails/times out → automatically sends to server
6. Result appears with slide-in animation → before/after slider active
7. User can: drag slider, change background, crop, download result
8. "New image" resets to drop state

## Error Handling

- **Invalid file type:** Toast notification "Supported formats: JPEG, PNG, WebP"
- **File too large:** Toast "Maximum file size: 20MB"
- **Client-side failure:** Silent fallback to server (no user-visible error)
- **Server failure:** Toast "Processing failed. Please try again." with retry button
- **Network offline + large image:** Toast "This image requires server processing. Check your connection."

## File Structure

```
remove-bg-własne/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          # Main app logic, state management
│   ├── dropzone.js     # File upload / drag & drop
│   ├── processor.js    # Hybrid processing orchestration
│   ├── onnx-worker.js  # Web Worker for ONNX inference
│   ├── slider.js       # Before/after slider component
│   ├── background.js   # Background change functionality
│   ├── crop.js         # Crop tool
│   └── toast.js        # Toast notification system
├── models/
│   └── modnet.onnx     # Client-side segmentation model
├── server/
│   ├── main.py         # FastAPI app
│   ├── requirements.txt
│   └── Dockerfile      # Optional containerization
└── assets/
    └── favicon.svg
```

## Technical Notes

- ONNX model loaded lazily on first use (not on page load)
- Web Worker for inference to keep UI responsive
- Canvas API for image manipulation (slider, background compositing)
- Server CORS configured for local development
- No database needed — stateless processing
