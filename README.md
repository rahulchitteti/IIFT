# Trimester Attendance & Grade-Risk Tracker

A mobile-first, **installable PWA** that tracks class attendance per trimester and
warns you about grade-point penalties and debarment. It works **fully offline**,
stores everything **on-device** (localStorage, no account, no backend, no network at
runtime), and installs to an Android home screen as a standalone app.

Built with **React + TypeScript + Vite**, `vite-plugin-pwa`, and **Vitest**. The
SVG charts are hand-rolled — no chart library.

---

## The rule it encodes

- **≥ 80% attendance** → no penalty.
- For **every 10% below 80%**, the grade point for that subject drops by **1**
  (70–80% = −1, 60–70% = −2, 50–60% = −3).
- **Below 50%** → **debarred** from the course.

All three thresholds (safe %, step %, debar %) are editable in **More → Attendance
rule** and flow through the whole app.

A class can be taught by multiple faculty; each faculty's sessions roll up into one
subject's attendance. Status types and how they count:

| Code | Meaning | Present? | Counts toward classes held? |
|------|---------|----------|------------------------------|
| `P`  | Present | yes | yes |
| `L`  | Late    | yes | yes |
| `OD` | On-Duty | yes | yes |
| `A`  | Absent  | no  | yes |
| `M`  | Medical | no  | **no** (excused) |
| `C`  | Cancelled | no | **no** |
| `H`  | Holiday | no  | **no** |

---

## Run / build / test

```bash
npm install        # install deps
npm run dev        # dev server (http://localhost:5173)
npm test           # run the Vitest suite (engine + storage + smoke)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm run icons      # regenerate the PWA PNG icons (pure Node, no native deps)
```

The engine tests in `src/engine.test.ts` reproduce the acceptance table from the
spec exactly (per-subject `capYet`, band, `mustAttend`, `canMiss`), plus the band
edges (80→Safe, 79→−1, … 49→Debarred) and exam-eligibility cases.

---

## Install it on your phone

The production build is a real installable PWA. To get it onto an Android home
screen:

1. **Host the `dist/` folder over HTTPS.** Any static host works and the app makes
   no network calls at runtime, so a free static host is fine. Quick options:
   - GitHub Pages: push this repo, build, and publish the `dist/` folder (e.g. with
     the `gh-pages` branch or an Actions workflow). The app uses **relative base
     paths** (`base: './'`), so it works from a sub-path like
     `https://<user>.github.io/<repo>/`.
   - Netlify / Vercel / Cloudflare Pages: point them at this repo, build command
     `npm run build`, publish directory `dist`.
   - Local test on the same Wi-Fi: `npm run build && npm run preview -- --host`,
     then open the shown LAN URL on your phone (note: install prompts need HTTPS;
     `localhost` is treated as secure on the same device).
2. Open the hosted URL in **Chrome on Android**.
3. Tap the **⋮ menu → "Install app"** (or "Add to Home screen"). The install prompt
   appears because the build ships a valid manifest (name, short_name, `start_url`,
   `display: standalone`, theme/background colors, 192 + 512 + 512-maskable icons)
   and a service worker with a fetch handler.
4. Launch it from the home screen — it opens standalone and works offline.

On **iOS Safari**: Share → "Add to Home Screen" (iOS supports the home-screen app
and offline cache, but not the Chrome install prompt).

### Want reliable timed reminders?

Mobile browsers restrict background execution for PWAs, so **timed/background
notifications are not guaranteed** — the app is honest about this in the UI. In-app
nudges (the Today banner and Insights) are reliable. For guaranteed scheduled
alerts, wrap this PWA into an APK later with **[PWABuilder](https://pwabuilder.com)**.

---

## Architecture

```
src/
  engine.ts        Pure domain logic (no UI imports) — metrics, bands,
                   eligibility, what-if, SGPA, term summaries. Fully unit-tested.
  engine.test.ts   Vitest tests against the seed acceptance table + band edges.
  seed.ts          Preloaded 2nd & 3rd trimester data from the spreadsheet.
  storage.ts       Single-key localStorage wrapper with in-memory fallback +
                   forward migration from older keys (preserves logged classes).
  storage.test.ts  Migration / export-import round-trip tests.
  dates.ts         Local (not UTC) date math, so the day never shifts in IST.
  types.ts         The data model.
  report.ts        Self-contained printable HTML report (window.print()).
  state/store.tsx  React context store: persistence, theme, single-level undo.
  components/       BandMeter (signature element), charts (sparkline/bar/donut), ui.
  screens/         Today, Subjects, SubjectDetail, Insights, Calendar, More.
scripts/
  gen-icons.mjs    Pure-Node PNG encoder that draws the app icons.
```

### Key computed metrics (per subject)

```
present   = P + L + OD
absent    = A
excluded  = M + C + H
held      = present + absent
total     = max(totalPlanned, held)
remaining = max(0, total - held)

capYet    = present / held  * 100   // headline: attendance among classes held
capAll    = present / total * 100   // final % if you skip everything remaining
best      = (present + remaining) / total * 100   // final % if you attend all

mustAttend = max(0, ceil(th/100 * total) - present)
canMiss    = max(0, min(remaining, floor((100-th)/100 * total) - absent))
```

Live status is based on `capYet`; the what-if planner projects on the final %.

---

## Features

- **Today** — today's classes from each subject's weekly timetable, one-tap P/A and
  a ⋯ menu for L/OD/M/C/H, holiday banner, at-risk banner, quick-mark FAB.
- **Subjects** — trimester switcher (incl. archived), header summary, urgency-sorted
  cards with the band meter and a plain-English verdict.
- **Subject detail** — verdict, "where you stand" (meter + eligibility + 4 stats),
  **what-if planner** stepper, trend sparkline, the numbers, class log grouped by
  faculty, weekly timetable editor, edit/delete.
- **Insights** — grade-points-at-risk, **SGPA impact** (expected vs penalized),
  attendance-by-subject bars with a safe-% marker, present/absent/excused donut.
- **Calendar** — month heatmap with colored pips, today highlighted, holidays shaded;
  tap a day to view/edit/add classes and toggle it as a holiday.
- **More** — theme, credit-weighted toggle, editable rule, best-effort reminders,
  per-trimester archive/clone/generate-from-timetable, print report, JSON/CSV
  export, JSON import, reset to seed.

Every data change shows a toast with single-level **Undo**.

---

## Privacy

No account, no analytics, no network calls at runtime. All data lives in your
browser's localStorage on this device. Use **More → Backup (JSON)** to keep a copy.
