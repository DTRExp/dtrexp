---
title: "Python"
description: "dtrexp on PyPI — the Python implementation of DTRExp. Install, quick start, API and worked examples."
---

[`dtrexp-py`](https://github.com/DTRExp/dtrexp-py) is the Python implementation of DTRExp. Its scope is the spec's core interface: parsing, validation and coverage evaluation. Rendering, description and RRULE export are out of scope; the [reference implementation](/javascript/) has them. Zero dependencies, stdlib only, driven by the shared [conformance vectors](/vectors/).

## Install

```sh
pip install dtrexp
```

Python 3.11+, stdlib only (`zoneinfo` for IANA zones).

## Quick Start

```python
from datetime import datetime, timezone
import dtrexp

dtr = dtrexp.parse("T0900:1800 E1:5")   # business hours, Mon–Fri

dtr.covers(datetime(2026, 7, 7, 10, 0, tzinfo=timezone.utc))
# —> True (UTC — the default)
dtr.covers(datetime(2026, 7, 7, 7, 30, tzinfo=timezone.utc), tz="Europe/Berlin")
# —> True (09:30 Berlin local time)
```

You parse **once** (at write/config time) and evaluate **many**; `Expression` objects are immutable, and `covers` is a single calendar-field extraction followed by integer comparisons, with no occurrence iteration. The zone is an evaluation parameter, never part of the expression; `covers` also accepts an ISO 8601 string for the instant.

## Examples

An access-control grant that only applies during business hours; the expression lives in the grant as data, and the check runs on every request:

```python
import dtrexp

# grant.scope = "T0900:1800 E1:5"  — stored in your DB / ACL
scope = dtrexp.parse(grant.scope)

def authorize(req):
    if not scope.covers(req.now, tz=req.user.tz):
        raise PermissionError("outside the permitted window")
    # … proceed
```

Validation with the spec's *unsatisfiability lint*; `D30 M2` parses but can never match, and `validate` tells you so as data instead of raising:

```python
import dtrexp

res = dtrexp.validate("D30 M2")
res.valid       # —> True (it parses)
res.warnings    # —> (DTRExpWarning(message="unsatisfiable …", position=0),)
```

## API

### Functions

| Function | Description |
| --- | --- |
| `parse(text)` | Parses a DTRExp string into an immutable `Expression`. Raises `DTRExpSyntaxError` (a `ValueError`) with a *position* on invalid input. The only way to construct an `Expression`. |
| `validate(text)` | Non-raising variant. Returns a frozen `ValidationResult` with *valid*, *errors* and *warnings*; warnings are the spec's *unsatisfiability lint*. |

### `Expression` Instance

| Member | Description |
| --- | --- |
| `covers(instant, tz="UTC")` | Whether the expression covers the instant, evaluated in `tz`. A single calendar-field extraction followed by integer comparisons; no occurrence iteration. |
| `warnings` | The [§9.1](/spec/#91-the-existence-rule) warnings of the parsed expression; same content as `validate(text).warnings`. |

### Errors and Warnings

Both carry a **position**; the 0-based character offset into the source.

```python
dtrexp.parse("Y*/3")
# raises DTRExpSyntaxError: "anchorless stride — an explicit start is required (at 1)"
# error.position —> 1
```

- `parse(text)` raises `DTRExpSyntaxError` (a `ValueError`) on invalid input; *position* points at the offending character and is appended to the rendered message.
- `validate(text)` never raises; typo-shaped input comes back as data. It returns a frozen `ValidationResult` with *valid* `bool`, *errors* (parsing stops at the first syntax error, so at most one) and *warnings*.
- Warnings are the spec's [§9.1](/spec/#91-the-existence-rule) unsatisfiability lint: expressions that parse but can never match. They are `DTRExpWarning` objects (*message* `str`, *position* `int | None`); `str(warning)` is the message.

### Inputs and Options

- **Instant**: an aware `datetime`, or an ISO 8601 string (parsed with `datetime.fromisoformat`).
- **`tz`**: IANA time zone for evaluation, default `"UTC"`. The zone is always an evaluation parameter, never part of the expression.

## Quality

The test suite is driven by the shared [`vectors.json`](https://github.com/DTRExp/dtrexp/blob/main/vectors.json) from the spec repo (draft 2.8): every coverage, rejection, warning and quiet vector, including the calendar traps (Feb 29 across 2000/2024/**2100**, `W53` existence, DST gap/overlap in `Europe/Berlin`). See [VECTORS](/vectors/) for how the suite works. 100% line and branch coverage is enforced; the code is mutation-tested with mutmut, and there are zero dependencies.

## Links

- PyPI: [`dtrexp`](https://pypi.org/project/dtrexp/)
- Repository: [DTRExp/dtrexp-py](https://github.com/DTRExp/dtrexp-py)
