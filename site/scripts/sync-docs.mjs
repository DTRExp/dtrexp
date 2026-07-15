// Pulls the repo-root spec documents into the Starlight content collection at
// build time — the root files stay the single source of truth (the vectors and
// prose are canonical there; the site is a rendering). The engine lives in
// @onury/docs-kit; this file declares WHICH root files map to WHICH in-site
// pages, then post-processes what the engine doesn't cover: reference-style
// link definitions ([label]: spec.md#…) and links to non-synced repo files
// (vectors.json, LICENSE.md), which point at GitHub.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncDocs } from '@onury/docs-kit/sync';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../src/content/docs');
const GH_BLOB = 'https://github.com/DTRExp/dtrexp/blob/main';

const files = [
  {
    src: 'spec.md',
    out: 'spec.md',
    title: 'Specification',
    description: 'The DTRExp specification — model, grammar, and evaluation semantics. Draft 2.8.'
  },
  {
    src: 'recurrence.md',
    out: 'recurrence.md',
    title: 'Recurrence, Cleanly',
    description: 'Why DTRExp has two recurrence constructs — strides and cadences — and one question that decides between them.'
  },
  {
    src: 'API.md',
    out: 'api.md',
    title: 'Library Interface',
    description: 'The recommended DTRExp library interface — fixed operation names, per-language casing.'
  },
  {
    src: 'VECTORS.md',
    out: 'vectors.md',
    title: 'Conformance Vectors',
    description: 'vectors.json explained — structure, conformance criteria, and how to wire it into an implementation.'
  },
  {
    src: 'CHANGELOG.md',
    out: 'changelog.md',
    title: 'Changelog',
    description: 'Draft-by-draft changes, each with its reasoning.'
  }
];

syncDocs({ root: resolve(here, '../..'), outDir, base: '/', files });

// --- post-pass ---------------------------------------------------------------
const route = (out) => `/${out.replace(/\.mdx?$/, '')}/`;
for (const { out } of files) {
  const target = resolve(outDir, out);
  let body = readFileSync(target, 'utf8');
  // Reference-style definitions between synced docs: `[label]: spec.md#anchor`.
  for (const f of files) {
    const re = new RegExp(
      `^(\\[[^\\]]+\\]:\\s*)(?:\\./)?${basename(f.src).replace(/\./g, '\\.')}(#\\S*)?\\s*$`,
      'gm'
    );
    body = body.replace(re, (_m, open, anchor = '') => `${open}${route(f.out)}${anchor}`);
  }
  // Links to repo files that have no site page → GitHub.
  for (const gh of ['vectors.json', 'LICENSE.md', 'CONTRIBUTING.md']) {
    body = body
      .split(`](${gh})`).join(`](${GH_BLOB}/${gh})`)
      .split(`](./${gh})`).join(`](${GH_BLOB}/${gh})`);
  }
  writeFileSync(target, body);
}
