"use client"

import { useState } from "react"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DataGridFilterPopover } from "./data-grid-filter-popover"
import type { ColumnConfig, FilterConfig } from "./types"

interface DataGridHeaderCellProps<TData> {
  column: ColumnConfig<TData>
  sortDirection?: "asc" | "desc" | false
  isFiltered?: boolean
  onSort?: () => void
  onFilter?: (value: unknown) => void
  onClearFilter?: () => void
  currentFilterValue?: unknown
}

export function DataGridHeaderCell<TData>({
  column,
  sortDirection,
  isFiltered,
  onSort,
  onFilter,
  onClearFilter,
  currentFilterValue,
}: DataGridHeaderCellProps<TData>) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  const canSort = column.enableSorting !== false
  const canFilter = column.enableFiltering !== false && column.filterConfig
  
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 select-none",
        "min-h-[40px] px-3 py-2",
        column.headerClassName
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header content with sort indicator */}
      <div
        className={cn(
          "relative flex-1 font-medium text-sm",
          canSort && "cursor-pointer",
          column.align === "right" && "text-right",
          column.align === "center" && "text-center"
        )}
        onClick={canSort ? onSort : undefined}
        role={canSort ? "button" : undefined}
        tabIndex={canSort ? 0 : undefined}
        onKeyDown={canSort ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onSort?.()
          }
        } : undefined}
      >
        {/* Title text */}
        <span className="relative z-10">{column.header}</span>
        
        {/* Sort indicator shadow - below text for ASC */}
        {sortDirection === "asc" && (
          <span 
            className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-t from-primary/40 to-transparent"
            aria-hidden="true"
          />
        )}
        
        {/* Sort indicator shadow - above text for DESC */}
        {sortDirection === "desc" && (
          <span 
            className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-b from-primary/40 to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      
      {/* Filter active indicator (always visible when filtered) */}
      {isFiltered && !isHovered && (
        <span 
          className="size-1.5 rounded-full bg-primary shrink-0"
          aria-label="Filter active"
        />
      )}
      
      {/* Filter button (visible on hover or when filter open) */}
      {canFilter && (isHovered || isFilterOpen) && (
        <DataGridFilterPopover
          column={column}
          isOpen={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          onApply={onFilter}
          onClear={onClearFilter}
          currentValue={currentFilterValue}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "size-6 shrink-0 transition-opacity",
              isFiltered && "text-primary"
            )}
            aria-label={`Filter ${column.header}`}
          >
            <MoreVertical className="size-3.5" />
          </Button>
        </DataGridFilterPopover>
      )}
      
      {/* Screen reader text for sort state */}
      {sortDirection && (
        <span className="sr-only">
          Sorted {sortDirection === "asc" ? "ascending" : "descending"}
        </span>
      )}
    </div>
  )
}

// Simpler header for non-interactive columns (like actions)
interface DataGridHeaderSimpleProps {
  children?: React.ReactNode
  className?: string
  align?: "left" | "center" | "right"
}

export function DataGridHeaderSimple({ 
  children, 
  className,
  align = "left"
}: DataGridHeaderSimpleProps) {
  return (
    <div
      className={cn(
        "flex items-center px-3 py-2 min-h-[40px] text-sm font-medium",
        align === "right" && "justify-end",
        align === "center" && "justify-center",
        className
      )}
    >
      {children}
    </div>
  )
}
