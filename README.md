# AI Tax Platform

A prototype for the GreenGrowth AI Engineer case study, covering
four of the ten challenges:

- **01 — Source Document Traceability**
- **06 — Return Status & Progress** (folded in - shares a data model with 07)
- **07 — An Actionable Dashboard**
- **08 — Clickable vs. Editable**
- **10 — Trustworthy AI**

**Live demo:** https://ai-powered-taxplatform.onrender.com

---

## Why these four

They're the ones I could design from direct experience rather than from
scratch:

- A rule-governed **medication titration agent** — RAG traceability back to
  clinical guideline text, plus an evaluation harness for
  factuality/hallucination/safety. Maps directly onto challenges 01 and 10.
- A **trading agent** with a mandatory two-step preview-then-confirm gate
  before any order executes, and FinBERT sentiment output that always ships
  with the headlines that drove the score. Maps onto challenge 08 (the
  confirm-before-verify pattern) and 10 (evidence-backed confidence).
- An **ML-ops monitoring pipeline** with dashboards that rank returns/items
  by "what needs a human right now," not by recency. Maps onto challenge 07.

This prototype re-applies those same interaction patterns to tax prep — a
different domain, the same underlying trust problem: an AI produced a
number, and a professional needs to decide whether to trust it.

---

## Challenge → where to find it

| Challenge | Route | What to look at |
|---|---|---|
| **01 · Traceability** | `/returns/RTN-1001/review` | Click any field (e.g. "Line 1a — Wages"). The right panel shows the source document, exact page, the OCR-style excerpt, and — for the wages field — the transformation combining two W-2s. |
| **06 · Status & Progress** | `/returns/RTN-1001` or `RTN-1002` | Progress stepper, activity log, "what's next," and an explicit owner. Toggle **Preview as → Client** in the header to see the same return reworded for the client audience and internal blockers hidden. |
| **07 · Actionable Dashboard** | `/dashboard` | KPI row, "What to work on right now" (ranked by a real urgency score, not hand-picked), and a searchable/filterable table of all ~200 returns. Toggle **My Queue / Firm-wide** to see the individual-preparer vs. manager view. |
| **08 · Clickable vs. Editable** | `/returns/RTN-1001/review` and `/returns/RTN-1002/insights` | The locked / editable / AI-pending / verified badge system (with a legend at the top of Review). Click an AI-pending field to see the two-step approve confirmation; click "Editable" fields to type and save. The same visual language reappears on the Insights screen's accept/correct/dismiss actions. |
| **10 · Trustworthy AI** | `/returns/RTN-1002/insights` | Open the 58%-confidence extraction. It shows supporting *and* conflicting evidence side by side, explains in plain language why confidence is capped, and offers Accept / "This isn't right" (with a correction form) / Dismiss. |

---

## Screen-by-screen guide

- **`/dashboard`** — the CPA's landing page. Everything is ranked by an
  urgency score (`priority.py`), not sorted by recency. The "My Queue /
  Firm-wide" toggle and the search/filter box both hit the server for real
  (`app.py` → `partial_queue`), returning an htmx-swapped table rather than
  filtering a static list in the browser.
- **`/returns`** — the full firm-wide list of all ~200 returns (unlike the
  dashboard, this one isn't scoped to "my" returns — it's a browsable
  system-of-record). Every row is clickable straight into the return.
- **`/returns/<id>`** (Overview) — status pipeline, activity log, "what's
  next," and blockers. The Staff/Client toggle re-renders the same data with
  different wording, different level of detail, and internal-only blockers
  hidden from the client view.
- **`/returns/<id>/review`** (Traceability + affordances) — every field on
  the return, grouped by form section, each tagged with its state (locked /
  editable / AI-pending / verified). Selecting a field loads its detail via
  an htmx partial swap — source documents, page numbers, exact excerpts, and
  the transformation applied.
- **`/returns/<id>/insights`** (Trustworthy AI) — every AI-generated flag on
  the return (extractions, recommendations, warnings), each with a
  confidence score, supporting/conflicting evidence, and a correction
  workflow.

