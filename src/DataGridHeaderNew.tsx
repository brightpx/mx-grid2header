import { ReactElement, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import classNames from "classnames";

import { DataGridHeaderNewContainerProps } from "../typings/DataGridHeaderNewProps";
import { GroupedHeader } from "./components/GroupedHeader";
import { ParsedHeader, parseHeaderConfig } from "./utils/headerParser";
import {
    GridState,
    applyHiddenHeaderStyle,
    ensureHeaderContainer,
    findGrid,
    readGridState,
    validateConfig
} from "./utils/gridSync";
import "./ui/DataGridHeaderNew.css";

export function DataGridHeaderNew(props: DataGridHeaderNewContainerProps): ReactElement {
    const { gridName, hideOriginalHeader, headerRow1, headerRow2, backgroundColor } = props;

    const [gridElement, setGridElement] = useState<HTMLElement | null>(null);
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    const [gridState, setGridState] = useState<GridState>({
        columnCount: 0,
        templateColumns: "",
        originalHeaders: []
    });

    const parsed: ParsedHeader = useMemo(
        () => parseHeaderConfig(headerRow1, headerRow2),
        [headerRow1, headerRow2]
    );

    const refresh = useCallback(() => {
        const element = findGrid(gridName);
        if (!element) {
            console.error(`DataGrid2 '${gridName}' not found`);
            setGridElement(null);
            setGridState({ columnCount: 0, templateColumns: "", originalHeaders: [] });
            return;
        }
        setGridElement(element);
        setGridState(readGridState(element));
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

    return createPortal(
        <div
            className={rootClassName}
            style={{ gridTemplateColumns: gridState.templateColumns }}
        >
            <GroupedHeader parsed={parsed} gridState={gridState} />
        </div>,
        portalTarget
    );
}
