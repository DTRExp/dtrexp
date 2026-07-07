# DTRE — Date-Time Range & Recursion Expression

**Draft 2** · Status: RFC · 2026-07-07

A DTRE is a compact string expression denoting a — possibly infinite — set of time intervals. It is evaluated for **coverage** ("is this instant inside the set?"), not enumerated into date objects. Finite windows of it can be enumerated on demand.

```
T0900-1800 E1-5          business hours
E7#-1 M4                 last Sunday of April, every year
20200106/10D             every 10 days from 2020-01-06
```

---

## 1. Model

A DTRE **expression** is one or more **components** whose denoted interval sets are **intersected**. The `|` operator unions whole expressions.

```
expression  =  component ∩ component ∩ …
dtre        =  expression ∪ expression ∪ …        (via |)
```

- Components may appear in any order; each designator may appear **at most once** per expression. Canonical (recommended) writing order is smallest unit first: `T… E… D… W… M… Q… Y… <bounds>`.
- Whitespace between components is optional but recommended.
- Expressions are **time-zone agnostic**. The time zone is a parameter of *evaluation*, never part of the expression. (Default: UTC.)
- All ranges over **discrete calendar units** (days, months, …) are **inclusive** on both ends: `D1-15` is exactly the first 15 days. Only the continuous time-of-day component `T` uses half-open ranges: `T0900-1200` covers 09:00:00.000 up to but not including 12:00.

## 2. Designators

| Designator | Unit | Domain | Scoped by (nearest present, else default) |
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

- `D`'s meaning follows its **nearest coarser selector present**: `D40 Q2` = 40th day of Q2; `D-1 Y*` = last day of each year; plain `D1` = day 1 of every month.
- When `W` is present, `Y` is interpreted as the **ISO week-year** for that expression (Dec 29 can be W1 of the next week-year; the pairing must be consistent).
- Milliseconds exist only as `T` literal precision (`T093015.250-…`); there is no millisecond selector.
- `T` and `H`/`m`/`s` can coexist (they intersect like everything else), but pick one style: `T` for clock ranges, `H`/`m`/`s` for unit patterns and strides.

## 3. Component values

`<designator><value-part>` where the value-part is one of:

| Form | Example | Meaning |
| --- | --- | --- |
| value | `D5` | day 5 |
| negative value | `D-1` | 1st from the end of the parent's actual domain (last day — 28/29/30/31 as the month dictates; leap years resolve themselves) |
| range | `M3-7` | months 3 through 7, inclusive |
| open range | `D-7-*` | 7th-from-last through end (last 7 days); `*` = domain edge |
| list | `M1,3,7-9` | union of values/ranges |
| all | `M*` | entire domain (explicit "every") |
| exclusion | `M!5,7-9` | domain **minus** the listed set |
| stride | `M1/3`, `M1/5/2` | repetition — §5.1 |
| ordinal (E only) | `E7#2`, `E7#-1` | nth / nth-from-last occurrence within the scope |

Rules:

- **Exclusion `!` appears only immediately after the designator** and negates the whole value list. That is the *only* position. "Months 1–10 except 5" is written explicitly: `M1-4,6-10`.
- A component is *either* an exclusion *or* carries a stride — never both.
- Strides attach to a single value or a single range, not to lists; the stride's start must be a **positive** value (an end-relative anchor like `D-10-*/2` would shift per parent instance — write the positive equivalent).
- `#` takes a single ordinal in `-5…-1, 1…5`. Multiple ordinals ("1st and 3rd Friday") use union: `E5#1 | E5#3`.
- Omitted coarser components default to "every": `M3` alone ≡ `M3` of every year. Writing `Y*` is legal but redundant.

## 4. Time of day — `T`

`Thhmm[ss[.sss]]-hhmm[ss[.sss]]`, half-open `[start, end)`. Lists allowed: `T0900-1200,1300-1800` (business hours minus lunch). A single value `T12` means the implied unit interval `[12:00, 13:00)`; `T1230` means `[12:30, 12:31)`.

**Midnight wrap:** `T2200-0600` is legal and wraps *within each covered day*: ≡ `T0000-0600,2200-2400`. It does not spill into the next day.

Gotcha: because the wrap stays within the day, `T2200-0600 E5` means Friday 00:00–06:00 **and** Friday 22:00–24:00 — *not* "Friday night into Saturday morning." For the latter, write the intent: `T2200-2400 E5 | T0000-0600 E6`. `2400` is valid only as a range end (`T0000-2400` = the whole day).

## 5. Repetition

Two constructs, split by one question: **does the pattern look identical in every parent cycle?**