Only **RTN-1001** (Maria Chen), **RTN-1002** (David Okafor), and **RTN-1003**
(Marcus Whitfield) have this full depth — see [Data model](#data-model)
below for why.

---

## Stack

Flask 3 · Jinja2 · htmx · Alpine.js · Tailwind CSS (via CDN)

**Interaction model:** full page loads for real navigation (return tabs,
list → detail), htmx partial swaps for everything that should feel instant
(field/insight selection, approve/reject/accept/correct, search and filter,
the staff/client status toggle) — including out-of-band swaps so selecting
an item updates both the detail panel and the active row in the list from
one request.

**No database** — an in-memory Python store stands in for one. See
[Data model](#data-model).

---

## Project structure

```
app.py                    Flask routes — one file, ~300 lines, grouped by
                           challenge (dashboard / returns / review / insights)
models.py                 Dataclasses for the whole domain: TaxReturn,
                           ReturnField, AIInsight, SourceDocument, etc.
data.py                   Mock data generator — 3 hand-authored "hero"
                           returns with full depth, ~197 lighter-weight
                           generated ones for realistic dashboard volume
priority.py                Real urgency-scoring function used by the
                           dashboard (not a hardcoded order)
state.py                  In-memory server-side store for approvals /
                           corrections (see "What's real vs. simulated")
ai.py                     The one live Claude API call (see below)
formatting.py             Date/relative-date/initials helpers used in
                           templates
templates/                Jinja2 templates
  base.html                Shell: sidebar, theme (light/dark), fonts, the
                           ledger design system's CSS variables
  dashboard.html            Challenge 07
  returns_list.html          Firm-wide return directory
  returns/overview.html      Challenge 06
  returns/review.html        Challenge 01 + 08
  returns/insights.html      Challenge 10
  partials/                htmx-swapped fragments (field detail, insight
                           detail, queue table, badges, icons)
render.yaml, Procfile     Render deployment config
```

---

## Data model

Everything hangs off one `TaxReturn` object graph (`models.py`):
`TaxReturn → SourceDocument`, `TaxReturn → ReturnField → SourceRef`,
`TaxReturn → AIInsight → Evidence`, `TaxReturn → AuditEvent`. All five
challenges read from this same graph instead of five disconnected mock
datasets, which is what keeps the prototype feeling like one product.

`data.py` generates ~200 `TaxReturn`s with a seeded RNG so the dataset is
identical across reloads and recordings (no re-randomizing mid-demo). Only
**3 returns** (RTN-1001/1002/1003) get full depth — fields, documents,
insights, an audit log, and deliberately include a low-confidence,
conflicting-evidence case (RTN-1002) so the trust UI isn't just a single
happy path. The other ~197 stay list-depth (status, due date, blockers,
assigned staff) — enough to make the dashboard's search, filter, and
urgency ranking genuinely testable against real volume, without fabricating
deep detail nobody would click into.

---

## Running it locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://localhost:5001` — it redirects to the dashboard. Use **Reset
demo data** in the sidebar to wipe any approvals/corrections made during a
session and start clean.

### Environment variables

| Variable | Required? | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | No | Enables the one live Claude call (see below). Without it, the app works identically — the AI-summary block just doesn't render. |

Copy `.env.example` to `.env` and fill it in to enable that feature locally.

---

## What's real vs. simulated

**Real:**
- The full Flask app, routing, and every interaction shown in the video —
  nothing is a static image or a click-through Figma export.
- The urgency ranking on the dashboard (`priority.py`) is an actual scoring
  function (weighs overdue days, blockers, review status, open AI flags)
  run against the live dataset — not a hand-picked order.
- Search and filtering on the dashboard and returns list are real server-
  side queries against ~200 generated returns, not five demo rows filtered
  in the browser.
- The approve → confirm → verified flow on AI-generated fields, the
  accept/correct/dismiss flow on AI insights, and the staff/client status
  toggle are genuine server-side state transitions (`state.py`) driven by
  htmx requests, not disabled mockups or client-only React state.
- Because state lives server-side instead of in the browser, approvals and
  corrections now survive a page refresh — an improvement over a pure
  client-state prototype, though a server restart still clears it (see
  below).
- The mock dataset is generated by a seeded RNG (`data.py`), so it's
  reproducible across reloads and recordings rather than re-randomizing
  every request.
- **One genuinely live AI call** (`ai.py`): when a preparer corrects an
  insight, their free-text reason is sent to Claude (`claude-haiku-4-5`)
  and turned into a one-sentence audit-log summary. This one is a real API
  call, not fabricated — included to show the AI can be wired in for real,
  not just simulated throughout. It fails soft with no API key set (shows
  the raw note only, never errors), since it's optional polish, not
  load-bearing.

**Simulated:**
- Everywhere else, there's no real OCR, document parsing, or AI model.
  Source document excerpts, confidence scores, evidence, and AI
  recommendations are hand-authored fabricated data (`data.py`) chosen to
  be plausible and to include a deliberately low-confidence,
  conflicting-evidence case — not just a single happy path.
- There's no real database. `state.py` holds approvals/corrections in a
  module-level Python dict, which is enough to demonstrate real backend
  logic but is wiped on a server restart — a Postgres table is the obvious
  next step, and is what GreenGrowth's real stack already uses.
- There's no real authentication or role system. The signed-in preparer is
  hardcoded, and "Preview as Client" on a return is a UI toggle, not a
  second login.
- Only 3 of the ~200 returns (RTN-1001, RTN-1002, RTN-1003) have full
  field/document/insight depth, for the reasons explained under
  [Data model](#data-model).
- Tailwind and htmx/Alpine load from CDN rather than a bundled build step —
  the fastest path for a prototype at this scope; a real deploy would
  compile Tailwind and vendor the JS.

---

## Decisions worth explaining

- **The AI-field approval flow is a two-step confirm, not a single click**
  — mirroring a `confirm=False` → `confirm=True` gate pattern from a
  trading agent I built, where nothing with financial consequence executes
  without an explicit second step.
- **Confidence scores always ship with evidence, and evidence can conflict**
  — the low-confidence case (RTN-1002) shows the AI citing both supporting
  and contradicting evidence and explaining in plain language why its own
  confidence is capped, rather than presenting a bare percentage.
- **Client-facing status text never leaks internal detail.** Blockers like
  "1099 amount conflicts with bank statement" are staff-only; the client
  view only surfaces a blocker when it's something they can actually act
  on, worded as a request rather than an internal finding.
- **List selection updates two parts of the page from one request** (the
  detail panel and the active row highlight) via htmx out-of-band swaps —
  a small technical choice, but one that avoids either a full page reload
  or hand-rolled JavaScript state management for something this simple.
- **Dashboard vs. Returns is a deliberate split**, not an oversight: the
  Dashboard is a personalized, prioritized worklist ("My Queue" filters to
  returns assigned to the signed-in preparer); Returns is the firm's full
  system-of-record, browsable by anyone regardless of assignment — the same
  distinction a "My Tasks" view vs. a full company directory would make.

---

## Deployment

Hosted on Render (free tier) — `render.yaml` and `Procfile` are both
committed, so `pip install -r requirements.txt` + `gunicorn app:app` is
all a fresh deploy needs. No database or external service required unless
`ANTHROPIC_API_KEY` is set for the optional live AI call.
