import io
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from PIL import Image
from rembg import remove

app = FastAPI(title="Remove BG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

MAX_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@app.post("/api/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Obsługiwane formaty: JPEG, PNG, WebP")

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(400, "Maksymalny rozmiar pliku: 20 MB")

    try:
        input_image = Image.open(io.BytesIO(data))
    except Exception:
        raise HTTPException(400, "Nieprawidłowy plik obrazu")

    result = remove(input_image)

    buf = io.BytesIO()
    result.save(buf, format="PNG")
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Content-Disposition": "inline; filename=result.png"},
    )


# Serve frontend static files
frontend_dir = Path(__file__).parent.parent
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="static")
