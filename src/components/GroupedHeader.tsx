import { ReactElement, useEffect, useState } from "react";
import classNames from "classnames";

import { HeaderCell, HeaderLeaf, ParsedHeader } from "../utils/headerParser";
import {
    GridState,
    forwardClick,
    forwardSelectClick,
    getSortState,
    readSelectState,
    resolveSequenceTrackIndex
} from "../utils/gridSync";

export interface GroupedHeaderProps {
    parsed: ParsedHeader;
    gridState: GridState;
    sequenceEnabled?: boolean;
    sequenceLabel?: string;
    /** 1-based column number where the sequence column is inserted */
    sequencePosition?: number;
    /** Row number of the first visible row (0 based offset for the running numbers) */
    sequenceStartIndex?: number;
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
    gridState,
    sequenceTrack
}: {
    cell: HeaderCell;
    gridState: GridState;
    /** Zero-based track index of the sequence column, -1 when disabled */
    sequenceTrack: number;
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
                gridColumn: `${cell.columnIndex + 1 + (cell.columnIndex >= sequenceTrack ? 1 : 0)} / span ${cell.colspan}`,
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
    gridState,
    sequenceTrack
}: {
    leaf: HeaderLeaf;
    gridState: GridState;
    /** Zero-based track index of the sequence column, -1 when disabled */
    sequenceTrack: number;
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
            style={{ gridColumn: `${leaf.columnIndex + 1 + (leaf.columnIndex >= sequenceTrack ? 1 : 0)}`, gridRow: "2" }}
            onClick={sortable ? () => forwardClick(targetHeader) : undefined}
        >
            <span className="widget-datagridheadernew-label">{leaf.label}</span>
            {sortable && <SortIndicator sort={sort} />}
        </div>
    );
}

/** Header cell of the sequence running column */
function SequenceHeaderCell({ label, track }: { label: string; track: number }): ReactElement {
    return (
        <div
            className="widget-datagridheadernew-cell widget-datagridheadernew-seq-header"
            style={{
                gridColumn: `${track + 1} / span 1`,
                gridRow: "1 / span 2"
            }}
        >
            <span className="widget-datagridheadernew-label">{label}</span>
        </div>
    );
}

/** Mirrors the original select-all checkbox: real state + click forwarding */
function SelectAllCell({
    columnIndex,
    gridState,
    sequenceTrack
}: {
    columnIndex: number;
    gridState: GridState;
    /** Zero-based track index of the sequence column, -1 when disabled */
    sequenceTrack: number;
}): ReactElement {
    const originalHeader = gridState.originalHeaders[columnIndex];
    const [tick, setTick] = useState(0);
    const state = readSelectState(originalHeader);

    // Keep mirroring while DG2 updates the checkbox asynchronously (e.g. after
    // row selection changes), not only right after our own clicks
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="widget-datagridheadernew-cell widget-datagridheadernew-filler widget-datagridheadernew-select-all"
            style={{ gridColumn: `${columnIndex + 1 + (columnIndex >= sequenceTrack ? 1 : 0)}`, gridRow: "1 / span 2" }}
            onClick={() => {
                forwardSelectClick(originalHeader);
            }}
            key={`select-${columnIndex}-${tick}`}
        >
            <input
                type="checkbox"
                className="three-state-checkbox"
                aria-label="Select all rows"
                checked={state.checked}
                onChange={() => {
                    /* handled by cell onClick forwarding */
                }}
                ref={el => {
                    if (el) {
                        el.indeterminate = state.indeterminate;
                    }
                }}
            />
        </div>
    );
}

export function GroupedHeader({
    parsed,
    gridState,
    sequenceEnabled = false,
    sequenceLabel = "No.",
    sequencePosition = 1
}: GroupedHeaderProps): ReactElement {
    // Zero-based track index of the sequence column inside the header grid
    // (one track per configured column plus the sequence track itself).
    // Configured columns at or after this index shift one track to the right.
    const sequenceTrack = sequenceEnabled
        ? resolveSequenceTrackIndex(sequencePosition, gridState.columnCount + 1)
        : -1;

    // Build row 2 leaves that are not covered by a rowspan=2 parent cell
    const coveredByParent = new Set<number>();
    for (const cell of parsed.row1) {
        if (cell.rowspan === 2) {
            coveredByParent.add(cell.columnIndex);
        }
    }

    const row2Leaves = parsed.row2.filter(leaf => !coveredByParent.has(leaf.columnIndex));

    // Blank filler cells keep the grid aligned with unconfigured DataGrid2
    // columns. A column needs a filler only when no row-1 cell covers it:
    // rowspan=2 parents cover both rows, grouped parents leave row 2 to their
    // child leaves, so any covered column must never get a filler on top.
    const coveredByRow1 = new Set<number>();
    for (const cell of parsed.row1) {
        for (let i = cell.columnIndex; i < cell.columnIndex + cell.colspan; i++) {
            coveredByRow1.add(i);
        }
    }
    const fillers: number[] = [];
    for (let i = 0; i < gridState.columnCount; i++) {
        if (!coveredByRow1.has(i)) {
            fillers.push(i);
        }
    }

    return (
        <div className="widget-datagridheadernew-header">
            {sequenceEnabled && (
                <SequenceHeaderCell label={sequenceLabel} track={sequenceTrack} />
            )}
            <div className="widget-datagridheadernew-row1">
                {parsed.row1.map((cell, index) => (
                    <HeaderCellView
                        key={`${cell.label}-${index}`}
                        cell={cell}
                        gridState={gridState}
                        sequenceTrack={sequenceTrack}
                    />
                ))}
            </div>
            <div className="widget-datagridheadernew-row2">
                {row2Leaves.map((leaf, index) => (
                    <LeafCellView
                        key={`${leaf.label}-${index}`}
                        leaf={leaf}
                        gridState={gridState}
                        sequenceTrack={sequenceTrack}
                    />
                ))}
                {fillers.map(columnIndex =>
                    gridState.selectColumns.includes(columnIndex) ? (
                        <SelectAllCell
                            key={`select-${columnIndex}`}
                            columnIndex={columnIndex}
                            gridState={gridState}
                            sequenceTrack={sequenceTrack}
                        />
                    ) : (
                        <div
                            key={`filler-${columnIndex}`}
                            className="widget-datagridheadernew-cell widget-datagridheadernew-filler"
                            style={{
                                gridColumn: `${columnIndex + 1 + (columnIndex >= sequenceTrack ? 1 : 0)}`,
                                gridRow: "1 / span 2"
                            }}
                        />
                    )
                )}
            </div>
        </div>
    );
}
