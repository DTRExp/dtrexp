# DTRExp — Conformance Vectors

`vectors.json` is the conformance contract of the DTRExp specification. The prose in [spec.md](spec.md) explains the format; whether an implementation conforms is decided by this file alone. If the prose and the vectors ever disagree; the vectors win and the prose gets fixed.

## What conforming means

An implementation is conforming iff **all four** hold:

1. It **rejects** every `invalid` expression at parse time.
2. It **warns** on every `warnings` expression, while still accepting it.
3. It accepts every `quiet` expression with **zero** warnings.
4. It returns the expected boolean from `covers(instant, tz)` for every instant of every `coverage` group.

Note that 2 and 3 are two sides of one requirement. Without the `quiet` class, a linter could warn on everything and still "pass"; false positives would be unfalsifiable. A linter that cries wolf is as non-conforming as a silent one.

## File structure

```jsonc
{
  "spec": 2.8,                 // the draft these vectors pin
  "description": "…",          // the conformance statement, in one paragraph
  "coverage": [ … ],           // 95 groups, 403 instant checks
  "invalid":  [ … ],           // 57 expressions that must not parse
  "warnings": [ … ],           //  9 expressions that must warn
  "quiet":    [ … ]            //  6 expressions that must NOT warn
}
```

### `coverage`

Each group is one expression evaluated at several instants:

```json
{
  "id": "month-single",
  "expression": "M3",
  "tz": "UTC",
  "cases": {
    "2024-03-15T12:00:00Z": true,
    "2024-04-01T00:00:00Z": false
  }
}
```

- *id* `String` — unique name of the group; use it in your test output so a failure is identifiable.
- *expression* `String` — the DTRExp source to parse.
- *tz* `String` — the IANA **evaluation zone**. Most groups run in `UTC`; the DST groups run in `Europe/Berlin`.
- *cases* `Object` — instant → expected boolean. Instants are absolute **ISO 8601 UTC** timestamps; parse them as instants, then evaluate in *tz*. In other words, `"2024-03-31T01:30:00Z": true` with `"tz": "Europe/Berlin"` asks about 03:30 Berlin local time.

### `invalid`

```json
{ "expression": "Y*/3", "reason": "anchorless stride" }
```

*reason* is for the human reading a failed test; implementations only need to reject. The spec does not pin error messages or codes — only that parsing fails.

### `warnings` and `quiet`

```json
{ "expression": "D30 M2", "warning": "unsatisfiable — no February has 30 days" }
{ "expression": "D366 Y2020", "note": "leap year 2020 has a day 366" }
```

A `warnings` expression parses successfully **and** reports at least one warning (spec §9.1). A `quiet` expression parses with none; each carries a *note* explaining why warning on it would be wrong. Warning texts are not pinned — only the fact of warning.

## Wiring it into an implementation

1. **Vendor the file verbatim.** Copy `vectors.json` into your test tree; do not reformat, filter or merge it. Byte-identical vendoring is what lets one suite certify many implementations.
2. Drive all four sections from one runner. This is a few dozen lines in any language; every existing implementation does it this way.
3. Report failures by group *id* / expression, not by index.

Do not hand-pick "the relevant" vectors. The suite is deliberately heavy on the corners that break date libraries: February 29 across 2000 / 2024 / **2100**, `W53` existence per ISO week-year, the Berlin spring-forward gap and fall-back overlap, and constrain arithmetic on month-end anchors. If your implementation fails exactly one strange-looking vector; that vector is probably the one doing its job.

## When your implementation disagrees

First re-read the relevant spec section; the vectors have been validated by six independent implementations, so the odds favor the vectors. If you still believe a vector is wrong, [open an issue](https://github.com/DTRExp/dtrexp/issues) — a disputed vector is a spec bug either way: either the behavior is wrong, or the prose that led you elsewhere is.

## License

Unlike the specification prose, `vectors.json` (and the grammar and examples) is additionally available under **MIT**, so vendoring it into your test tree carries no attribution requirement. See [LICENSE.md](LICENSE.md).
