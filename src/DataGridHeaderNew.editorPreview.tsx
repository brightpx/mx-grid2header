import { ReactElement } from "react";

import { DataGridHeaderNewPreviewProps } from "../typings/DataGridHeaderNewProps";

export function preview(props: DataGridHeaderNewPreviewProps): ReactElement {
    const row1 = (props.headerRow1 || "").split(",").map(v => v.trim());
    const row2 = (props.headerRow2 || "").split(",").map(v => v.trim());
    const columns = Math.max(row1.length, row2.length, 1);
    const seqEnabled = !!props.sequenceEnabled;
    const seqLabel = props.sequenceLabel || "No.";

    return (
        <div style={{ fontFamily: "monospace", fontSize: 11, padding: 4 }}>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
                Grouped header → {props.gridName || "(grid name not set)"}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
                {seqEnabled && (
                    <div
                        style={{
                            border: "1px solid #ccc",
                            padding: "2px 4px",
                            background: "#fff8e1",
                            fontWeight: 600,
                            minWidth: 32,
                            textAlign: "center"
                        }}
                    >
                        {seqLabel}
                    </div>
                )}
                {Array.from({ length: columns }, (_, i) => (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            border: "1px solid #ccc",
                            padding: "2px 4px",
                            background: row1[i] ? "#eef6fb" : "#f5f5f5"
                        }}
                    >
                        {row1[i] || ""}
                        <div style={{ fontWeight: 400, color: "#666" }}>{row2[i] || ""}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/DataGridHeaderNew.css");
}
