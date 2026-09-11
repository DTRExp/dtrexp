---
title: "Why DTRExp"
description: "What DTRExp can express that cron, RRULE, ISO 8601 and opening_hours can't; and where each of them wins. An honest comparison."
---

No single existing format stores *"when does this apply?"* as a compact, checkable, general-purpose literal. This page makes that case honestly; including where the incumbents are the right choice.

## Why is this needed?

Software constantly needs to store *"when does this apply?"* as data, not as code, not as a materialized list of dates:

- a permission valid only during business hours (`grant.scope = "T0900:1800 E1:5"`),
- a price rule for the last week of every quarter,
- a maintenance window every 10 days,
- content that publishes on the 2nd Sunday of May, forever.

Two properties make this hard for existing formats:

1. **The set is infinite.** "Every Monday, forever" cannot be stored as date objects. It must stay an expression, and the expression must be *checkable* without expansion.
2. **The check is on the hot path.** An access-control decision runs on every request. Whatever answers "are we currently inside the window?" must be cheap; a handful of integer comparisons, not an iteration over generated occurrences.

DTRExp is designed for exactly this shape: a short literal that fits in a database column, a JSON value, an ACL grant or a config file, with **O(1) coverage evaluation**. One calendar-field extraction, then per-component integer tests ([spec.md §9](/spec/#9-evaluation-semantics)).

## What can DTRExp express that others can't?

No single existing format combines all of these; each row breaks at least one incumbent:

| Capability | Example | Who else fails |
| --- | --- | --- |
| **Intervals, not instants**: components denote spans (`M3` = all of March) | `T0900:1800 E1:5` | cron (fires at instants); RRULE (recurrence of *start* instants; duration lives outside the rule) |
| **Coverage as the primitive**: membership test, no enumeration | `covers(now)` | RRULE (must iterate occurrences); ISO 8601 intervals (no evaluation model at all) |
| **First-class negation** | `M!7`, `E!6:7` | cron, ISO 8601, opening_hours (only "off" overrides); RRULE (only enumerated `EXDATE`s) |
| **Anchored cadences**: patterns that drift across calendar boundaries | `20200106/10D` (every 10 days), `20180301/14M` (every 14 months) | cron (famously impossible); opening_hours; ISO 8601-1 |
| **Calendar ordinals** | `E7#-1 M4` (last Sunday of April) | cron (only Quartz's `L`/`#` extensions); ISO 8601 repeating intervals |
| **Day-of-month ∩ weekday** | `D13 E5` (every Friday the 13th) | cron, its oldest gotcha: DOM + DOW is **OR**, not AND |
| **Infinite recurrence + absolute bounds in one literal** | `E1 M3 20180101:*` | ISO 8601 (`R` counts, doesn't select); cron (no bounds) |
| **One compact literal**: no multi-property envelope | the whole examples column | RRULE/iCalendar, JSCalendar (property bags), later.js (JSON/builder) |

And one meta-capability: **conformance by test vectors.** The spec ships `vectors.json` (expression, instant, tz → expected); an implementation is conforming iff it passes them. See [VECTORS.md](/vectors/) for the file's structure and how to wire it into an implementation.

## The Alternatives, Honestly

### Cron (and Quartz)

**Good at:** triggering jobs. Ubiquitous, terse, everyone half-remembers the five fields. Quartz adds seconds, years, `L` (last), `#` (nth weekday), `W` (nearest weekday).

**Fails at:** everything that isn't a trigger. A cron line matches *instants* (minute granularity); there are no durations, so "09:00–18:00" needs external logic. There are no bounds ("until 2027") in classic cron. And the famous one: **"every 10 days" is impossible**, because `*/10` in the day field resets every month (1, 11, 21, 31, then 1 again; the phase snaps back). Negation doesn't exist. Standard cron can't even say "last day of the month."

*Use cron when:* a cron runner is already in front of you. That is cron's real edge, and it is not in the pattern: every cron line comes with a daemon and an ecosystem that speaks it (crontab, systemd timers, Kubernetes `CronJob`, CI schedules, Quartz, every cloud scheduler). Every classic cron line is a DTRExp (`0 9 * * 1-5` is `T0900 E1:5`), and what cron can't say stays unsayable in cron. As a schedule language DTRExp is the stronger of the two: it fires every ten days, on the last day of the month, on Friday the 13th, never in July, and it can give a job a deadline. The one rule a host needs is in [Scheduling with DTRExp](#scheduling-with-dtrexp).

### ISO 8601 (durations, intervals, repeating intervals) and ISO 8601-2:2019

**Good at:** interchange of *concrete* times. `2018-03-01/P1M` is unambiguous and universally parseable. Repeating intervals (`R5/2018-03-01/P14M`) express linear anchored cadences; DTRExp's cadence component ([§5.2](/spec/#52-cadence--anchor-based-recurrence)) is deliberately isomorphic to them, so that subset round-trips.

**Fails at:** selection. ISO 8601-1 has no way to say "last Sunday of April," "weekdays," "except July," or to combine rules; `R` only counts recurrences of one interval. ISO 8601-2:2019 (the extension) does add rule-based recurrences (an RRULE-alike) plus seasons and approximate dates, but it inherits RRULE's model and verbosity, and its real-world adoption is close to zero. You will not find a parser for it in your stack.

*Use ISO 8601 when:* exchanging concrete timestamps and simple repeating intervals across systems. DTRExp uses its date syntax (`YYYYMMDD`) precisely for this familiarity.

### RFC 5545 ICalendar RRULE (and rrule.js)

**Good at:** calendar-event recurrence. The most expressive incumbent by far: `FREQ=YEARLY;BYMONTH=4;BYDAY=-1SU` *is* "last Sunday of April." `BYSETPOS`, negative ordinals, `COUNT`/`UNTIL` bounds, well-understood by every calendar system on earth. If your problem is "when does this *event* repeat," RRULE is the right and standard answer.

**Fails at:** being a coverage expression. An RRULE describes the recurrence of an event's **start instants**; the covered *interval* comes from the surrounding `DTSTART`/`DTEND` component, so the rule alone doesn't denote a set of spans. Answering "does this instant fall inside an occurrence?" requires **iterating occurrences** to find the neighborhood. That's fine for rendering a calendar month; wrong for a per-request permission check. Exceptions are enumerated dates (`EXDATE`), not rules (`EXRULE` was deprecated by RFC 5545 itself), so "every month except July, forever" has no finite representation. It's a multi-property text envelope, not a literal you drop into a column. And the JavaScript flagship, [rrule.js](https://github.com/jkbrzt/rrule), sits at ~1.7M weekly downloads with no release in over a year.

*Use RRULE when:* interoperating with calendar systems. DTRExp specifies `toRRule()` for its losslessly-mappable subset for exactly this reason.

### RFC 8984 JSCalendar

**Good at:** modernizing iCalendar: same recurrence model, clean JSON, sane defaults.

**Fails at:** the same things RRULE fails at, with more braces. A `recurrenceRules` array inside a JSON object is even further from "a value in a config file." No coverage semantics, negation via enumerated overrides.

### OSM `opening_hours`

**Good at:** its domain, genuinely the closest relative. A compact string, evaluated for coverage ("is the shop open now?"), with weekday ranges, nth-weekdays (`Su[-1]`), month/week selectors, exceptions, even `sunrise`/`sunset`. Battle-tested against ~1M unique real-world values; [opening_hours.js](https://github.com/opening-hours/opening_hours.js) is actively maintained.

**Fails at:** general-purpose use. The vocabulary is shop-hours-shaped: no quarters, no day-of-year, no anchored cadences (biweekly exists via `week …/2`, but "every 10 days" or "every 14 months" do not). Year-level algebra is weak. The grammar grew organically for a decade and it shows; even its own corpus only parses at 99.3%, and writing a *correct* complex value by hand is notoriously error-prone. Semantics are defined by the evaluator, not by a conformance suite.

*Use opening_hours when:* you're working with OSM data, or your domain literally is opening hours. It's the strongest evidence that DTRExp's category (compact coverage expressions) is real and wanted.

### Schedule Libraries (later.js, rSchedule, node-schedule)

**Good at:** in-process scheduling APIs. rSchedule's date-library-agnostic core is good engineering (DTRExp's reference implementation borrows the idea).

**Fails at:** being a format. These are libraries, not specifications; their schedule definitions (JSON blobs, builder chains) are not portable literals, have no conformance story, and several are semi-abandoned. Storing a later.js JSON blob in your database couples your data to one unmaintained package's semantics forever.

## Scheduling with DTRExp

A DTRExp denotes intervals, not fire times; a scheduler needs one convention to turn the first into the second: **a job fires once, at the start of each maximal covered interval.** The primitive is `next(after)`: arm a timer for the start it returns, run, ask again from that start. `T0020` fires every day at 00:20; `H0/6 m0` four times a day; `20200106/10D` every ten days, which cron cannot say. And a duration can mean something a trigger never could: `T0020:0100` is a job that starts at 00:20 and has until 01:00 to finish; the host checks `covers(now)` while it runs and stops it when that turns false.

Four consequences of that rule, each of which surprises somebody the first time:

- **`next()` skips the interval you are standing in.** It answers "when does the next one start?", not "does this apply now?"; ask `covers(now)` for the current state and `intersect()` for what is covered between two dates. For a trigger this is the right shape: a job already running must not be started again.
- **Adjacent coverage is one interval, and fires once.** Cron's `0-5 * * * *` fires six times an hour; its DTRExp, `m0:5`, is one six-minute interval per hour and fires once. `T0000:2400` is one interval per day. In other words, a wider window means fewer firings, not more; a cron line whose firings are a minute apart has no DTRExp trigger equivalent. Write what should fire (`T0020`), not what should be covered, unless the duration means something.
- **A single clock value is a one-minute interval, not an instant.** `T0020` is `T0020:0021` (`T002000` is one second, `T002000.500` one millisecond); the job fires at its start, and a human reading it back sees "00:20–00:21", which is what it is. Note that a `T` value takes a range, never a duration: `T0020:0100`, not `T0020/1`; the `/` form belongs to strides and cadences ([§5](/spec/#51-stride--calendar-locked-recurrence)).
- **`null` from `next()` means "no later start"**, in both of its cases: the coverage is exhausted (bounded and past its end, or unsatisfiable), or it is continuous from `after` on (`E1:7` covers every instant, so nothing ever *starts*). Neither means "never applies"; `covering(now)` returns the interval in progress, and a display pairs the two: "applies now, until …" from `covering()`, "next applies at …" from `next()`.

Everything after the start is the host's: the clock, jitter, overlap, missed-run and catch-up policy, retries. DTRExp defines *when*; the scheduler runs. Store the zone next to the expression ([§9.3](/spec/#93-dst-and-local-time)); `T0020` in Berlin and `T0020` in UTC are two different jobs. Validate on write with `validate()` rather than `parse()`: it returns every error with a position, and its warnings carry the unsatisfiability lint ([§9.1](/spec/#91-the-existence-rule)); `D30 M2` parses and never fires.

Cron to DTRExp, for the lines everyone half-remembers:

| cron | DTRExp | |
| --- | --- | --- |
| `20 0 * * *` | `T0020` | daily at 00:20 |
| `0 */6 * * *` | `H0/6 m0` | 00:00, 06:00, 12:00, 18:00 |
| `*/15 * * * *` | `m0/15` | every 15 minutes, on the quarter |
| `0 8 * * 1-5` | `T0800 E1:5` | weekdays at 08:00 |
| `0 0 L * *` (Quartz) | `T0000 D-1` | last day of the month |
| `0 9 * * 5#2` (Quartz) | `T0900 E5#2` | second Friday of the month |
| no cron | `T0900 20200106/10D` | every 10 days at 09:00 |
| no cron | `T0800 E1:5 M!8` | weekdays at 08:00, not in August |
| no cron | `T0300:0500 D-1` | last day of the month, 03:00 with a 05:00 deadline |

Two cron features have no DTRExp on purpose: `W` (nearest weekday) is a runner's decision about a missed day, not a schedule, and `@reboot` is not a time.

## Where DTRExp Deliberately Does Less

What a format does *not* do should be stated as directly as what it does. DTRExp is **not**:

- **A job runner.** It has no clock, no jitter, no missed-run or catch-up policy, no execution semantics, and no instants: a trigger is the start of a covered interval, by the one rule in [Scheduling with DTRExp](#scheduling-with-dtrexp). `next()` is a Tier 2 operation ([API](/api/)), today in the JavaScript implementation; the Core interface every port ships is `covers()`.
- **A calendar-event interchange format.** No attendees, no event metadata, no per-occurrence overrides. That's iCalendar/JSCalendar's job; use `toRRule()` at the boundary.
- **A natural-language parser.** `E7#2 M5` is written by people who read a one-page spec, not by parsing "second Sunday of May."
- **Timezone-clever.** Expressions are tz-agnostic by design; the zone is an evaluation parameter (default UTC). This is a feature — "09:00–18:00" means local business hours wherever you evaluate it — but it means a single expression can't mix zones.

## Design Principles

1. **One way to say it.** One range operator (inclusive `:`; half-open only for clock time), one negation position, one ordinal mechanism, one stride form.
2. **Ambiguity is a syntax error.** An anchorless stride (`Y*/3`, "every 3rd year from *when?*") doesn't get a default; it doesn't parse.
3. **Two kinds of recurrence, two constructs.** Calendar-locked patterns are strides on selectors; boundary-crossing patterns are date-anchored cadences. They evaluate differently, so they read differently.
4. **The vectors are the contract.** If prose and `vectors.json` ever disagree, the vectors win and the prose gets fixed.
5. **DST correctness is emergent, not special-cased.** Coverage is defined on instants, and calendar fields are extracted from the instant in the evaluation zone; so spring-forward gaps cover nothing and fall-back repeats cover both passes, with no DST rules in the model. Independent implementations discover this property rather than code it.

