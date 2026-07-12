# DTRExp — Recurrence, cleanly

_One question decides everything._

## The one question

> **Does the pattern look the same in every parent cycle?**

- "Hours 0, 4, 8, 12, 16, 20" — same every day, forever. → **calendar-locked**. The calendar field itself tells you the answer.
- "Every 14 months from March 2018" — hits 2018-03, 2019-05, 2020-07… the month **drifts** each year. → **anchor-based**. No calendar field can tell you; only elapsed time since a start date can.

These are two different kinds of recurrence; forcing both through one syntax is how recurrence grammars collapse. DTRExp gives each its own construct.

## Construct 1 — Stride `/interval[/duration]` (calendar-locked)

Attach `/<interval>[/<duration>]` to a normal selector: _from the range start, every interval-th unit, covering duration units (default 1)_.

| Expression | Meaning | Covered |
| --- | --- | --- |
| `H0/4` | every 4th hour from hour 0, each day | 00, 04, 08, 12, 16, 20 |
| `M1/3` | every 3rd month from January, each year | Jan, Apr, Jul, Oct |
| `M1/5/2` | every 5 months, 2 months long | Jan–Feb, Jun–Jul, Nov–Dec |
| `Y2020:2040/3` | every 3rd year of that range | 2020, 2023, 2026, … 2038 |

Rules:

- **Legal only when it fits inside the parent cycle** (`n` ≤ parent's span). `M3/14` is a **syntax error** — 14 months can't repeat inside one year; that's a cadence (below).
- **The range start is the anchor.** `Y2020:2040/3` anchors at 2020. Bare `Y*/3` is a syntax error — no start, no anchor. (This kills the old "every 3 years… from when?" / year-0 problem by construction.)
- The first number after `/` is always the **interval**; the optional second is the **duration** — the same order as cadences (`20180301/14M/2M`). `1 ≤ duration < interval`.
- Evaluation is one modulo: `(value − start) % interval < duration`. No dates, no iteration.

Stride is pure convenience — `H0/4` and `H0,4,8,12,16,20` are the same expression. It adds terseness, not power.

## Construct 2 — Anchored cadence `<date>/<n><unit>[/<n><unit>]` (anchor-based)

A component that **starts with a date literal**: _from this date, repeat every `<period>`, covering `<duration>` each time (default: 1 period-unit)._

| Expression | Meaning | Covered |
| --- | --- | --- |
| `20180301/14M` | every 14 months from 2018-03-01 | 2018-03, 2019-05, 2020-07, … |
| `20200106/10D` | every 10 days from 2020-01-06 | Jan 6, 16, 26, Feb 5, … |
| `20200106/10D/3D` | every 10 days, 3 days long | Jan 6–8, 16–18, 26–28, … |

Rules:

- The anchor date is **required and part of the literal** — a cadence without an anchor cannot be written, so it can never be ambiguous.
- Evaluation is still O(1): `elapsed = unitsBetween(anchor, instant)`; covered iff `elapsed % period < duration`.
- This is the thing cron famously **cannot** express ("every 10 days") and RRULE expresses only via `DTSTART` + `INTERVAL`. It maps 1:1 to ISO 8601 repeating intervals (`R/2018-03-01/P14M`) — so `toRRule()` / ISO interop falls out for free.

## Composing them

Components still just intersect, like everything else in DTRExp:

| Expression | Meaning |
| --- | --- |
| `T0900:1200 20200106/10D` | 09:00–12:00, on every 10th day from 2020-01-06 |
| `m0:19 H0/4` | first 20 minutes of every 4th hour (da Vinci's sleep) |
| `E1 20180301/14M` | Mondays that fall inside each 14-month recurrence window |

## Cheat sheet

> Same pattern every year/day/hour? → **selector + `/n` stride.**
> Pattern drifts across the calendar? → **date-anchored cadence.**
> Want only some recurrences? → **bound it with a date range.**
