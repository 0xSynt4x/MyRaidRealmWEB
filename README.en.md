# 1980s-NW Standalone

**English** | [简体中文](./README.md)

`1980s-NW` (MyRaidRealm) is a **browser-only AI text role-play / world-simulation** project: a self-contained web page that handles reply generation, variable updates, message history, saves, and local content management in-page. Running it in production **requires no external tools and no external runtime scripts**.

The build output is the whole `dist/` directory. Inside it, `index.html` has **JS and CSS fully inlined** (no external script or style requests), but images, audio, and the preset package are **not** inlined — they sit beside it as relative paths under `dist/assets/` and `dist/preset-package/`. So the **only supported distribution is deploying the whole directory online**; shipping `index.html` alone means missing images and no starting presets. Players visit the online URL and configure the API, choose a starting preset, begin a session, send messages, auto-update game variables, and save/import game states in the page.

## Features

- **Standalone**: A pure front-end build with no backend and no framework injection — just open the online URL in a browser.
- **Built-in API configuration**: Fill in an OpenAI-compatible endpoint (URL / Key / model) in-page to drive both narration and variable updates.
- **Rich starting presets**: About 38 world-setting presets + 21 Workshop world packs (apocalypse, cultivation, officialdom, Game of Thrones, Marvel, Naruto, Gaokao simulator, and more).
- **AI opening setup**: Fill in the key details of your world and character, then let AI generate the opening setup in one click.
- **Variable-driven simulation**: Maintains structured state for characters, NPCs, business, and factions via a local `stat_data` + `<JSONPatch>`.
- **Local supplementary content / worldbooks**: Inject rules and world material by target (narration model / variable model / both).
- **Built-in mini-game**: A dice (Farkle) gameplay panel.
- **Save management**: Browser local storage + JSON import/export.
- **Internationalization**: Ships with `zh-CN` (default) and `en` UI languages.

## Tech Stack

- **UI framework**: Vue 3 (`<script setup>` single-file components)
- **State management**: Pinia
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 + PostCSS + Sass
- **Validation**: Zod
- **Graph/visualization**: vis-network / vis-data
- **Templating**: EJS (browser runtime)
- **Build**: Webpack 5, outputting the inlined single file `dist/index.html`
- **Package manager**: pnpm (requires Node 18+; verified with Node 24 / pnpm 11)

## Quick Start

```bash
# 1. Install dependencies (this directory is the sub-project root)
pnpm install

# 2. Production build -> generates dist/index.html
pnpm build

# 3. Local development (development mode + watch rebuild)
pnpm watch
```

Available scripts (see `package.json`):

