/**
 * This file was generated from DataGridHeaderNew.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { CSSProperties } from "react";

export type SequencePositionEnum = "first" | "last";

export type BackgroundColorEnum = "default" | "transparent" | "white" | "gray" | "blue" | "primary" | "dark";

export interface DataGridHeaderNewContainerProps {
    name: string;
    class: string;
    style?: CSSProperties;
    tabIndex?: number;
    gridName: string;
    hideOriginalHeader: boolean;
    sequenceEnabled: boolean;
    sequenceLabel: string;
    sequencePosition: SequencePositionEnum;
    sequenceWidth: number;
    headerRow1: string;
    headerRow2: string;
    backgroundColor: BackgroundColorEnum;
}

export interface DataGridHeaderNewPreviewProps {
    /**
     * @deprecated Deprecated since version 9.18.0. Please use class property instead.
     */
    className: string;
    class: string;
    style: string;
    styleObject?: CSSProperties;
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    gridName: string;
    hideOriginalHeader: boolean;
    sequenceEnabled: boolean;
    sequenceLabel: string;
    sequencePosition: SequencePositionEnum;
    sequenceWidth: number | null;
    headerRow1: string;
    headerRow2: string;
    backgroundColor: BackgroundColorEnum;
}
