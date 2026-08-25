# Data Grid Header New

Custom **two-level grouped header** layer for [Mendix](https://www.mendix.com/) **Data Grid 2**, rendered as an overlay via React Portal — plus an optional **sequence (running number) column**.

> Widget ID: `tbn.datagridheadernew.DataGridHeaderNew` · Version `2.1.0` · Platform: Web · License: Apache-2.0

## Features

- 🧩 **Two-level grouped header** — define parent groups and sub-headers with a simple comma-separated configuration; the widget renders cells with the correct `colspan` / `rowspan`.
- 🔃 **Sort indicators & select-all mirroring** — sort state (`aria-sort`) and the select-all checkbox are mirrored from the original grid; clicking a header cell forwards the click to the real Data Grid 2 sort button.
- 🎨 **Background color presets** — Default, Transparent, White, Gray, Light blue, Primary blue, Dark.
- 🔢 **Sequence running column** *(optional)*:
    - Configurable label (e.g. `No.`), position (column number) and width.
    - Numbers keep counting across pages — page size 10 + page 2 shows **11–20**.
    - In virtual scrolling / load-more mode numbering continues continuously as rows accumulate.
    - Column widths are kept perfectly aligned with the body by extending the grid's `--widgets-grid-template-columns` template.
- 🛡️ **Non-invasive** — never modifies Data Grid 2 internals; the original header stays functional in the DOM and can be visually hidden while remaining clickable for sorting.

## Requirements

- Mendix **11.x** (Data Grid 2 module)
- Node.js ≥ 16

## Usage

1. In Studio Pro, import the widget MPK into your app's `widgets/` folder (or use App Store / Marketplace deployment).
2. Place **Data Grid Header New** on a page that also contains a **Data Grid 2**.
3. Configure the properties:

### Data grid

| Property | Type | Default | Description |
|---|---|---|---|
| **DataGrid2 name** | string | — *(required)* | Name of the target Data Grid 2 widget, e.g. `dataGrid2_2`. |
| **Hide original header** | boolean | `true` | Visually hide the original DG2 header while keeping it functional in the DOM. |

### Sequence running column

| Property | Type | Default | Description |
|---|---|---|---|
| **Enable sequence running column** | boolean | `false` | Adds a running number column to the grid. |
| **Sequence column header** | string | `No.` | Header text of the sequence column. |
| **Sequence column position** | integer | `1` | 1-based column number where the sequence column is inserted (1 = first). Values larger than the number of columns place it last. |
| **Sequence column width (px)** | integer | `60` | Width in pixels of the sequence column. |

### Header configuration (CSV format)

The two-level header is configured with two comma-separated strings:

- **Header row 1** *(required)* — top-level group labels.
- **Header row 2** *(optional)* — sub-level labels. An empty cell means the cell above extends over it.

Example for a grid with columns `Name, Email, Price P1, Price P2, Price P3`:

```
Row 1:  Name,,Prices,,
Row 2:        ,Email,P1,P2,P3
```

Result: **Name** spans 1 column, **Email** spans 1 column, **Prices** spans 3 columns (`P1`, `P2`, `P3`).

Rules (run-based parser):

- A Row 1 label aligned with a non-empty run in Row 2 becomes a group parent (`colspan` = run length).
- An empty Row 1 cell extends the previous parent's `colspan`.
- Trailing commas in Row 1 count toward the children of the previous group.
- A leaf in Row 2 without a parent produces a validation error message.

> ℹ️ The configuration addresses **data columns only** — non-data columns such as the select-all checkbox, action buttons and the column selector are detected and skipped automatically.

### Appearance

| Property | Options |
|---|---|
| **Background color** | Default (light gray), Transparent, White, Gray, Light blue, Primary blue (white text), Dark (white text) |

## Demo project

_Coming soon._

## Issues, suggestions and feature requests

Please report issues via the repository's [issue tracker](../../issues).

## Development and contribution

1. Install NPM package dependencies:

   ```bash
   npm install
   # If you use NPM v7+, run instead:
   npm install --legacy-peer-deps
   ```

2. Available scripts:

   | Script | Purpose |
   |---|---|
   | `npm run dev` | Watch mode — bundles the widget and copies it into the test project's `deployment` / `widgets` folders on every change. |
   | `npm run build` | Production build. |
   | `npm start` | Start the dev server (configurable via `mendixHost` / `developmentPort` in `package.json`). |
   | `npm run lint` / `lint:fix` | ESLint checks / auto-fixes. |
   | `npm run release` | Lint + create the release MPK in `dist/<version>/`. |

3. Build output: `dist/<version>/tbn.DataGridHeaderNew.mpk`.

4. Deploying to a local Mendix app:
    - Copy the MPK into the app's `widgets/` folder — the runtime unpacks it at **startup** only.
    - To hot-update without restarting: copy `dist/tmp/widgets/tbn/<widget>/*` → `deployment/web/widgets/tbn/<widget>/`, then reload the browser.

5. Project structure:

   ```
   src/
     DataGridHeaderNew.tsx          # Main widget component (portals, effects)
     DataGridHeaderNew.xml          # Property schema (Studio Pro)
     components/
       GroupedHeader.tsx            # Two-level grouped header rendering
       Alert.tsx                    # Validation message display
     utils/
       headerParser.ts              # CSV config → rowspan/colspan model
       gridSync.ts                  # Grid lookup, template sync, MutationObserver,
                                    # aria-sort mirroring, click forwarding,
                                    # sequence cell injection
     ui/DataGridHeaderNew.css       # Styles
   typings/
     DataGridHeaderNewProps.d.ts    # Hand-maintained prop typings (match the XML)
   ```

## How it works (short version)

- The widget looks up the target Data Grid 2 by its widget name, then injects its own header through a **React Portal** positioned right after the grid toolbar.
- The original DG2 header is hidden with `display:none` (the only style that wins over Mendix's `display:contents` theming) but remains in the DOM so sort clicks keep working.
- When the sequence column is enabled, the table's inline `--widgets-grid-template-columns` is extended with an extra track and every body row gets an injected number cell — kept in sync across paging, sorting and virtual scrolling via a `MutationObserver`.
