import { useEffect, useState } from "react";
import { type CellContext, type RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}

export function EditableCell<TData extends RowData>({
  getValue,
  row,
  column,
  table,
}: CellContext<TData, unknown>) {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    table.options.meta?.updateData(row.index, column.id, value);
  };

  return (
    <input
      value={value as string}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      style={{
        all: "unset",
        display: "block",
        width: "100%",
        padding: "var(--table-cell-padding)",
        margin: "calc(var(--table-cell-padding) * -1)",
        cursor: "text",
      }}
    />
  );
}