| Command          | Description                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm build`     | Production build; produces `dist/` (`index.html` + `assets/` + `preset-package/`)                 |
| `pnpm build:dev` | One-off development-mode build (for debugging)                                                    |
| `pnpm watch`     | Development mode + `--watch`; rebuilds on change                                                  |
| `pnpm typecheck` | Full type check via `vue-tsc` (0 errors)                                                          |
| `pnpm lint`      | Run ESLint (0 errors; warnings are known tech debt)                                               |
| `pnpm format`    | Format with Prettier (existing code is not fully formatted; prefer running only on changed files) |

After the build you can **preview locally**: serve the whole `dist/` directory with a static server (opening `index.html` on its own gives missing images and no presets). See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the development workflow.

## Production Entry Points

- Deployment entry: `dist/` (whole directory)
- HTML template: `src/index.html`
- Source entry: `src/index.ts`
- Build config: `webpack.1980s-nw-standalone.config.ts`
- Build command: run `pnpm build` in this directory
- Local dev command: run `pnpm watch` in this directory (development-mode watch rebuild)

The built `dist/` directory is deployed to Cloudflare Pages as the online page players visit. Within the page, players configure the API, choose presets, start a session, send messages, auto-update variables, and save/import game states.

## Directory Structure

```
1980s-NW/
├─ src/                     # Web source (standalone main flow)
│  ├─ index.ts / index.html # App entry and HTML template
│  ├─ App.vue               # Root component
│  ├─ components/           # UI components
│  │  ├─ layout/            # Layout (Header, sidebars, main area, panels)
│  │  ├─ panels/            # Feature panels (character, business, faction, lottery, settings…)
│  │  ├─ setup/             # Setup wizard (preset select, workshop, AI generate)
│  │  ├─ config/            # World/player/business/faction config
│  │  ├─ game/              # Dice mini-game components
│  │  └─ common/            # Shared components
│  ├─ stores/               # Pinia state (messages, settings, statData…)
│  ├─ composables/          # Composition functions
│  ├─ presets/              # Starting preset definitions (incl. ws/ world-pack JSON)
│  ├─ assets/               # standalone local content, worldbooks, registry
│  ├─ utils/                # Runtime/standalone utility functions
│  ├─ game/                 # Farkle dice game engine
│  └─ i18n/                 # Internationalization (zh-CN / en)
├─ runtime/                 # Standalone runtime (Provider, turn, state, prompts)
├─ schema/                  # Variable/data-structure schema (schema.ts / schema.json)
├─ preset-package/          # Preset package entry (attached globally for runtime loading)
├─ assets-design/           # Design drafts and raw preset JSON (not part of the build)
├─ docs/                    # Plan, progress, and snapshot docs
├─ scripts/tests/           # Test scripts
├─ dist/                    # Build output (index.html, git-ignored)
└─ webpack.1980s-nw-standalone.config.ts
```

## Preset Delivery

Starting presets are not bundled into `dist/index.html`; instead they are dynamically loaded at runtime from an external preset-package script.

- Preset source definitions: `src/presets/`, aggregated into `PRESETS` in `presets/index.ts`.
- Preset package entry: `preset-package/index.ts`, which attaches `PRESETS` to the global `window.__TH1980S_PRESETS__`.
- Loading logic: `src/utils/preset-loader.ts` injects a `<script>` at runtime to load the preset package.

The preset package is **deployed together with `dist/`** and loaded only from the project's own artifacts — it **does not depend on any external CDN**. `preset-loader.ts` tries three candidate URLs in order:

1. Relative path `../preset-package/index.js` (when the page is deployed at the root)
2. Local dev server `http://127.0.0.1:5500/dist/1980s/preset-package/index.js`
3. The project's own Cloudflare Pages absolute address (fallback when the page moves to a sub-path)

Note: presets depend entirely on the project's own artifacts; if the preset package is not deployed or the path is wrong, the page cannot load starting presets.
**After changing presets you must rebuild and redeploy the preset package**; rebuilding only the main artifact has no effect.

## Multiplayer

Multiplayer requires a dedicated server, so it is not provided in the current version.

## Local Content & Worldbook Strategy

The standalone version adopts the current local-content model: explicitly enabled entries, injected by send target.

- `main`: sent only to the narration model
- `variable_update`: sent only to the variable-update model
- `shared`: sent to both

Worldbook injection uses a local-content model: explicitly enabled entries injected by send target. Entries are injected whole, with no keyword filtering. The "worldbook" concept maps to one type of "local supplementary content".

Currently active assets live in:

- `src/assets/standalone-local-content/`: general prompts, variable-update rules, lottery, text-to-image rules, etc.
- `src/assets/standalone-worldbooks/`: preset world material built into the standalone version
- `src/assets/worldbook-registry/index.ts`: links built-in presets to their corresponding world material

## Legacy Preset Compatibility

New, edited, and exported presets all use `localContentEntries`.

If an old preset still contains a `worldbookEntries` field, importing will automatically attempt to migrate it to `localContentEntries`. This is a compatibility entry for reading old files, not a new data format for new projects.

## Variable Updates

Variable updates are handled by the local `stat_data`, `<JSONPatch>`, and the runtime pipeline, with no global object involved.

The production rules live in:

- `src/assets/standalone-local-content/variable-update-rules.txt`
- `src/assets/standalone-local-content/variable-update-format.txt`

The chain-of-thought template is folded into the `<Analysis>` section and is not loaded as a separate rule entry.

## Save Strategy

Saves live in the browser's **IndexedDB**, with support for multiple save slots and JSON import/export.

Session, messages, variable snapshots and save payloads — everything that grows as the game progresses —
goes into IndexedDB; small configuration such as settings, volume and UI preferences stays in localStorage.
The reason is that localStorage is capped at a hard 5MB and can hit that limit after a round or two,
while IndexedDB's quota scales with available disk space.

Existing local data is migrated automatically at startup, with no manual action required.
