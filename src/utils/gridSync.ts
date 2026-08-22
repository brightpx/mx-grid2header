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
        return { columnCount: 0, templateColumns: "", originalHeaders: [] };
    }

    const computed = getComputedStyle(inner);
    const templateColumns = computed.getPropertyValue(TEMPLATE_VAR).trim();

    // Data Grid 2 renders a div-based grid: .widget-datagrid-grid-head > .tr > .th
    const headerCells = inner.querySelectorAll<HTMLElement>(
        ".widget-datagrid-grid-head [role='row'] > [role='columnheader']"
    );

    return {
        columnCount: headerCells.length,
        templateColumns,
        originalHeaders: Array.from(headerCells)
    };
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
