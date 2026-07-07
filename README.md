# DTRE

**Date-Time Range & Recursion Expression** — a compact string expression for describing *when*, evaluated by *coverage*.

```
T0900-1800 E1-5                 Mon–Fri, 09:00–18:00
E7#-1 M4                        last Sunday of April, every year
20200106/10D                    every 10 days from 2020-01-06
D-7-* Y*                        last 7 days of every year
M!7                             every month except July
```

A DTRE denotes a — possibly infinite — set of time intervals. You don't expand it into dates; you ask it questions: *does it cover this instant?* *What does it cover between these two dates?* *When does it next apply?*

**Status: Draft 2 (RFC).** See [draft-2.md](draft-2.md) for the full specification and [draft-2-repetition.md](draft-2-repetition.md) for the repetition-model rationale. (Draft 1 and the DTRExp generation are superseded and archived outside this repo.)

---

## Why is this needed?

Software constantly needs to store *"when does this apply?"* as data — not as code, not as a materialized list of dates:

- a permission valid only during business hours (`grant.scope = "T0900-1800 E1-5"`),
- a price rule for the last week of every quarter,
- a maintenance window every 10 days,
- content that publishes on the 2nd Sunday of May, forever.

Two properties make this hard for existing formats:

1. **The set is infinite.** "Every Monday, forever" cannot be stored as date objects. It must stay an expression, and the expression must be *checkable* without expansion.
2. **The check is on the hot path.** An access-control decision runs on every request. Whatever answers "are we currently inside the window?" must be cheap — ideally a handful of integer comparisons, not an iteration over generated occurrences.

DTRE is designed for exactly this shape: a short literal that fits in a database column, a JSON value, an ACL grant, or a config file — with **O(1) coverage evaluation** (one calendar-field extraction, then per-component integer tests; see draft-2 §9).

## What can DTRE express that others can't?

No single existing format combines all of these; each row breaks at least one incumbent:

