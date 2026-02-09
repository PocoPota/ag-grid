import { useEffect, useRef, useState } from "react";
import { type CellContext, type RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    clearSelection?: () => void;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    editable?: boolean;
    type?: "text" | "number";
    options?: string[];
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
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = column.columnDef.meta?.editable ?? false;
  const inputType = column.columnDef.meta?.type ?? "text";
  const isEditingRef = useRef(false);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const [isFocused, setIsFocused] = useState(false);

  const onBlur = () => {
    setIsEditing(false);
    isEditingRef.current = false;
    setIsFocused(false);
    const committed = inputType === "number" ? Number(value) : value;
    table.options.meta?.updateData(row.index, column.id, committed);
  };

  return (
    <input
      ref={inputRef}
      inputMode={inputType === "number" ? "numeric" : undefined}
      value={value as string}
      size={Math.max(String(value).length, 1)}
      onChange={(e) => {
        if (isEditingRef.current) {
          setValue(e.target.value);
        }
      }}
      onMouseDown={(e) => {
        if (!isEditing) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
      onFocus={() => setIsFocused(true)}
      onDoubleClick={() => {
        if (editable) {
          table.options.meta?.clearSelection?.();
          setIsEditing(true);
          isEditingRef.current = true;
        }
      }}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Escape") {
          setValue(initialValue);
          setIsEditing(false);
          isEditingRef.current = false;
          inputRef.current?.blur();
        } else if (e.key === "Enter") {
          inputRef.current?.blur();
        } else if (!isEditing && editable && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          table.options.meta?.clearSelection?.();
          setIsEditing(true);
          isEditingRef.current = true;
          setValue("");
        }
      }}
      style={{
        all: "unset",
        display: "block",
        width: "100%",
        padding: "var(--table-cell-padding)",
        margin: "calc(var(--table-cell-padding) * -1)",
        cursor: isEditing ? "text" : "default",
        caretColor: isEditing ? undefined : "transparent",
        userSelect: isEditing ? undefined : "none",
        boxShadow: isFocused
          ? isEditing
            ? "inset 0 0 0 2px var(--accent-9)"
            : "inset 0 0 0 2px var(--accent-7)"
          : undefined,
      }}
    />
  );
}
