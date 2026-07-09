# Changes

## Changes from draft 2.2 (draft 2.3)

Locked 2026-07-09, from the second clean-room implementation's (dtrexp-go) one substantive finding: no vector exercised a cadence on a DST transition, and the three implementations had quietly built **three different models** there. §9.3 now decides it.

| Was | Now | Why |
| --- | --- | --- |
| §9.3 internally torn: "occurrence windows align to the local clock" (b3) vs. an instant-resolving anchor rule (b4) that only means anything in absolute time | **calendar-period (`D`/`W`/`M`/`Y`) occurrence windows are local wall-clock intervals** — membership on `t`'s local fields; the anchor is a naive local date-time, never resolved to an instant. Fall-back: both passes covered (25-hour "day"); gap: nothing (23) | extends the `T`-selector's emergent DST model to cadences — one time model, not two; matches the reference and the clean-room py reading; correct for the business-hours use case |
| anchor disambiguation (earlier/forward) stated for all cadence anchors | scoped to where a literal **must** become one instant: **`H`/`m`-period anchors and bounds literals** | under local wall-clock windows the rule was dead prose for calendar periods — and two of three implementations silently violated it where it was live |
| — | new vectors: cadence across the Berlin spring-forward gap and fall-back overlap (calendar-period), and the `H`-period anchor in the overlap (earlier occurrence pins the absolute grid) | the corner had zero vectors; dtrexp-py and dtrexp-go both passed the full 2.2 suite while diverging from the spec (later-anchor grids) and from each other (window model) |

## Changes from draft 2.1 (draft 2.2)

Locked 2026-07-09, from the findings of a **clean-room second implementation** (dtrexp-py, built from prose + vectors alone under an ambiguity-journal protocol). Its journal surfaced 28 underdetermined readings; 4 were live divergences — the reference and the clean-room implementation both passed the full vector suite while disagreeing on all four. Every fix below is vectored.

| Was | Now | Why |
| --- | --- | --- |
| wrap decided on "literal **positive** endpoints" | "literal **non-negative** endpoints" — on 0-based domains a literal `0` wraps: `H22:0` = hours 22, 23, 0 | "positive" fit only 1-based units (the same editorial slip 2.1 fixed for stride starts); `H22:1` wrapped while `H22:0` was empty — a discontinuity exactly where "22:00 to midnight" is written |
| `T0900:0900` silently empty (or implementation-defined) | equal `T` endpoints are a syntax error | half-open, it covers nothing; typo-shaped input fails loudly |
| `20180120T09` tokenization unstated | the date literal's `T`-glue is unconditional — a malformed time-part is a syntax error, never re-tokenized as `20180120` + `T09` | one implementation errored, the other re-tokenized; "greedy" alone did not decide |
| `*:*` bounds derivable from the EBNF | at least one endpoint must be a date literal; EBNF tightened | an unbounded window is spelled by omitting bounds; grammar overgenerated |
| bounds zone unstated ("the absolute window") | bounds resolve in the **evaluation zone**; "absolute" means non-recurring, not UTC-pinned | both implementations chose local — by luck; no vector distinguished the readings |
| cadence window end formula ambiguous for M/Y durations | end = `constrain(startₖ + duration)`, measured from the constrained start | the two readings diverge (Apr 30 + 1M = May 30 vs May 31); all constrain vectors used 1-day durations |
| `Y` stride interval ceiling undefined (table had no `Y` row) | `Y` has no interval ceiling — `Y2020:*/100` valid | the cap exists so strides cannot drift; a year stride cannot drift at any interval |
| negative-value parse limits unstated | symmetric domain check: `-max…-1`; 0-based resolution `max + 1 + v` (`H-1` = 23) | `D-31` vs `D-32` was implementation-defined |
| `"Y*` is legal but redundant" | "…redundant **unless it rescopes a finer component**" (`D-7:*` ≠ `D-7:* Y*`) | the flat claim was false — deleting a "redundant" `Y*` changed meaning |
| §9.1 warning SHOULD unbounded | required minimum defined (per-selector domain-size satisfiability, full-domain exclusions, `M`∩`Q` disjointness); union branches all surface | implementers could not tell how much static analysis conformance demands |
| — | new vectors: bounds-in-zone (Berlin), month-duration window end, `H22:0` wrap, `Y` stride, `D-31`/`D-32`, `H-1`, equal-`T`, `T`-glue, `*:*`, dead-union-branch warning | six agreements previously held by luck are now pinned; four divergences decided |

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

### Review fixes folded into 2.1 (independent model review, 2026-07-09)

| Was | Now | Why |
| --- | --- | --- |
| §3 "start exceeds end wraps" vs §9.1 "resolved start > end covers nothing" — unreconciled | wrap is decided **syntactically, on literal positive endpoints only**; negative/`*` endpoints resolve per instance and never wrap; statically-always-empty inverted ranges (`M-2:2`, `D-1:5`) now warn | the two sections contradicted each other and no vector pinned the reading |
| §9 step 3: `unitsBetween mod period < duration` for all cadences | occurrence windows `[constrain(anchor + k·period), +duration)`; the `mod` reduction holds only for exact units (`D`/`W`/`H`/`m`) | the formula contradicted the spec's own §9.2 constrain vectors (`20240131/1M/1D` covers Apr 30) |
| EBNF could not derive `M*`/`Y*`; ordinals derivable inside lists | `selector = designator , ( "*" \| ordinal \| valuelist \| … )`; `item = value \| range` | the grammar undergenerated the spec's own §10 examples |
| `Y-1` and `M1,*` accepted, silently useless | both rejected (`Y` has no edge to count from; a list containing `*` *is* `*`) | typo-shaped inputs should fail loudly |
| `T`'s permitted forms unstated | §4: values, ranges, lists only — no `*` / `!` / stride / ordinal; rejection vectors added | grammar generated forms the evaluator rejects |
| §5.2 duration check ("max ≤ min length") ambiguous | exact fixed unit lengths specified (M = 28/31 d, Y = 365/366 d); `20240101/2M/58D` rejection vectored | prose and implementation disagreed; "min length of 2 months" is 59 d, the check uses 2×28 |
| `W`⇒week-year effect on `M`/`Q` unstated; tokenization unstated; bare-literal-with-seconds span undefined | §2: only `Y` tests the week-year; §8: greedy longest-match, any-width separators; §6: day/minute/second span | independent implementers could not answer deterministically |
| `W53 Y2021` accepted, silent | statically-decidable W53-in-short-years warns | §9.1 SHOULD-flag, now honored; vectored |

Considered and refused: **out-of-domain overflow** (`M14` = February, `D40 M3` = April 9). It would break the existence rule (`D29 M2` = leap day only), silently change `M5 Q2` (May → August), and stop catching typos — fatal for the access-control use case. Wrap ranges + date-literal bounds cover both cross-boundary cases.

## Changes from draft 1 / DTRExp (as of draft 2 — ranges have since moved to `:`, see above)

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
