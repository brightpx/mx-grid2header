import { ParsedHeader } from "./headerParser";

export const TEMPLATE_VAR = "--widgets-grid-template-columns";
export const GRID_SELECTOR = ".widget-datagrid-grid";

export interface GridState {
    /** Number of visible columns in the DataGrid2 body */
    columnCount: number;
    /** CSS grid-template-columns value of the DataGrid2 grid */
    templateColumns: string;
    /** Original header cells, one per visible column */
    originalHeaders: HTMLElement[];
    /** Column indexes whose header holds the select-all checkbox */
    selectColumns: number[];
    /** Number of body rows currently rendered (grows in load more / virtual scrolling) */
    rowCount: number;
}

export interface PagingState {
    /** Zero based index of the current page (buttons mode) */
    pageIndex: number;
    /** Number of rows per page as configured on the DataGrid2 */
    pageSize: number;
    /** True when the grid uses virtual scrolling or load more pagination */
    isLimitBased: boolean;
}

export function findGrid(gridName: string): HTMLElement | null {
    return document.querySelector(`.mx-name-${gridName}`);
}

export function findGridInner(gridElement: HTMLElement): HTMLElement | null {
    return gridElement.querySelector<HTMLElement>(GRID_SELECTOR);
}

/**
 * Creates (or reuses) the container that hosts the custom header, inserted
 * directly below the .widget-datagrid-header toolbar inside the grid.
 */
export function ensureHeaderContainer(gridElement: HTMLElement): HTMLElement {
    let container = gridElement.querySelector<HTMLElement>(".widget-datagridheadernew-portal");
    if (!container || !container.isConnected) {
        container = document.createElement("div");
        container.className = "widget-datagridheadernew-portal";
        const anchor = gridElement.querySelector(".widget-datagrid-header");
        if (anchor && anchor.parentElement) {
            anchor.parentElement.insertBefore(container, anchor.nextSibling);
        } else {
            gridElement.prepend(container);
        }
    }
    return container;
}

export function readGridState(gridElement: HTMLElement): GridState {
    const inner = findGridInner(gridElement);
    if (!inner) {
        return { columnCount: 0, templateColumns: "", originalHeaders: [], selectColumns: [], rowCount: 0 };
    }

    const computed = getComputedStyle(inner);
    // When the sequence column override is active the inline variable holds
    // the extended value; report the original base so extensions are not
    // applied twice
    const originalTemplate = inner.dataset.dgihnOriginalTemplate;
    const templateColumns = originalTemplate ?? computed.getPropertyValue(TEMPLATE_VAR).trim();

    // Data Grid 2 renders a div-based grid: .widget-datagrid-grid-head > .tr > .th
    const headerCells = inner.querySelectorAll<HTMLElement>(
        ".widget-datagrid-grid-head [role='row'] > [role='columnheader']"
    );

    // Columns whose header holds the select-all checkbox (th.widget-datagrid-col-select)
    const selectColumns: number[] = [];
    headerCells.forEach((cell, index) => {
        if (cell.classList.contains("widget-datagrid-col-select")) {
            selectColumns.push(index);
        }
    });

    // Body rows grow when load more / virtual scrolling appends pages
    const rowCount = inner.querySelectorAll<HTMLElement>(".widget-datagrid-grid-body > .tr").length;

    return {
        columnCount: headerCells.length,
        templateColumns,
        originalHeaders: Array.from(headerCells),
        selectColumns,
        rowCount
    };
}

/**
 * Copies the current checked/indeterminate state of the original select-all
 * checkbox so our mirrored checkbox always reflects the real grid state.
 */
export function readSelectState(originalHeader: HTMLElement): {
    checked: boolean;
    indeterminate: boolean;
} {
    const checkbox = originalHeader.querySelector<HTMLInputElement>("input[type='checkbox']");
    return {
        checked: !!checkbox?.checked,
        indeterminate: !!checkbox?.indeterminate
    };
}

