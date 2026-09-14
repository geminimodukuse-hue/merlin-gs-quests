# Merlin GS Quests v2

Static export extracted from the Doubao share thread `xKzpchsVVX49wGJKP`.

## Files
- `index.html` — self-contained app entry and embedded offline curriculum fallback.
- `data/cards.json` — extracted curriculum data used by the app when served over HTTP.

## Run locally
Serve this folder (do not open via `file://`, because the app attempts to fetch `data/cards.json`):

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`. It is a static client-side app; progress is stored in browser `localStorage`.

## Network notes
No application/API backend is required. The app uses the local `data/cards.json`, has the same data embedded in `index.html` as an offline fallback, and optionally requests an external Baloo 2 font stylesheet.
