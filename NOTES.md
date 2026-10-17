# Prayer widget — operational notes

Implementation details and standing calls that aren't in the README.

## Data source

- Times come from isalaah.com: `schedule.php?p=clk&loc=` (+ location id).
- JSON keys: `{p}e` = azan, `{p}` = iqamah, `s` = shurooq, `nf` = date,
  where `{p}` is the prayer prefix.
- Widget shows azan + iqamah for both IOK and CHESS masjids.

## Standing calls (his)

- **Azan shown is IOK only** — CHESS azan is ignored even when the two differ
  (his call 2026-09-11).
- **Time-change announcements show only the new time** — no previous time, no
  arrow (his call 2026-09-26).

## Open issue

- Unresolved which Scriptable script copy on his phone the widget actually runs.
  Confirm the script name with him before resending widget code.
