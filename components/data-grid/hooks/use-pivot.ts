"use client"

import { useState, useCallback, useMemo } from "react"
import type { PivotState, RowGroupCol, PivotCol, ValueCol, ColumnConfig, AggregationFn } from "../types"

const emptyPivotState: PivotState = {
  rowGroups: [],
  columnGroups: [],
  values: [],
  filters: [],
}

interface UsePivotOptions<TData> {
  columns: ColumnConfig<TData>[]
  initialState?: Partial<PivotState>
  onApply?: (state: PivotState) => void
}

export function usePivot<TData = unknown>(options: UsePivotOptions<TData>) {
  const { columns, initialState, onApply } = options
  
  const [pivotState, setPivotState] = useState<PivotState>({
    ...emptyPivotState,
    ...initialState,
  })
  
  const [draftState, setDraftState] = useState<PivotState>(pivotState)
  const [isDirty, setIsDirty] = useState(false)
  
  // Available fields that can be used in pivot
  const availableFields = useMemo(() => {
    return columns.filter(col => {
      // Field is available if not already used
      const isUsedAsRowGroup = draftState.rowGroups.some(rg => rg.id === col.id)
      const isUsedAsColumnGroup = draftState.columnGroups.some(cg => cg.id === col.id)
      const isUsedAsValue = draftState.values.some(v => v.id === col.id)
      const isUsedAsFilter = draftState.filters.some(f => f.id === col.id)
      
      return !isUsedAsRowGroup && !isUsedAsColumnGroup && !isUsedAsValue && !isUsedAsFilter
    })
  }, [columns, draftState])
  
  // Fields that can be grouped (non-numeric typically)
  const groupableFields = useMemo(() => {
    return columns.filter(col => col.enableGrouping !== false)
  }, [columns])
  
  // Fields that can be aggregated (numeric)
  const aggregatableFields = useMemo(() => {
    return columns.filter(col => col.enableAggregation === true)
  }, [columns])
  
  // Add to row groups
  const addRowGroup = useCallback((columnId: string) => {
    const col = columns.find(c => c.id === columnId)
    if (!col || !col.accessorKey) return
    
    const rowGroupCol: RowGroupCol = {
      id: col.id,
      field: col.accessorKey,
      displayName: col.header,
    }
    
    setDraftState(prev => ({
      ...prev,
      rowGroups: [...prev.rowGroups, rowGroupCol],
    }))
    setIsDirty(true)
  }, [columns])
  
  // Remove from row groups
  const removeRowGroup = useCallback((columnId: string) => {
    setDraftState(prev => ({
      ...prev,
      rowGroups: prev.rowGroups.filter(rg => rg.id !== columnId),
    }))
    setIsDirty(true)
  }, [])
  
  // Reorder row groups
  const reorderRowGroups = useCallback((fromIndex: number, toIndex: number) => {
    setDraftState(prev => {
      const newRowGroups = [...prev.rowGroups]
      const [removed] = newRowGroups.splice(fromIndex, 1)
      newRowGroups.splice(toIndex, 0, removed)
      return { ...prev, rowGroups: newRowGroups }
    })
    setIsDirty(true)
  }, [])
  
  // Add to column groups (pivot columns)
  const addColumnGroup = useCallback((columnId: string) => {
    const col = columns.find(c => c.id === columnId)
    if (!col || !col.accessorKey) return
    
    const pivotCol: PivotCol = {
      id: col.id,
      field: col.accessorKey,
    }
    
    setDraftState(prev => ({
      ...prev,
      columnGroups: [...prev.columnGroups, pivotCol],
    }))
    setIsDirty(true)
  }, [columns])
  
  // Remove from column groups
  const removeColumnGroup = useCallback((columnId: string) => {
    setDraftState(prev => ({
      ...prev,
      columnGroups: prev.columnGroups.filter(cg => cg.id !== columnId),
    }))
    setIsDirty(true)
  }, [])
  
  // Add to values
  const addValue = useCallback((columnId: string, aggFunc: AggregationFn = "sum") => {
    const col = columns.find(c => c.id === columnId)
    if (!col || !col.accessorKey) return
    
    const valueCol: ValueCol = {
      id: col.id,
      field: col.accessorKey,
      aggFunc,
    }
    
    setDraftState(prev => ({
      ...prev,
      values: [...prev.values, valueCol],
    }))
    setIsDirty(true)
  }, [columns])
  
  // Remove from values
  const removeValue = useCallback((columnId: string) => {
    setDraftState(prev => ({
      ...prev,
      values: prev.values.filter(v => v.id !== columnId),
    }))
    setIsDirty(true)
  }, [])
  
  // Update value aggregation function
  const updateValueAggFunc = useCallback((columnId: string, aggFunc: AggregationFn) => {
    setDraftState(prev => ({
      ...prev,
      values: prev.values.map(v => 
        v.id === columnId ? { ...v, aggFunc } : v
      ),
    }))
    setIsDirty(true)
  }, [])
  
  // Add filter
  const addFilter = useCallback((columnId: string) => {
    const col = columns.find(c => c.id === columnId)
    if (!col || !col.accessorKey) return
    
    setDraftState(prev => ({
      ...prev,
      filters: [...prev.filters, {
        id: col.id,
        field: col.accessorKey!,
        condition: {
          filterType: "text",
          operator: "contains",
          filter: "",
        },
      }],
    }))
    setIsDirty(true)
  }, [columns])
  
  // Remove filter
  const removeFilter = useCallback((columnId: string) => {
    setDraftState(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== columnId),
    }))
    setIsDirty(true)
  }, [])
  
  // Move field between zones
  const moveField = useCallback((
    columnId: string,
    fromZone: "available" | "rowGroups" | "columnGroups" | "values" | "filters",
    toZone: "available" | "rowGroups" | "columnGroups" | "values" | "filters"
  ) => {
    if (fromZone === toZone) return
    
    // Remove from source zone
    switch (fromZone) {
      case "rowGroups":
        removeRowGroup(columnId)
        break
      case "columnGroups":
        removeColumnGroup(columnId)
        break
      case "values":
        removeValue(columnId)
        break
      case "filters":
        removeFilter(columnId)
        break
    }
    
    // Add to target zone
    switch (toZone) {
      case "rowGroups":
        addRowGroup(columnId)
        break
      case "columnGroups":
        addColumnGroup(columnId)
        break
      case "values":
        addValue(columnId)
        break
      case "filters":
        addFilter(columnId)
        break
    }
  }, [addRowGroup, removeRowGroup, addColumnGroup, removeColumnGroup, addValue, removeValue, addFilter, removeFilter])
  
  // Apply changes
  const apply = useCallback(() => {
    setPivotState(draftState)
    setIsDirty(false)
    onApply?.(draftState)
  }, [draftState, onApply])
  
  // Reset to last applied state
  const reset = useCallback(() => {
    setDraftState(pivotState)
    setIsDirty(false)
  }, [pivotState])
  
  // Clear all
  const clear = useCallback(() => {
    setDraftState(emptyPivotState)
    setIsDirty(true)
  }, [])
  
  return {
    // State
    pivotState,
    draftState,
    isDirty,
    
    // Derived
    availableFields,
    groupableFields,
    aggregatableFields,
    
    // Row group actions
    addRowGroup,
    removeRowGroup,
    reorderRowGroups,
    
    // Column group actions
    addColumnGroup,
    removeColumnGroup,
    
    // Value actions
    addValue,
    removeValue,
    updateValueAggFunc,
    
    // Filter actions
    addFilter,
    removeFilter,
    
    // General actions
    moveField,
    apply,
    reset,
    clear,
  }
}
