---
title: "WASM"
description: "dtrexp-wasm on npm — the Rust DTRExp core compiled to WebAssembly for browsers, Node, Deno, and edge runtimes. Install, quick start, API and worked examples."
---

[`dtrexp-wasm`](https://github.com/DTRExp/dtrexp-wasm) is [DTRExp](/spec/) evaluated by the [Rust core](https://github.com/DTRExp/dtrexp-rs), compiled to WebAssembly for JS hosts — browsers, Node, Deno, edge runtimes. The wasm binary (~63 KB, ~29 KB gzipped) ships inside the package and instantiates at import; no fetch configuration, no separate asset step.

For most JS applications the reference implementation, [`dtrexp`](/javascript/), is the right pick; it is pure TypeScript, zero-dependency, and implements the full Tier-2 API (`next()`, `describe()`, `toRRule()`…). This package exists for a different job: running the **Rust** evaluator itself in a JS host. Use it when your backend already standardizes on [dtrexp-rs](https://github.com/DTRExp/dtrexp-rs) and you want the same binary logic in the browser, or for cross-implementation parity checks against the reference.

## Install

```sh
npm i dtrexp-wasm
```

## Quick Start

```js
import { parse, validate } from 'dtrexp-wasm';

const dtr = parse('T0900:1800 E1:5'); // business hours

// coverage — evaluated by the wasm core, one call per check
dtr.covers(new Date(), { tz: 'Europe/Berlin' });
// —> true (weekday, 09:00–18:00 Berlin local time)

dtr.covers('2026-07-11T10:00:00Z');
// —> false (a Saturday, evaluated in UTC)

// non-throwing validation, with the spec's unsatisfiability lint
validate('D30 M2');
// —> { valid: true, errors: [], warnings: [{ message: '…unsatisfiable…', position: 0 }] }
```

The operation vocabulary is fixed across every DTRExp implementation ([API reference](/api/)); if you know one library, you know this one.

## Examples

An access-control grant that only applies during business hours; the expression lives in the grant as data, and the check runs on every request:

```js
import { parse } from 'dtrexp-wasm';

// grant.scope = "T0900:1800 E1:5"  — stored in your DB / ACL
const scope = parse(grant.scope);

function authorize(req) {
  if (!scope.covers(Date.now(), { tz: req.user.tz })) {
    throw new ForbiddenError('outside the permitted window');
  }
  // … proceed
}
```

Validation with the spec's *unsatisfiability lint*; `D30 M2` parses but can never match, and the library tells you so instead of failing silently:

```js
import { validate } from 'dtrexp-wasm';

validate('D30 M2');
// —> { valid: true, errors: [], warnings: [{ message: '…unsatisfiable…', position: 0 }] }
```

An expression can be valid **and** warned; that is the point of the distinction. When you parse directly, the same warnings are on the instance:

```js
parse('D30 M2').warnings;
// —> [{ message: '…unsatisfiable…', position: 0 }]
```

## API

### Functions

| Function | Description |
| --- | --- |
| `parse(expression)` | Parses a DTRExp string into a `DTRExp` instance. Fails with a positioned `DTRExpSyntaxError` (`position`, `expression` properties) on invalid input. Parse failure is the only failure; a syntactically valid expression never fails later. |
| `validate(expression)` | Non-throwing variant. Returns `{ valid, errors, warnings }`; every issue carries a `message` and a 0-based `position`. Warnings include the spec's *unsatisfiability lint*. |

### `DTRExp` Instance

| Member | Description |
| --- | --- |
| `covers(instant, opts?)` | Whether the expression covers the instant. Returns `Boolean`. An unknown zone throws a `RangeError`; exactly what `Intl` itself throws for one. |
| `warnings` | The [§9.1](/spec/#91-the-existence-rule) unsatisfiability warnings of the parsed expression; same content as `validate(source).warnings`, exposed on the instance so code that parses directly doesn't lose them. |

### Inputs & Options

- **Instants**: `Date`, epoch milliseconds, ISO 8601 string, or any Temporal-like object exposing `epochMilliseconds` (no Temporal dependency).
- **`opts.tz`**: IANA time zone for evaluation (e.g. `"Europe/Berlin"`), default `"UTC"`.

### Time Zones

WebAssembly has no zoneinfo filesystem, so this package does not ship a time-zone database. Zone lookups are answered by the host's own IANA data through `Intl.DateTimeFormat` — the same technique the reference implementation uses — which keeps the binary small and the zone data exactly as current as the runtime's. `UTC` (the default) never touches the bridge and evaluates entirely inside the wasm module.

## Conformance

The spec's test vectors are the contract ([spec §12](/spec/#12-conformance)); this package vendors [`vectors.json`](https://github.com/DTRExp/dtrexp/blob/main/vectors.json) and runs all of it in its test suite — 97 groups, 409 checks, including the coverage groups evaluated through the `Intl` zone bridge.

## Links

- npm: [`dtrexp-wasm`](https://www.npmjs.com/package/dtrexp-wasm)
- Repository: [DTRExp/dtrexp-wasm](https://github.com/DTRExp/dtrexp-wasm)
- Prefer the pure-TS reference on Node? See [JavaScript / TypeScript](/javascript/).
