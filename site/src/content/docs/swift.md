---
title: "Swift"
description: "dtrexp-swift — the Swift implementation of DTRExp. Install, quick start, API and worked examples."
---

[`dtrexp-swift`](https://github.com/DTRExp/dtrexp-swift) is the Swift implementation of DTRExp — a compact string expression for date-time ranges and recurrence, evaluated by **coverage** rather than enumeration. Its scope is **parsing, validation and coverage evaluation** (the spec's core interface); rendering, description and RRULE export are out of scope, and live in the [reference implementation](/javascript/). Foundation only, zero dependencies, driven by the shared [conformance vectors](/vectors/).

## Install

Add the package to your `Package.swift`:

```swift
.package(url: "https://github.com/DTRExp/dtrexp-swift", from: "1.0.0")
```

Then depend on the `DTRExp` product from your target:

```swift
.product(name: "DTRExp", package: "dtrexp-swift")
```

Swift 6.0+, Foundation only (`TimeZone` and `Date` for IANA zones and instants).

## Quick Start

```swift
import DTRExp

let dtr = try DTRExp("T0900:1800 E1:5")    // business hours, Mon–Fri

let berlin = TimeZone(identifier: "Europe/Berlin")!
dtr.covers(Date(), timeZone: berlin)
// —> true on a weekday, 09:00–18:00 Berlin local time

// By IANA name; throws on an unknown identifier:
let ok = try dtr.covers(Date(), tz: "Europe/Berlin")
```

`DTRExp("…")` and the equivalent static `DTRExp.parse("…")` both parse; `parse` is the fixed cross-language name for what the initializer does natively.

Note that you parse **once** (at write/config time) and evaluate **many**; a `DTRExp` value is an immutable `struct`, `Sendable`, and safe to share across concurrent evaluations. `covers` is a single calendar-field extraction followed by integer comparisons; no occurrence iteration. The zone is an evaluation parameter, never part of the expression; omit it and evaluation is in UTC.

## Examples

An access-control grant that only applies during business hours; the expression lives in the grant as data, and the check runs on every request:

```swift
import DTRExp

// grant.scope = "T0900:1800 E1:5"  — stored in your DB / ACL
let scope = try DTRExp(grant.scope)

func authorize(_ request: Request) throws {
    guard try scope.covers(request.now, tz: request.user.timeZone) else {
        throw AuthError.forbidden("outside the permitted window")
    }
    // … proceed
}
```

Validation with the spec's *unsatisfiability lint*; `D30 M2` parses but can never match, and the library tells you so instead of failing silently:

```swift
let result = DTRExp.validate("D30 M2")     // never throws
result.valid                               // true — it parses
result.warnings                            // [Warning] — no February has 30 days

for warning in result.warnings {
    print(warning)
    // —> "unsatisfiable: 'D' selector never matches in any parent instance (at offset 0)"
}
```

A parse error carries the offending position, caught with a typed `catch`:

```swift
do {
    _ = try DTRExp("Y*/3")                 // anchorless stride — a syntax error
} catch let error {                        // typed catch — error is a ParseError
    error.message                          // human-readable reason
    error.position                         // 0-based offset of the offending character
}
```

## API

### Parsing & Validation

| Member | Description |
| --- | --- |
| `DTRExp(_:)` | Failable initializer; parses the source into an immutable `DTRExp` or throws a `ParseError`. Typed `throws(ParseError)`. |
| `DTRExp.parse(_:)` | Static equivalent of the initializer; the fixed cross-language name for the parse operation. Typed `throws(ParseError)`. |
| `DTRExp.validate(_:)` | Non-throwing variant. Returns a `ValidationResult`; typo-shaped input comes back as data. |

### `DTRExp` Instance

| Member | Description |
| --- | --- |
| `covers(_:timeZone:)` | Whether the expression covers the instant, evaluated in the given `TimeZone` (default UTC). A single calendar-field extraction followed by integer comparisons. Cannot fail. |
| `covers(_:tz:)` | Same, by IANA identifier `String`; throws an `EvaluationError` for an unknown zone. |
| `warnings` | The [§9.1](/spec/#91-the-existence-rule) unsatisfiability warnings of the parsed expression; same content as `validate(_:).warnings`. |
| `source` | The original expression, verbatim. |

### Supporting Types

| Type | Description |
| --- | --- |
| `ParseError` | Parse failure: *message* `String`, *position* `Int?` (0-based offset of the offending character, when known). |
| `ValidationResult` | *valid* `Bool`, *errors* `[ParseError]` (parsing stops at the first syntax error, so at most one), *warnings* `[Warning]`. |
| `Warning` | A non-fatal finding — the expression parses but can never match: *message* `String`, *position* `Int?`. |
| `EvaluationError` | Raised by `covers(_:tz:)` for an unknown IANA identifier. |

### Inputs & Options

- **Instants**: a Foundation `Date`.
- **Time zone**: a `TimeZone` value, or an IANA identifier `String` via `covers(_:tz:)`. The zone is always an **evaluation parameter**, never part of the expression; omitted, evaluation is in UTC. DST is handled per [spec §9.3](/spec/#93-dst-and-local-time): spring-forward gap times cover nothing; repeated fall-back times are covered on both passes.
- **Warnings**: the spec's [§9.1](/spec/#91-the-existence-rule) unsatisfiability lint — expressions that parse but can never match. The parsed value's `warnings` property and `validate(_:).warnings` carry the same content.

## Quality

The test suite is driven by the shared [`vectors.json`](https://github.com/DTRExp/dtrexp/blob/main/vectors.json) from the spec repo, vendored at `Tests/DTRExpTests/Resources/vectors.json`: every coverage, rejection, warning and quiet vector, including the calendar traps (Feb 29 across 2000/2024/**2100**, `W53` existence, DST gap/overlap in `Europe/Berlin`). Run the suite with `swift test`; see [VECTORS.md](/vectors/) for how the vectors are structured. 100% line coverage, and mutation-tested by a scripted exit-code harness that applies the classic mutant classes and treats any nonzero `swift test` exit as a kill. Zero dependencies.

## Links

- Repository: [DTRExp/dtrexp-swift](https://github.com/DTRExp/dtrexp-swift)
- Add via SwiftPM: `.package(url: "https://github.com/DTRExp/dtrexp-swift", from: "1.0.0")`
