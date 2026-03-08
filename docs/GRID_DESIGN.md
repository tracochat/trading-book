# DataGrid Component Design

A reusable, configurable data grid component built on TanStack Table v8 following shadcn/ui conventions. Supports server-side pagination, sorting, filtering, grouping, and pivot functionality.

## Table of Contents

1. [Overview](#overview)
2. [Configuration Schema](#configuration-schema)
3. [Column Configuration](#column-configuration)
4. [SSRM Request/Response Schema](#ssrm-requestresponse-schema)
5. [Header Cell Behavior](#header-cell-behavior)
6. [Toolbar Features](#toolbar-features)
7. [Pivot Panel](#pivot-panel)
8. [Usage Examples](#usage-examples)
9. [Integration Guide](#integration-guide)

---

## Overview

The DataGrid component provides a highly customizable table with:

- **Headless architecture** via TanStack Table v8
- **Server-Side Row Model (SSRM)** for pagination, sorting, and filtering
- **Intuitive header cells** with shadow-based sort indicators and hover-reveal filters
- **Pivot panel** for dynamic data aggregation (inspired by Excel/Tableau)
- **Full TypeScript support** with Zod runtime validation

---

## Configuration Schema

### TypeScript Interfaces

```typescript
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"

// ============================================
// Data Source Configuration
// ============================================

export const DataSourceTypeSchema = z.enum(["client", "server"])
export type DataSourceType = z.infer<typeof DataSourceTypeSchema>

export const DataSourceConfigSchema = z.object({
  /** Client-side or server-side data mode */
  type: DataSourceTypeSchema,
  /** For client-side: initial data array */
  data: z.array(z.any()).optional(),
  /** For server-side: API endpoint for SSRM requests */
  endpoint: z.string().optional(),
  /** For server-side: table name for generic SSRM endpoint */
  tableName: z.string().optional(),
})
export type DataSourceConfig = z.infer<typeof DataSourceConfigSchema>

// ============================================
// Feature Toggles
// ============================================

export const GridFeaturesSchema = z.object({
  /** Enable column sorting */
  sorting: z.boolean().default(true),
  /** Enable column filtering */
  filtering: z.boolean().default(true),
  /** Enable pagination */
  pagination: z.boolean().default(true),
  /** Enable column visibility toggle */
  columnVisibility: z.boolean().default(true),
  /** Enable row selection (checkbox column) */
  rowSelection: z.boolean().default(false),
  /** Enable row grouping */
  rowGrouping: z.boolean().default(false),
  /** Enable pivot mode */
  pivoting: z.boolean().default(false),
  /** Enable global search across all fields */
  globalSearch: z.boolean().default(true),
})
export type GridFeatures = z.infer<typeof GridFeaturesSchema>

// ============================================
// Pagination Configuration
// ============================================

export const PaginationConfigSchema = z.object({
  /** Default page size */
  pageSize: z.number().int().positive().default(20),
  /** Available page size options */
  pageSizeOptions: z.array(z.number().int().positive()).default([10, 20, 50, 100]),
  /** Show page size selector */
  showPageSizeSelector: z.boolean().default(true),
  /** Show row count summary */
  showRowCount: z.boolean().default(true),
})
export type PaginationConfig = z.infer<typeof PaginationConfigSchema>

// ============================================
// Toolbar Configuration
// ============================================

export const ToolbarConfigSchema = z.object({
  /** Show global search input */
  showSearch: z.boolean().default(true),
  /** Show column visibility toggle menu */
  showColumnToggle: z.boolean().default(true),
  /** Show pivot panel toggle button */
  showPivotToggle: z.boolean().default(false),
  /** Custom action buttons (React nodes) */
  customActions: z.any().optional(),
  /** Additional filter controls */
  filters: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.enum(["select", "multiselect", "daterange"]),
    options: z.array(z.object({
      label: z.string(),
      value: z.string(),
    })).optional(),
    field: z.string(),
  })).optional(),
})
export type ToolbarConfig = z.infer<typeof ToolbarConfigSchema>

// ============================================
// Main Grid Configuration
// ============================================

export const DataGridConfigSchema = z.object({
  /** Unique identifier for the grid instance */
  id: z.string().optional(),
  /** Data source configuration */
  dataSource: DataSourceConfigSchema,
  /** Feature toggles */
  features: GridFeaturesSchema.optional(),
  /** Pagination settings */
  pagination: PaginationConfigSchema.optional(),
  /** Toolbar settings */
  toolbar: ToolbarConfigSchema.optional(),
  /** Enable row actions column */
  enableRowActions: z.boolean().default(false),
  /** Custom row ID accessor */
  getRowId: z.function().args(z.any()).returns(z.string()).optional(),
  /** Initial sorting state */
  initialSorting: z.array(z.object({
    id: z.string(),
    desc: z.boolean(),
  })).optional(),
  /** Initial filter state */
  initialFilters: z.record(z.any()).optional(),
  /** Debounce delay for server requests (ms) */
  debounceMs: z.number().default(300),
})
export type DataGridConfig<TData = unknown> = z.infer<typeof DataGridConfigSchema> & {
  columns: ColumnConfig<TData>[]
  onRowAction?: (action: string, row: TData) => void
}
```

---

## Column Configuration

```typescript
import { z } from "zod"

// ============================================
// Filter Configuration
// ============================================

export const FilterTypeSchema = z.enum([
  "text",
  "number", 
  "date",
  "daterange",
  "select",
  "multiselect",
  "boolean",
])
export type FilterType = z.infer<typeof FilterTypeSchema>

export const FilterConfigSchema = z.object({
  /** Filter input type */
  type: FilterTypeSchema,
  /** For select/multiselect: available options */
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
  })).optional(),
  /** Placeholder text */
  placeholder: z.string().optional(),
  /** Custom filter function for client-side */
  filterFn: z.function().optional(),
})
export type FilterConfig = z.infer<typeof FilterConfigSchema>

// ============================================
// Aggregation Functions
// ============================================

export const AggregationFnSchema = z.enum([
  "sum",
  "avg",
  "count",
  "min",
  "max",
  "first",
  "last",
])
export type AggregationFn = z.infer<typeof AggregationFnSchema>

// ============================================
// Column Definition
// ============================================

export const ColumnConfigSchema = z.object({
  /** Unique column identifier */
  id: z.string(),
  /** Property path to access data (e.g., "user.name") */
  accessorKey: z.string().optional(),
  /** Custom accessor function */
  accessorFn: z.function().optional(),
  /** Column header text */
  header: z.string(),
  
  // Feature flags
  /** Allow sorting on this column */
  enableSorting: z.boolean().default(true),
  /** Allow filtering on this column */
  enableFiltering: z.boolean().default(true),
  /** Allow hiding this column */
  enableHiding: z.boolean().default(true),
  /** Allow grouping by this column */
  enableGrouping: z.boolean().default(false),
  /** Allow using this column in pivot */
  enablePivoting: z.boolean().default(false),
  /** Can be used as a value column in pivot */
  enableAggregation: z.boolean().default(false),
  
  /** Filter configuration */
  filterConfig: FilterConfigSchema.optional(),
  
  /** Default aggregation function for pivot */
  aggregation: AggregationFnSchema.optional(),
  
  // Styling
  /** Column width */
  width: z.union([z.number(), z.string()]).optional(),
  /** Minimum width */
  minWidth: z.number().optional(),
  /** Maximum width */
  maxWidth: z.number().optional(),
  /** Text alignment */
  align: z.enum(["left", "center", "right"]).default("left"),
  /** Additional CSS classes */
  className: z.string().optional(),
  /** Header CSS classes */
  headerClassName: z.string().optional(),
  
  // Formatting
  /** Number format options */
  numberFormat: z.object({
    style: z.enum(["decimal", "currency", "percent"]).optional(),
    currency: z.string().optional(),
    minimumFractionDigits: z.number().optional(),
    maximumFractionDigits: z.number().optional(),
  }).optional(),
  /** Date format string (date-fns format) */
  dateFormat: z.string().optional(),
  
  // Visibility
  /** Initial visibility state */
  defaultVisible: z.boolean().default(true),
  /** Pin column position */
  pin: z.enum(["left", "right"]).optional(),
})

export type ColumnConfig<TData = unknown> = z.infer<typeof ColumnConfigSchema> & {
  /** Custom cell renderer */
  cell?: (value: unknown, row: TData, index: number) => React.ReactNode
  /** Custom header renderer */
  headerCell?: () => React.ReactNode
  /** Custom footer renderer */
  footer?: () => React.ReactNode
}
```

### JSON Configuration Example

```json
{
  "columns": [
    {
      "id": "trade_date",
      "accessorKey": "trade_date",
      "header": "Date",
      "enableSorting": true,
      "enableFiltering": true,
      "filterConfig": {
        "type": "daterange"
      },
      "dateFormat": "yyyy-MM-dd",
      "width": 120
    },
    {
      "id": "symbol",
      "accessorKey": "instrument.symbol",
      "header": "Symbol",
      "enableSorting": true,
      "enableFiltering": true,
      "filterConfig": {
        "type": "text",
        "placeholder": "Search symbol..."
      },
      "enableGrouping": true,
      "width": 100
    },
    {
      "id": "trade_type",
      "accessorKey": "trade_type",
      "header": "Type",
      "enableFiltering": true,
      "filterConfig": {
        "type": "select",
        "options": [
          { "label": "Buy", "value": "Buy" },
          { "label": "Sell", "value": "Sell" },
          { "label": "Buy to Open", "value": "Buy to Open" },
          { "label": "Sell to Close", "value": "Sell to Close" }
        ]
      },
      "width": 100
    },
    {
      "id": "quantity",
      "accessorKey": "quantity",
      "header": "Qty",
      "align": "right",
      "enableSorting": true,
      "enableAggregation": true,
      "aggregation": "sum",
      "numberFormat": {
        "style": "decimal",
        "maximumFractionDigits": 0
      },
      "width": 80
    },
    {
      "id": "net_amount",
      "accessorKey": "net_amount",
      "header": "Net Amount",
      "align": "right",
      "enableSorting": true,
      "enableAggregation": true,
      "aggregation": "sum",
      "numberFormat": {
        "style": "currency",
        "currency": "USD"
      },
      "width": 120
    }
  ]
}
```

---

## SSRM Request/Response Schema

### Request Schema (Client to Server)

```typescript
import { z } from "zod"

// ============================================
// Sort Model
// ============================================

export const SortItemSchema = z.object({
  /** Column ID to sort by */
  colId: z.string(),
  /** Sort direction */
  sort: z.enum(["asc", "desc"]),
})
export type SortItem = z.infer<typeof SortItemSchema>

// ============================================
// Filter Model
// ============================================

export const FilterOperatorSchema = z.enum([
  // Text operators
  "equals",
  "notEquals",
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "blank",
  "notBlank",
  // Number operators
  "lessThan",
  "lessThanOrEqual",
  "greaterThan",
  "greaterThanOrEqual",
  "inRange",
  // Date operators
  "before",
  "after",
  "between",
  // Set operators
  "inSet",
  "notInSet",
])
export type FilterOperator = z.infer<typeof FilterOperatorSchema>

export const FilterConditionSchema = z.object({
  /** Filter type */
  filterType: z.enum(["text", "number", "date", "set", "boolean"]),
  /** Comparison operator */
  operator: FilterOperatorSchema,
  /** Filter value */
  filter: z.union([z.string(), z.number(), z.boolean()]).optional(),
  /** Second value for range filters */
  filterTo: z.union([z.string(), z.number()]).optional(),
  /** Values for set filters */
  values: z.array(z.string()).optional(),
})
export type FilterCondition = z.infer<typeof FilterConditionSchema>

export const FilterModelSchema = z.record(z.string(), z.union([
  FilterConditionSchema,
  z.object({
    filterType: z.literal("combined"),
    operator: z.enum(["AND", "OR"]),
    conditions: z.array(FilterConditionSchema),
  }),
]))
export type FilterModel = z.infer<typeof FilterModelSchema>

// ============================================
// Row Group Model
// ============================================

export const RowGroupColSchema = z.object({
  /** Column ID */
  id: z.string(),
  /** Field path */
  field: z.string(),
  /** Display name */
  displayName: z.string(),
})
export type RowGroupCol = z.infer<typeof RowGroupColSchema>

// ============================================
// Pivot Model
// ============================================

export const PivotColSchema = z.object({
  /** Column ID */
  id: z.string(),
  /** Field path */
  field: z.string(),
})
export type PivotCol = z.infer<typeof PivotColSchema>

export const ValueColSchema = z.object({
  /** Column ID */
  id: z.string(),
  /** Field path */
  field: z.string(),
  /** Aggregation function */
  aggFunc: AggregationFnSchema,
})
export type ValueCol = z.infer<typeof ValueColSchema>

// ============================================
// SSRM Request
// ============================================

export const SSRMRequestSchema = z.object({
  /** Starting row index (0-based) */
  startRow: z.number().int().nonnegative(),
  /** Ending row index (exclusive) */
  endRow: z.number().int().positive(),
  
  /** Sort configuration */
  sortModel: z.array(SortItemSchema).default([]),
  
  /** Filter configuration */
  filterModel: FilterModelSchema.default({}),
  
  /** Global search term */
  globalSearch: z.string().optional(),
  /** Fields to include in global search */
  globalSearchFields: z.array(z.string()).optional(),
  
  /** Row grouping columns */
  rowGroupCols: z.array(RowGroupColSchema).default([]),
  /** Current group keys (for nested groups) */
  groupKeys: z.array(z.string()).default([]),
  
  /** Pivot mode enabled */
  pivotMode: z.boolean().default(false),
  /** Pivot columns */
  pivotCols: z.array(PivotColSchema).default([]),
  
  /** Value columns for aggregation */
  valueCols: z.array(ValueColSchema).default([]),
  
  /** Table name for generic endpoint */
  tableName: z.string().optional(),
  
  /** Include related data (joins) */
  includes: z.array(z.string()).optional(),
})
export type SSRMRequest = z.infer<typeof SSRMRequestSchema>
```

### Response Schema (Server to Client)

```typescript
// ============================================
// Grouped Row Structure
// ============================================

export const GroupedRowSchema: z.ZodType<GroupedRow> = z.lazy(() =>
  z.object({
    /** Is this a group row? */
    isGroup: z.literal(true),
    /** Group key value */
    groupKey: z.string(),
    /** Group field name */
    groupField: z.string(),
    /** Display value for the group */
    groupValue: z.string(),
    /** Number of children (direct or nested) */
    childCount: z.number(),
    /** Aggregated values */
    aggregations: z.record(z.number()).optional(),
    /** Child rows (loaded on expand) */
    children: z.array(z.union([GroupedRowSchema, z.any()])).optional(),
    /** Can this group be expanded? */
    isExpandable: z.boolean().default(true),
  })
)

export interface GroupedRow<TData = unknown> {
  isGroup: true
  groupKey: string
  groupField: string
  groupValue: string
  childCount: number
  aggregations?: Record<string, number>
  children?: (GroupedRow<TData> | TData)[]
  isExpandable?: boolean
}

// ============================================
// SSRM Response
// ============================================

export const SSRMResponseSchema = z.object({
  /** Row data for current page */
  rowData: z.array(z.any()),
  /** Total row count (-1 if unknown) */
  rowCount: z.number().int(),
  /** For grouped data: structured rows */
  groupedData: z.array(z.any()).optional(),
  /** For pivot mode: generated column IDs */
  pivotResultCols: z.array(z.string()).optional(),
  /** Server-side generated metadata */
  metadata: z.object({
    /** Query execution time (ms) */
    queryTime: z.number().optional(),
    /** Cache hit */
    cached: z.boolean().optional(),
    /** Aggregation totals */
    totals: z.record(z.number()).optional(),
  }).optional(),
})

export interface SSRMResponse<TData = unknown> {
  rowData: TData[]
  rowCount: number
  groupedData?: GroupedRow<TData>[]
  pivotResultCols?: string[]
  metadata?: {
    queryTime?: number
    cached?: boolean
    totals?: Record<string, number>
  }
}
```

---

## Header Cell Behavior

### Visual States

```
+------------------+
|  Column Title    |  <- Default: only text visible
+------------------+

+------------------+
|  Column Title    |  <- Sorted ASC: soft blue shadow below
|  ▂▂▂▂▂▂▂▂▂▂▂▂   |     (gradient: transparent -> blue)
+------------------+

+------------------+
|  ▂▂▂▂▂▂▂▂▂▂▂▂   |  <- Sorted DESC: shadow above
|  Column Title    |     (gradient: blue -> transparent)
+------------------+

+------------------+
|  Column Title •••|  <- Hover: reveal filter menu icon
|  ▂▂▂▂▂▂▂▂▂▂▂▂   |     (positioned absolutely, no layout shift)
+------------------+
```

### Interaction Behavior

1. **Click on title text**: Cycle through sort states (none -> asc -> desc -> none)
2. **Click on three-dot icon**: Open filter popover
3. **Sort indicator shadow**: Uses CSS gradients for visual feedback without affecting layout
4. **Filter popover**: Opens as overlay, doesn't shift table content

### CSS Implementation

```css
.data-grid-header-cell {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.data-grid-header-cell::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.data-grid-header-cell[data-sort="asc"]::after {
  bottom: 0;
  background: linear-gradient(to top, hsl(var(--primary) / 0.4), transparent);
  opacity: 1;
}

.data-grid-header-cell[data-sort="desc"]::after {
  top: 0;
  background: linear-gradient(to bottom, hsl(var(--primary) / 0.4), transparent);
  opacity: 1;
}

.data-grid-header-filter-trigger {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 150ms ease;
}

.data-grid-header-cell:hover .data-grid-header-filter-trigger {
  opacity: 1;
}
```

---

## Toolbar Features

### Layout

```
+------------------------------------------------------------------+
| [🔍 Search...] [Account ▾] [Type ▾] [📅 Date Range] ... [⊞] [⫶] |
+------------------------------------------------------------------+
```

### Components

1. **Global Search**: Text input that filters across all searchable fields
2. **Custom Filters**: Configurable dropdowns/pickers from toolbar config
3. **Column Toggle (⊞)**: Dropdown menu to show/hide columns
4. **Pivot Toggle (⫶)**: Button to show/hide the right-side pivot panel

### Configuration

```typescript
const toolbarConfig: ToolbarConfig = {
  showSearch: true,
  showColumnToggle: true,
  showPivotToggle: true,
  filters: [
    {
      id: "account",
      label: "Account",
      type: "select",
      field: "account_id",
      options: accounts.map(a => ({ label: a.name, value: a.id })),
    },
    {
      id: "dateRange",
      label: "Date Range",
      type: "daterange",
      field: "trade_date",
    },
  ],
  customActions: (
    <>
      <Button onClick={handleImport}>Import</Button>
      <Button onClick={handleNewTrade}>New Trade</Button>
    </>
  ),
}
```

---

## Pivot Panel

### Layout (Right Side Panel)

```
+----------------------------------+
| PIVOT CONFIGURATION        [×]   |
+----------------------------------+
| Available Fields                 |
| +------------------------------+ |
| | 📋 Date        [drag handle] | |
| | 📋 Symbol      [drag handle] | |
| | 📋 Account     [drag handle] | |
| | 📋 Type        [drag handle] | |
| | 📋 Quantity    [drag handle] | |
| | 📋 Amount      [drag handle] | |
| +------------------------------+ |
+----------------------------------+
| Row Groups                       |
| +------------------------------+ |
| |  Drop fields here to group   | |
| +------------------------------+ |
+----------------------------------+
| Column Groups (Pivot)            |
| +------------------------------+ |
| |  Drop fields to pivot        | |
| +------------------------------+ |
+----------------------------------+
| Values                           |
| +------------------------------+ |
| | 📊 Amount  [SUM ▾]           | |
| +------------------------------+ |
+----------------------------------+
| Filters                          |
| +------------------------------+ |
| |  Drop fields to filter       | |
| +------------------------------+ |
+----------------------------------+
| [Reset]            [Apply]       |
+----------------------------------+
```

### Pivot State Schema

```typescript
export const PivotStateSchema = z.object({
  /** Columns used for row grouping */
  rowGroups: z.array(z.object({
    id: z.string(),
    field: z.string(),
    displayName: z.string(),
  })),
  /** Columns used for column pivoting */
  columnGroups: z.array(z.object({
    id: z.string(),
    field: z.string(),
  })),
  /** Value columns with aggregation */
  values: z.array(z.object({
    id: z.string(),
    field: z.string(),
    aggFunc: AggregationFnSchema,
  })),
  /** Filter conditions */
  filters: z.array(z.object({
    id: z.string(),
    field: z.string(),
    condition: FilterConditionSchema,
  })),
})
export type PivotState = z.infer<typeof PivotStateSchema>
```

---

## Usage Examples

### Basic Usage

```tsx
import { DataGrid } from "@/components/data-grid"
import type { Trade } from "@/lib/types"

const columns = [
  {
    id: "trade_date",
    accessorKey: "trade_date",
    header: "Date",
    dateFormat: "yyyy-MM-dd",
  },
  {
    id: "symbol",
    accessorKey: "instrument.symbol",
    header: "Symbol",
  },
  {
    id: "quantity",
    accessorKey: "quantity",
    header: "Qty",
    align: "right" as const,
    numberFormat: { style: "decimal" },
  },
]

export function TradesTable({ trades }: { trades: Trade[] }) {
  return (
    <DataGrid<Trade>
      columns={columns}
      dataSource={{
        type: "client",
        data: trades,
      }}
      features={{
        sorting: true,
        filtering: true,
        pagination: true,
      }}
    />
  )
}
```

### Server-Side Mode

```tsx
import { DataGrid } from "@/components/data-grid"

export function TradesTable() {
  return (
    <DataGrid
      columns={tradeColumns}
      dataSource={{
        type: "server",
        endpoint: "/api/ssrm",
        tableName: "trades",
      }}
      features={{
        sorting: true,
        filtering: true,
        pagination: true,
        rowGrouping: true,
        pivoting: true,
      }}
      toolbar={{
        showSearch: true,
        showColumnToggle: true,
        showPivotToggle: true,
        filters: [
          {
            id: "account",
            label: "Account",
            type: "select",
            field: "account_id",
            options: accountOptions,
          },
        ],
      }}
      pagination={{
        pageSize: 50,
        pageSizeOptions: [20, 50, 100],
      }}
      onRowAction={(action, row) => {
        if (action === "edit") openEditDialog(row)
        if (action === "delete") openDeleteDialog(row)
      }}
    />
  )
}
```

### With Row Actions

```tsx
const columns = [
  // ... other columns
  {
    id: "actions",
    header: "",
    enableSorting: false,
    enableFiltering: false,
    enableHiding: false,
    cell: (_, row) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleEdit(row)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDelete(row)}>
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]
```

---

## Integration Guide

### Installation in Another Project

1. **Copy the component files:**

```bash
# From the source project
cp -r components/data-grid your-project/components/
cp -r lib/ssrm your-project/lib/
```

2. **Install dependencies:**

```bash
npm install @tanstack/react-table @dnd-kit/core @dnd-kit/sortable zod
```

3. **Ensure shadcn/ui components are available:**
   - Table, Button, Input, Popover, DropdownMenu, Sheet, etc.

4. **Set up the SSRM API route (if using server mode):**

```bash
cp app/api/ssrm/route.ts your-project/app/api/ssrm/
```

5. **Configure for your database:**

```typescript
// lib/ssrm/config.ts
export const ssrmConfig = {
  // Map table names to Drizzle schema objects
  tables: {
    trades: tradesTable,
    accounts: accountsTable,
  },
  // Define allowed joins
  relations: {
    trades: {
      account: { table: accountsTable, on: ["account_id", "id"] },
      instrument: { table: instrumentsTable, on: ["instrument_id", "id"] },
    },
  },
}
```

### Environment Variables

No environment variables required for the component itself. The SSRM API uses your existing database connection.

### TypeScript Configuration

The component is fully typed. Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler"
  }
}
```

---

## File Structure

```
components/
  data-grid/
    index.tsx                    # Main export
    data-grid.tsx                # Core component
    data-grid-header.tsx         # Header cell with sort/filter
    data-grid-toolbar.tsx        # Toolbar with search, filters, toggles
    data-grid-pagination.tsx     # Pagination controls
    data-grid-pivot-panel.tsx    # Right-side pivot configuration
    data-grid-filter-popover.tsx # Column filter popover
    data-grid-row-group.tsx      # Grouped row rendering
    types.ts                     # All TypeScript types & Zod schemas
    utils.ts                     # Utility functions
    hooks/
      use-data-grid.ts           # Main state management hook
      use-ssrm.ts                # Server-side data fetching hook
      use-pivot.ts               # Pivot configuration hook

lib/
  ssrm/
    types.ts                     # SSRM request/response types
    query-builder.ts             # Drizzle ORM query builder
    utils.ts                     # SSRM utilities

app/api/ssrm/
  route.ts                       # Generic SSRM endpoint
```
