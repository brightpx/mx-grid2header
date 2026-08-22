import { ReactElement } from "react";
import classNames from "classnames";

import { HeaderCell, HeaderLeaf, ParsedHeader } from "../utils/headerParser";
import { GridState, forwardClick, getSortState } from "../utils/gridSync";

export interface GroupedHeaderProps {
    parsed: ParsedHeader;
    gridState: GridState;
}

function SortIndicator({ sort }: { sort: "none" | "ascending" | "descending" }): ReactElement {
    if (sort === "ascending") {
        return <span className="widget-datagridheadernew-sort-arrow">▲</span>;
    }
    if (sort === "descending") {
        return <span className="widget-datagridheadernew-sort-arrow">▼</span>;
    }
    return <span className="widget-datagridheadernew-sort-arrow widget-datagridheadernew-sort-hidden">↕</span>;
}

function HeaderCellView({
    cell,
    gridState
}: {
    cell: HeaderCell;
    gridState: GridState;
}): ReactElement {
    const targetHeader = gridState.originalHeaders[cell.columnIndex];
    // Only leaf cells (rowspan=2) are sortable; group parents with children
    // must not trigger sorting of their first child column
    const sortable = !!targetHeader && cell.children.length === 0;
    const sort = sortable && targetHeader ? getSortState(targetHeader) : "none";

    return (
        <div
            className={classNames("widget-datagridheadernew-cell", {
                "widget-datagridheadernew-cell-sortable": sortable,
                [`widget-datagridheadernew-sorted-${sort}`]: sort !== "none"
            })}
            style={{
                gridColumn: `${cell.columnIndex + 1} / span ${cell.colspan}`,
                gridRow: `1 / span ${cell.rowspan}`
            }}
            role={sortable ? "button" : undefined}
            onClick={sortable ? () => forwardClick(targetHeader) : undefined}
        >
            <span className="widget-datagridheadernew-label">{cell.label}</span>
            {sortable && <SortIndicator sort={sort} />}
        </div>
    );
}

function LeafCellView({
    leaf,
    gridState
}: {
    leaf: HeaderLeaf;
    gridState: GridState;
}): ReactElement {
    const targetHeader = gridState.originalHeaders[leaf.columnIndex];
    const sort = targetHeader ? getSortState(targetHeader) : "none";
    const sortable = !!targetHeader;

    return (
        <div
            className={classNames("widget-datagridheadernew-cell", "widget-datagridheadernew-leaf", {
                "widget-datagridheadernew-cell-sortable": sortable,
                [`widget-datagridheadernew-sorted-${sort}`]: sort !== "none"
            })}
            style={{ gridColumn: `${leaf.columnIndex + 1}`, gridRow: "2" }}
            onClick={sortable ? () => forwardClick(targetHeader) : undefined}
        >
            <span className="widget-datagridheadernew-label">{leaf.label}</span>
            {sortable && <SortIndicator sort={sort} />}
        </div>
    );
}

export function GroupedHeader({ parsed, gridState }: GroupedHeaderProps): ReactElement {
    // Build row 2 leaves that are not covered by a rowspan=2 parent cell
    const coveredByParent = new Set<number>();
    for (const cell of parsed.row1) {
        if (cell.rowspan === 2) {
            coveredByParent.add(cell.columnIndex);
        }
    }

    const row2Leaves = parsed.row2.filter(leaf => !coveredByParent.has(leaf.columnIndex));

    // Blank filler cells keep the grid aligned with unconfigured DataGrid2 columns
    const configuredColumns = new Set<number>();
    for (const cell of parsed.row1) {
        for (let i = cell.columnIndex; i < cell.columnIndex + cell.colspan; i++) {
            if (cell.rowspan === 2 || !row2Leaves.some(l => l.columnIndex === i)) {
                configuredColumns.add(i);
            }
        }
    }
    const fillers: number[] = [];
    for (let i = 0; i < gridState.columnCount; i++) {
        if (!configuredColumns.has(i)) {
            fillers.push(i);
        }
    }

    return (
        <div className="widget-datagridheadernew-header">
            <div className="widget-datagridheadernew-row1">
                {parsed.row1.map((cell, index) => (
                    <HeaderCellView key={`${cell.label}-${index}`} cell={cell} gridState={gridState} />
                ))}
            </div>
            <div className="widget-datagridheadernew-row2">
                {row2Leaves.map((leaf, index) => (
                    <LeafCellView key={`${leaf.label}-${index}`} leaf={leaf} gridState={gridState} />
                ))}
                {fillers.map(columnIndex => (
                    <div
                        key={`filler-${columnIndex}`}
                        className="widget-datagridheadernew-cell widget-datagridheadernew-filler"
                        style={{ gridColumn: `${columnIndex + 1}`, gridRow: "1 / span 2" }}
                    />
                ))}
            </div>
        </div>
    );
}
