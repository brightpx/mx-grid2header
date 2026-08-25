## DataGridHeaderNew
Custom two-level grouped header for Mendix Data Grid 2, rendered as an overlay via React Portal — plus an optional sequence (running number) column.

## Features
- Two-level grouped header with configurable column labels
- Sort indicators and select-all mirroring from the original grid
- Background color presets
- **Sequence running column** (optional):
    - Configurable label (e.g. `No.`), position (first/last) and column width
    - Numbers run across all rows: page size 10 + page 2 shows 11–20
    - In virtual scrolling / load more mode numbering continues continuously

## Usage
[step by step instructions]

## Demo project
[link to sandbox]

## Issues, suggestions and feature requests
[link to GitHub issues]

## Development and contribution

1. Install NPM package dependencies by using: `npm install`. If you use NPM v7.x.x, which can be checked by executing `npm -v`, execute: `npm install --legacy-peer-deps`.
1. Run `npm start` to watch for code changes. On every change:
    - the widget will be bundled;
    - the bundle will be included in a `dist` folder in the root directory of the project;
    - the bundle will be included in the `deployment` and `widgets` folder of the Mendix test project.

[specify contribution]
