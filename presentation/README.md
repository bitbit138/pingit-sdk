# PingIt SDK — Presentation

Editable PowerPoint deck for the SDK proposal + server architecture.

- **`PingIt_SDK.pptx`** — the deck (22 slides). Open in PowerPoint, Keynote, or
  Google Slides and edit text / move shapes directly.
- **`build_deck.py`** — the generator. Edit wording or the theme here and
  regenerate to rebuild the whole deck consistently.

## Two ways to edit

**A. Directly in PowerPoint** — every text box and diagram box is a native,
editable shape. Just type. (If you regenerate later, those manual edits are
overwritten — keep your changes in the script if you want them to stick.)

**B. In the script (recommended for structural changes)**
1. Open `build_deck.py`.
2. The deck is organised into 4 sections (top of the file): `THEME`
   (colours/fonts), `HELPERS`, `SLIDES` (the wording lives here, one `slide_*`
   function per slide), and `BUILD` (the running order).
3. Edit the text in the relevant `slide_*` function, or recolour everything by
   changing the palette constants in the `THEME` block.
4. Regenerate:

```bash
./.venv/bin/python presentation/build_deck.py
```

## First-time setup (already done in this workspace)

```bash
python3 -m venv .venv
./.venv/bin/pip install python-pptx
```

## Preview as images (optional)

Requires LibreOffice + poppler (already installed here):

```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --headless \
  --convert-to pdf --outdir render presentation/PingIt_SDK.pptx
pdftoppm -png -r 90 render/PingIt_SDK.pdf render/slide
```

## Slide order (22)

Title · Problem & need · The idea · Features · Readiness checks · System
architecture · SDK exposed functions · SDK internal functions · On-device data
strategy · Server functions/endpoints · Server data model · Saving & retrieving
data efficiently (server-side) · Request flow · Resilience & no single source ·
Lightweight design · Solutions (data cost & abuse) · Portal functions & access ·
Portal wireframe · Research: Android device data · Research: crash capture · Tech
stack · Applications.

Source of truth for content: [`../docs/PRD.md`](../docs/PRD.md) and
[`../docs/SERVER_ARCHITECTURE.md`](../docs/SERVER_ARCHITECTURE.md).
