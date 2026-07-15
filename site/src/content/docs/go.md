---
title: "Go"
description: "dtrexp-go on pkg.go.dev — the Go implementation of DTRExp. Install, quick start, API and worked examples."
---

[`dtrexp-go`](https://github.com/DTRExp/dtrexp-go) is the Go implementation of DTRExp; parsing, validation and coverage evaluation, the spec's core interface. Standard library only, zero dependencies, driven by the shared [conformance vectors](/vectors/). Rendering, description and RRULE export are out of scope; the [reference implementation](/javascript/) has them.

## Install

```sh
go get github.com/DTRExp/dtrexp-go
```

Go 1.26+, standard library only (`time` for IANA zones).

## Quick Start

```go
import (
    "time"

    dtrexp "github.com/DTRExp/dtrexp-go"
)

dtr, err := dtrexp.Parse("T0900:1800 E1:5")   // business hours, Mon–Fri
if err != nil {
    // a positioned ParseError
}

// coverage — one field extraction, then integer comparisons
ok, err := dtr.Covers(time.Now(), "Europe/Berlin")
// —> true on a weekday, 09:00–18:00 Berlin local time

// preloaded zone; cannot fail
berlin, _ := time.LoadLocation("Europe/Berlin")
ok = dtr.CoversIn(time.Now(), berlin)
```

You parse **once** (at write/config time) and evaluate **many**; `Expression` values are immutable after `Parse` and safe for concurrent use. `Covers` is a single calendar-field extraction followed by integer comparisons, with no occurrence iteration. The zone is an evaluation parameter, never part of the expression; an empty string or `"UTC"` means UTC.

## Examples

An access-control grant that only applies during business hours; the expression lives in the grant as data, and the check runs on every request:

```go
// grant.Scope = "T0900:1800 E1:5"  — stored in your DB / ACL.
// Parse once, at load time:
scope, err := dtrexp.Parse(grant.Scope)
if err != nil {
    return err
}

// Then, on every request:
ok, err := scope.Covers(time.Now(), req.User.TZ)
if err != nil {
    return err   // req.User.TZ is not a loadable IANA zone
}
if !ok {
    return ErrForbidden   // outside the permitted window
}
// … proceed
```

Validation with the spec's *unsatisfiability lint*; `D30 M2` parses but can never match, and the package hands you a warning instead of failing silently:

```go
res := dtrexp.Validate("D30 M2")   // never returns a Go error
res.Valid                          // —> true (it parses)
res.Warnings                       // —> [{Pos: 0, Message: "unsatisfiable …"}] — no February has 30 days
```

A positioned syntax error surfaces through `errors.As`; `Pos` points at the offending character:

```go
_, err := dtrexp.Parse("Y*/3")   // anchorless stride — a syntax error
var pe dtrexp.ParseError
if errors.As(err, &pe) {
    pe.Pos   // —> the 0-based offset of the offending character
    pe.Msg   // —> the reason
}
```

## API

### Functions

| Function | Description |
| --- | --- |
| `Parse(s string) (*Expression, error)` | Parses a DTRExp string into an immutable `*Expression`. Returns a `ParseError` carrying the offending character offset on syntactically or statically invalid input. The only way to construct an `Expression`. |
| `Validate(s string) ValidationResult` | Non-failing variant. Returns `{Valid, Errors, Warnings}`; typo-shaped input comes back as data, never as a Go error. Warnings include the spec's *unsatisfiability lint*. |

### `Expression` Methods

| Member | Description |
| --- | --- |
| `Covers(t time.Time, tz string) (bool, error)` | Whether the expression covers the instant `t`, evaluated in IANA zone `tz`. An empty `tz` means UTC. Returns an error only when `tz` is not a loadable zone. |
| `CoversIn(t time.Time, loc *time.Location) bool` | `Covers` with an already-resolved `*time.Location` (`nil` means UTC); cannot fail. |
| `Warnings() []Warning` | The [§9.1](/spec/#91-the-existence-rule) warnings collected during parsing; same content as `Validate(s).Warnings`. Empty for a clean expression. |
| `Source() string` | The original expression string, verbatim. |

### Types

- **`ParseError`** — `Pos int`, `Msg string`. A positioned syntax error; `Pos` is the 0-based character offset of the offending input. Every error `Parse` returns for invalid source is a `ParseError`.
- **`Warning`** — `Pos int`, `Message string`. A positioned §9.1 warning: legal, but can never match. `Pos` is `-1` where no position is derivable.
- **`ValidationResult`** — `Valid bool`, `Errors []ParseError`, `Warnings []Warning`. Parsing stops at the first syntax error, so `Errors` holds at most one entry. An expression can be valid and still warned.

### Zones & Instants

Instants are `time.Time`; the zone is always an **evaluation parameter**, never part of the expression, default UTC. Pass it as an IANA name to `Covers`, or as a preloaded `*time.Location` to `CoversIn` when the same zone drives many checks. DST is handled per [spec §9.3](/spec/#93-dst-and-local-time): spring-forward gap times cover nothing; repeated fall-back times are covered on both passes.

## Quality

The test suite is driven by the shared [`vectors.json`](https://github.com/DTRExp/dtrexp/blob/main/vectors.json) from the spec repo (draft 2.8): every coverage, rejection, warning and quiet vector, including the calendar traps (Feb 29 across 2000/2024/**2100**, `W53` existence, DST gap/overlap in `Europe/Berlin`). See [VECTORS.md](/vectors/) for how the suite works. 100% statement coverage, mutation-tested with [gremlins](https://github.com/go-gremlins/gremlins), and zero dependencies.

## Links

- pkg.go.dev: [`dtrexp-go`](https://pkg.go.dev/github.com/DTRExp/dtrexp-go)
- Repository: [DTRExp/dtrexp-go](https://github.com/DTRExp/dtrexp-go)
