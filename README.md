# Merlin GS Quests (v3)

Primary 3 NGS Term 1 revision quests for Merlin — warm coral/gold/violet UI, mobile-first.

## Open it

- **Local:** open `index.html` in a browser (`file://` works — cards are embedded).
- **GitHub Pages:** publish this folder; `data/cards.json` is also loaded when fetch works.
- **iPhone Safari:** big buttons, high contrast, safe-area padding.

## How to play

1. Pick a **mode** chip: Mix · Flash · Match · MCQ · Short · Fill · Case · Lightning.
2. Tap **Today's Mix** (weak topics boosted from saved progress) or a **chapter**.
3. Answer → instant feedback + short explain → stars & streak.
4. At the end, **Retry wrong only** if needed.
5. **Parent Coach** (top-right): accuracy, weak topics, 2 oral prompts from `can` fields.

Progress key: `localStorage['merlin-gs-quests-v2']`.

## Content

- Curriculum: 26 facts (`c1f1`…`c4f7`) across 4 chapters.
- Each fact has ≥4 structured questions (mcq / flash / match / short / fill / case).
- Answers are fixed in `data/cards.json` — the app never invents options at runtime.

## Validate

```bash
python3 validate.py
```

Must print `RESULT: PASS` with zero Q/A integrity failures.

## Files

- `index.html` — shell + embedded cards fallback
- `css/app.css` — styles
- `js/app.js` — SPA logic
- `data/cards.json` — curriculum + question bank
- `validate.py` — integrity checker
