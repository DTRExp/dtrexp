# DTRExp — Library Interface

> **Status: informative.** This document is a recommendation, not a conformance rule. Conformance is defined by the test vectors alone ([spec §12][spec-conformance]) — an implementation that passes `vectors.json` with a completely different API is still a conforming DTRExp implementation. But if you are building one; start here. Users who learn one DTRExp library should know them all.

## Why this exists

An expression like `T0900:1800 E1:5` means the same thing in every language. The code around it should too. When parsing, coverage checks and warnings are named the same everywhere, switching languages costs nothing but syntax:

```js
// JavaScript
const expr = parse('T0900:1800 E1:5');
expr.covers('2026-07-07T10:00:00Z', { tz: 'Europe/Berlin' }); // —> true
```
```python
# Python
expr = dtrexp.parse('T0900:1800 E1:5')
expr.covers(instant, tz='Europe/Berlin')  # —> True
```

Same vocabulary, same defaults, same mental model.

## Naming: the words are fixed, the casing is yours

An operation name in this document is a **sequence of words** — render it in your language's convention:

| Convention | Languages (e.g.) | `covers` | `covers in` | `to rrule` |
| --- | --- | --- | --- | --- |
| camelCase | JavaScript, Java, Swift | `covers` | `coversIn` | `toRRule` |
| PascalCase | Go, C# | `Covers` | `CoversIn` | `ToRRule` |
| snake_case | Python, Rust, Ruby | `covers` | `covers_in` | `to_rrule` |

The words never change; the rendering always follows the language. In other words; `coversIn`, `CoversIn` and `covers_in` are the **same operation** — while `isCovered` or `matches` would be a different vocabulary, which is exactly what this document exists to prevent.

## Core (Tier 1)

Every DTRExp library provides these four operations; everything about them is fixed except the rendering above.

### `parse(expression)`

Parses the source text into an expression object.

- *expression* `String` — Required. The DTRExp source text.

**returns** an `Expression` (or your language's equivalent).

Fails with a **positioned** parse error on invalid input — a character position and a message, per the grammar and static rules of [spec §§2–8][spec]. Note that parse failure is the *only* failure: a syntactically valid expression never fails later.

### `validate(expression)`

Checks the source text without throwing. Never fails; typo-shaped input comes back as data.

- *expression* `String` — Required. The DTRExp source text.

**returns** a result object with:

- *valid* `Boolean` — whether the expression parses.
- *errors* — positioned syntax errors. Empty when valid.
- *warnings* — positioned [§9.1][spec-91] unsatisfiability warnings. An expression can be valid **and** warned; that is the point of the distinction.

### `Expression.covers(instant [, zone])`

The reason this format exists: "is this instant inside the set?"

- *instant* — Required. The language's native instant type (`Date`, `datetime`, `time.Time`, `Instant`, epoch milliseconds).
- *zone* `String` — Optional. An IANA time-zone identifier (e.g. `"Europe/Berlin"`). Default: **`"UTC"`**.

**returns** `Boolean`.

This is the hot path. Keep it to the [§9][spec-9] cost model: one field extraction, then integer comparisons — no date-object iteration.

### `Expression.warnings`

The [§9.1][spec-91] warnings of a parsed expression; property or method per your language's idiom. Same content as `validate().warnings` — exposed on the instance so code that parses directly doesn't lose them.

## What may vary — and what may not

Idiom wins on shape:

- **Types** follow the language: `datetime` in Python, `time.Time` in Go, `Instant` in Java, epoch millis + a zone handle in Rust.
- **Failure** follows the language: exceptions, `Result`, `(value, error)` returns.
- **Preloaded zones**: where zone lookup by identifier is costly or fallible, a variant named `covers in` (rendered per convention: `coversIn`, `CoversIn`, `covers_in`) MAY take the language's zone object instead of the IANA string. Where the language supports overloading, overloading `covers` itself is equally fine — then no extra name exists at all.
- **Extras** are fine: a convenience that accepts ISO strings, extra overloads.

The vocabulary does not:

- The four operations — `parse`, `validate`, `covers`, `warnings` — and nothing else for these jobs. Not `isCovered`, not `check`, not `matches`.
- The zone parameter of `covers` is an **IANA identifier** and its default is **UTC**. Always both.
- Errors and warnings carry a **position**.

## Extended (Tier 2)

None of these affect conformance. But if you implement the operation, use the name — the reference implementation ([dtrexp-js][js]) is the model:

| Operation | Meaning |
| --- | --- |
| `next(after [, zone])` | First covered interval after an instant. |
| `intersect(a, b, window)` | The covered intervals of two expressions, clipped to a finite window. |
| `describe([locale])` | Human-readable text of the expression. |
| `toRRule()` | RFC 5545 export. Constrained cadences need RFC 7529 `SKIP=BACKWARD` — see [spec §9.2][spec-92]. |
| `toString()` | The canonical form of the expression (not necessarily the original source). |

## Checklist for a new implementation

1. Vendor `vectors.json` verbatim; wire it as your test suite ([spec §12][spec-conformance]). The vectors — not this document, not the prose — are the contract.
2. Implement Core with the names above.
3. Add Extended operations as your users need them; keep the names.

[spec]: spec.md
[spec-9]: spec.md#9-evaluation-semantics
[spec-91]: spec.md#91-the-existence-rule
[spec-92]: spec.md#92-cadence-overflow--constrain-never-skip
[spec-conformance]: spec.md#12-conformance
[js]: https://github.com/DTRExp/dtrexp-js