### 5.1 Stride — calendar-locked repetition

`<start>[-<end>]/<interval>[/<duration>]` on a normal selector. From `start`, every `interval`-th unit, covering `duration` units (default 1), stopping at `end` (default: domain edge).

| Expression | Covered |
| --- | --- |
| `H0/4` | hours 0, 4, 8, 12, 16, 20 — every day |
| `M1/3` | Jan, Apr, Jul, Oct — every year |
| `M1/5/2` | Jan–Feb, Jun–Jul, Nov–Dec (2-month block every 5) |
| `M1-6/2` | Jan, Mar, May (stride stops at June) |
| `Y2020-2040/3` | 2020, 2023, … 2038 |
| `Y2020-*/3` | 2020, 2023, 2026, … (open-ended, anchored) |

Validity:

- `2 ≤ interval ≤` parent-domain size. Larger patterns ("every 14 months") **must** use a cadence — a stride cannot drift.
- `1 ≤ duration < interval` (equal would be continuous coverage — write a plain range instead).
- The **range start is the anchor** and must be explicit: `Y*/3` is a syntax error (every 3rd year *from when?*). This kills the epoch problem at the grammar level.

The first number after `/` is **always the interval**; the optional second is the duration. (Same order as cadences.) A stride is pure sugar: `H0/4` ≡ `H0,4,8,12,16,20`.

### 5.2 Cadence — anchor-based repetition

`<date>/<n><unit>[/<n><unit>]` — a component that **starts with a date literal**: from this anchor, repeat every *period*, covering *duration* each time (default: 1 period-unit). Period/duration units: `Y M W D H m`.

| Expression | Covered |
| --- | --- |
| `20180301/14M` | 2018-03, 2019-05, 2020-07, … (month drifts — no calendar field can express this) |
| `20200106/10D` | Jan 6, 16, 26, Feb 5, … (the thing cron cannot say) |
| `20200106/10D/3D` | Jan 6–8, 16–18, 26–28, … (3 on, 7 off) |
| `20200106/2W` | every other week from a Monday (biweekly) |

Validity:

- The anchor is part of the literal — an anchorless cadence cannot be written.
- The anchor must be a **real calendar date** — `20230229/1Y` is rejected outright.
- Month/year periods use **constrain** overflow arithmetic (§9.2): `20240131/1M` covers Jan 31, Feb 28/29, Mar 31, …
- duration < period (compared conservatively: max length of duration ≤ min length of period; same-unit comparisons are exact).
- At most **one cadence per expression**; union more via `|`.

Cadences intersect with other components like anything else:

```
T0900-1200 20200106/10D     09:00–12:00 on every 10th day
E1 20180301/14M             Mondays inside each 14-month recurrence window
```

Maps 1:1 to ISO 8601 repeating intervals (`R/2018-03-01/P14M`) and to RRULE `DTSTART` + `INTERVAL`.

## 6. Absolute bounds — date literals

