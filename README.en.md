# 1980s-NW Standalone

**English** | [简体中文](./README.md)

`1980s-NW` (MyRaidRealm) is a **browser-only AI text role-play / world-simulation** project. It fully migrates gameplay that originally ran inside SillyTavern into a self-contained web page: running it in production **requires no SillyTavern installation and no tavern scripts**.

The build output is a **self-contained single file** `dist/index.html` (with JS/CSS fully inlined). Users simply open this file in a browser to configure the API, choose a starting preset, begin a session, send messages, auto-update game variables, and save/import game states.

## Features

- **Standalone**: A single HTML file — double-click to open. No backend, no framework injection required.
- **Built-in API configuration**: Fill in an OpenAI-compatible endpoint (URL / Key / model) in-page to drive both narration and variable updates.
- **Rich starting presets**: About 38 world-setting presets + 21 Workshop world packs (apocalypse, cultivation, officialdom, Game of Thrones, Marvel, Naruto, Gaokao simulator, and more).
- **Custom setup wizard**: Step-by-step configuration of world time, society, identity, currency, factions, business, etc., or generate a world with AI in one click.
- **Variable-driven simulation**: Maintains structured state for characters, NPCs, business, and factions via a local `stat_data` + `<JSONPatch>`, independent of MVU.
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

| Command | Description |
| --- | --- |
| `pnpm build` | Production build; produces the self-contained `dist/index.html` |
| `pnpm build:dev` | One-off development-mode build (for debugging) |
| `pnpm watch` | Development mode + `--watch`; rebuilds on change |

After the build, open `dist/index.html` in a browser to use it.

## Production Entry Points

- Release entry: `dist/index.html`
- HTML template: `src/index.html`
- Source entry: `src/index.ts`
- Build config: `webpack.1980s-nw-standalone.config.ts`
- Build command: run `pnpm build` in this directory
- Local dev command: run `pnpm watch` in this directory (development-mode watch rebuild)

The built `dist/index.html` is the standalone web page users open. Within the page, users configure the API, choose presets, start a session, send messages, auto-update variables, and save/import game states.

## Directory Structure

```
1980s-NW/
├─ src/                     # Web source (standalone main flow)
│  ├─ index.ts / index.html # App entry and HTML template
│  ├─ App.vue               # Root component
│  ├─ components/           # UI components
│  │  ├─ layout/            # Layout (Header, sidebars, main area, panels)
│  │  ├─ panels/            # Feature panels (character, business, faction, lottery, settings…)
│  │  ├─ setup/             # Setup wizard (preset select, custom wizard, AI generate)
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
├─ legacy-reference/        # Legacy tavern script references (archive only, not an entry)
├─ docs/                    # Plan, progress, and snapshot docs
├─ scripts/tests/           # Test scripts
├─ dist/                    # Build output (index.html, git-ignored)
└─ webpack.1980s-nw-standalone.config.ts
```

## Release Boundary

The production standalone build depends only on the web source, runtime code, and standalone assets.

Content that enters the standalone web main flow:

- `src/`
- `runtime/`
- `schema/schema.ts`
- `dist/index.html` and its sibling build artifacts
- `src/assets/standalone-local-content/`
- `src/assets/standalone-worldbooks/`
- `src/assets/worldbook-registry/`

Content that should NOT be loaded as a standalone entry:

- `legacy-reference/assistant-api/` (formerly `脚本/辅助API(Legacy)/`)
- `legacy-reference/variable-schema/` (formerly `脚本/变量结构(Legacy)/`)

These directories are references from the old tavern project; their capabilities have been replaced by in-page implementations and are not part of the standalone HTML main flow. Reply generation, auxiliary variable updates, message history, saves, and local content management are all handled inside the web page.

`preset-package/` (formerly `脚本/预设包/`) is NOT on the "do not load" list above: it is the runtime source of presets — see the "Preset Delivery" section below.

`package.json` is kept in this directory to give the build tooling a clear sub-project boundary and prevent the root build from mistakenly scanning legacy reference directories as entries; it does not mean the standalone version still depends on the tavern.

## Preset Delivery

Starting presets are not bundled into `dist/index.html`; instead they are dynamically loaded at runtime from an external preset-package script.

- Preset source definitions: `src/presets/`, aggregated into `PRESETS` in `presets/index.ts`.
- Preset package entry: `preset-package/index.ts`, which attaches `PRESETS` to the global `window.__TH1980S_PRESETS__`.
- Loading logic: `src/utils/preset-loader.ts` injects a `<script>` at runtime to load the preset package.

In production, the preset package is served from a single CDN shared by both the standalone and tavern versions, so it is maintained once and updated in sync. `preset-loader.ts` tries candidate URLs in order; local relative paths and local dev addresses are optional fallbacks, with the CDN as the source of truth.

Note: because presets fully depend on that CDN address, if the CDN is unavailable or the network is down, the page will be unable to load starting presets. This is a deliberate current trade-off.

## Multiplayer

Multiplayer is not provided in the standalone version due to the lack of a dedicated server. The related legacy tavern multiplayer scripts have been removed from this directory.

## Local Content & Worldbook Strategy

The standalone version adopts the current local-content model: explicitly enabled entries, injected by send target.

- `main`: sent only to the narration model
- `variable_update`: sent only to the variable-update model
- `shared`: sent to both

It does not fully replicate SillyTavern's worldbook mechanics such as keyword triggers, insertion depth, or recursive triggering. The old "worldbook" concept maps to one type of "local supplementary content" in the standalone version.

Currently active assets live in:

- `src/assets/standalone-local-content/`: general prompts, variable-update rules, lottery, text-to-image rules, etc.
- `src/assets/standalone-worldbooks/`: preset world material migrated into the standalone version
- `src/assets/worldbook-registry/index.ts`: links built-in presets to their corresponding world material

## Legacy Preset Compatibility

New, edited, and exported presets all use `localContentEntries`.

If an old preset still contains a `worldbookEntries` field, importing will automatically attempt to migrate it to `localContentEntries`. This is a compatibility entry for reading old files, not a new data format for new projects.

## Variable Updates

The standalone version does not use the MVU global object. Variable updates are handled by the local `stat_data`, `<JSONPatch>`, and the standalone run pipeline.

The production rules live in:

- `src/assets/standalone-local-content/variable-update-rules.txt`
- `src/assets/standalone-local-content/variable-update-format.txt`

The old chain-of-thought template has been folded into the `<Analysis>` section and is no longer loaded as a separate rule entry.

## Save Strategy

For now, the browser local-storage save plus JSON import/export approach is kept as a short-term solution.

If large long-term saves are needed later, consider IndexedDB, compression, or reducing debug-info size.
