import { useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Box, Heading, Table, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

type User = {
  id: number;
  name: string;
  age: number;
  email: string;
  department: string;
};

const data: User[] = [
  { id: 1, name: "田中太郎", age: 28, email: "tanaka@example.com", department: "営業部" },
  { id: 2, name: "鈴木花子", age: 34, email: "suzuki@example.com", department: "開発部" },
  { id: 3, name: "佐藤一郎", age: 45, email: "sato@example.com", department: "人事部" },
  { id: 4, name: "高橋美咲", age: 29, email: "takahashi@example.com", department: "開発部" },
  { id: 5, name: "山田健太", age: 38, email: "yamada@example.com", department: "営業部" },
];

const columnHelper = createColumnHelper<User>();

const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("name", {
    header: "名前",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("age", {
    header: "年齢",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("email", {
    header: "メールアドレス",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("department", {
    header: "部署",
    cell: (info) => info.getValue(),
  }),
];

const sortIndicator: Record<string, string> = {
  asc: " ↑",
  desc: " ↓",
  none: " ↑↓",
};

export default function App() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <Box p="5">
      <Heading size="5" mb="4">
        TanStack Table サンプル
      </Heading>
      <Box mb="3" maxWidth="300px">
        <TextField.Root
          placeholder="検索..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon />
          </TextField.Slot>
        </TextField.Root>
      </Box>
      <Table.Root variant="surface">
        <Table.Header>
          {table.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.ColumnHeaderCell
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {sortIndicator[(header.column.getIsSorted() || "none") as string]}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Table.Cell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