An undesignated date-literal range clips the whole expression to an absolute window. Date literals are always 8+ digits: `YYYYMMDD[Thhmm[ss]]` (no bare `YYYY`/`YYYYMM` — that's what `Y`/`M` selectors are for).

| Form | Meaning |
| --- | --- |
| `20150101-*` | on and after 2015-01-01 (replaces `>=`) |
| `*-20291231` | through end of 2029-12-31, inclusive (replaces `<=`) |
| `20180301-20190425` | from start of Mar 1 2018 through end of Apr 25 2019 |
| `20180120` | that entire day (replaces `=`) |
| `20180120T1800` | that instant as a lower/upper edge inside a range |

A bare date literal denotes its **whole span** (a day, or a minute if `T…` given); a range covers from the start of its first literal through the end of its last. Note the end is span-inclusive: `*-20180120T1800` runs through the *end* of the 18:00 minute — for a strict "before 18:00," write `*-20180120T1759`. At most one bounds component per expression. The comparison operators of draft 1 (`<`, `<=`, `>`, `>=`, `=`) are **removed** — bounds express all of them with less grammar.

## 7. Union — `|`

`expr | expr` unions two complete expressions. Use it for anything a single expression's "one designator once, one ordinal, one cadence" rules disallow:

```
E5#1 M* | E5#3 M*            1st and 3rd Friday of every month
T0900-1800 E1-5 | T1000-1400 E6    weekday hours, plus short Saturdays
```

## 8. Grammar (EBNF)

```ebnf
dtre        = expression , { "|" , expression } ;
expression  = component , { [ " " ] , component } ;
component   = selector | cadence | bounds ;

selector    = designator , ( valuelist | exclusion | strided ) ;
designator  = "Y" | "Q" | "M" | "W" | "D" | "E" | "T" | "H" | "m" | "s" ;
valuelist   = item , { "," , item } ;
item        = value | range | ordinal ;
value       = [ "-" ] , integer | timeval ;            (* timeval only under T *)
range       = ( value | "*" ) , "-" , ( value | "*" ) ;
exclusion   = "!" , valuelist ;
strided     = ( value | range ) , "/" , integer , [ "/" , integer ] ;
ordinal     = value , "#" , [ "-" ] , integer ;         (* E only *)

cadence     = date , "/" , integer , unit , [ "/" , integer , unit ] ;
unit        = "Y" | "M" | "W" | "D" | "H" | "m" ;

bounds      = date | ( ( date | "*" ) , "-" , ( date | "*" ) ) ;
date        = 8digit , [ "T" , 4digit , [ 2digit ] ] ;

timeval     = 4digit , [ 2digit , [ "." , 3digit ] ] ;
```

(Static validity rules — domains, stride limits, one-designator-once, `W`⇒ISO-week-year, etc. — are constraints on top of this grammar, per §§2–6.)

## 9. Evaluation semantics

Every component denotes a set of half-open instant intervals; the expression denotes their intersection; `|` unions expressions. Formally, for an instant `t` evaluated in time zone `z`:

1. Compute the calendar fields of `t` in `z` **once**: year, ISO week-year+week, quarter, month, day-of-month/quarter/year, weekday, weekday-ordinal-in-scope, time-of-day, hour, minute, second.
2. Each selector tests its field against its normalized span set (inclusive surface ranges become half-open integer spans at parse time; negative values resolve against the *actual* parent instance — `D-1` in Feb 2024 is 29). Strides test `(value − start) mod interval < duration` within the range.
3. A cadence tests `unitsBetween(anchor, t) mod period < duration` (unit-difference arithmetic in `z`).
4. Bounds test `t` against the absolute window.
5. `covers(t)` ⇔ every component passes; a `|`-union covers ⇔ any branch covers.

Cost: `covers` is O(#components) integer comparisons after one field extraction — no date object iteration. This is the property that makes DTRE suitable for hot paths (e.g. per-request permission checks).

Derived operations: `intersect(a, b)` — the covered intervals clipped to a finite window (always a finite list); `next(after)` — first covered interval after an instant (candidate-stepping search, coarsest selector first).

### 9.1 The existence rule

Selectors match against the fields of *real instants*, so a calendar position that doesn't exist in a given parent instance simply covers nothing there — no error, no substitution:

- `D29 M2` covers Feb 29 in leap years and nothing in other years. (2100 is **not** a leap year — the century rule; test vectors must include it.)
- `D31` covers nothing in 30-day months; `D366` and `W53` cover nothing in years that lack them; `E7#5` covers nothing in months without a fifth Sunday.
- Ranges resolve **per parent instance**: `D25--1` is days 25–28 in Feb 2025 but 25–31 in January. An instance where the resolved start exceeds the resolved end covers nothing there.
- `validate()` SHOULD flag *statically unsatisfiable* expressions (`D30 M2` can never match, in any year) as warnings — they are not syntax errors.
- To pin a calendar date, use `D`+`M`, never day-of-year: `D60 Y*` is Mar 1 in common years but Feb 29 in leap years.

### 9.2 Cadence overflow — constrain, never skip

When a month- or year-period cadence occurrence lands on a nonexistent date, it is **constrained** (clamped) to the last valid day:

- `20240131/1M` → Jan 31, Feb 29, Mar 31, Apr 30, … (2025: Feb 28)
- `20240229/1Y` → Feb 29 in leap years, Feb 28 otherwise

This matches Temporal's `constrain` arithmetic. Interop note: plain RFC 5545 RRULE *skips* such occurrences; the equivalent behavior requires RFC 7529 `SKIP=BACKWARD`, which `toRRule()` must emit for affected cadences.

### 9.3 DST and local time

Evaluation in a non-UTC zone follows directly from instant-based coverage:

- **Nonexistent local times** (spring-forward gap): no instant ever carries those fields, so `T0230-0300` covers nothing on that day — the existence rule again.
- **Repeated local times** (fall-back): both instants carry matching fields; **both are covered**. Local-time coverage can therefore total 23 or 25 hours on transition days — this is correct for the "local business hours" use case.
- Cadences with `D`/`W`/`M`/`Y` periods use **calendar arithmetic in the evaluation zone** (Temporal semantics): occurrence windows align to the local clock, so a covered "day" on a transition date is 23 or 25 absolute hours. `H`/`m` periods are absolute elapsed time.

### 9.4 Leap seconds

Not representable, following POSIX/Temporal: `s` runs 0–59 and `T…60` is invalid. 23:59:60 never occurs in the evaluated timeline.

## 10. Examples

| Definition | DTRE |
| --- | --- |
| Business hours (Mon–Fri 9–18) | `T0900-1800 E1-5` |
| …with lunch break excluded | `T0900-1200,1300-1800 E1-5` |
| Last Sunday of April, every year | `E7#-1 M4` |
| Mothers' Day (2nd Sunday of May) | `E7#2 M5` |
| Christmas Day | `D25 M12` |
| Last 7 days of every year | `D-7-* Y*` |
| First 15 days of each month | `D1-15` |
| Every month except July | `M!7` |
| 3rd and 7th month of each year | `M3,7` |
| First 10 days of Q2 | `D1-10 Q2` |
| Every Wednesday of March 2018 | `E3 M3 Y2018` |
| Weekends from 2018-03-01 to 2019-04-25 | `E6-7 20180301-20190425` |
| 18:00–20:00 on 2018-01-20 | `T1800-2000 20180120` |
| Every Monday 10–11 until 2018-01-20 18:00 | `T1000-1100 E1 *-20180120T1800` |
| Every 4th hour, first 20 minutes (Einstein's nap) | `m0-19 H0/4` |
| Jan/Apr/Jul/Oct, every year | `M1/3` |
| Every 3rd year, 2020 through 2040 | `Y2020-2040/3` |
| Every 14 months from March 2018 | `20180301/14M` |
| Every 10 days from 2020-01-06, 3 days long | `20200106/10D/3D` |
| Biweekly from a given Monday | `20200106/2W` |
| 1st and 3rd Friday of every month | `E5#1 \| E5#3` |
| First 10 ISO weeks of each year, 2015–2029 | `W1-10 Y2015-2029` |

## 11. Changes from draft 1 / DTRExp

| Was | Now | Why |
| --- | --- | --- |
| `:` (exclusive) *and* `-` ranges | `-` inclusive only; `T` half-open | one operator, one rule; off-by-ones die |
| `!` in 5 positions | `!` only after the designator | one negation, defined set semantics |
| `F` / `L` / `+` ordinals | negative values + `E…#n` | one mechanism; `-1SU`-style familiarity |
| `/duration/interval/repetition` tail | stride `/i[/d]` + anchored cadence | split by evaluation model (§5); anchor required by grammar |
| repetition indices `/*3;5` | removed | bound the cadence with dates instead |
| `<ᐧ <=ᐧ >ᐧ >=ᐧ =` operators | date-literal bounds (§6) | same power, less grammar |
| `Y*3` (anchorless stride) | syntax error | epoch problem solved by construction |
| week-of-month `W` | removed; `W` = ISO week-of-year, Y-scoped | ill-defined; notes-issues already conceded |
| `T` always UTC | tz is an evaluation parameter | business hours are local; DST |
| "a DTRE should not be parsed" | "cannot generally be enumerated; evaluated by coverage" | it is parsed; it isn't expanded |
| 4/6-digit date literals (`2015`, `201703`) | 8-digit minimum | removes `Y2015` vs `2015` ambiguity |
| millisecond selector `S` | removed (`T` literals keep `.sss` precision) | no real use case |

## 12. Open questions (for draft 2.1)

1. **`W` + `M` co-occurrence** — currently legal by intersection (`W10 M3` = the part of ISO week 10 that lies in March). Confirm or forbid.
2. **Ordinal `#` on units other than `E`** — e.g. `D15#…` makes no sense, but `W#-1 M*` ("last full week of each month") was a draft-1 wish. Deferred; would reintroduce week-of-month semantics.
3. **Cadence duration in a different unit than the period** (`/10D/36H`) — currently allowed with a conservative max≤min length check; may restrict to same-unit if the check proves confusing.
4. **`describe()` locale model** — deferred to the library spec.

## 13. Conformance

An implementation is conforming iff it accepts/rejects and evaluates the shared test vectors (`vectors.json`, to be authored with this draft: `{ expression, instant, tz, expected }` coverage cases plus `{ expression, error }` rejection cases). The vectors — not the prose — are the contract.

The suite must include the calendar traps of §§9.1–9.3: `D29 M2` against 2023, 2024, and **2100**; `D-1 M2`; `D366`; `W53`; `E7#5`; `20240131/1M` across February; `20240229/1Y`; midnight-wrap + weekday intersection; and DST-transition instants in a non-UTC zone (gap, overlap, and a cadence window spanning the transition).
