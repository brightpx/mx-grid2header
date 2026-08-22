export interface HeaderCell {
    /** Display text of the header cell */
    label: string;
    /** Number of grid columns this cell spans (row 1 cells only) */
    colspan: number;
    /** Number of header rows this cell spans (2 when it has no children) */
    rowspan: 1 | 2;
    /** Sub headers rendered in row 2 under this cell */
    children: HeaderLeaf[];
    /** Zero based index of the first DataGrid2 column covered by this cell */
    columnIndex: number;
}

export interface HeaderLeaf {
    label: string;
    columnIndex: number;
}

export interface ParsedHeader {
    row1: HeaderCell[];
    row2: HeaderLeaf[];
    /** Total number of configured columns (longest of the two rows) */
    totalColumns: number;
    valid: boolean;
    /** Set when the configuration is structurally invalid */
    error?: string;
}

/**
 * Parses the two comma separated configuration rows into a grouped header
 * structure with automatic rowspan/colspan calculation. Supports any number
 * of groups.
 *
 * Rules:
 * - A row 1 label aligned with a non-empty row 2 cell absorbs the whole run
 *   of consecutive non-empty row 2 cells as its children (colspan = run length).
 * - A row 1 label aligned with an empty row 2 cell has no children (rowspan = 2).
 * - An empty row 1 cell extends the previous parent cell's span; trailing
 *   placeholders beyond row 2 are ignored.
 */
export function parseHeaderConfig(row1Config: string, row2Config: string): ParsedHeader {
    const row1Cells = splitCsv(row1Config);
    const row2Cells = splitCsv(row2Config);
    const totalColumns = Math.max(row1Cells.length, row2Cells.length);

    const row1: HeaderCell[] = [];
    const row2: HeaderLeaf[] = [];

    let colIndex = 0;
    for (let i = 0; i < row1Cells.length; i++) {
        const label = row1Cells[i];

        if (label === "") {
            if (colIndex < row2Cells.length && row1.length > 0) {
                row1[row1.length - 1].colspan++;
            }
            colIndex++;
            continue;
        }

        const cell: HeaderCell = { label, colspan: 1, rowspan: 2, children: [], columnIndex: colIndex };
        row1.push(cell);

        if (colIndex < row2Cells.length && row2Cells[colIndex] !== "") {
            const runStart = colIndex;
            while (colIndex < row2Cells.length && row2Cells[colIndex] !== "") {
                const leaf: HeaderLeaf = { label: row2Cells[colIndex], columnIndex: colIndex };
                row2.push(leaf);
                cell.children.push(leaf);
                colIndex++;
            }
            cell.colspan = colIndex - runStart;
            cell.rowspan = 1;
        } else {
            colIndex++;
        }
    }

    // A leaf must always sit under a parent cell; otherwise the two rows are misaligned
    const orphan = row2.find(leaf => !findParentAt(row1, leaf.columnIndex));
    if (orphan) {
        return {
            row1,
            row2,
            totalColumns,
            valid: false,
            error: `GroupedHeader: header row 2 value '${orphan.label}' has no matching parent cell in row 1 (check trailing commas)`
        };
    }

    return { row1, row2, totalColumns, valid: true };
}

function findParentAt(row1: HeaderCell[], columnIndex: number): HeaderCell | undefined {
    return row1.find(
        cell => columnIndex >= cell.columnIndex && columnIndex < cell.columnIndex + cell.colspan
    );
}

function splitCsv(config: string): string[] {
    if (!config) {
        return [];
    }
    return config.split(",").map(value => value.trim());
}
