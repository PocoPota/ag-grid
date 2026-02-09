import { useState } from "react";
import { type CellContext, type RowData } from "@tanstack/react-table";
import { Select } from "@radix-ui/themes";

export function SelectCell<TData extends RowData>({
  getValue,
  row,
  column,
  table,
}: CellContext<TData, unknown>) {
  const initialValue = getValue() as string;
  const [isFocused, setIsFocused] = useState(false);
  const options = column.columnDef.meta?.options ?? [];

  return (
    <Select.Root
      value={initialValue}
      onValueChange={(val) => {
        table.options.meta?.updateData(row.index, column.id, val);
      }}
      onOpenChange={(open) => setIsFocused(open)}
    >
      <Select.Trigger
        variant="ghost"
        style={{
          width: "100%",
          padding: "var(--table-cell-padding)",
          margin: "calc(var(--table-cell-padding) * -1)",
          borderRadius: 0,
          cursor: "pointer",
          boxShadow: isFocused
            ? "inset 0 0 0 2px var(--accent-7)"
            : undefined,
        }}
      />
      <Select.Content>
        {options.map((option) => (
          <Select.Item key={option} value={option}>
            {option}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
