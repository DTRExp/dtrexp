# Changes

DTRExp has been in the works since 2017. Draft 1 — then under the name **DTRE** — is dated August 24, 2018; the format spent the years between in production notes and a shelved implementation. Draft 2 (2026) is a ground-up revision with one added discipline: five clean-room implementations, each built from the prose and vectors alone, plus the reference — and every divergence between them resolved as a spec fix and a test vector. Newest first.

## Changes from draft 2.7 (draft 2.8)

Vocabulary only — no grammar, evaluation, or vector change; the 2.7 vector suite is the 2.8 vector suite, byte for byte.

| Was | Now | Why |
| --- | --- | --- |
| *Date-Time Range & **Recursion** Expression* in the title; "repetition" as the umbrella term in the prose (§5, `repetition.md`) — two words for one concept, both wrong-shaped | *Date-Time Range & **Recurrence** Expression*; **recurrence** is the one umbrella term — §5 retitled, `repetition.md` → `recurrence.md` | to a programmer, *recursion* is self-reference (a function calling itself) — a claim this spec never makes, and a false signal to exactly its audience; *repetition* is correct but generic — it names no domain. *Recurrence* is the established calendar-domain term (RFC 5545 `RRULE` = recurrence rule; Google Calendar, Microsoft Graph, EventKit all follow), so the title now states what the spec covers in the vocabulary implementers already search for — and one concept gets one word (the doctrine §3's `-0` decision already follows). Draft-1 syntax quoted in this file (the `/duration/interval/repetition` tail) stays verbatim — it names the old grammar, not the concept |

## Changes from draft 2.6 (draft 2.7)

From the fifth clean-room implementation's (dtrexp-java) journal — 21 entries, probed across all **six** codebases (five ports + reference). Ten behaviors pinned; two were owner doctrine calls; one probe exposed a crash no vector had ever reached.

| Was | Now | Why |
| --- | --- | --- |
| `T` range endpoints' precision semantics unstated | endpoints resolve to their literal's span-**start** instant (`T0900:12` ends at 12:00); equal *resolved* endpoints reject (`T12:1200`) — bounds (§6) remain the one place a coarse literal contributes its full span | 6-way unanimous, previously held by luck; the §4↔§6 asymmetry is now stated instead of discovered |
| whitespace never defined; the EBNF allowed spaces only between components while §7's own examples put them around `\|` | ASCII space runs — between components, around `\|`, at either end; tabs and all other whitespace are errors | 6-way unanimous |
| `D`/`W` **durations** inside `H`/`m`-period cadences undefined at evaluation | fixed absolute lengths (`D` = 24 h, `W` = 168 h) — an absolute grid has no calendar anchor to constrain against; vectored across the Berlin spring-forward | 5-way agreement — and dtrexp-rs **crashed** (`unreachable!`) on the very first evaluation, proof the corner had zero coverage |
| scope resolution ("nearest of `M`/`Q`/`Y`") ambiguous between granularity and textual order; single-pass parsers would wrongly reject `Q2 D40` | "nearest" = finest granularity present, never position; static validity applies to the **completed expression** (`Q2 D40` valid, `Q2 D40 M1` rejected) | 6-way unanimous; two journals independently flagged the ordering trap |
| `-0` accepted as hour 0 by four of six implementations | **a signed zero is never a value** — the `-` requires a nonzero integer; `H0` is the only spelling of hour 0 | owner decision (one way to say it); matches the reference |
| `E-1#2` rejected by one of six | the ordinal's base may be negative and resolves against `E`'s fixed domain first: `E-1#2` ≡ `E7#2` | owner decision (text as written — the grammar derives it, no rule bans it) |
| stride range ends implicitly restricted alongside starts by a broad reading of §3 | only the **start** must be non-negative; a negative end clips per parent instance (`D2:-1/5` valid) | 6-way unanimous; the anti-drift rationale only ever applied to the anchor |
| statically-dead strides unflagged in the reference (`D30:*/2 M2`) | a stride is sugar over a range and participates in the §9.1 minimum; js gains the check | 5–1 inside the written minimum |
| hour 24 in date literals, star-endpoint ranges in lists — unstated | `20180120T2400/1D` rejects (hour 24 is a `T`-range token only); `M11:*,5` and `M*:3,7` are valid list items (only the bare `*` is banned) | 6-way unanimous |
| — | `D29 M2 Y2021`: rs warns (deeper, correct analysis), five stay quiet — left unpinned by design: §9.1 already licenses quality-of-implementation warnings beyond the minimum, and a vector could only ban one of two legitimate behaviors | recorded so it is never mistaken for an oversight |

## Changes from draft 2.5 (draft 2.6)

An owner decision, closing the `Y` domain question the rs round surfaced: cold readers had split 3–2 on `Y0` and 2–3 on an upper bound, each implementation quietly inventing its own limits where the prose was silent.

| Was | Now | Why |
| --- | --- | --- |
| `Y` domain "unbounded"; `Y0` and `Y12000` implementation-defined (js/py capped at 1–9999, go/swift/rs each drew different lines) | **`Y` takes 4-digit ISO years: 1–9999, everywhere** — selector values match the range the 8-digit `YYYYMMDD` date-literal grammar already commits to; `Y0` and `Y12000` are syntax errors; `*` on `Y` resolves to the domain edge (9999 / 1) like every other designator, so `Y2020:*` still reads "2020 and every later year" | one rule for values, literals, anchors and bounds; ISO 8601 without expanded representation is exactly the 4-digit years; year 0 is 1 BCE — an invitation to the zero-confusion §3 just closed |
| wrap and negative-value rejections on `Y` justified by "no edge / unbounded domain" — a rationale the finite domain broke | rationale re-anchored: years are **absolute and non-cyclic** — wrap models a cyclic domain inside a parent instance and negatives count back from a parent's edge; `Y` sits inside nothing, so neither applies | the rules stand; only their reasons moved |

## Changes from draft 2.4 (draft 2.5)

From the fourth clean-room implementation's (dtrexp-rs) journal — 21 entries, 18 of which the 2.4 prose already decided (the round validated the spec). The three `[VECTOR-GAP]`s were probed across all five implementations; two are pinned below, one (`Y0` and the `Y` domain bounds — a live 3–2 split among cold readers) is deferred to the owner.

| Was | Now | Why |
| --- | --- | --- |
| gap anchors named "Temporal's `compatible`" but only the overlap→earlier direction was vectored; rs silently resolved gap anchors to the transition instant and passed the full suite | §9.3 example makes the gap direction concrete: `20240331T0230` in Berlin resolves to local 03:30 CEST (`01:30Z`) — pre-transition offset, pushed forward by the gap's length — **never** the transition instant; vectored (`dst-cadence-anchor-gap-forward`); rs fixed | 4–1 with normative prose on the majority side; an unvectored normative sentence is exactly how divergence hides |
| backwards-bounds threshold undefined beyond one clearly-inverted vector | §6: a bounds range is backwards — syntax error — iff the first literal's span begins **at or after** the last literal's span end; equal literals cover the literal's span, mixed precision is valid in either order; vectored (invalid `…T1801:…T1800`, coverage equal-literal + mixed-precision) | 5-way unanimous behavior, previously held by luck |
| zero on 1-based domains implied only by the domain tables (the swift journal's stumble #2, re-raised by rs) | §3 rule: literal `0` is out of domain on 1-based designators (`M0`, `D0`, `Q0`, `W0` are syntax errors); ordinary value on 0-based `H`/`m`/`s`; `D0` vectored beside the existing `M0` | two cold readers independently had to infer it; one sentence ends that |

## Changes from draft 2.3 (draft 2.4)

Closes the round-3 triage (clean-room dtrexp-swift + the go/swift journals' prose findings). Two behavior decisions, two unanimous agreements pinned, and a new vector class.

| Was | Now | Why |
| --- | --- | --- |
| "`2400` is valid only as a range end" — silent on spelling: `T22:24`, `T2300:24`, `T0000:240000` accepted by half the implementations | **hour 24 is the exact 4-digit token `2400`, in range-end position only** — every other spelling is a syntax error; canonical "to midnight" is `T2200:2400` | both fresh clean-room readers independently derived the narrow reading (2–2 split against the older implementations); one-way-to-say-it doctrine |
| `D366 Y2021` accepted silently by half the implementations | `D366` under concrete years that lack it **must warn** — it falls inside the §9.1 written minimum (domain sizes implied by co-present selectors; the day-of-year twin of `W53 Y2021`); range forms included (`D366:* Y2021` resolves 366:365, backwards in every instance) | the minimum already required it; the vectors didn't pin it |
| §9.1 minimum said nothing about how far concrete-year checks must scan | required only over **closed** year spans ≤ 1,000 years; open/wider spans MAY stay quiet; with `W` present, `Y` is the week-year and `D366`×week-year MUST stay quiet (`D366 W1 Y2025` covers Dec 31 2024) | implementers could not tell how much enumeration conformance demands; the week-year corner produces a genuinely covered day 366 in a 365-day selector year |
| warnings testable in one direction only — nothing pinned what must NOT warn | new **`quiet`** vector section: expressions that must parse with **zero** warnings (`D366 Y2020`, `W53 Y2020`, open spans, the week-year corner, true wraps) | a linter that cries wolf is as non-conforming as a silent one; false positives were unfalsifiable |
| `H`/`m` durations inside calendar-period cadence windows undecided in prose (4-way unanimous in code) | pinned: the duration follows the period's **naive wall-clock** arithmetic (`20241026T2300/2D/12H` in Berlin ends at local 11:00 across the 25-hour night — 12 wall hours, 13 absolute) | unanimity is not a contract until vectored; this was the last un-pinned DST corner |
| `M*:*` accepted by all four, undocumented | pinned in §3.1 and vectored: `M*:*` ≡ `M*` (canonical: `M*`); bounds `*:*` stays an error | same — verification without pinning rots (the hour-24 lesson) |
| §3 "max" meant element **count** in the parse check and largest **value** in the resolution formula, three lines apart | parse check uses *N* = domain **size**; resolution is `maxValue + 1 + v` with *maxValue* the instance's largest value | the swift journal's first stumble — the examples disambiguated, the prose didn't |
| — | §9.3: the fall-back transition instant itself carries **post-transition** fields (Berlin `2024-10-27T01:00:00Z` = local 02:00:00 CET) | the boundary case was decidable only from a vector, not the prose |

## Changes from draft 2.2 (draft 2.3)

From the second clean-room implementation's (dtrexp-go) one substantive finding: no vector exercised a cadence on a DST transition, and the three implementations had quietly built **three different models** there. §9.3 now decides it.

| Was | Now | Why |
| --- | --- | --- |
| §9.3 internally torn: "occurrence windows align to the local clock" (b3) vs. an instant-resolving anchor rule (b4) that only means anything in absolute time | **calendar-period (`D`/`W`/`M`/`Y`) occurrence windows are local wall-clock intervals** — membership on `t`'s local fields; the anchor is a naive local date-time, never resolved to an instant. Fall-back: both passes covered (25-hour "day"); gap: nothing (23) | extends the `T`-selector's emergent DST model to cadences — one time model, not two; matches the reference and the clean-room py reading; correct for the business-hours use case |
| anchor disambiguation (earlier/forward) stated for all cadence anchors | scoped to where a literal **must** become one instant: **`H`/`m`-period anchors and bounds literals** | under local wall-clock windows the rule was dead prose for calendar periods — and two of three implementations silently violated it where it was live |
| — | new vectors: cadence across the Berlin spring-forward gap and fall-back overlap (calendar-period), and the `H`-period anchor in the overlap (earlier occurrence pins the absolute grid) | the corner had zero vectors; dtrexp-py and dtrexp-go both passed the full 2.2 suite while diverging from the spec (later-anchor grids) and from each other (window model) |

## Changes from draft 2.1 (draft 2.2)

From the findings of a **clean-room second implementation** (dtrexp-py, built from prose + vectors alone under an ambiguity-journal protocol). Its journal surfaced 28 underdetermined readings; 4 were live divergences — the reference and the clean-room implementation both passed the full vector suite while disagreeing on all four. Every fix below is vectored.

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

Adopted during implementation review. Breaking against draft 2, which nobody consumed — no compatibility owed.

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

### Review fixes folded into 2.1 (independent review)

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

## Changes from draft 1 / DTRE (August 24, 2018)

_Stated as of draft 2; ranges have since moved to `:`, see above._

| Was | Now | Why |
| --- | --- | --- |
| `:` (exclusive) *and* `-` ranges | `-` inclusive only; `T` half-open | one operator, one rule; off-by-ones die |
| `!` in 5 positions | `!` only after the designator | one negation, defined set semantics |
| `F` / `L` / `+` ordinals | negative values + `E…#n` | one mechanism; `-1SU`-style familiarity |
| `/duration/interval/repetition` tail | stride `/i[/d]` + anchored cadence | split by evaluation model (§5); anchor required by grammar |
| recurrence indices `/*3;5` | removed | bound the cadence with dates instead |
| `<ᐧ <=ᐧ >ᐧ >=ᐧ =` operators | date-literal bounds (§6) | same power, less grammar |
| `Y*3` (anchorless stride) | syntax error | epoch problem solved by construction |
| week-of-month `W` | removed; `W` = ISO week-of-year, Y-scoped | ill-defined; notes-issues already conceded |
| `T` always UTC | tz is an evaluation parameter | business hours are local; DST |
| "a DTRExp should not be parsed" | "cannot generally be enumerated; evaluated by coverage" | it is parsed; it isn't expanded |
| 4/6-digit date literals (`2015`, `201703`) | 8-digit minimum | removes `Y2015` vs `2015` ambiguity |
| millisecond selector `S` | removed (`T` literals keep `.sss` precision) | no real use case |

### Migrating the old examples

| Old (draft-1 / DTRE) | Now |
| --- | --- |
| `M3/14/14/* Y2018:*` (every 14 months after 2018-03) | `20180301/14M` |
| `m0:20 H00/1/4/*` (da Vinci's sleep) | `m0:19 H0/4` |
| `M3/1/2/*` (every 2nd month from March) | `M3/2` |
| `D3:100/5/2/10:15` (recurrence indices) | **gone** — bound the cadence with a date range instead |

### What died, and why

- **The 3-part tail on selectors** (`/duration/interval/repetition`): duration+interval inside a parent is expandable to a plain range list at parse time — sugar, kept as the stride's block form (see [recurrence.md](recurrence.md)). Across parents it's a cadence — moved to the anchored-cadence construct.
- **Recurrence indices** (`/*3;5` — "only the 3rd and 5th recurrence"): counting occurrences from an anchor *and* filtering by index; expressible as a date bound when finite; appeared in zero real examples.