/**
 * Forwards a click to the original select-all checkbox. React listens for the
 * change event on it, so we set its state and dispatch "click" (which makes
 * React toggle + fire change), then let DG2 update row selection.
 */
export function forwardSelectClick(originalHeader: HTMLElement): void {
    const checkbox = originalHeader.querySelector<HTMLInputElement>("input[type='checkbox']");
    if (checkbox) {
        checkbox.click();
    }
}

export function getSortState(headerCell: HTMLElement): "none" | "ascending" | "descending" {
    const ariaSort = headerCell.getAttribute("aria-sort");
    if (ariaSort === "ascending" || ariaSort === "descending") {
        return ariaSort;
    }
    return "none";
}

export function forwardClick(originalHeader: HTMLElement): void {
    // DG2 handles sorting on the inner .column-header button, not the .th wrapper
    const sortButton = originalHeader.querySelector<HTMLElement>(".column-header");
    (sortButton ?? originalHeader).dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

/**
 * Validates the parsed configuration against the actual visible columns.
 * Returns an error message when the configuration cannot be rendered safely.
 */
export function validateConfig(parsed: ParsedHeader, actualColumns: number): string | null {
    if (parsed.totalColumns > actualColumns) {
        return "GroupedHeader: configured columns exceed visible DataGrid2 columns";
    }
    return null;
}

/**
 * Reads the current pagination state from the DataGrid2 footer/top bar.
 *
 * - Buttons mode renders a `.paging-status` element like "11 to 20 of 100",
 *   which gives us both page size and current page directly.
 * - Virtual scrolling / load more have no such status; rows accumulate in the
 *   DOM, so the running number simply continues row by row.
 */
export function readPagingState(gridElement: HTMLElement): PagingState {
    const inner = findGridInner(gridElement);
    if (!inner) {
        return { pageIndex: 0, pageSize: 0, isLimitBased: false };
    }

    const root = gridElement.querySelector<HTMLElement>(".widget-datagrid") ?? gridElement;
    const status = root.querySelector<HTMLElement>(".paging-status");
    const text = status?.textContent ?? "";
    const match = text.match(/(\d+)\s*(?:-|to|–|—)\s*(\d+)/i);
    if (match) {
        const first = parseInt(match[1], 10);
        const pageSize = parseInt(match[2], 10) - first + 1;
        return {
            pageIndex: Math.floor((first - 1) / Math.max(pageSize, 1)),
            pageSize,
            isLimitBased: false
        };
    }

    // No paging status rendered: virtual scrolling / load more / custom paging.
    // Rows accumulate in the DOM so numbers keep counting continuously.
    return { pageIndex: 0, pageSize: 0, isLimitBased: true };
}

/**
 * Inserts or removes the sequence number cells in every body row. Cells are
 * plain DOM nodes managed outside React because Data Grid 2 re-renders its
 * own rows; a MutationObserver keeps them in sync.
 */
export function syncSequenceCells(
    gridElement: HTMLElement,
    options: { enabled: boolean; position: "first" | "last"; width: number; startIndex: number }
): void {
    const inner = findGridInner(gridElement);
    if (!inner) {
        return;
    }

    // Remove all previously injected cells when disabled
    if (!options.enabled) {
        removeSequenceCells(inner);
        return;
    }

    const body = inner.querySelector<HTMLElement>(".widget-datagrid-grid-body");
    if (!body) {
        return;
    }
    
    const rows = Array.from(body.querySelectorAll<HTMLElement>(":scope > .tr"));
    rows.forEach((row, rowIndex) => {
        let cell = row.querySelector<HTMLElement>(":scope > .widget-datagridheadernew-seq-cell");
        if (!cell) {
            cell = document.createElement("div");
            cell.className = "td widget-datagridheadernew-seq-cell";
            cell.setAttribute("role", "gridcell");
            cell.setAttribute("aria-hidden", "true");
            cell.textContent = String(options.startIndex + rowIndex + 1);
            if (options.position === "first") {
                row.insertBefore(cell, row.firstChild);
            } else {
                row.appendChild(cell);
            }
        } else {
            // Keep position and text up to date when DG2 re-renders rows
            if (options.position === "first" && cell !== row.firstElementChild) {
                row.insertBefore(cell, row.firstChild);
            } else if (options.position === "last" && cell !== row.lastElementChild) {
                row.appendChild(cell);
            }
            const expected = String(options.startIndex + rowIndex + 1);
            if (cell.textContent !== expected) {
                cell.textContent = expected;
            }
        }
        cell.style.width = `${options.width}px`;
    });
}

function removeSequenceCells(scope: HTMLElement): void {
    scope.querySelectorAll(".widget-datagridheadernew-seq-cell").forEach(cell => cell.remove());
}

/**
 * Adds (or removes) an extra grid track for the sequence column directly on
 * the DataGrid2 table element. All body rows are display:contents children of
 * the table grid, so the injected sequence cells only line up when the
 * --widgets-grid-template-columns variable itself gains the extra track —
 * setting gridTemplateColumns on the header portal alone is not enough and
 * would push the last real cell of every row onto a new line.
 *
 * The original value is stored in a data attribute so it can be restored
 * when the feature is disabled or the widget unmounts. The function is
 * idempotent and tolerates DG2 rewriting its own inline style.
 */
export function applySequenceTemplateColumns(
    gridElement: HTMLElement,
    enabled: boolean,
    position: "first" | "last",
    width: number
): void {
    const inner = findGridInner(gridElement);
    if (!inner) {
        return;
    }

    const current = inner.style.getPropertyValue(TEMPLATE_VAR).trim();
    const savedBase = inner.dataset.dgihnOriginalTemplate;

    if (!enabled || !current) {
        if (savedBase !== undefined) {
            if (current !== savedBase) {
                inner.style.setProperty(TEMPLATE_VAR, savedBase);
            }
            delete inner.dataset.dgihnOriginalTemplate;
            delete inner.dataset.dgihnSeqTrack;
        }
        return;
    }

    // Base template = the original DG2 value (before our override)
    let base = current;
    if (savedBase !== undefined) {
        base = savedBase;
        const extendedNow = extendTemplateColumns(savedBase, true, position, width);
        if (extendedNow && current !== extendedNow && current !== savedBase) {
            // DG2 changed its own template while we hold an override —
            // adopt the new value as the new base
            base = current;
            inner.dataset.dgihnOriginalTemplate = current;
        }
    } else {
        inner.dataset.dgihnOriginalTemplate = current;
    }

    const extended = extendTemplateColumns(base, true, position, width);
    if (extended && current !== extended) {
        inner.style.setProperty(TEMPLATE_VAR, extended);
    }
    inner.dataset.dgihnSeqTrack = `${position}-${width}`;
}

/**
 * Extends the grid template columns CSS variable with an extra track for the
 * sequence column. Returns null when no extra track is needed.
 */
export function extendTemplateColumns(
    templateColumns: string,
    enabled: boolean,
    position: "first" | "last",
    width: number
): string | null {
    if (!enabled || !templateColumns) {
        return null;
    }
    const track = ` ${width}px`;
    return position === "first" ? `${width}px ${templateColumns}` : `${templateColumns}${track}`;
}

export function applyHiddenHeaderStyle(gridElement: HTMLElement, hidden: boolean): void {
    const inner = findGridInner(gridElement);
    if (!inner) {
        return;
    }
    const head = inner.querySelector<HTMLElement>(".widget-datagrid-grid-head");
    if (head) {
        // Mendix styles the head as display:contents, so it generates no box and
        // its .tr children become grid items occupying the first row track.
        // display:none wins over display:contents, hides the whole subtree, and
        // keeps the DOM intact for sort-click forwarding.
        head.style.display = hidden ? "none" : "";
    }
}
