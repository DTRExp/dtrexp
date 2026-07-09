# DTRExp — Date-Time Range & Recursion Expression

**Draft 2.2** · Status: RFC · 2026-07-09 · [Onur Yıldırım](https://github.com/onury) · changes: [CHANGELOG.md](CHANGELOG.md)

A DTRExp is a compact string expression denoting a — possibly infinite — set of time intervals. It is evaluated for **coverage** ("is this instant inside the set?"), not enumerated into date objects. Finite windows of it can be enumerated on demand.

```
T0900:1800 E1:5          business hours
E7#-1 M4                 last Sunday of April, every year
20200106/10D             every 10 days from 2020-01-06
```

---

## 1. Model

A DTRExp **expression** is one or more **components** whose denoted interval sets are **intersected**. The `|` operator unions whole expressions.

```
expression  =  component ∩ component ∩ …
dtrexp      =  expression ∪ expression ∪ …        (via |)
```

- Components may appear in any order; each designator may appear **at most once** per expression. Canonical (recommended) writing order is smallest unit first: `T… E… D… W… M… Q… Y… <bounds>`.
- Whitespace between components is optional but recommended.
- Expressions are **time-zone agnostic**. The time zone is a parameter of *evaluation*, never part of the expression. (Default: UTC.)
- All ranges over **discrete calendar units** (days, months, …) are **inclusive** on both ends: `D1:15` is exactly the first 15 days. Only the continuous time-of-day component `T` uses half-open ranges: `T0900:1200` covers 09:00:00.000 up to but not including 12:00.

## 2. Designators

| Designator | Unit | Domain | Scoped by (nearest **of these** present, else default) |
| --- | --- | --- | --- |
| `Y` | year | e.g. `2026` | absolute |
| `Q` | quarter | 1–4 | `Y` |
| `M` | calendar month | 1–12 | `Y` |
| `W` | ISO week | 1–53 | `Y` (always; week-of-month does not exist) |
| `D` | day | 1–31 / 1–92 / 1–366 | `M` (default) · `Q` · `Y` |
| `E` | ISO weekday | 1 (Mon) – 7 (Sun) | week; with `#` ordinal: `M` (default) · `Q` · `Y` |
| `T` | time of day | `hhmm[ss[.sss]]` half-open range | each covered day |
| `H` | hour of day | 0–23 | day |
| `m` | minute of hour | 0–59 | `H` |
| `s` | second of minute | 0–59 | `m` |
| *(none)* | date literal | `YYYYMMDD[Thhmm[ss]]` | absolute — bounds (§6) and cadence anchors (§5.2) |

Notes:

- A designator is scoped **only by the units its table row lists** — never by whatever coarser selector happens to be present. `D`'s scope is the nearest of `M`/`Q`/`Y` in the expression, else `M`: `D40 Q2` = 40th day of Q2; `D-1 Y*` = last day of each year; plain `D1` = day 1 of every month.
- `W` scopes nothing. `D-1 W*` is the last day of the month (intersected with every week) — *not* the last day of a week; that's `E7`.
- `M` and `Q` are absolute within the year, never rescoped: `M5 Q2` is May (May ∩ Q2), and `M-1 Q1` is December ∩ Q1 = ∅ — statically unsatisfiable, flagged per §9.1.
- When `W` is present, `Y` is interpreted as the **ISO week-year** for that expression (Dec 29 can be W1 of the next week-year; the pairing must be consistent). Only the `Y` selector's own test uses the week-year — `M` and `Q` always test calendar fields, so on 2025-12-29 the expression `M12 W1 Y2026` is satisfied (calendar December, week 1 of week-year 2026).
- Milliseconds exist only as `T` literal precision (`T093015.250:…`); there is no millisecond selector.
- `T` and `H`/`m`/`s` can coexist (they intersect like everything else), but pick one style: `T` for clock ranges, `H`/`m`/`s` for unit patterns and strides.

## 3. Component values

`<designator><value-part>` where the value-part is one of:

| Form | Example | Meaning |
| --- | --- | --- |
| value | `D5` | day 5 |
| negative value | `D-1` | 1st from the end of the parent's actual domain (last day — 28/29/30/31 as the month dictates; leap years resolve themselves) |
| range | `M3:7` | months 3 through 7, inclusive |
| open range | `D-7:*` | 7th-from-last through end (last 7 days); `*` = domain edge — §3.1 |
| wrap range | `M11:2` | November through February, each year: start → domain edge, plus domain start → end |
| list | `M1,3,7:9` | union of values/ranges |
| all | `M*` | entire domain (explicit "every") |
| exclusion | `M!5,7:9` | domain **minus** the listed set |
| stride | `M1/3`, `M1/5/2` | repetition — §5.1 |
| ordinal (E only) | `E7#2`, `E7#-1` | nth / nth-from-last occurrence within the scope |

Rules:

- **Exclusion `!` appears only immediately after the designator** and negates the whole value list. That is the *only* position. "Months 1–10 except 5" is written explicitly: `M1:4,6:10`.
- A component is *either* an exclusion *or* carries a stride — never both.
- A range whose start exceeds its end **wraps** within the parent instance (`M11:2`, `H22:6`, `D25:5`) — same model as `T`'s midnight wrap (§4). `Y` is the one designator with no edge to wrap around: `Y2030:2020` is an error.
- Wrapping is decided **syntactically, on literal non-negative endpoints only**. On 0-based domains a literal `0` is an ordinary endpoint and wraps like any other: `H22:0` covers hours 22, 23 and 0 — the hour analogue of `T2200:0100`. A range containing a negative or `*` endpoint never wraps: it resolves per parent instance (§9.1) and covers nothing in any instance where the resolved start exceeds the resolved end. `D-1:5` is therefore empty in every month — and when emptiness is statically certain, it draws the §9.1 unsatisfiability warning.
- Negative values are meaningless on `Y` (no edge to count back from — §3.1) and are rejected.
- Negative values are domain-checked **symmetrically** at parse time: `-max … -1`, where *max* is the domain's maximum size. `D-31` parses — and covers nothing in months without 31 days (§9.1), the mirror of `D31` in April — while `D-32` is out of domain, a syntax error. On 0-based domains a negative resolves as `max + 1 + v`: `H-1` is hour 23, `H-24` is hour 0.
- `*` as a bare list item is rejected (`M1,*`): a list containing the whole domain *is* the whole domain — write `M*`.
- Strides attach to a single value or a single range, not to lists; the stride's start must be a **non-negative** value (an end-relative anchor like `D-10:*/2` would shift per parent instance — write the positive equivalent). Wrap ranges take no stride.
- `#` takes a single ordinal in `-5…-1, 1…5`. Multiple ordinals ("1st and 3rd Friday") use union: `E5#1 | E5#3`.
- Omitted coarser components default to "every": `M3` alone ≡ `M3` of every year. Writing `Y*` is legal — and redundant **unless it rescopes a finer component**: `D` and `E#` bind to the nearest coarser component *present* (§2), so `D-7:*` alone is the last 7 days of each **month**, while `D-7:* Y*` is the last 7 days of each **year**. Deleting a coarse `*` component is safe only when nothing takes its scope from it.

### 3.1 Domain, scope, and `*`

Two ideas decide what every component value means; they are easy to conflate.

**Domain** — the set of values a designator can take. Some are fixed (`M` is 1–12, `H` is 0–23), some depend on the calendar (`D` is 1–31 / 1–92 / 1–366), one is unbounded (`Y`).

**Scope** — *which* instance of the parent the domain is measured against, per the §2 table. `D`'s domain is the days of one month by default; `D40 Q2` measures days against the quarter, so the domain becomes 1–92.

`*` is not a wildcard and never means "now". It denotes the **edge of the domain in force**, resolved per parent instance — it moves with the calendar, never with the clock. Standalone `M*` (the whole domain) and `M3:*` (from 3 to the domain's edge) are the same `*` doing the same job:

| Expression | Scope | `*` resolves to | Covers |
| --- | --- | --- | --- |
| `D25:*` | month | last day of that month | Feb: 25–29 (5 days) · Mar: 25–31 (7 days) |
| `D25:* Q2` | quarter | last day of Q2 | Apr 25 → Jun 30 |
| `M3:*` | year | December | March through December |
| `H*:3` | day | 0 | hours 0–3 |
| `Y2020:*` | *(none)* | +∞ | 2020 and every later year |
| `Y*:2020` | *(none)* | −∞ | 2020 and every earlier year |

`Y`'s domain has no edge, so the same rule yields "onwards forever" there — that is a property of the domain, not a second meaning of `*`.

**Negative anchors have constant length; positive ones do not.** A negative start counts back from the edge, so its distance to the edge never varies: `D-7:*` is *always* the last 7 days (Feb 23–29 · Mar 25–31), while `D25:*` is 4–7 days depending on the month. `D-7` alone is a single day — the 7th from the end; the `:*` is what makes it a range. This is also why strides forbid end-relative starts (§3, Rules): `D-10:*/2` would shift phase in every month of a different length.

## 4. Time of day — `T`

`Thhmm[ss[.sss]]:hhmm[ss[.sss]]`, half-open `[start, end)`. Lists allowed: `T0900:1200,1300:1800` (business hours minus lunch). A single value `T12` means the implied unit interval `[12:00, 13:00)`; `T1230` means `[12:30, 12:31)` — the unit is the literal's precision, so `T093015` means `[09:30:15, 09:30:16)` and `T093015.250` one millisecond. A range with **equal endpoints** (`T0900:0900`) is a syntax error: half-open, it would cover nothing — typo-shaped input fails loudly.

`T` takes **only values, ranges and lists** — no `*`, no exclusion `!`, no stride, no ordinal (`T0900:*`, `T!0900:1200` and `T0900:1800/2` are all syntax errors). A day-complement is written explicitly: not `T!0900:1200` but `T0000:0900,1200:2400`.

**Midnight wrap:** `T2200:0600` is legal and wraps *within each covered day*: ≡ `T0000:0600,2200:2400`. It does not spill into the next day.

Gotcha: because the wrap stays within the day, `T2200:0600 E5` means Friday 00:00–06:00 **and** Friday 22:00–24:00 — *not* "Friday night into Saturday morning." For the latter, write the intent: `T2200:2400 E5 | T0000:0600 E6`. `2400` is valid only as a range end (`T0000:2400` = the whole day).

## 5. Repetition

Two constructs, split by one question: **does the pattern look identical in every parent cycle?**

### 5.1 Stride — calendar-locked repetition

`<start>[:<end>]/<interval>[/<duration>]` on a normal selector. From `start`, every `interval`-th unit, covering `duration` units (default 1), stopping at `end` (default: domain edge).

| Expression | Covered |
| --- | --- |
| `H0/4` | hours 0, 4, 8, 12, 16, 20 — every day |
| `M1/3` | Jan, Apr, Jul, Oct — every year |
| `M1/5/2` | Jan–Feb, Jun–Jul, Nov–Dec (2-month block every 5) |
| `M1:6/2` | Jan, Mar, May (stride stops at June) |
| `Y2020:2040/3` | 2020, 2023, … 2038 |
| `Y2020:*/3` | 2020, 2023, 2026, … (open-ended, anchored) |

Validity:

- `2 ≤ interval ≤` parent-domain size (its **maximum**, for variable domains: 31/92/366 for `D` by scope, 53 for `W`). Larger patterns ("every 14 months") **must** use a cadence — a stride cannot drift. `Y` has no parent cycle to fit inside and therefore **no interval ceiling**: `Y2020:*/100` is valid.
- `1 ≤ duration < interval` (equal would be continuous coverage — write a plain range instead).
- The **range start is the anchor** and must be explicit: `Y*/3` is a syntax error (every 3rd year *from when?*). This kills the epoch problem at the grammar level.

The first number after `/` is **always the interval**; the optional second is the duration. (Same order as cadences.) A stride is pure sugar: `H0/4` ≡ `H0,4,8,12,16,20`.

### 5.2 Cadence — anchor-based repetition

`<date>/<n><unit>[/<n><unit>]` — a component that **starts with a date literal**: from this anchor, repeat every *period*, covering *duration* each time (default: **1 of the period's unit** — `…/14M` covers 1 month per recurrence, `…/10D` covers 1 day). Period/duration units: `Y M W D H m`.

| Expression | Covered |
| --- | --- |
| `20180301/14M` | 2018-03, 2019-05, 2020-07, … (month drifts — no calendar field can express this) |
| `20200106/10D` | Jan 6, 16, 26, Feb 5, … (the thing cron cannot say) |
| `20200106/10D/3D` | Jan 6–8, 16–18, 26–28, … (3 on, 7 off) |
| `20200106/2W` | every other week from a Monday (biweekly) |

Validity:

- The anchor is part of the literal — an anchorless cadence cannot be written.
- The anchor must be a **real calendar date** — `20230229/1Y` is rejected outright.
- Month/year periods use **constrain** overflow arithmetic (§9.2): `20240131/3M/1D` covers Jan 31, Apr 30 (constrained), Jul 31, Oct 31.
- duration < period, compared conservatively with **fixed unit lengths**: max length (duration side) Y = 366 d · M = 31 d · W = 7 d · D = 1 d; min length (period side) Y = 365 d · M = 28 d · W = 7 d · D = 1 d; `H`/`m` exact. The check is `duration × max(durationUnit) < period × min(periodUnit)`; same-unit comparisons are exact. The conservatism is deliberate: `20240101/2M/58D` is rejected (58 ≥ 2 × 28) even though no real pair of consecutive months is shorter than 59 days. Consequence: a period of exactly 1 unit (`/1M`, `/1D`) requires an **explicit smaller-unit duration** (`/1M/1D`) — the default would equal the period, and continuous coverage is a bound's job, not a cadence's.
- **Month/year duration units require a month/year period** (`/3Y/2M` ✓ · `/10D/1M` ✗): a calendar-month of coverage needs a calendar anchor to constrain against (§9.2), and a day-anchored recurrence supplies none.
- At most **one cadence per expression**; union more via `|`.

Cadences intersect with other components like anything else:

```
T0900:1200 20200106/10D     09:00–12:00 on every 10th day
E1 20180301/14M             Mondays inside each 14-month recurrence window
```

Maps 1:1 to ISO 8601 repeating intervals (`R/2018-03-01/P14M`) and to RRULE `DTSTART` + `INTERVAL`.

## 6. Absolute bounds — date literals

An undesignated date-literal range clips the whole expression to an absolute window. Date literals are always 8+ digits: `YYYYMMDD[Thhmm[ss]]` (no bare `YYYY`/`YYYYMM` — that's what `Y`/`M` selectors are for).

| Form | Meaning |
| --- | --- |
| `20150101:*` | on and after 2015-01-01 (replaces `>=`) |
| `*:20291231` | through end of 2029-12-31, inclusive (replaces `<=`) |
| `20180301:20190425` | from start of Mar 1 2018 through end of Apr 25 2019 |
| `20180120` | that entire day (replaces `=`) |
| `20180120T1800` | that instant as a lower/upper edge inside a range |

A bare date literal denotes its **whole span** (a day; a minute if `Thhmm` given; a second if `Thhmmss` given); a range covers from the start of its first literal through the end of its last. Note the end is span-inclusive: `*:20180120T1800` runs through the *end* of the 18:00 minute — for a strict "before 18:00," write `*:20180120T1759`. At most one bounds component per expression. At least one endpoint must be a date literal: `*:*` is a syntax error — an unbounded window is spelled by omitting bounds. The comparison operators of draft 1 (`<`, `<=`, `>`, `>=`, `=`) are **removed** — bounds express all of them with less grammar.

Bounds resolve in the **evaluation zone**, like every other component: `20180120` is that calendar day *as observed in the evaluation time zone*, so the window's absolute position shifts with the zone. "Absolute" means the window does not recur — not that it is pinned to UTC; the expression still carries no zone (§1).

## 7. Union — `|`

`expr | expr` unions two complete expressions. Use it for anything a single expression's "one designator once, one ordinal, one cadence" rules disallow:

```
E5#1 M* | E5#3 M*            1st and 3rd Friday of every month
T0900:1800 E1:5 | T1000:1400 E6    weekday hours, plus short Saturdays
```

## 8. Grammar (EBNF)

```ebnf
dtrexp      = expression , { "|" , expression } ;
expression  = component , { { " " } , component } ;
component   = selector | cadence | bounds ;

selector    = designator , ( "*" | ordinal | valuelist | exclusion | strided ) ;
designator  = "Y" | "Q" | "M" | "W" | "D" | "E" | "T" | "H" | "m" | "s" ;
valuelist   = item , { "," , item } ;
item        = value | range ;
value       = [ "-" ] , integer | timeval ;            (* timeval only under T *)
range       = ( value | "*" ) , ":" , ( value | "*" ) ;
exclusion   = "!" , valuelist ;
strided     = ( value | range ) , "/" , integer , [ "/" , integer ] ;
ordinal     = value , "#" , [ "-" ] , integer ;         (* E only; single, never in a list *)

cadence     = date , "/" , integer , unit , [ "/" , integer , unit ] ;
unit        = "Y" | "M" | "W" | "D" | "H" | "m" ;

bounds      = date | ( date , ":" , ( date | "*" ) ) | ( "*" , ":" , date ) ;
date        = 8digit , [ "T" , 4digit , [ 2digit ] ] ;

timeval     = 2digit | 4digit , [ 2digit , [ "." , 3digit ] ] ;
```

Tokens match **greedily** (longest match): `20180120T1800` is always one date-with-time literal, never a bounds `20180120` followed by a selector `T1800`; `M3Y2018` parses as two components with the whitespace elided. The date literal's `T`-glue is **unconditional**: a `T` immediately following 8 digits belongs to the literal, so a malformed time-part is a syntax error — `20180120T09` does **not** re-tokenize as bounds `20180120` + selector `T09`. Greed never backtracks on semantic failure.

(Static validity rules — domains, stride limits, one-designator-once, `W`⇒ISO-week-year, etc. — are constraints on top of this grammar, per §§2–6.)

## 9. Evaluation semantics

Every component denotes a set of half-open instant intervals; the expression denotes their intersection; `|` unions expressions. Formally, for an instant `t` evaluated in time zone `z`:

1. Compute the calendar fields of `t` in `z` **once**: year, ISO week-year+week, quarter, month, day-of-month/quarter/year, weekday, weekday-ordinal-in-scope, time-of-day, hour, minute, second.
2. Each selector tests its field against its normalized span set (inclusive surface ranges become half-open integer spans at parse time; negative values resolve against the *actual* parent instance — `D-1` in Feb 2024 is 29). Strides test `(value − start) mod interval < duration` within the range.
3. A cadence covers `t` iff `t` lies inside one of its **occurrence windows**. Occurrence `k` (k ≥ 0) starts at `startₖ = constrain(anchor + k·period)` (§9.2) and ends at `constrain(startₖ + duration)` — the end is measured **from the constrained start**, not from the ideal `anchor + k·period + duration` (for `20240131/3M/1M`, occurrence 1 runs Apr 30 → May 30, not May 31). For the exact units (`D`/`W`/`H`/`m`) this reduces to `unitsBetween(anchor, t) mod period < duration`; for month/year periods the window start **must** be computed by constrained anchor arithmetic — the reduction is wrong there (`20240131/1M/1D` covers Apr 30, which no `mod` on `monthsBetween` yields). `k` is still locatable in O(1) via `floor(unitsBetween(anchor, t) / period)` ± 1.
4. Bounds test `t` against the absolute window.
5. `covers(t)` ⇔ every component passes; a `|`-union covers ⇔ any branch covers.

Cost: `covers` is O(#components) integer comparisons after one field extraction — no date object iteration. This is the property that makes DTRExp suitable for hot paths (e.g. per-request permission checks).

Derived operations: `intersect(a, b)` — the covered intervals clipped to a finite window (always a finite list); `next(after)` — first covered interval after an instant (candidate-stepping search, coarsest selector first).

### 9.1 The existence rule

Selectors match against the fields of *real instants*, so a calendar position that doesn't exist in a given parent instance simply covers nothing there — no error, no substitution:

- `D29 M2` covers Feb 29 in leap years and nothing in other years. (2100 is **not** a leap year — the century rule; test vectors must include it.)
- `D31` covers nothing in 30-day months; `D366` and `W53` cover nothing in years that lack them; `E7#5` covers nothing in months without a fifth Sunday.
- Ranges resolve **per parent instance**: `D25:-1` is days 25–28 in Feb 2025 but 25–31 in January. An instance where the resolved start exceeds the resolved end covers nothing there.
- `validate()` SHOULD flag *statically unsatisfiable* expressions as warnings — they are not syntax errors. `D30 M2` can never match in any year; neither can `M-1 Q1` (`M-1` is December — §2 — and December ∩ Q1 is empty). The **required minimum** (pinned by the warning vectors) is: per-selector satisfiability against the set of domain sizes implied by co-present selectors (catches `D30 M2`, `W53` under fixed 52-week years, statically-empty non-wrap ranges like `D-1:5` and `M-2:2`), full-domain exclusions (`M!1:12`), and `M`∩`Q` disjointness (`M-1 Q1`). Deeper cross-selector analysis (day×weekday interplay and the like) is quality-of-implementation, not conformance. Warnings from every `|` branch surface on the whole expression — a dead branch is exactly the typo the warning exists for.
- To pin a calendar date, use `D`+`M`, never day-of-year: `D60 Y*` is Mar 1 in common years but Feb 29 in leap years.

### 9.2 Cadence overflow — constrain, never skip

When a month- or year-period cadence occurrence lands on a nonexistent date, it is **constrained** (clamped) to the last valid day:

- `20240131/1M/1D` → Jan 31, Feb 29, Mar 31, Apr 30, … (2025: Feb 28)
- `20240229/1Y/1D` → Feb 29 in leap years, Feb 28 otherwise

This matches Temporal's `constrain` arithmetic. Interop note: plain RFC 5545 RRULE *skips* such occurrences; the equivalent behavior requires RFC 7529 `SKIP=BACKWARD`, which `toRRule()` must emit for affected cadences.

### 9.3 DST and local time

Evaluation in a non-UTC zone follows directly from instant-based coverage:

- **Nonexistent local times** (spring-forward gap): no instant ever carries those fields, so `T0230:0300` covers nothing on that day — the existence rule again.
- **Repeated local times** (fall-back): both instants carry matching fields; **both are covered**. Local-time coverage can therefore total 23 or 25 hours on transition days — this is correct for the "local business hours" use case.
- Cadences with `D`/`W`/`M`/`Y` periods use **calendar arithmetic in the evaluation zone** (Temporal semantics): occurrence windows align to the local clock, so a covered "day" on a transition date is 23 or 25 absolute hours. `H`/`m` periods are absolute elapsed time.
- A cadence **anchor** that resolves to a repeated local wall-clock time is the **earlier** occurrence; one that falls in a gap resolves **forward** past it — Temporal's `compatible` disambiguation. The rule must not depend on the zone or the sign of its offset.

### 9.4 Leap seconds

Not representable, following POSIX/Temporal: `s` runs 0–59 and `T…60` is invalid. 23:59:60 never occurs in the evaluated timeline.

## 10. Examples

| Definition | DTRExp |
| --- | --- |
| Business hours (Mon–Fri 9–18) | `T0900:1800 E1:5` |
| …with lunch break excluded | `T0900:1200,1300:1800 E1:5` |
| Last Sunday of April, every year | `E7#-1 M4` |
| Mothers' Day (2nd Sunday of May) | `E7#2 M5` |
| Christmas Day | `D25 M12` |
| Last 7 days of every year | `D-7:* Y*` |
| First 15 days of each month | `D1:15` |
| Every month except July | `M!7` |
| 3rd and 7th month of each year | `M3,7` |
| First 10 days of Q2 | `D1:10 Q2` |
| Every Wednesday of March 2018 | `E3 M3 Y2018` |
| Weekends from 2018-03-01 to 2019-04-25 | `E6:7 20180301:20190425` |
| 18:00–20:00 on 2018-01-20 | `T1800:2000 20180120` |
| Every Monday 10–11 until 2018-01-20 18:00 | `T1000:1100 E1 *:20180120T1800` |
| Every 4th hour, first 20 minutes (Einstein's nap) | `m0:19 H0/4` |
| Jan/Apr/Jul/Oct, every year | `M1/3` |
| Every 3rd year, 2020 through 2040 | `Y2020:2040/3` |
| Every 14 months from March 2018 | `20180301/14M` |
| Every 10 days from 2020-01-06, 3 days long | `20200106/10D/3D` |
| Biweekly from a given Monday | `20200106/2W` |
| 1st and 3rd Friday of every month | `E5#1 \| E5#3` |
| First 10 ISO weeks of each year, 2015–2029 | `W1:10 Y2015:2029` |

## 11. Open questions (for draft 3)

1. **`W` + `M` co-occurrence** — currently legal by intersection (`W10 M3` = the part of ISO week 10 that lies in March). Confirm or forbid.
2. **Ordinal `#` on units other than `E`** — e.g. `D15#…` makes no sense, but `W#-1 M*` ("last full week of each month") was a draft-1 wish. Deferred; would reintroduce week-of-month semantics.
3. **Cadence duration in a different unit than the period** (`/10D/36H`) — currently allowed with a conservative max≤min length check; may restrict to same-unit if the check proves confusing.
4. **`describe()` locale model** — deferred to the library spec.

## 12. Conformance

An implementation is conforming iff it accepts/rejects and evaluates the shared test vectors (**[`vectors.json`](vectors.json)**, shipped with this draft): `{ expression, tz, instant → expected }` coverage groups, plus rejection cases and warning cases. The vectors — not the prose — are the contract.

The suite includes the calendar traps of §§9.1–9.3: `D29 M2` against 2023, 2024, 2000, and **2100**; `D-1` across leap February; `W53`; `E7#5`; `20240131/3M/1D` and `20240229/1Y/1D` constrain cases; midnight-wrap + weekday intersection; and DST-transition instants in `Europe/Berlin` (gap and overlap).
