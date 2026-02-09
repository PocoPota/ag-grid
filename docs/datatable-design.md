# DataTable 汎用化計画

## 背景

現在の `App.tsx` にはテーブルの機能（ソート、フィルタ、選択、コピー、CSV出力、編集）とデータ定義（User型、defaultData、columns）が混在している。同一プロジェクト内の複数画面で再利用するため、テーブル機能を汎用コンポーネントとして切り出す。

## 設計方針

### コンポーネントAPI

```tsx
<DataTable
  data={users}
  columns={columns}
  features={{ sorting: true, selection: true, csvExport: true }}
  onCellEdit={(rowIndex, columnId, value) => { ... }}
/>
```

- `data`: 任意の型の配列（ジェネリクス `T` で型推論）
- `columns`: TanStack Table の `ColumnDef<T>[]` をそのまま使用（カスタムセルも `cell` プロパティで渡せる）
- `features`: 各機能の ON/OFF（省略時はデフォルト値）
- `onCellEdit`: セル編集時のコールバック（データ更新方式を外部に委譲）

### data の形式

`data` は任意のオブジェクト配列。型パラメータ `T` で推論される。

```typescript
// 例: User データ
type User = {
  id: number;
  name: string;
  age: number;
  email: string;
  department: string;
};

const users: User[] = [
  { id: 1, name: "田中太郎", age: 28, email: "tanaka@example.com", department: "営業部" },
  // ...
];

// 例: Product データ（別画面で使う場合）
type Product = {
  sku: string;
  productName: string;
  price: number;
  stock: number;
  category: string;
};
```

DataTable は `data` の中身を一切知らない。どのフィールドをどう表示するかは `columns` 側で決める。

### カラム定義とセルの種類

カラムごとに**表示用セルコンポーネント**と**メタ情報**を指定する。

#### ColumnMeta 型拡張（現状）

```typescript
// EditableCell.tsx で宣言している TanStack Table の型拡張
interface ColumnMeta<TData extends RowData, TValue> {
  editable?: boolean;        // セルが編集可能か（デフォルト: false）
  type?: "text" | "number";  // 入力タイプ（デフォルト: "text"）
  options?: string[];         // SelectCell 用の選択肢リスト
}
```

#### セルコンポーネント一覧

| コンポーネント | 用途 | 編集 | meta で使うプロパティ |
|---|---|---|---|
| `EditableCell` | テキスト/数値の表示・編集 | ダブルクリック or 文字キーで編集開始 | `editable`, `type` |
| `SelectCell` | プルダウン選択 | クリックで選択肢表示 | `options` |
| `NameCell` | アバター付き名前表示 | 読み取り専用 | なし |
| (cell 未指定) | TanStack のデフォルト表示 | 読み取り専用 | なし |

#### カラム定義の例

```tsx
const columnHelper = createColumnHelper<User>();

const columns = [
  // 読み取り専用（EditableCell だが editable: false）
  columnHelper.accessor("id", {
    header: "ID",
    cell: EditableCell,
    meta: { editable: false },
  }),

  // カスタム表示（アバター付き、読み取り専用）
  columnHelper.accessor("name", {
    header: "名前",
    cell: NameCell,
  }),

  // 数値編集
  columnHelper.accessor("age", {
    header: "年齢",
    cell: EditableCell,
    meta: { editable: true, type: "number" },
  }),

  // テキスト編集
  columnHelper.accessor("email", {
    header: "メールアドレス",
    cell: EditableCell,
    meta: { editable: true },
  }),

  // プルダウン選択
  columnHelper.accessor("department", {
    header: "部署",
    cell: SelectCell,
    meta: { options: ["営業部", "開発部", "人事部", "総務部", "経理部"] },
  }),
];
```

#### 別データ型での利用例

```tsx
const productColumnHelper = createColumnHelper<Product>();

const productColumns = [
  productColumnHelper.accessor("sku", {
    header: "SKU",
    cell: EditableCell,
    meta: { editable: false },
  }),
  productColumnHelper.accessor("productName", {
    header: "商品名",
    cell: EditableCell,
    meta: { editable: true },
  }),
  productColumnHelper.accessor("price", {
    header: "価格",
    cell: EditableCell,
    meta: { editable: true, type: "number" },
  }),
  productColumnHelper.accessor("category", {
    header: "カテゴリ",
    cell: SelectCell,
    meta: { options: ["食品", "雑貨", "衣料", "家電"] },
  }),
];

// DataTable に渡すだけで動作する
<DataTable data={products} columns={productColumns} onCellEdit={...} />
```

### セルコンポーネントの仕組み

#### 基本構造

