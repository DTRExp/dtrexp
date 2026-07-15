---
title: "Java"
description: "dtrexp-java — the Java port of DTRExp. Parsing, validation and coverage evaluation, pure Java 17+ with zero dependencies."
---

[`dtrexp-java`](https://github.com/DTRExp/dtrexp-java) implements DTRExp in Java. Its scope is **parsing, validation and coverage evaluation** — the spec's core interface; rendering, description and RRULE export are out of scope, the [reference implementation](/javascript/) has them. Pure Java 17+, zero dependencies (`java.time` for IANA zones), driven by the shared [conformance vectors](/vectors/).

## Install

Not on Maven Central yet. Build from source with `./run.sh`; it compiles the sources under `src/` and runs the conformance suite. The planned coordinate is `io.onury:dtrexp`.

## Quick Start

```java
import io.onury.dtrexp.DTRExp;
import java.time.Instant;

DTRExp dtr = DTRExp.parse("T0900:1800 E1:5");   // Mon–Fri, 09:00–18:00
// throws a positioned DTRExpParseException on a syntax or static-validity error

boolean open = dtr.covers(Instant.now(), "Europe/Berlin");
// —> true on a weekday, 09:00–18:00 Berlin local time
```

You parse **once** (at write/config time) and evaluate **many**. A `DTRExp` is immutable after `parse` and safe to share across threads; `covers` is a single calendar-field extraction followed by integer comparisons, with no occurrence iteration. `toString()` returns the source expression verbatim.

## Examples

An access-control grant that only applies during business hours; the expression lives in the grant as data, and the check runs on every request:

```java
import io.onury.dtrexp.DTRExp;
import java.time.Instant;

// grant.scope = "T0900:1800 E1:5"  — stored in your DB / ACL
DTRExp scope = DTRExp.parse(grant.scope());

boolean allowed = scope.covers(Instant.now(), user.zone());
// —> true inside Mon–Fri 09:00–18:00 in the user's zone, false outside it
if (!allowed) {
    throw new ForbiddenException("outside the permitted window");
}
```

The zone is an evaluation parameter, never part of the expression. Three `covers` overloads take it three ways:

```java
dtr.covers(instant);                          // UTC — the default zone
dtr.covers(instant, ZoneId.of("Asia/Tokyo")); // a preloaded ZoneId
dtr.covers(instant, "Asia/Tokyo");            // an IANA identifier
```

Validation with the spec's *unsatisfiability lint*; `D30 M2` parses but can never match, and `validate` tells you so instead of failing silently:

```java
ValidationResult res = DTRExp.validate("D30 M2");   // never throws
res.valid();       // —> true — it parses
res.warnings();    // —> [DTRExpWarning{position=…, message="unsatisfiable …"}]
                   //     no February has 30 days
```

Errors and warnings both carry a **position**; the 0-based character offset into the source, rendered into the message as `(at N)`:

```java
DTRExp.parse("Y*/3");   // anchorless stride — throws DTRExpParseException
// e.position() points at the offending character
```

## API

### Static Methods

| Method | Description |
| --- | --- |
| `DTRExp.parse(String)` | Parses a DTRExp string into an immutable `DTRExp`, or throws a `DTRExpParseException` with a `position()` on a syntax or static-validity error. The only way to construct a `DTRExp`. |
| `DTRExp.validate(String)` | Non-throwing variant. Returns a `ValidationResult` record; typo-shaped input comes back as data, never an exception. |

### `DTRExp` Instance

| Member | Description |
| --- | --- |
| `covers(Instant)` | Whether the expression covers the instant, evaluated in UTC. A single calendar-field extraction followed by integer comparisons. |
| `covers(Instant, ZoneId)` | Same, evaluated in a preloaded `ZoneId`. |
| `covers(Instant, String)` | Same, evaluated in a zone given as an IANA identifier. |
| `warnings()` | The [§9.1](/spec/#91-the-existence-rule) unsatisfiability warnings of the parsed expression; a `List<DTRExpWarning>`, same content as `validate(s).warnings()`. |
| `toString()` | The source expression, verbatim. |

### Records and Exceptions

| Type | Description |
| --- | --- |
| `ValidationResult` | Record with `valid()` `boolean`, `errors()` (parsing stops at the first syntax error, so at most one `DTRExpParseException`) and `warnings()` `List<DTRExpWarning>`. |
| `DTRExpWarning` | Record of `(int position, String message)`. |
| `DTRExpParseException` | Thrown by `parse` on invalid input; carries a `position()` `int` and the message. |

The zone is always an **evaluation parameter**, never part of the expression. Its default is UTC. DST is handled per [spec §9.3](/spec/#93-dst-and-local-time): spring-forward gap times cover nothing; repeated fall-back times are covered on both passes.

## Quality

The test suite is driven by the shared [`vectors.json`](https://github.com/DTRExp/dtrexp/blob/main/vectors.json) from the spec repo: every coverage, rejection, warning and quiet vector, including the calendar traps (Feb 29 across 2000/2024/**2100**, `W53` existence, DST gap/overlap in `Europe/Berlin`). The vectors are vendored at `test/resources/vectors.json`; see [VECTORS.md](/vectors/) for how the suite works. The build compiles under `javac -Xlint:all -Werror`, so a warning fails it. Zero dependencies.

## Links

- Repository: [DTRExp/dtrexp-java](https://github.com/DTRExp/dtrexp-java)
- Planned Maven coordinate: `io.onury:dtrexp` (not published yet; build from source with `./run.sh`).
- Reference implementation with `intersect`, `next`, `describe` and `toRRule`: [JavaScript / TypeScript](/javascript/).
