import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";

import { DataGridHeaderNewContainerProps } from "../typings/DataGridHeaderNewProps";
import { GroupedHeader } from "./components/GroupedHeader";
import { ParsedHeader, parseHeaderConfig } from "./utils/headerParser";
import {
    GridState,
    PagingState,
    applyHiddenHeaderStyle,
    applySequenceTemplateColumns,
    ensureHeaderContainer,
    extendTemplateColumns,
    findGrid,
    readGridState,
    readPagingState,
    syncSequenceCells,
    validateConfig
} from "./utils/gridSync";
import "./ui/DataGridHeaderNew.css";

export function DataGridHeaderNew(props: DataGridHeaderNewContainerProps): ReactElement {
    const {
        gridName,
        hideOriginalHeader,
        sequenceEnabled,
        sequenceLabel,
        sequencePosition,
        sequenceWidth,
        headerRow1,
        headerRow2,
        backgroundColor
    } = props;

    const [gridElement, setGridElement] = useState<HTMLElement | null>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [gridState, setGridState] = useState<GridState>({
        columnCount: 0,
        templateColumns: "",
        originalHeaders: [],
        selectColumns: [],
        rowCount: 0
    });
    const [pagingState, setPagingState] = useState<PagingState>({
        pageIndex: 0,
        pageSize: 0,
        isLimitBased: false
    });

    const parsed: ParsedHeader = useMemo(
        () => parseHeaderConfig(headerRow1, headerRow2),
        [headerRow1, headerRow2]
    );

    // First visible row number of the current page. In buttons mode the page
    // index comes from the paging status (page size 10 + page 2 => rows 11+).
    // In virtual scrolling / load more mode rows accumulate in the DOM and
    // numbers keep counting continuously from 1.
    const sequenceStartIndex =
        sequenceEnabled && !pagingState.isLimitBased ? pagingState.pageIndex * pagingState.pageSize : 0;

    const refresh = useCallback(() => {
        const element = findGrid(gridName);
        if (!element) {
            console.error(`DataGrid2 '${gridName}' not found`);
            setGridElement(null);
            setGridState({
                columnCount: 0,
                templateColumns: "",
                originalHeaders: [],
                selectColumns: [],
                rowCount: 0
            });
            return;
        }
        setGridElement(element);
        setGridState(readGridState(element));
        setPagingState(readPagingState(element));
        setPortalTarget(ensureHeaderContainer(element));
    }, [gridName]);

    useEffect(() => {
        refresh();
        // Grid renders after the widget on first load; poll briefly until it appears
        if (!findGrid(gridName)) {
            const retry = setInterval(refresh, 500);
            const stop = setTimeout(() => clearInterval(retry), 10000);
            return () => {
                clearInterval(retry);
                clearTimeout(stop);
            };
        }
    }, [refresh, gridName]);

    // Observe the grid for template column changes (resize) and header
    // structure changes (column visibility) to stay in sync
    useEffect(() => {
        if (!gridElement) {
            return;
        }
        const observer = new MutationObserver(() => {
            setGridState(readGridState(gridElement));
            setPagingState(readPagingState(gridElement));
            // DG2 re-renders its DOM on data/paging changes; re-apply hidden style
            applyHiddenHeaderStyle(gridElement, hideOriginalHeader);
        });
        observer.observe(gridElement, {
            attributes: true,
            attributeFilter: ["style", "class"],
            subtree: true,
            childList: true
        });
        return () => observer.disconnect();
    }, [gridElement, hideOriginalHeader]);

    useEffect(() => {
        if (gridElement) {
            applyHiddenHeaderStyle(gridElement, hideOriginalHeader);
        }
    }, [gridElement, hideOriginalHeader]);

    // Keep the injected sequence cells in sync with the rendered body rows.
    // Runs on every relevant change (paging state, row count, options) so that
    // page navigation, load more and virtual scrolling all stay correct.
    useEffect(() => {
        if (!gridElement || !sequenceEnabled) {
            return;
        }
        syncSequenceCells(gridElement, {
            enabled: true,
            position: sequencePosition,
            width: sequenceWidth,
            startIndex: sequenceStartIndex
        });
        // The extra track must live on the DG2 table itself (rows are
        // display:contents children of its grid) or the last real cell of
        // every row wraps onto a new line
        applySequenceTemplateColumns(gridElement, true, sequencePosition, sequenceWidth);
    }, [
        gridElement,
        sequenceEnabled,
        sequencePosition,
        sequenceWidth,
        sequenceStartIndex,
        gridState.columnCount,
        gridState.rowCount,
        gridState.templateColumns,
        pagingState.pageIndex,
        pagingState.pageSize,
        pagingState.isLimitBased
    ]);

    // Remove injected cells and restore the original template when disabled
    useEffect(() => {
        if (!gridElement || sequenceEnabled) {
            return;
        }
        syncSequenceCells(gridElement, { enabled: false, position: sequencePosition, width: sequenceWidth, startIndex: 0 });
        applySequenceTemplateColumns(gridElement, false, sequencePosition, sequenceWidth);
    }, [gridElement, sequenceEnabled, sequencePosition, sequenceWidth, gridState.templateColumns]);

    // Remove injected cells and restore the original template when unmounting
    useEffect(
        () => () => {
            if (gridElement) {
                syncSequenceCells(gridElement, { enabled: false, position: "first", width: 0, startIndex: 0 });
                applySequenceTemplateColumns(gridElement, false, "first", 0);
            }
        },
        [gridElement]
    );

    const configError = useMemo(
        () =>
            !parsed.valid
                ? parsed.error
                : gridState.columnCount > 0
                  ? validateConfig(parsed, gridState.columnCount)
                  : null,
        [parsed, gridState.columnCount]
    );

    if (!gridElement || !portalTarget || gridState.columnCount === 0 || configError) {
        if (configError) {
            console.warn(configError);
        }
        return <div className="widget-datagridheadernew-root" />;
    }

    const rootClassName = classNames("widget-datagridheadernew-root", {
        [`widget-datagridheadernew-bg-${backgroundColor}`]: backgroundColor !== "default"
    });

    // The portal lives next to the DG2 table (not inside it), so it cannot
    // inherit --widgets-grid-template-columns. The template must be set
    // explicitly — extended with the sequence track when enabled — using the
    // ORIGINAL base template so the extra track is never added twice.
    // gridState.templateColumns already reports the base while our override
    // is active on the table.
    const extendedColumns = extendTemplateColumns(
        gridState.templateColumns,
        sequenceEnabled,
        sequencePosition,
        sequenceWidth
    );

    return createPortal(
        <div
            className={rootClassName}
            style={{ gridTemplateColumns: extendedColumns ?? gridState.templateColumns }}
        >
            <GroupedHeader
                parsed={parsed}
                gridState={gridState}
                sequenceEnabled={sequenceEnabled}
                sequenceLabel={sequenceLabel}
                sequencePosition={sequencePosition}
                sequenceStartIndex={sequenceStartIndex}
            />
        </div>,
        portalTarget
    );
}
