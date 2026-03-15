# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Remove BG — web app for intelligent background removal from photos. Hybrid processing: client-side ONNX Runtime Web (MODNet/SINet) for small images, server-side Python `rembg` (U2Net) as fallback.

## Architecture

- **Frontend:** Vanilla HTML/CSS/JS (no frameworks), served as static files from `index.html`
- **Backend:** Python FastAPI in `server/` — single endpoint `POST /api/remove-bg`
- **Client-side ML:** ONNX Runtime Web in a Web Worker (`js/onnx-worker.js`), model in `models/`
- **Processing logic:** Frontend tries ONNX first, falls back to server if image >2048px, processing >10s, or WebGL/WASM unavailable

## Commands

### Backend
```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
Serve static files (e.g. `python -m http.server 3000` from project root, or use the FastAPI static mount).

## Design

- **UI:** Fullscreen canvas with before/after slider, top toolbar, slide-out side panels
- **Style:** Slate & Green dark theme — bg `#0c1220`→`#1a2332`, surfaces `#1e293b`/`#334155`, accent `#10b981`, text `#e2e8f0`
- **Full spec:** `docs/superpowers/specs/2026-03-14-remove-bg-design.md`
