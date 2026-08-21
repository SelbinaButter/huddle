# Huddle

A daily football coverage puzzle. A defense lines up against you; call a concept, commit to a receiver, watch the annotated film, and find the throw that scores in four snaps. Everyone gets the same UTC-dated defense.

## Run it

```bash
npm install
npm run tables
npm run generate -- --date=2026-08-20
npm run dev
```

Useful commands:

- `npm test` — fast core, solver, date, and share-card verification
- `npm run test:generation` — exhaustive 60-day generation and 30-day repeat verification
- `npm run test:all` — all Vitest suites
- `npm run test:browser` — Node/Chromium lookup parity and playable mode checks
- `npm run tables` — rebuild the committed integer lookup table
- `npm run generate -- --from=2026-08-20 --days=7` — generate a date range
- `npm run generate -- --from=2026-08-20 --through=2026-08-27 --missing` — fill only missing dates and refresh the index
- `npm run build` — type-check and build the static app

Set `HUDDLE_SEED_SALT` before production generation. The public shell value is deliberately only obfuscated—the browser must resolve arbitrary plays—but the private salt prevents future daily states from being derived. GitHub Actions requires a repository secret with that name.

## How it works

`src/core/` is pure TypeScript with no React or DOM dependencies. The game uses a 1-yard lattice and deterministic distance comparisons; there is no physics integration or cross-engine floating-point state. Open completions gain yards after the catch according to the nearest defender's cushion, while tight-window throws are still broken up or intercepted. `scripts/buildTables.ts` computes and commits all 256 shell variants × eight concept observations and 256 × 40 play outcomes to `public/tables.json`. Both generation and the browser only look those values up.

The current measured pool contains 64 states that pass all gates: 5–15% blind scoring plays, 3–8 survivors after the worst first snap, no universal pre-snap scoring throw, at least 90% first-snap convertibility, and reference par at most three. Per-date generation excludes the prior 30 shells, writes the public puzzle to `public/puzzles/`, and writes the unobfuscated answer and measurements only to gitignored `.generated/solutions/`.

The UI keeps the coverage name and candidate list hidden during play. It accumulates route and defender trails, labels only route-stressed assignments, and reveals the complete defense plus every scoring throw after the series. Daily rounds and streaks use versioned `huddle:*:v1` localStorage keys; archive and practice are separate, and practice never affects the streak.

## Deployment and test cadence

The Pages workflow restores its validated puzzle archive, fills missing dates through the current UTC day, verifies that today's file and index entry exist, builds, and deploys. Three staggered cron windows make the publish resilient to GitHub schedule delays; because generation uses `--missing`, retries are safe. Pushes and manual runs execute exhaustive generation plus Playwright, while daily cron runs use the fast deterministic suite and build only.

The browser parity harness remains intentional: here it protects serialized table decoding and lookup consistency, not floating-point physics.

## Structure

```text
src/core/     routes, shell assignments, observations, outcomes, filtering, solver
src/game/     UTC dates, persisted rounds/streaks, spoiler-safe sharing
src/ui/       React call sheet and animated canvas field
scripts/      one-time table build and salted daily generation
public/       committed tables and dated public puzzles
test/         fast core/game, exhaustive generation, Playwright parity/UI
```
