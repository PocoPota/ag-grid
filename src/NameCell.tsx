import { useRef, useState } from "react";
import { type CellContext, type RowData } from "@tanstack/react-table";
import Avatar from "boring-avatars";

export function NameCell<TData extends RowData>({
  getValue,
}: CellContext<TData, unknown>) {
  const name = getValue() as string;
  const ref = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      ref={ref}
      tabIndex={0}
      onMouseDown={(e) => {
        e.preventDefault();
        ref.current?.focus();
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "var(--table-cell-padding)",
        margin: "calc(var(--table-cell-padding) * -1)",
        outline: "none",
        cursor: "default",
        userSelect: "none",
        boxShadow: isFocused
          ? "inset 0 0 0 2px var(--accent-7)"
          : undefined,
      }}
    >
      <Avatar size={20} name={name} variant="beam" />
      <span>{name}</span>
    </div>
  );
}
