import { useEffect } from "react";
import type { Table, RowData } from "@tanstack/react-table";
import type { CellId } from "./useSelection";

export function useCopyToClipboard<TData extends RowData>(
  table: Table<TData>,
  selected: Set<CellId>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key === "c")) return;
      if (selected.size === 0) return;

      // If the user has text selected inside an input, let native copy work
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      ) {
        const { selectionStart, selectionEnd } = active;
        if (
          selectionStart !== null &&
          selectionEnd !== null &&
          selectionStart !== selectionEnd
        ) {
          return;
        }
      }

      e.preventDefault();

      // Parse selected cell IDs into a map: visualRow -> Set<visualCol>
      const rowCols = new Map<number, Set<number>>();
      for (const cellId of selected) {
        const sep = cellId.indexOf(":");
        const row = Number(cellId.slice(0, sep));
        const col = Number(cellId.slice(sep + 1));
        if (!rowCols.has(row)) rowCols.set(row, new Set());
        rowCols.get(row)!.add(col);
      }

      // Collect selected column indices in visual order
      const allCols = new Set<number>();
      for (const cols of rowCols.values()) {
        for (const c of cols) allCols.add(c);
      }
      const selectedColIndices = [...allCols].sort((a, b) => a - b);

      // Build TSV from rows in visual order
      const visibleColumns = table.getVisibleLeafColumns();
      const rows = table.getRowModel().rows;
      const lines: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        if (!rowCols.has(i)) continue;
        const cols = rowCols.get(i)!;
        const values = selectedColIndices.map((colIdx) =>
          cols.has(colIdx)
            ? String(rows[i].getValue(visibleColumns[colIdx].id) ?? "")
            : ""
        );
        lines.push(values.join("\t"));
      }

      navigator.clipboard.writeText(lines.join("\n"));
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [table, selected, enabled]);
}