| Capability | Example | Who else fails |
| --- | --- | --- |
| **Intervals, not instants** — components denote spans (`M3` = all of March) | `T0900-1800 E1-5` | cron (fires at instants); RRULE (recurrence of *start* instants; duration lives outside the rule) |
| **Coverage as the primitive** — membership test, no enumeration | `covers(now)` | RRULE (must iterate occurrences); ISO 8601 intervals (no evaluation model at all) |
| **First-class negation** | `M!7`, `E!6-7` | cron, ISO 8601, opening_hours (only "off" overrides); RRULE (only enumerated `EXDATE`s) |
| **Anchored cadences** — patterns that drift across calendar boundaries | `20200106/10D` (every 10 days), `20180301/14M` (every 14 months) | cron (famously impossible); opening_hours; ISO 8601-1 |
| **Calendar ordinals** | `E7#-1 M4` (last Sunday of April) | cron (only Quartz's `L`/`#` extensions); ISO 8601 repeating intervals |
| **Infinite recursion + absolute bounds in one literal** | `E1 M3 20180101-*` | ISO 8601 (`R` counts, doesn't select); cron (no bounds) |
| **One compact literal** — no multi-property envelope | the whole examples column | RRULE/iCalendar, JSCalendar (property bags), later.js (JSON/builder) |

And one meta-capability: **conformance by test vectors.** The spec ships `vectors.json` (expression, instant, tz → expected); an implementation is conforming iff it passes them. The prose explains; the vectors decide.

## The alternatives, honestly

### cron (and Quartz)

**Good at:** triggering jobs. Ubiquitous, terse, everyone half-remembers the five fields. Quartz adds seconds, years, `L` (last), `#` (nth weekday), `W` (nearest weekday).

**Fails at:** everything that isn't a trigger. A cron line matches *instants* (minute granularity) — there are no durations, so "09:00–18:00" needs external logic. There are no bounds ("until 2027") in classic cron. And the famous one: **"every 10 days" is impossible**, because `*/10` in the day field resets every month (1, 11, 21, 31, then 1 again — the phase snaps back). Negation doesn't exist. Standard cron can't even say "last day of the month."

*Use cron when:* you're scheduling job execution and the pattern is calendar-locked. That's its home turf; DTRE is not a job scheduler.

### ISO 8601 (durations, intervals, repeating intervals) and ISO 8601-2:2019

**Good at:** interchange of *concrete* times. `2018-03-01/P1M` is unambiguous and universally parseable. Repeating intervals (`R5/2018-03-01/P14M`) express linear anchored cadences — DTRE's cadence component (§5.2) is deliberately isomorphic to them, so that subset round-trips.

**Fails at:** selection. ISO 8601-1 has no way to say "last Sunday of April," "weekdays," "except July," or to combine rules — `R` only counts repetitions of one interval. ISO 8601-2:2019 (the extension) does add rule-based recurrences (an RRULE-alike) plus seasons and approximate dates — but it inherits RRULE's model and verbosity, and its real-world adoption is close to zero: you will not find a parser for it in your stack.

*Use ISO 8601 when:* exchanging concrete timestamps and simple repeating intervals across systems. DTRE uses its date syntax (`YYYYMMDD`) precisely for this familiarity.

### RFC 5545 iCalendar RRULE (and rrule.js)

**Good at:** calendar-event recurrence. The most expressive incumbent by far: `FREQ=YEARLY;BYMONTH=4;BYDAY=-1SU` *is* "last Sunday of April." `BYSETPOS`, negative ordinals, `COUNT`/`UNTIL` bounds, well-understood by every calendar system on earth. If your problem is "when does this *event* repeat," RRULE is the right and standard answer.

**Fails at:** being a coverage expression. An RRULE describes the recurrence of an event's **start instants**; the covered *interval* comes from the surrounding `DTSTART`/`DTEND` component — the rule alone doesn't denote a set of spans. Answering "does this instant fall inside an occurrence?" requires **iterating occurrences** to find the neighborhood — fine for rendering a calendar month, wrong for a per-request permission check. Exceptions are enumerated dates (`EXDATE`), not rules (`EXRULE` was deprecated by RFC 5545 itself) — "every month except July, forever" has no finite representation. It's a multi-property text envelope, not a literal you drop into a column. And the JavaScript flagship, [rrule.js](https://github.com/jkbrzt/rrule), sits at ~1.7M weekly downloads with no release in over a year.

*Use RRULE when:* interoperating with calendar systems. DTRE specifies `toRRule()` for its losslessly-mappable subset for exactly this reason.

### RFC 8984 JSCalendar

**Good at:** modernizing iCalendar — same recurrence model, clean JSON, sane defaults.

**Fails at:** the same things RRULE fails at, with more braces. A `recurrenceRules` array inside a JSON object is even further from "a value in a config file." No coverage semantics, negation via enumerated overrides.

### OSM `opening_hours`

**Good at:** its domain — genuinely the closest relative. A compact string, evaluated for coverage ("is the shop open now?"), with weekday ranges, nth-weekdays (`Su[-1]`), month/week selectors, exceptions, even `sunrise`/`sunset`. Battle-tested against ~1M unique real-world values; [opening_hours.js](https://github.com/opening-hours/opening_hours.js) is actively maintained.

**Fails at:** general-purpose use. The vocabulary is shop-hours-shaped: no quarters, no day-of-year, no anchored cadences (biweekly exists via `week …/2`, but "every 10 days" or "every 14 months" do not). Year-level algebra is weak. The grammar grew organically for a decade and it shows — even its own corpus only parses at 99.3%, and writing a *correct* complex value by hand is notoriously error-prone. Semantics are defined by the evaluator, not by a conformance suite.

*Use opening_hours when:* you're working with OSM data, or your domain literally is opening hours. It's the strongest evidence that DTRE's category — compact coverage expressions — is real and wanted.

### Schedule libraries (later.js, rSchedule, node-schedule)

**Good at:** in-process scheduling APIs. rSchedule's date-library-agnostic core is good engineering (DTRE's reference implementation borrows the idea).

**Fails at:** being a format. These are libraries, not specifications — their schedule definitions (JSON blobs, builder chains) are not portable literals, have no conformance story, and several are semi-abandoned. Storing a later.js JSON blob in your database couples your data to one unmaintained package's semantics forever.

## Where DTRE deliberately does less

Honesty cuts both ways. DTRE does **not** try to be:

- **A job scheduler.** No jitter, no missed-run policy, no execution semantics. Pair it with a scheduler if you need triggers.
- **A calendar-event interchange format.** No attendees, no event metadata, no per-occurrence overrides. That's iCalendar/JSCalendar's job; use `toRRule()` at the boundary.
- **A natural-language parser.** `E7#2 M5` is written by people who read a one-page spec, not by parsing "second Sunday of May."
- **Timezone-clever.** Expressions are tz-agnostic by design; the zone is an evaluation parameter (default UTC). This is a feature — "09:00–18:00" means local business hours wherever you evaluate it — but it means a single expression can't mix zones.

## Design principles (draft 2)

1. **One way to say it.** One range operator (inclusive `-`; half-open only for clock time), one negation position, one ordinal mechanism, one stride form.
2. **Ambiguity is a syntax error.** An anchorless stride (`Y*/3` — "every 3rd year from *when?*") doesn't get a default; it doesn't parse.
3. **Two kinds of repetition, two constructs.** Calendar-locked patterns are strides on selectors; boundary-crossing patterns are date-anchored cadences. They evaluate differently, so they read differently.
4. **The vectors are the contract.** If prose and `vectors.json` ever disagree, the vectors win and the prose gets fixed.

## Repository layout

| File | What |
| --- | --- |
| [draft-2.md](draft-2.md) | current specification (grammar, semantics, examples) |
| [draft-2-repetition.md](draft-2-repetition.md) | the stride/cadence split, explained |
| `vectors.json` | conformance test vectors *(planned, ships with draft 2.1)* |

A reference implementation ([`dtre-js`](https://github.com/DTRExp/dtre-js) — TypeScript, ESM, zero dependencies) is developed against the vectors.

## Feedback

This is a request for comments. Open an issue for anything ambiguous, missing, or over-engineered — ambiguities found now are grammar fixes; found later, they're breaking changes.
