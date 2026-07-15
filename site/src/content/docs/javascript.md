---
title: "JavaScript / TypeScript"
description: "dtrexp on npm — the reference TypeScript implementation of DTRExp. Install, quick start, API and worked examples."
---

[`dtrexp-js`](https://github.com/DTRExp/dtrexp-js) is the **reference implementation** of DTRExp, in TypeScript. ESM, zero runtime dependencies, 100% coverage and 100% mutation score, driven by the shared [conformance vectors](/vectors/).

## Install

```sh
npm i dtrexp
```

Requires Node.js ≥ 22.

## Quick Start

```ts
import { parse } from 'dtrexp';

const dtr = parse('T0900:1800 E1:5');

// coverage — O(#components), built for per-request hot paths
dtr.covers(new Date(), { tz: 'Europe/Berlin' });
// —> true (weekday, 09:00–18:00 Berlin local time)

// enumeration on demand — a finite window is always a finite list
dtr.intersect('2026-07-06T00:00:00Z', '2026-07-13T00:00:00Z');
// —> 5 intervals, one per business day

// "when does it next apply?"
dtr.next('2026-07-11T10:00:00Z');
// —> { start: 2026-07-13T09:00:00Z, end: 2026-07-13T18:00:00Z }
```

Parse **once** (at write/config time), evaluate **many**; `DTRExp` instances are immutable, and `covers()` performs a single calendar-field extraction followed by integer comparisons. No occurrence iteration, ever.

## Examples

An access-control grant that only applies during business hours; the expression lives in the grant as data, and the check runs on every request:

```ts
import { parse } from 'dtrexp';

// grant.scope = "T0900:1800 E1:5"  — stored in your DB / ACL
const scope = parse(grant.scope);

function authorize(req) {
  if (!scope.covers(Date.now(), { tz: req.user.tz })) {
    throw new ForbiddenError('outside the permitted window');
  }
  // … proceed
}
```

A maintenance window every 10 days from an anchor date; "when is the next one?" is one call:

```ts
const win = parse('20200106/10D T0300:0500');
win.next(new Date());
// —> { start: …, end: … } — the next 03:00–05:00 slot on the 10-day cadence
```

Validation with the spec's *unsatisfiability lint*; `D30 M2` parses but can never match, and the library tells you so instead of failing silently:

```ts
import { validate } from 'dtrexp';

validate('D30 M2');
// —> { valid: true, errors: [], warnings: [{ code: 'unsatisfiable', … }] }
```

Interop and display:

```ts
parse('E7#-1 M4').describe();
// —> 'the last Sunday in April'

parse('D25 M12').toRRule();
// —> 'RRULE:FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25'
```

## API

### Functions

| Function | Description |
| --- | --- |
| `parse(expression)` | Parses a DTRExp string into an immutable `DTRExp`. Throws `DTRExpSyntaxError` with a stable `code` and character `position` on invalid input. The only way to construct a `DTRExp`. |
| `validate(expression)` | Non-throwing variant. Returns `{ valid, errors, warnings }`; warnings include the spec's *unsatisfiability lint*. |

### `DTRExp` Instance

| Member | Description |
| --- | --- |
| `covers(instant, opts?)` | Whether the expression covers the instant. O(#components) integer tests after one field extraction. |
| `intersect(start, end, opts?)` | Covered intervals clipped to `[start, end)`: a finite, sorted, merged list of half-open `{ start: Date, end: Date }` intervals. |
| `next(after, opts?)` | The first **maximal** covered interval starting strictly after `after`. `null` when nothing starts before the year-9999 horizon. |
| `describe(locale?)` | Human-readable English rendering. v1 supports `'en'`; the parameter is reserved. |
| `toRRule()` | RFC 5545 RRULE (+ `DTSTART` when anchored) for the losslessly-mappable subset, else `null`. Constrained cadences emit RFC 7529 `SKIP=BACKWARD`. |
| `toString()` | Canonical normalized form (redundant components dropped, canonical order, wraps re-fused). |
| `warnings` | The [§9.1](/spec/#91-the-existence-rule) warnings of the parsed expression; same content as `validate().warnings`. |
| `source` | The original expression, verbatim. |

### Inputs & Options

- **Instants**: `Date`, epoch milliseconds, ISO 8601 string, or any Temporal-like object exposing `epochMilliseconds` (no Temporal dependency).
- **`opts.tz`**: IANA time zone for evaluation, default `'UTC'`. The zone is always an **evaluation parameter**, never part of the expression. DST is handled per [spec §9.3](/spec/#93-dst-and-local-time): spring-forward gap times cover nothing; repeated fall-back times are covered on both passes.

## Quality

The test suite is driven by the shared [`vectors.json`](https://github.com/DTRExp/dtrexp/blob/main/vectors.json), including the calendar traps (Feb 29 in 2000/2024/**2100**, `W53` existence, DST gap/overlap, constrain arithmetic on month-end anchors). 100% coverage on all four metrics and a 100% [Stryker](https://stryker-mutator.io/) mutation score, both enforced in CI; inclusivity mutants (`<` vs `<=`) are exactly the class of bug a date-range library must not ship.

## Links

- npm: [`dtrexp`](https://www.npmjs.com/package/dtrexp)
- Repository: [DTRExp/dtrexp-js](https://github.com/DTRExp/dtrexp-js)
- Prefer the Rust core in the browser? See [WASM](/wasm/).