すべてのセルコンポーネントは TanStack Table の `CellContext<TData, unknown>` を props として受け取る関数コンポーネント。

```tsx
import { type CellContext, type RowData } from "@tanstack/react-table";

export function MyCell<TData extends RowData>(props: CellContext<TData, unknown>) {
  const { getValue, row, column, table } = props;
  // ...
}
```

| props | 説明 |
|---|---|
| `getValue()` | セルの現在の値を取得 |
| `row.index` | 行インデックス（`updateData` に渡す） |
| `column.id` | カラムID（`updateData` に渡す） |
| `column.columnDef.meta` | カラム定義の `meta` オブジェクト（`editable`, `type`, `options` など） |
| `table.options.meta?.updateData(rowIndex, columnId, value)` | データ更新を親に通知 |
| `table.options.meta?.clearSelection?.()` | セル選択を解除（編集開始時に呼ぶ） |

#### 守るべき規約

1. **スタイル**: セル内の余白を `padding` / 負の `margin` で Table.Cell と揃える
2. **フォーカスリング**: `boxShadow: "inset 0 0 0 2px var(--accent-7)"` で統一
3. **選択との共存**: `onMouseDown` で `e.preventDefault()` してセル選択のドラッグを阻害しない
4. **データ更新**: 値の確定時に `table.options.meta?.updateData()` を呼ぶ（直接 data を変更しない）

```tsx
// 共通のスタイルパターン
const cellStyle = {
  padding: "var(--table-cell-padding)",
  margin: "calc(var(--table-cell-padding) * -1)",
  outline: "none",
  boxShadow: isFocused ? "inset 0 0 0 2px var(--accent-7)" : undefined,
};
```

#### カスタムセルのテンプレート

新しいセルを作る際のテンプレート。

**読み取り専用セル（表示のみ）:**

```tsx
import { type CellContext, type RowData } from "@tanstack/react-table";

export function BadgeCell<TData extends RowData>({
  getValue,
}: CellContext<TData, unknown>) {
  const value = getValue() as string;

  return (
    <div
      style={{
        padding: "var(--table-cell-padding)",
        margin: "calc(var(--table-cell-padding) * -1)",
        userSelect: "none",
      }}
    >
      <Badge>{value}</Badge>
    </div>
  );
}
```

**編集可能セル（値を変更する）:**

```tsx
import { useState } from "react";
import { type CellContext, type RowData } from "@tanstack/react-table";

export function ToggleCell<TData extends RowData>({
  getValue,
  row,
  column,
  table,
}: CellContext<TData, unknown>) {
  const value = getValue() as boolean;

  return (
    <div
      style={{
        padding: "var(--table-cell-padding)",
        margin: "calc(var(--table-cell-padding) * -1)",
      }}
    >
      <Switch
        checked={value}
        onCheckedChange={(checked) => {
          table.options.meta?.updateData(row.index, column.id, checked);
        }}
      />
    </div>
  );
}
```

#### ColumnMeta の拡張

新しいセルコンポーネントが追加の meta プロパティを必要とする場合、`EditableCell.tsx` 内の `ColumnMeta` 型拡張に追記する。

```typescript
interface ColumnMeta<TData extends RowData, TValue> {
  editable?: boolean;
  type?: "text" | "number";
  options?: string[];
  // 新しいセルで必要になったら追加:
  // format?: string;        // DateCell 用
  // min?: number;            // SliderCell 用
  // max?: number;
}
```

### 機能トグル

```typescript
type DataTableFeatures = {
  sorting?: boolean;        // デフォルト: true
  globalFilter?: boolean;   // デフォルト: true
  columnVisibility?: boolean; // デフォルト: true
  selection?: boolean;      // デフォルト: true
  copy?: boolean;           // デフォルト: true（selection が true の時のみ有効）
  csvExport?: boolean;      // デフォルト: true
};
```

OFF の場合:
- `sorting: false` → ヘッダークリックでソートしない、ソートインジケーター非表示、`getSortedRowModel` を渡さない
- `globalFilter: false` → 検索バー非表示、`getFilteredRowModel` を渡さない
- `columnVisibility: false` → 表示カラムボタン非表示
- `selection: false` → `useSelection` を呼ばない、セルに選択ハンドラを付けない
- `copy: false` → `useCopyToClipboard` を呼ばない
- `csvExport: false` → CSV出力ボタン非表示

### データ更新の設計

テーブルは**データを直接変更しない**。セル編集時に `onCellEdit` コールバックを呼ぶだけ。

