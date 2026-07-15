---
title: "Rust"
description: "dtrexp on crates.io — the Rust implementation of DTRExp: parsing, validation and coverage evaluation. Install, quick start, API and worked examples."
---

[`dtrexp-rs`](https://github.com/DTRExp/dtrexp-rs) is the Rust implementation of DTRExp. Its scope is the spec's core interface: **parsing, validation and coverage evaluation**. Rendering, description and RRULE export are out of scope; the [reference implementation](/javascript/) has them. Zero dependencies, including the zone handling; IANA zones are read straight from the system TZif database, and the test suite is driven by the shared [conformance vectors](/vectors/).

## Install

```sh
cargo add dtrexp
```

Rust 2021 edition.

## Quick Start

```rust
use dtrexp::{parse, Tz};

let dtr = parse("T0900:1800 E1:5").unwrap();   // business hours, Mon–Fri

// 2026-07-07 (a Tuesday) 10:00:00Z, in ms since the Unix epoch:
let t: i64 = 1_783_418_400_000;

dtr.covers(t, "Europe/Berlin").unwrap();
// —> true; a weekday, 09:00–18:00 Berlin local time

// preloaded zone; cannot fail:
let berlin = Tz::load("Europe/Berlin").unwrap();
dtr.covers_in(t, &berlin);
// —> true
```

Instants are milliseconds since the Unix epoch (UTC); the time zone is passed at evaluation, and the default is `Tz::utc()`. You parse **once** (at write/config time) and evaluate **many**; a `Dtrexp` value is immutable after `parse`. `covers` is a single calendar-field extraction followed by integer comparisons; no occurrence iteration, ever.

## Examples

An access-control grant that only applies during business hours; the expression lives in the grant as data, and the check runs on every request. Load the zone once and evaluate with `covers_in`, which cannot fail:

```rust
use dtrexp::{parse, Dtrexp, Tz};

// grant.scope = "T0900:1800 E1:5" — stored in your DB / ACL
let scope: Dtrexp = parse(&grant.scope).unwrap();
let berlin = Tz::load("Europe/Berlin").unwrap();

fn authorize(scope: &Dtrexp, tz: &Tz, now_ms: i64) -> Result<(), Forbidden> {
    if !scope.covers_in(now_ms, tz) {
        return Err(Forbidden("outside the permitted window"));
    }
    // … proceed
    Ok(())
}
```

Validation with the spec's *unsatisfiability lint*; `D30 M2` parses cleanly but can never match, and the library tells you so instead of failing silently:

```rust
let warnings = dtrexp::validate("D30 M2").unwrap();  // parses cleanly
// —> one warning; no February has 30 days
warnings[0].pos;      // —> 0
warnings[0].message;  // —> "unsatisfiable — day never exists …"
```

A syntactically invalid expression returns a positioned `ParseError` rather than a warning:

```rust
let err = dtrexp::parse("T2500").unwrap_err();   // hour out of range
err.pos;        // —> 1; points at the offending token
err.message;    // —> "hour out of range — 24 exists only as the exact token '2400'"
```

## API

### Functions

| Function | Description |
| --- | --- |
| `parse(input)` | Parses a DTRExp string into an immutable `Dtrexp`. Returns a positioned `ParseError { pos, message }` on syntactically or statically invalid input. The only way to construct a `Dtrexp`. Warnings from a clean parse are available via `Dtrexp::warnings()`. |
| `validate(input)` | Returns `Result<Vec<Warning>, ParseError>`: the warnings on a clean parse, or the same `ParseError` when the input does not parse. Same warnings as `Dtrexp::warnings()`. |

### `Dtrexp` Value

| Member | Description |
| --- | --- |
| `covers(instant_ms, tz_id)` | Whether the expression covers the instant, evaluated in IANA zone `tz_id`. Returns `Result<bool, UnknownTimeZone>`; an empty identifier or `"UTC"` selects UTC. One field extraction followed by integer tests. |
| `covers_in(instant_ms, &tz)` | The preloaded-zone variant; evaluate against an already-loaded `Tz`, infallibly. Returns `bool`. |
| `warnings()` | The [§9.1](/spec/#91-the-existence-rule) unsatisfiability warnings of the parsed expression; the same content `validate()` returns. Empty for a clean expression. |

### Zones

| Member | Description |
| --- | --- |
| `Tz::load(id)` | Loads an IANA zone from the system TZif database. Returns `Result<Tz, UnknownTimeZone>`; a non-resolving identifier is the one runtime failure. |
| `Tz::utc()` | The UTC zone; the default when none is given. |

### Inputs & Options

- **Instants**: milliseconds since the Unix epoch (UTC), as `i64`.
- **Time zone**: an IANA identifier passed to `covers`, or an already-loaded `Tz` passed to `covers_in`. The zone is always an **evaluation parameter**, never part of the expression; an empty identifier or `"UTC"` means UTC. DST is resolved per the spec's local-time rules ([§9.3](/spec/#93-dst-and-local-time)).
- **Errors**: both `ParseError` and `Warning` carry a `pos`; the byte offset into the source where the problem was detected. `UnknownTimeZone { id, message }` is the only failure at evaluation time, and `covers_in` avoids it entirely by taking a `Tz` you already loaded.

## Quality

The test suite is driven by the shared [`vectors.json`](https://github.com/DTRExp/dtrexp/blob/main/vectors.json) from the spec repo (draft 2.8), vendored at `tests/vectors.json`: every coverage, rejection, warning and quiet vector, including the calendar traps (Feb 29 across 2000/2024/**2100**, `W53` existence, DST gap/overlap in `Europe/Berlin`). Run `cargo test`; see [VECTORS](/vectors/) for how the suite works. `Tz::load` reads the system zoneinfo database directly, with no time-zone crate underneath, and the crate has zero dependencies.

## Links

- crates.io: [`dtrexp`](https://crates.io/crates/dtrexp)
- API docs: [docs.rs/dtrexp](https://docs.rs/dtrexp)
- Repository: [DTRExp/dtrexp-rs](https://github.com/DTRExp/dtrexp-rs)
- Need it in the browser? The same core ships as WASM: see [WASM](/wasm/).
