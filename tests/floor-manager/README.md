# Floor Manager checks

These checks exercise the game shipped in `dist/floor-manager/`. They originally
accompanied Sites version 17 (source commit
`6cb86e51927834c05b36753d3f846705002d0308`) and have been updated for the current
four-day campaign, starter furniture, $2,000 budget, required cleanup and timed
customer requests. They do not require a browser or installed dependencies.

Run all checks from the repository root:

```sh
node tests/floor-manager/run-checks.cjs
```

Each `*-checks.mjs` file can also be run directly with Node. The runner gives each
file three minutes and reports failures without skipping the remaining checks.

- `focused-checks.mjs`: opening resources, cleanup charges, live edits, noise,
  four complete shifts, transactions, settlement and mission thresholds.
- `four-day-checks.mjs`: mission progression, old-save migration, real comfort
  requests, paid fixes, affordability and duplicate-charge protection.
- `opening-checks.mjs`: actual opening handler, cleanup and required equipment.
- `urgency-checks.mjs`: real requests on all four days, deadlines, urgency,
  charging, successful resolution and unresolved departures.
- `pace-motion-checks.mjs`: 36 full simulations across four days, three layouts
  and three frame schedules; pause, accounting, walking and departure routes.

The pacing fixtures explicitly remove starter furniture before placing their
own furniture. Otherwise the scenario called “empty” is not empty, and furniture
in the furnished scenario overlaps the starter layout. Walking routes end at
the chair approach; the game handles sitting as a separate animation.