```tsx
// パターン1: ローカルstate管理（現状と同等）
const [data, setData] = useState(initialData);
<DataTable
  data={data}
  onCellEdit={(rowIndex, columnId, value) => {
    setData(prev => prev.map((row, i) =>
      i === rowIndex ? { ...row, [columnId]: value } : row
    ));
  }}
/>

// パターン2: API連携（楽観的更新）
<DataTable
  data={data}
  onCellEdit={async (rowIndex, columnId, value) => {
    const prev = data[rowIndex];
    setData(/* 楽観的に更新 */);
    try { await api.update(prev.id, { [columnId]: value }); }
    catch { setData(/* ロールバック */); }
  }}
/>

// パターン3: API連携（確定的更新）
<DataTable
  data={data}
  onCellEdit={async (rowIndex, columnId, value) => {
    await api.update(data[rowIndex].id, { [columnId]: value });
    const fresh = await api.fetch();
    setData(fresh);
  }}
/>
```

`onCellEdit` が未指定の場合、`TableMeta.updateData` は何もしない（読み取り専用テーブル）。

## ファイル構成

```
src/
├── components/
│   └── DataTable.tsx          # 汎用テーブルコンポーネント（新規）
├── cells/                     # セルコンポーネント（リネーム移動）
│   ├── EditableCell.tsx
│   ├── NameCell.tsx
│   └── SelectCell.tsx
├── hooks/                     # そのまま維持
│   ├── useSelection.ts
│   └── useCopyToClipboard.ts
├── lib/
│   └── downloadCsv.ts         # そのまま維持
├── App.tsx                    # DataTable の使用例（User データ）
├── table-overrides.css
└── main.tsx
```

## 変更ファイル一覧

### 新規: `src/components/DataTable.tsx`

App.tsx から汎用テーブルロジックを抽出する。主な責務:

- Props から `useReactTable` を構成
- `features` に応じて hooks の呼び出し・UIパーツの表示を切り替え
- ツールバー（検索、カラム表示、CSV出力）の描画
- テーブル本体の描画（ヘッダー、ボディ、セル選択ハンドラ）
- 選択状態のデバッグパネル（開発用、後で削除可能）

```tsx
type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  features?: DataTableFeatures;
  onCellEdit?: (rowIndex: number, columnId: string, value: unknown) => void;
};

export function DataTable<T>({ data, columns, features, onCellEdit }: DataTableProps<T>) {
  // features のデフォルト値をマージ
  // useReactTable を構成
  // features に応じて useSelection / useCopyToClipboard を呼ぶ
  // ツールバーとテーブルを描画
}
```

### 移動: セルコンポーネント → `src/cells/`

- `src/EditableCell.tsx` → `src/cells/EditableCell.tsx`
- `src/NameCell.tsx` → `src/cells/NameCell.tsx`
- `src/SelectCell.tsx` → `src/cells/SelectCell.tsx`
- 内容の変更なし（`TableMeta` の型拡張はそのまま `EditableCell.tsx` に残す）

### 変更: `src/App.tsx`

テーブルロジックを除去し、`DataTable` を使うだけのシンプルなページに:

```tsx
export default function App() {
  const [data, setData] = useState(defaultData);

  return (
    <Box p="5">
      <Heading size="5" mb="4">TanStack Table サンプル</Heading>
      <DataTable
        data={data}
        columns={columns}
        onCellEdit={(rowIndex, columnId, value) => {
          setData(prev =>
            prev.map((row, i) => i === rowIndex ? { ...row, [columnId]: value } : row)
          );
        }}
      />
    </Box>
  );
}
```

### 変更なし

- `src/hooks/useSelection.ts` — 変更不要（既に引数なしで汎用的）
- `src/hooks/useCopyToClipboard.ts` — 変更不要
- `src/lib/downloadCsv.ts` — 変更不要
- `src/table-overrides.css` — 変更不要

## 実装手順

1. `src/cells/` ディレクトリを作成し、セルコンポーネントを移動
2. `src/components/DataTable.tsx` を作成（App.tsx からロジックを移動）
3. `src/App.tsx` を `DataTable` を使う形に書き換え
4. インポートパスを修正
5. 型チェック・動作確認

## 検証方法

1. `npx tsc --noEmit` で型エラーがないこと
2. `npm run dev` で開発サーバーを起動し、以下を確認:
   - ソート、フィルタ、カラム表示切替が動作する
   - セル選択（クリック、Shift+クリック、Ctrl+ドラッグ）が動作する
   - Ctrl+C でコピーが動作する
   - CSV出力が動作する
   - セル編集（ダブルクリック、文字キー）が動作する
3. `features` の各プロパティを `false` に設定して、該当機能が無効化されることを確認
