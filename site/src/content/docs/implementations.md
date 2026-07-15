---
title: "Implementations"
description: "Every DTRExp implementation — packages, registries, platform requirements and how they were built."
---

Six implementations, each developed **clean-room against the [conformance vectors](/vectors/)**; built from the prose and vectors alone, with every divergence between them resolved as a spec fix and a new vector. All zero-dependency. The Rust core additionally ships as a WASM package for browsers and JS runtimes.

They share [one API vocabulary](/api/); operation names are fixed as words (`covers`, `covers in`, `to rrule`) and rendered in each language's casing convention. Learn one library and you know them all.

| Language | Package | Install | Requires |
| --- | --- | --- | --- |
| TypeScript / JavaScript *(reference)* | [`dtrexp`](https://www.npmjs.com/package/dtrexp) on npm | `npm i dtrexp` | Node.js ≥ 22 |
| WebAssembly *(the Rust core)* | [`dtrexp-wasm`](https://www.npmjs.com/package/dtrexp-wasm) on npm | `npm i dtrexp-wasm` | any modern browser or JS runtime |
| Python | [`dtrexp`](https://pypi.org/project/dtrexp/) on PyPI | `pip install dtrexp` | Python 3.11+ |
| Go | [`dtrexp-go`](https://github.com/DTRExp/dtrexp-go) via the Go proxy | `go get github.com/DTRExp/dtrexp-go` | Go 1.26+ |
| Rust | [`dtrexp`](https://crates.io/crates/dtrexp) on crates.io | `cargo add dtrexp` | Rust 2021 edition |
| Swift | [`dtrexp-swift`](https://github.com/DTRExp/dtrexp-swift) via SwiftPM | `.package(url: "https://github.com/DTRExp/dtrexp-swift", from: "1.0.0")` | Swift 6.0+ |
| Java | [`dtrexp-java`](https://github.com/DTRExp/dtrexp-java), from source | `./run.sh` (planned coordinate: `io.onury:dtrexp`) | Java 17+ |

Platform notes, terse:

- **JavaScript** ([`dtrexp-js`](https://github.com/DTRExp/dtrexp-js)) — the reference implementation. TypeScript, ESM, zero runtime dependencies.
- **WASM** ([`dtrexp-wasm`](https://github.com/DTRExp/dtrexp-wasm)) — the Rust core via wasm-bindgen; ~63 KB wasm, ~29 KB gzipped, instantiates at import. IANA zones come from the host's `Intl` data, so no timezone database is bundled.
- **Python** ([`dtrexp-py`](https://github.com/DTRExp/dtrexp-py)) — stdlib only; `zoneinfo` for IANA zones.
- **Go** ([`dtrexp-go`](https://github.com/DTRExp/dtrexp-go)) — stdlib only; `time` for IANA zones.
- **Rust** ([`dtrexp-rs`](https://github.com/DTRExp/dtrexp-rs)) — no dependencies, including the zone handling; IANA zones are read straight from the system TZif database.
- **Swift** ([`dtrexp-swift`](https://github.com/DTRExp/dtrexp-swift)) — Foundation only; `TimeZone` and `Date` for zones and instants.
- **Java** ([`dtrexp-java`](https://github.com/DTRExp/dtrexp-java)) — pure Java 17+, zero dependencies; `java.time` for IANA zones. Not on Maven Central yet.

Building your own? Start from the [library interface](/api/) and wire in the [vectors](/vectors/); an implementation that passes `vectors.json` is a conforming DTRExp implementation, whatever its internals look like.
