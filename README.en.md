# 1980s-NW Standalone

**English** | [简体中文](./README.md)

`1980s-NW` (MyRaidRealm) is a **browser-only general-purpose management & narrative simulation platform** — any setting goes (modern, historical, cultivation, fantasy, sci-fi, anime…). Players configure an API, pick a starting preset and send messages in the page; reply generation, variable updates, saves and local content management all happen in the browser, with **no external tools to install**.

The build output is the whole `dist/` directory: `index.html` has its JS and CSS fully inlined, while images, audio and the preset package sit beside it as relative paths under `dist/assets/` and `dist/preset-package/`. So the **only supported distribution is deploying the whole directory online** — shipping `index.html` alone means missing images and no starting presets. The project-root `functions/` holds the only server-side code (Cloudflare Pages Functions; a same-origin relay so third-party APIs without CORS still work).

## Features

- **Standalone** — a pure front-end build; just open the online URL in a browser.
- **Built-in API configuration** — fill in an OpenAI-compatible endpoint (URL / key / model) in-page to drive narration and variable updates.
- **Rich starting presets** — about 38 world-setting presets + 21 Workshop world packs, plus AI-generated openings.
- **Variable-driven simulation** — local `stat_data` + `<JSONPatch>` maintain structured state for characters, NPCs, business and factions, with autosave every turn.
- **Narration enhancements** — concurrent multi-candidate pages with floor paging, a separate review-and-revise pipeline, and slash shortcuts in the input bar.
- **Local supplementary content / worldbooks** — inject rules and world material by target (narration model / variable model / both).
- **Web map** — the model generates the location tree; layout and road network are computed in the front end.
- **Built-in mini-game** — a dice (Farkle) gameplay panel.
- **Save management** — multiple slots in browser IndexedDB + JSON import/export.
- **Internationalization** — ships with `zh-CN` (default) and `en` UI languages.

## Tech Stack

Vue 3 (`<script setup>` SFCs) · Pinia · TypeScript 5 · Tailwind CSS v4 + PostCSS + Sass · Zod · vis-network / vis-data · EJS (browser runtime) · Webpack 5 · pnpm (requires Node 18+; verified with Node 24 / pnpm 11)

## Quick Start

```bash
pnpm install   # install dependencies
pnpm build     # production build -> dist/ (index.html + assets/ + preset-package/)
pnpm watch     # development mode + watch rebuild
```

Common scripts: `pnpm typecheck` (full `vue-tsc` check) · `pnpm lint` · `pnpm format` · `pnpm test` · `pnpm check:i18n` (run after editing language files).

To **preview locally after a build, serve the whole `dist/` directory** with a static server — opening `index.html` on its own gives missing images and no presets.

## Documentation

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — dev environment, pre-commit checks, code style, deployment
- [`spec/README.md`](./spec/README.md) — **engineering spec index**: architecture, build & deploy, UI system, prompt pipeline, worldbooks, presets, variables & saves, image generation, CI, known issues
- [`AGENTS.md`](./AGENTS.md) — working guidelines for AI coding agents
- [`CHANGELOG.md`](./CHANGELOG.md) — release notes

## Directory Structure

```text
src/              web source (components / stores / composables / presets / assets / utils / i18n)
runtime/          standalone runtime (provider, turns, state, prompts)
schema/           variable & data-structure schema
preset-package/   preset package entry, attached to window.__TH1980S_PRESETS__
functions/        Cloudflare Pages Functions (the only server-side code: same-origin relay)
scripts/          test and i18n check scripts
spec/             engineering spec (committed with the repo)
dist/             build output (git-ignored)
```

## Deployment

Run `pnpm build`, then deploy the whole `dist/` directory to Cloudflare Pages — that becomes the online page players visit, with `functions/` active alongside it. **After changing presets you must redeploy the preset package too**; rebuilding only the main artifact has no effect.
