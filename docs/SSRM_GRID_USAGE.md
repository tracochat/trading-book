# SSRM Grid Usage

This project ships a reusable data grid that supports server-side row model (SSRM), row grouping, pivoting, filtering, sorting, and server-driven dynamic pivot columns.

## Overview

Use the SSRM grid when:

- The dataset is too large to preload into the browser.
- Filtering and sorting should be executed on the server.
- Row grouping and pivoting need server-generated aggregates.

The core pieces are:

- `DataGridProvider` for grid state and SSRM fetching.
- `DataGridTable` for rendering rows, grouped rows, and pivot columns.
- `/api/ssrm` for validated SSRM requests.
- `tableRegistry` for table-specific field mappings and query sources.

## Minimal Setup

Example based on the trades grid:

```tsx
const gridConfig: DataGridConfig<TradeRow> = {
  id: "trades-grid",
  columns,
  dataSource: {
    type: "server",
    endpoint: "/api/ssrm",
    tableName: "trades",
  },
  features: {
    sorting: true,
    filtering: true,
    pagination: true,
    rowGrouping: true,
    pivoting: true,
    globalSearch: true,
  },
  pagination: {
    pageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },
  getRowId: (row) => row.id,
}

return (
  <DataGridProvider config={gridConfig}>
    <DataGridToolbar columns={columns} toolbar={{ showPivotToggle: true }} />
    <DataGridTable />
  </DataGridProvider>
)
```

## Column Requirements

For SSRM to work correctly, each column should define:

- `id`: unique column identifier.
- `accessorKey` or `accessorFn`: source field used by the UI.
- `enableSorting`, `enableFiltering`, `enableGrouping`, `enablePivoting`, `enableAggregation` as needed.

For pivoting and grouping, prefer `accessorKey` values that match `tableRegistry.fieldMapping` entries.

Example:

```tsx
{
  id: "quantity",
  accessorKey: "quantity",
  header: "Quantity",
  align: "right",
  enableSorting: true,
  enableAggregation: true,
  aggregation: "sum",
}
```

## What The Grid Sends

When configured for SSRM, the provider sends a POST body like:

```json
{
  "startRow": 0,
  "endRow": 20,
  "sortModel": [],
  "filterModel": {},
  "globalSearch": "AAPL",
  "globalSearchFields": ["symbol", "notes"],
  "tableName": "trades",
  "rowGroupCols": [{ "id": "account", "field": "account.account_name", "displayName": "Account" }],
  "groupKeys": [],
  "pivotMode": true,
  "pivotCols": [{ "id": "instrument.symbol", "field": "instrument.symbol" }],
  "valueCols": [{ "id": "quantity", "field": "quantity", "aggFunc": "sum" }]
}
```

Notes:

- `rowGroupCols.displayName` is required by the schema.
- `pivotMode` is automatically derived from whether `pivotCols` has entries.
- `valueCols` should be provided for meaningful aggregates.

## Grouping And Pivoting In The UI

Open the pivot panel from the toolbar.

- Drag fields into `Row Groups` to enable grouped rows.
- Drag fields into `Column Groups` to enable pivoted columns.
- Drag numeric fields into `Values` and choose `sum`, `avg`, `count`, `min`, `max`, `first`, or `last`.
- Click `Apply` to commit the draft state.

Behavior:

- Only row groups: server returns `groupedData`, and the table renders a collapsible tree.
- Only column groups: server returns wide pivot rows and dynamic pivot headers.
- Row groups plus column groups: server returns both `groupedData` and dynamic pivot column metadata so grouped rows can show pivot aggregates.

## API Response Contract

The `/api/ssrm` endpoint returns:

```ts
interface SSRMResponse<TData> {
  rowData: TData[]
  rowCount: number
  groupedData?: GroupedRow<TData>[]
  pivotResultCols?: string[]
  metadata?: {
    queryTime?: number
    totals?: Record<string, number>
    pivotValues?: Record<string, string[]>
    pivotColumns?: Array<{
      id: string
      valueId: string
      header: string
      labels: string[]
    }>
  }
}
```

Important details:

- `groupedData` is used instead of `rowData` whenever the server returns grouped rows.
- `pivotColumns` describes server-generated pivot leaf columns.
- Dynamic pivot IDs use the format `valueId::pivotValue` or `valueId::pivotA||pivotB`.

## Registering A Table

Tables are registered in `lib/ssrm/registry.ts`.

Each entry defines:

- `fieldMapping` from UI field IDs to SQL-visible columns.
- `searchableFields` used by global search.
- `querySource` with the base SQL projection and default ordering.
- `columns` metadata derived from Drizzle schema columns plus any computed output columns.

For simple tables, schema-driven mappings can be generated from Drizzle table definitions. Complex joined views can extend those mappings with computed fields.

## Making A New SSRM Table

1. Add a registry entry for the table in `lib/ssrm/registry.ts`.
2. If needed, add a query source in `lib/ssrm/query-sources.ts`.
3. Point `dataSource.tableName` to that registry key.
4. Ensure column `id` / `accessorKey` values line up with the registry mapping.
5. Enable only the features the endpoint can support.

## Current Limitations

- The existing implementation is fully generic for SSRM request handling, filtering, sorting, grouping, and pivot orchestration, but each table still needs a registered query source.
- Complex joined views like trades need explicit derived-field mappings.
- Row-group responses are returned as a full grouped tree rather than lazy-loading each group level.

## Testing Checklist

When adding a new SSRM grid, verify:

- Flat sorting and filtering work.
- Global search works on configured searchable fields.
- Row grouping renders a collapsible tree.
- Pivot-only mode renders dynamic headers and aggregated values.
- Row grouping plus pivoting shows group rows and pivot aggregates together.
- Empty filters and invalid mappings fail safely.