# Merlin GS Quests v2.1.0 — deeper bank

## Why
Mo said v2.0 questions were too shallow. This release doubles the bank and makes MCQs distinguish near-miss ideas from the same unit.

## Counts
| | v2.0.0 | v2.1.0 |
|---|---:|---:|
| Facts | 26 | 26 (unchanged) |
| Questions | 130 | **260** |
| Min / fact | 5 | **10** |

## What got harder
- **Near-miss distractors** from the same unit (doctor vs CMP; smoking vs drinking harms; positive vs negative feelings; care phrases vs unkind phrases; prescribed medicine vs drug abuse).
- More **which is BEST / which is NOT / multi-step case** comparisons.
- Silly candy/chips-style options removed where the lesson does not contrast medicine vs food; medicine-type MCQs now contrast syrup / pills / powder / herbs.
- Every fact mixes **mcq, flash, match, short, fill, case** (match coverage raised to all 26 facts).

## Type mix (v2.1)
- mcq: 93 · short: 51 · case: 37 · fill: 27 · flash: 26 · match: 26

## UI
- **Mix / Lightning** now round-robin across question types so a larger bank still feels varied (weak-topic boost kept).
- `validate.py` floor raised to **≥8 questions/fact**.

## Files ready to upload
`index.html`, `css/`, `js/`, `data/cards.json`, `README.md` under `gs-quests-v3/`.
