import { SQL, and, or, eq, like, gt, lt, gte, lte, desc, asc, count, sql } from 'drizzle-orm'
import type { SSRMRequest, SSRMResponse, SSRMFilter } from '@/docs/GRID_DESIGN'

/**
 * Represents a single column configuration for SSRM queries
 */
export interface SSRMColumn {
  field: string
  headerName: string
  type?: 'string' | 'number' | 'date' | 'boolean'
  sortable?: boolean
  filterable?: boolean
  dbColumn?: any // drizzle column reference
}

/**
 * Builds WHERE conditions based on filters
 */
export function buildFilterConditions(
  filters: SSRMFilter[],
  columns: Map<string, SSRMColumn>
): SQL | undefined {
  if (!filters || filters.length === 0) return undefined

  const conditions = filters.map((filter) => {
    const column = columns.get(filter.field)
    if (!column?.dbColumn) return undefined

    const col = column.dbColumn
    const value = filter.value

    switch (filter.operator) {
      case 'equals':
        return eq(col, value)
      case 'notEquals':
        return sql`${col} != ${value}`
      case 'contains':
        return like(col, `%${value}%`)
      case 'notContains':
        return sql`${col} NOT LIKE ${`%${value}%`}`
      case 'startsWith':
        return like(col, `${value}%`)
      case 'endsWith':
        return like(col, `%${value}`)
      case 'greaterThan':
        return gt(col, value)
      case 'lessThan':
        return lt(col, value)
      case 'greaterThanOrEqual':
        return gte(col, value)
      case 'lessThanOrEqual':
        return lte(col, value)
      case 'inRange':
        if (Array.isArray(value) && value.length === 2) {
          return and(gte(col, value[0]), lte(col, value[1]))
        }
        return undefined
      default:
        return undefined
    }
  })

  const validConditions = conditions.filter(Boolean)
  if (validConditions.length === 0) return undefined

  // Combine conditions with AND (all filters must match)
  return and(...validConditions)
}

/**
 * Builds ORDER BY clause based on sort configurations
 */
export function buildOrderBy(
  sortModel: Array<{ field: string; direction: 'asc' | 'desc' }>,
  columns: Map<string, SSRMColumn>
): SQL[] {
  return sortModel
    .map((sort) => {
      const column = columns.get(sort.field)
      if (!column?.dbColumn) return undefined
      return sort.direction === 'asc' ? asc(column.dbColumn) : desc(column.dbColumn)
    })
    .filter(Boolean) as SQL[]
}

/**
 * Applies grouping to query if needed
 */
export function applyGrouping(
  query: any,
  groupByFields: string[],
  columns: Map<string, SSRMColumn>
): any {
  if (!groupByFields || groupByFields.length === 0) return query

  const groupColumns = groupByFields
    .map((field) => {
      const column = columns.get(field)
      return column?.dbColumn
    })
    .filter(Boolean)

  if (groupColumns.length === 0) return query
  return query.groupBy(...groupColumns)
}

/**
 * Processes SSRM request and returns paginated, sorted, filtered data
 */
export async function processSSRMRequest<T>(
  ssrmRequest: SSRMRequest,
  baseQuery: any,
  columns: Map<string, SSRMColumn>,
  countQuery?: any
): Promise<SSRMResponse<T>> {
  const pageSize = ssrmRequest.pageSize || 50
  const startRow = ssrmRequest.startRow || 0
  const endRow = ssrmRequest.endRow || startRow + pageSize

  // Build filter conditions
  const whereCondition = buildFilterConditions(ssrmRequest.filterModel || [], columns)

  // Apply filters to queries
  let filteredQuery = baseQuery
  let filteredCountQuery = countQuery || baseQuery

  if (whereCondition) {
    filteredQuery = filteredQuery.where(whereCondition)
    filteredCountQuery = filteredCountQuery.where(whereCondition)
  }

  // Get total row count
  const countResult = await filteredCountQuery
  const totalRows = Array.isArray(countResult) ? countResult.length : countResult

  // Apply sorting
  const orderByClause = buildOrderBy(ssrmRequest.sortModel || [], columns)
  if (orderByClause.length > 0) {
    filteredQuery = filteredQuery.orderBy(...orderByClause)
  }

  // Apply grouping if needed
  if (ssrmRequest.groupByFields && ssrmRequest.groupByFields.length > 0) {
    filteredQuery = applyGrouping(filteredQuery, ssrmRequest.groupByFields, columns)
  }

  // Apply pagination
  const limit = endRow - startRow
  filteredQuery = filteredQuery.limit(limit).offset(startRow)

  // Execute query
  const rows = await filteredQuery

  // Determine last row index
  const lastRow = Math.min(endRow, totalRows)

  return {
    rowData: rows,
    rowCount: totalRows,
    lastRow: lastRow === totalRows ? totalRows : undefined,
  }
}

/**
 * Helper to create a column map from SSRMColumn array
 */
export function createColumnMap(columns: SSRMColumn[]): Map<string, SSRMColumn> {
  const map = new Map<string, SSRMColumn>()
  columns.forEach((col) => {
    map.set(col.field, col)
  })
  return map
}
