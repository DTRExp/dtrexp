# Changes

## Changes from draft 2 (draft 2.1)

Locked 2026-07-09 during implementation review. Breaking against draft 2, which nobody consumed — no compatibility owed.

| Was | Now | Why |
| --- | --- | --- |
| `-` doubles as range and negation (`M3-7`, `D-7-*`, `D-7--3`) | `:` is the range operator **everywhere** — `M3:7`, `D-7:*`, `T0900:1800`, `20200101:20210630`; `-` means only "from the end" | one symbol, one meaning; `D-7--3` was legal and unreadable. (Not draft-1's `:` — that was exclusive; this one is inclusive) |
| backwards ranges rejected | wrap ranges for every scoped designator: `M11:2` = November through February, each year (`Y` keeps rejecting — no edge to wrap around) | `T2200:0600` already wrapped midnight; periodic cross-boundary spans without out-of-domain arithmetic |
| §2 note: "`D` follows its nearest coarser selector present" | explicit scope table; `W` scopes nothing; `M`/`Q`/`W` stay Y-scoped | `W` *is* coarser than `D`, so the note promised `D-1 W*` = last day of the week; the table and the evaluator say month — the note lied |
| `*` defined in one parenthetical ("`*` = domain edge") | new §3.1: domain vs scope; `*` is the edge of the domain in force, never "now"; negative anchors have constant length, positive ones don't (`D-7:*` is always 7 days, `D25:*` is 4–7) | the model was load-bearing and undocumented |
| `M-1 Q1` valid, silent, empty | statically-unsatisfiable intersections draw a **warning**; warnings vectors added | negatives resolve against their own scope: `M-1` is December, and December ∩ Q1 = ∅ — legal, but never what you meant |
| §8 `timeval` requires 4 digits | 2-digit `timeval` legal (`T12`) | §4 already declares `T12` valid; the grammar catches up |
| §3 stride start "must be positive" | "must be non-negative" | `H0/4` is legal; "positive" fit only 1-based units |
| month/year cadence durations checked only by the reference parser | codified: `/nM`, `/nY` durations require month/year periods; rejection vector + `H`/`m`-period coverage vectors added | the vectors are the contract, not the parser |
| §9.3 silent on cadence-anchor disambiguation | explicit: an anchor at a repeated local time is the **earlier** occurrence; in a gap it resolves **forward** (Temporal `compatible`) | the reference implementation resolved it by the sign of the zone's offset — Berlin got later, New York earlier; mutation testing flushed it out |

Considered and refused: **out-of-domain overflow** (`M14` = February, `D40 M3` = April 9). It would break the existence rule (`D29 M2` = leap day only), silently change `M5 Q2` (May → August), and stop catching typos — fatal for the access-control use case. Wrap ranges + date-literal bounds cover both cross-boundary cases.

## Changes from draft 1 / DTRExp

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
| "a DTRExp should not be parsed" | "cannot generally be enumerated; evaluated by coverage" | it is parsed; it isn't expanded |
| 4/6-digit date literals (`2015`, `201703`) | 8-digit minimum | removes `Y2015` vs `2015` ambiguity |
| millisecond selector `S` | removed (`T` literals keep `.sss` precision) | no real use case |
