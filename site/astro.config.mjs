// @ts-check
// Per-project Astro + Starlight config. The shared THEME comes from
// @onury/docs-kit via the CSS string paths in `customCss` below.
//
// NOTE: do NOT `import` from @onury/docs-kit here. It is ESM-only, and importing
// it into the Astro config makes Vite externalize @astrojs/starlight and load its
// TypeScript entry under Node, which fails on Node >=22.18.
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://dtrexp.org',
  base: "/",
  integrations: [
    starlight({
      title: "DTRExp",
      description: "Date-Time Range & Recurrence Expression — a compact string expression for describing \"when\", evaluated by coverage.",
      logo: {
        light: './src/assets/logo-text.svg',
        dark: './src/assets/logo-text-dark.svg',
        replacesTitle: true
      },
      social: [{ icon: 'github', label: 'GitHub', href: "https://github.com/DTRExp/dtrexp" }],
      // Shared <head> (Cloudflare Web Analytics beacon) — token lives in the kit.
      components: { Head: '@onury/docs-kit/components/Head.astro' },
      customCss: [
        '@onury/docs-kit/styles/custom.css',
        '@onury/docs-kit/styles/theme.css',
        './src/styles/overrides.css',
        './src/styles/hero.css'
      ],
      sidebar: [
        {
          label: 'Start Here',
          items: [
            { label: 'Getting Started', slug: 'getting-started' },
            { label: 'Why DTRExp', slug: 'why' }
          ]
        },
        {
          label: 'Specification',
          items: [
            { label: 'The Spec', slug: 'spec' },
            { label: 'Recurrence, Cleanly', slug: 'recurrence' },
            { label: 'Conformance Vectors', slug: 'vectors' },
            { label: 'Library Interface', slug: 'api' }
          ]
        },
        {
          label: 'Ecosystem',
          items: [
            { label: 'Implementations', slug: 'implementations' },
            { label: 'JavaScript / TypeScript', slug: 'javascript' },
            { label: 'WASM', slug: 'wasm' },
            { label: 'Python', slug: 'python' },
            { label: 'Go', slug: 'go' },
            { label: 'Rust', slug: 'rust' },
            { label: 'Swift', slug: 'swift' },
            { label: 'Java', slug: 'java' }
          ]
        },
        {
          label: 'Help',
          items: [{ label: 'Changelog', slug: 'changelog' }]
        }
      ]
    })
  ]
});
