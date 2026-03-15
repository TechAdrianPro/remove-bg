# Remove BG

Inteligentne usuwanie tła ze zdjęć. Hybrydowe przetwarzanie: model ONNX w przeglądarce dla małych zdjęć, serwer Python jako fallback.

![Remove BG](assets/logo.png)

## Funkcje

- **Usuwanie tła** — model RMBG-1.4 (ONNX) bezpośrednio w przeglądarce
- **Slider przed/po** — interaktywne porównanie oryginału z wynikiem
- **Zmiana tła** — presetowe kolory, własny kolor, własne zdjęcie jako tło
- **Gumka** — ręczna korekta maski po przetworzeniu
- **Kadrowanie** — crop z presetami proporcji (1:1, 4:3, 16:9...)
- **Pobieranie** — PNG z przezroczystością lub z wybranym tłem
- **Drag & drop + wklejanie** ze schowka (Ctrl+V)

## Architektura

```
Frontend (Vanilla JS)  →  ONNX Runtime Web (RMBG-1.4, ~44MB)
                       ↘  FastAPI + rembg (fallback dla dużych zdjęć)
```

- Zdjęcia ≤2048px → przetwarzane lokalnie w przeglądarce (Web Worker)
- Zdjęcia >2048px lub błąd ONNX → fallback na serwer

## Uruchomienie

### Backend

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

Otwórz `http://localhost:8000` — FastAPI serwuje też pliki statyczne.

Albo bez backendu (tylko ONNX):
```bash
python3 -m http.server 3000
```

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Frontend | Vanilla HTML/CSS/JS |
| ML (przeglądarka) | ONNX Runtime Web + RMBG-1.4 |
| ML (serwer) | Python rembg (U2Net) |
| Backend | FastAPI |

## Wymagania

- Python 3.10+
- Przeglądarka z obsługą WebGL lub WASM
