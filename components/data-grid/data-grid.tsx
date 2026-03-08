"use client"

import { useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useDataGrid } from "./hooks/use-data-grid"
import { DataGridHeaderCell } from "./data-grid-header"
import { DataGridPagination } from "./data-grid-pagination"
import { getNestedValue, formatCellValue, getAlignmentClass, getColumnWidthStyle } from "./utils"
import type { ColumnConfig } from "./types"

export function DataGridTable<TData>() {
  const { 
    config, 
    state, 
    actions, 
    processedData, 
    totalCount 
  } = useDataGrid<TData>()
  
  const features = {
    sorting: true,
    filtering: true,
    pagination: true,
    ...config.features,
  }
  
  // Transform column config to TanStack Table column defs
  const columns: ColumnDef<TData>[] = useMemo(() => {
    return config.columns.map((col): ColumnDef<TData> => ({
      id: col.id,
      accessorFn: col.accessorFn || (col.accessorKey 
        ? (row) => getNestedValue(row, col.accessorKey!)
        : undefined
      ),
      header: ({ column }) => {
        const sortDirection = column.getIsSorted()
        const isFiltered = column.getIsFiltered()
        const filterValue = column.getFilterValue()
        
        if (col.headerCell) {
          return col.headerCell()
        }
        
        return (
          <DataGridHeaderCell
            column={col}
            sortDirection={sortDirection}
            isFiltered={isFiltered}
            onSort={() => {
              if (col.enableSorting !== false) {
                column.toggleSorting()
              }
            }}
            onFilter={(value) => {
              column.setFilterValue(value)
            }}
            onClearFilter={() => {
              column.setFilterValue(undefined)
            }}
            currentFilterValue={filterValue}
          />
        )
      },
      cell: ({ getValue, row, cell }) => {
        const value = getValue()
        
        if (col.cell) {
          return col.cell(value, row.original, row.index)
        }
        
        const formatted = formatCellValue(value, col)
        
        return (
          <div 
            className={cn(
              "px-3 py-2",
              getAlignmentClass(col.align),
              col.className
            )}
          >
            {formatted}
          </div>
        )
      },
      enableSorting: col.enableSorting !== false && features.sorting,
      enableColumnFilter: col.enableFiltering !== false && features.filtering,
      enableHiding: col.enableHiding !== false,
      size: typeof col.width === "number" ? col.width : undefined,
      minSize: col.minWidth,
      maxSize: col.maxWidth,
    }))
  }, [config.columns, features.sorting, features.filtering])
  
  // Create table instance
  const table = useReactTable({
    data: processedData,
    columns,
    state: {
      sorting: state.sorting,
      columnFilters: state.columnFilters,
      columnVisibility: state.columnVisibility,
      rowSelection: state.rowSelection,
      globalFilter: state.globalFilter,
      pagination: {
        pageIndex: state.pageIndex,
        pageSize: state.pageSize,
      },
    },
    onSortingChange: actions.setSorting,
    onColumnFiltersChange: actions.setColumnFilters,
    onColumnVisibilityChange: actions.setColumnVisibility,
    onRowSelectionChange: actions.setRowSelection,
    onGlobalFilterChange: actions.setGlobalFilter,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === "function"
        ? updater({ pageIndex: state.pageIndex, pageSize: state.pageSize })
        : updater
      actions.setPageIndex(newPagination.pageIndex)
      actions.setPageSize(newPagination.pageSize)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: config.dataSource.type === "client" ? getSortedRowModel() : undefined,
    getFilteredRowModel: config.dataSource.type === "client" ? getFilteredRowModel() : undefined,
    getPaginationRowModel: config.dataSource.type === "client" ? getPaginationRowModel() : undefined,
    manualPagination: config.dataSource.type === "server",
    manualSorting: config.dataSource.type === "server",
    manualFiltering: config.dataSource.type === "server",
    pageCount: Math.ceil(totalCount / state.pageSize),
    getRowId: config.getRowId,
  })
  
  const rows = table.getRowModel().rows
  
  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const colConfig = config.columns.find(c => c.id === header.column.id)
                  
                  return (
                    <TableHead
                      key={header.id}
                      style={colConfig ? getColumnWidthStyle(colConfig) : undefined}
                      className="p-0"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {state.isLoading ? (
              // Loading skeleton
              Array.from({ length: state.pageSize }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {config.columns.map((col) => (
                    <TableCell key={col.id} className="p-3">
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-0">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      {features.pagination && (
        <DataGridPagination
          pageIndex={state.pageIndex}
          pageSize={state.pageSize}
          totalRows={totalCount}
          pageSizeOptions={config.pagination?.pageSizeOptions || [10, 20, 50, 100]}
          onPageChange={actions.setPageIndex}
          onPageSizeChange={actions.setPageSize}
          showPageSizeSelector={config.pagination?.showPageSizeSelector !== false}
          showRowCount={config.pagination?.showRowCount !== false}
          isLoading={state.isLoading}
        />
      )}
      
      {/* Error display */}
      {state.error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive text-sm">
          Error loading data: {state.error.message}
        </div>
      )}
    </div>
  )
}
