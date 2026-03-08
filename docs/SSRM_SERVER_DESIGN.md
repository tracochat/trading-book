# SSRM Server-Side API Design

Server-Side Row Model (SSRM) API design for the DataGrid component, built on Drizzle ORM with PostgreSQL support.

## Table of Contents

1. [Overview](#overview)
2. [API Endpoint Design](#api-endpoint-design)
3. [Drizzle Query Builder](#drizzle-query-builder)
4. [Filter Processing](#filter-processing)
5. [Sorting Implementation](#sorting-implementation)
6. [Pagination with Groups](#pagination-with-groups)
7. [Aggregation Support](#aggregation-support)
8. [Security Considerations](#security-considerations)
9. [Performance Optimization](#performance-optimization)
10. [Error Handling](#error-handling)

---

## Overview

The SSRM API provides a generic, secure, and performant way to query database tables with:

- Dynamic filtering based on column types
- Multi-column sorting
- Pagination with accurate counts
- Row grouping with aggregation
- Pivot mode support
- Relation/join support

### Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐      ┌──────────┐
│  DataGrid   │─────▶│  SSRM Hook   │─────▶│  /api/ssrm      │─────▶│ Postgres │
│  Component  │      │  (Debounced) │      │  Query Builder  │      │ Database │
└─────────────┘      └──────────────┘      └─────────────────┘      └──────────┘
                           │                       │
                           │                       ▼
                           │               ┌─────────────────┐
                           │               │  Table Registry │
                           │               │  (Whitelist)    │
                           │               └─────────────────┘
                           │
                           ▼
                     ┌──────────────┐
                     │  SSRMResponse│
                     │  with cache  │
                     └──────────────┘
```

---

## API Endpoint Design

### Route: `POST /api/ssrm`

```typescript
// app/api/ssrm/route.ts
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { SSRMRequestSchema, type SSRMResponse } from "@/lib/ssrm/types"
import { buildSSRMQuery } from "@/lib/ssrm/query-builder"
import { tableRegistry } from "@/lib/ssrm/registry"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate request against schema
    const parseResult = SSRMRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      )
    }
    
    const ssrmRequest = parseResult.data
    
    // Security: Check if table is allowed
    if (!ssrmRequest.tableName || !tableRegistry[ssrmRequest.tableName]) {
      return NextResponse.json(
        { error: "Table not found or not allowed" },
        { status: 403 }
      )
    }
    
    const tableConfig = tableRegistry[ssrmRequest.tableName]
    
    // Build and execute query
    const startTime = performance.now()
    
    const response = await buildSSRMQuery(
      db,
      tableConfig.table,
      ssrmRequest,
      {
        relations: tableConfig.relations,
        fieldMapping: tableConfig.fieldMapping,
        searchableFields: tableConfig.searchableFields,
      }
    )
    
    const queryTime = performance.now() - startTime
    
    return NextResponse.json({
      ...response,
      metadata: {
        ...response.metadata,
        queryTime: Math.round(queryTime),
      },
    })
  } catch (error) {
    console.error("SSRM API Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

### Table Registry

```typescript
// lib/ssrm/registry.ts
import { trades, accounts, instruments, portfolios } from "@/schema/schema"
import type { PgTable } from "drizzle-orm/pg-core"

export interface TableRegistryEntry {
  table: PgTable
  /** Relations for JOIN queries */
  relations?: {
    [key: string]: {
      table: PgTable
      localField: string
      foreignField: string
      type: "one" | "many"
    }
  }
  /** Map frontend field names to actual column names */
  fieldMapping?: Record<string, string>
  /** Fields included in global search */
  searchableFields?: string[]
  /** Fields that should never be exposed */
  hiddenFields?: string[]
}

export const tableRegistry: Record<string, TableRegistryEntry> = {
  trades: {
    table: trades,
    relations: {
      account: {
        table: accounts,
        localField: "account_id",
        foreignField: "id",
        type: "one",
      },
      instrument: {
        table: instruments,
        localField: "instrument_id",
        foreignField: "id",
        type: "one",
      },
      portfolio: {
        table: portfolios,
        localField: "portfolio_id",
        foreignField: "id",
        type: "one",
      },
    },
    fieldMapping: {
      "instrument.symbol": "instruments.symbol",
      "account.account_name": "accounts.account_name",
      "portfolio.name": "portfolios.name",
    },
    searchableFields: ["symbol", "description", "notes"],
  },
  accounts: {
    table: accounts,
    searchableFields: ["account_id", "account_name", "platform"],
  },
  instruments: {
    table: instruments,
    searchableFields: ["symbol", "description", "cusip", "isin"],
  },
}
```

---

## Drizzle Query Builder

### Main Query Builder Function

```typescript
// lib/ssrm/query-builder.ts
import { db } from "@/lib/db"
import { 
  sql, eq, ne, like, ilike, gt, gte, lt, lte, 
  between, inArray, notInArray, isNull, isNotNull,
  and, or, asc, desc, count, sum, avg, min, max
} from "drizzle-orm"
import type { PgTable, PgColumn } from "drizzle-orm/pg-core"
import type { SSRMRequest, SSRMResponse, FilterCondition } from "./types"

export interface QueryBuilderOptions {
  relations?: Record<string, {
    table: PgTable
    localField: string
    foreignField: string
    type: "one" | "many"
  }>
  fieldMapping?: Record<string, string>
  searchableFields?: string[]
}

export async function buildSSRMQuery<TData>(
  database: typeof db,
  table: PgTable,
  request: SSRMRequest,
  options: QueryBuilderOptions = {}
): Promise<SSRMResponse<TData>> {
  const {
    startRow,
    endRow,
    sortModel,
    filterModel,
    globalSearch,
    globalSearchFields,
    rowGroupCols,
    groupKeys,
    valueCols,
    pivotMode,
    pivotCols,
  } = request

  const { relations, fieldMapping, searchableFields } = options
  
  // Determine if we're fetching group data or leaf data
  const isGroupRequest = rowGroupCols.length > 0 && groupKeys.length < rowGroupCols.length
  
  if (isGroupRequest) {
    return buildGroupQuery(database, table, request, options)
  }
  
  // Build WHERE conditions
  const whereConditions = buildWhereConditions(filterModel, table, fieldMapping)
  
  // Add global search condition
  if (globalSearch && globalSearch.trim()) {
    const searchFields = globalSearchFields || searchableFields || []
    const searchCondition = buildGlobalSearchCondition(
      globalSearch, 
      searchFields, 
      table, 
      fieldMapping
    )
    if (searchCondition) {
      whereConditions.push(searchCondition)
    }
  }
  
  // Add group key filters (for nested group requests)
  if (groupKeys.length > 0) {
    for (let i = 0; i < groupKeys.length; i++) {
      const col = rowGroupCols[i]
      const column = getColumn(table, col.field, fieldMapping)
      if (column) {
        whereConditions.push(eq(column, groupKeys[i]))
      }
    }
  }
  
  // Build base query with joins
  let query = database.select().from(table)
  
  // Add joins for relations
  if (relations) {
    for (const [key, relation] of Object.entries(relations)) {
      const localCol = table[relation.localField as keyof typeof table] as PgColumn
      const foreignCol = relation.table[relation.foreignField as keyof typeof relation.table] as PgColumn
      if (localCol && foreignCol) {
        query = query.leftJoin(relation.table, eq(localCol, foreignCol))
      }
    }
  }
  
  // Apply WHERE conditions
  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions))
  }
  
  // Apply sorting
  if (sortModel.length > 0) {
    const orderBy = sortModel.map(sort => {
      const column = getColumn(table, sort.colId, fieldMapping)
      if (!column) return null
      return sort.sort === "desc" ? desc(column) : asc(column)
    }).filter(Boolean)
    
    if (orderBy.length > 0) {
      query = query.orderBy(...orderBy)
    }
  }
  
  // Get total count (before pagination)
  const countQuery = database
    .select({ count: count() })
    .from(table)
  
  if (relations) {
    for (const [key, relation] of Object.entries(relations)) {
      const localCol = table[relation.localField as keyof typeof table] as PgColumn
      const foreignCol = relation.table[relation.foreignField as keyof typeof relation.table] as PgColumn
      if (localCol && foreignCol) {
        countQuery.leftJoin(relation.table, eq(localCol, foreignCol))
      }
    }
  }
  
  if (whereConditions.length > 0) {
    countQuery.where(and(...whereConditions))
  }
  
  const [countResult] = await countQuery
  const totalCount = Number(countResult?.count || 0)
  
  // Apply pagination
  const limit = endRow - startRow
  query = query.limit(limit).offset(startRow)
  
  // Execute query
  const rows = await query
  
  // Calculate totals if value columns are specified
  let totals: Record<string, number> | undefined
  if (valueCols.length > 0) {
    totals = await calculateTotals(database, table, valueCols, whereConditions, relations)
  }
  
  return {
    rowData: rows as TData[],
    rowCount: totalCount,
    metadata: {
      totals,
    },
  }
}
```

### Group Query Builder

```typescript
async function buildGroupQuery<TData>(
  database: typeof db,
  table: PgTable,
  request: SSRMRequest,
  options: QueryBuilderOptions
): Promise<SSRMResponse<TData>> {
  const { rowGroupCols, groupKeys, valueCols, startRow, endRow, filterModel } = request
  const { relations, fieldMapping } = options
  
  // Current group level
  const groupLevel = groupKeys.length
  const currentGroupCol = rowGroupCols[groupLevel]
  
  if (!currentGroupCol) {
    throw new Error("Invalid group configuration")
  }
  
  const column = getColumn(table, currentGroupCol.field, fieldMapping)
  if (!column) {
    throw new Error(`Column not found: ${currentGroupCol.field}`)
  }
  
  // Build WHERE conditions including parent group filters
  const whereConditions = buildWhereConditions(filterModel, table, fieldMapping)
  
  // Add parent group filters
  for (let i = 0; i < groupKeys.length; i++) {
    const parentCol = rowGroupCols[i]
    const parentColumn = getColumn(table, parentCol.field, fieldMapping)
    if (parentColumn) {
      whereConditions.push(eq(parentColumn, groupKeys[i]))
    }
  }
  
  // Build aggregation selections
  const aggregations: Record<string, ReturnType<typeof sum | typeof avg | typeof count | typeof min | typeof max>> = {}
  
  for (const valueCol of valueCols) {
    const valueColumn = getColumn(table, valueCol.field, fieldMapping)
    if (valueColumn) {
      switch (valueCol.aggFunc) {
        case "sum":
          aggregations[valueCol.id] = sum(valueColumn)
          break
        case "avg":
          aggregations[valueCol.id] = avg(valueColumn)
          break
        case "count":
          aggregations[valueCol.id] = count(valueColumn)
          break
        case "min":
          aggregations[valueCol.id] = min(valueColumn)
          break
        case "max":
          aggregations[valueCol.id] = max(valueColumn)
          break
      }
    }
  }
  
  // Build group query
  let query = database
    .select({
      groupValue: column,
      childCount: count(),
      ...aggregations,
    })
    .from(table)
  
  // Add joins
  if (relations) {
    for (const [key, relation] of Object.entries(relations)) {
      const localCol = table[relation.localField as keyof typeof table] as PgColumn
      const foreignCol = relation.table[relation.foreignField as keyof typeof relation.table] as PgColumn
      if (localCol && foreignCol) {
        query = query.leftJoin(relation.table, eq(localCol, foreignCol))
      }
    }
  }
  
  // Apply WHERE conditions
  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions))
  }
  
  // Group by current column
  query = query.groupBy(column)
  
  // Order by group value
  query = query.orderBy(asc(column))
  
  // Pagination for groups
  const limit = endRow - startRow
  query = query.limit(limit).offset(startRow)
  
  // Execute query
  const rows = await query
  
  // Get total group count
  const countQuery = database
    .select({ count: sql`COUNT(DISTINCT ${column})` })
    .from(table)
  
  if (whereConditions.length > 0) {
    countQuery.where(and(...whereConditions))
  }
  
  const [countResult] = await countQuery
  const totalGroups = Number(countResult?.count || 0)
  
  // Transform to GroupedRow format
  const groupedData = rows.map(row => ({
    isGroup: true as const,
    groupKey: String(row.groupValue),
    groupField: currentGroupCol.field,
    groupValue: String(row.groupValue),
    childCount: Number(row.childCount),
    aggregations: valueCols.reduce((acc, col) => {
      acc[col.id] = Number(row[col.id as keyof typeof row] || 0)
      return acc
    }, {} as Record<string, number>),
    isExpandable: groupLevel < rowGroupCols.length - 1,
  }))
  
  return {
    rowData: [],
    rowCount: totalGroups,
    groupedData,
  }
}
```

---

## Filter Processing

### Building WHERE Conditions

```typescript
function buildWhereConditions(
  filterModel: Record<string, FilterCondition>,
  table: PgTable,
  fieldMapping?: Record<string, string>
): SQL[] {
  const conditions: SQL[] = []
  
  for (const [field, filter] of Object.entries(filterModel)) {
    const column = getColumn(table, field, fieldMapping)
    if (!column) continue
    
    // Handle combined filters (AND/OR)
    if (filter.filterType === "combined") {
      const subConditions = filter.conditions.map(cond => 
        buildFilterCondition(column, cond)
      ).filter(Boolean)
      
      if (subConditions.length > 0) {
        if (filter.operator === "OR") {
          conditions.push(or(...subConditions)!)
        } else {
          conditions.push(and(...subConditions)!)
        }
      }
      continue
    }
    
    const condition = buildFilterCondition(column, filter)
    if (condition) {
      conditions.push(condition)
    }
  }
  
  return conditions
}

function buildFilterCondition(
  column: PgColumn,
  filter: FilterCondition
): SQL | undefined {
  const { filterType, operator, filter: value, filterTo, values } = filter
  
  switch (operator) {
    // Text operators
    case "equals":
      return eq(column, value)
    case "notEquals":
      return ne(column, value)
    case "contains":
      return ilike(column, `%${value}%`)
    case "notContains":
      return sql`${column} NOT ILIKE ${`%${value}%`}`
    case "startsWith":
      return ilike(column, `${value}%`)
    case "endsWith":
      return ilike(column, `%${value}`)
    case "blank":
      return or(isNull(column), eq(column, ""))
    case "notBlank":
      return and(isNotNull(column), ne(column, ""))
    
    // Number operators
    case "lessThan":
      return lt(column, value)
    case "lessThanOrEqual":
      return lte(column, value)
    case "greaterThan":
      return gt(column, value)
    case "greaterThanOrEqual":
      return gte(column, value)
    case "inRange":
      if (value !== undefined && filterTo !== undefined) {
        return between(column, value, filterTo)
      }
      return undefined
    
    // Date operators
    case "before":
      return lt(column, value)
    case "after":
      return gt(column, value)
    case "between":
      if (value !== undefined && filterTo !== undefined) {
        return between(column, value, filterTo)
      }
      return undefined
    
    // Set operators
    case "inSet":
      if (values && values.length > 0) {
        return inArray(column, values)
      }
      return undefined
    case "notInSet":
      if (values && values.length > 0) {
        return notInArray(column, values)
      }
      return undefined
    
    default:
      return undefined
  }
}
```

### Global Search

```typescript
function buildGlobalSearchCondition(
  searchTerm: string,
  fields: string[],
  table: PgTable,
  fieldMapping?: Record<string, string>
): SQL | undefined {
  if (!searchTerm.trim() || fields.length === 0) {
    return undefined
  }
  
  const term = `%${searchTerm.trim().toLowerCase()}%`
  
  const conditions = fields.map(field => {
    const column = getColumn(table, field, fieldMapping)
    if (!column) return null
    // Cast to text for consistent ILIKE behavior
    return sql`LOWER(CAST(${column} AS TEXT)) LIKE ${term}`
  }).filter(Boolean)
  
  if (conditions.length === 0) {
    return undefined
  }
  
  return or(...conditions)!
}
```

---

## Sorting Implementation

```typescript
function buildOrderBy(
  sortModel: Array<{ colId: string; sort: "asc" | "desc" }>,
  table: PgTable,
  fieldMapping?: Record<string, string>
): SQL[] {
  return sortModel
    .map(sort => {
      const column = getColumn(table, sort.colId, fieldMapping)
      if (!column) return null
      
      // Handle nulls: NULLS LAST for ASC, NULLS FIRST for DESC
      if (sort.sort === "desc") {
        return sql`${column} DESC NULLS FIRST`
      }
      return sql`${column} ASC NULLS LAST`
    })
    .filter((x): x is SQL => x !== null)
}
```

---

## Pagination with Groups

### AG-Grid Style Group Pagination

When row grouping is enabled, pagination works at the group level:

```typescript
interface GroupPaginationStrategy {
  // Level 0: Show top-level groups
  // Level 1+: Show children of expanded group
  
  /**
   * For top-level groups:
   * - startRow/endRow refer to group indices
   * - Return groups with childCount
   * 
   * For expanded groups:
   * - groupKeys identifies the parent path
   * - Return either child groups or leaf rows
   */
}

async function getGroupPage<TData>(
  database: typeof db,
  table: PgTable,
  request: SSRMRequest,
  options: QueryBuilderOptions
): Promise<SSRMResponse<TData>> {
  const { rowGroupCols, groupKeys, startRow, endRow } = request
  
  // Determine current depth
  const currentDepth = groupKeys.length
  const isLeafLevel = currentDepth >= rowGroupCols.length
  
  if (isLeafLevel) {
    // Fetch actual rows (leaf data)
    return buildSSRMQuery(database, table, request, options)
  }
  
  // Fetch groups at current level
  return buildGroupQuery(database, table, request, options)
}
```

### Efficient Count Queries

```typescript
async function getEffectiveRowCount(
  database: typeof db,
  table: PgTable,
  request: SSRMRequest,
  options: QueryBuilderOptions
): Promise<number> {
  const { rowGroupCols, groupKeys, filterModel } = request
  
  const whereConditions = buildWhereConditions(filterModel, table, options.fieldMapping)
  
  // Add parent group filters
  for (let i = 0; i < groupKeys.length; i++) {
    const col = rowGroupCols[i]
    const column = getColumn(table, col.field, options.fieldMapping)
    if (column) {
      whereConditions.push(eq(column, groupKeys[i]))
    }
  }
  
  const currentDepth = groupKeys.length
  const isLeafLevel = currentDepth >= rowGroupCols.length
  
  if (isLeafLevel) {
    // Count actual rows
    const [result] = await database
      .select({ count: count() })
      .from(table)
      .where(and(...whereConditions))
    
    return Number(result?.count || 0)
  }
  
  // Count distinct groups at current level
  const currentGroupCol = rowGroupCols[currentDepth]
  const column = getColumn(table, currentGroupCol.field, options.fieldMapping)
  
  if (!column) return 0
  
  const [result] = await database
    .select({ count: sql`COUNT(DISTINCT ${column})` })
    .from(table)
    .where(and(...whereConditions))
  
  return Number(result?.count || 0)
}
```

---

## Aggregation Support

### Calculating Totals

```typescript
async function calculateTotals(
  database: typeof db,
  table: PgTable,
  valueCols: Array<{ id: string; field: string; aggFunc: string }>,
  whereConditions: SQL[],
  relations?: QueryBuilderOptions["relations"]
): Promise<Record<string, number>> {
  const selections: Record<string, ReturnType<typeof sum | typeof avg | typeof count>> = {}
  
  for (const col of valueCols) {
    const column = table[col.field as keyof typeof table] as PgColumn
    if (!column) continue
    
    switch (col.aggFunc) {
      case "sum":
        selections[col.id] = sum(column)
        break
      case "avg":
        selections[col.id] = avg(column)
        break
      case "count":
        selections[col.id] = count(column)
        break
      case "min":
        selections[col.id] = min(column)
        break
      case "max":
        selections[col.id] = max(column)
        break
    }
  }
  
  let query = database.select(selections).from(table)
  
  // Add joins if needed
  if (relations) {
    for (const [key, relation] of Object.entries(relations)) {
      const localCol = table[relation.localField as keyof typeof table] as PgColumn
      const foreignCol = relation.table[relation.foreignField as keyof typeof relation.table] as PgColumn
      if (localCol && foreignCol) {
        query = query.leftJoin(relation.table, eq(localCol, foreignCol))
      }
    }
  }
  
  if (whereConditions.length > 0) {
    query = query.where(and(...whereConditions))
  }
  
  const [result] = await query
  
  return valueCols.reduce((acc, col) => {
    acc[col.id] = Number(result?.[col.id as keyof typeof result] || 0)
    return acc
  }, {} as Record<string, number>)
}
```

---

## Security Considerations

### Table Whitelist

```typescript
// Only tables in the registry can be queried
const allowedTables = new Set(Object.keys(tableRegistry))

export function validateTableAccess(tableName: string): boolean {
  return allowedTables.has(tableName)
}
```

### Field Whitelist

```typescript
// Optionally restrict which fields can be filtered/sorted
export function validateFieldAccess(
  tableName: string,
  field: string
): boolean {
  const config = tableRegistry[tableName]
  if (!config) return false
  
  // Check if field is explicitly hidden
  if (config.hiddenFields?.includes(field)) {
    return false
  }
  
  // Check if field exists in table or mapping
  const column = getColumn(config.table, field, config.fieldMapping)
  return column !== null
}
```

### SQL Injection Prevention

```typescript
// All values are parameterized through Drizzle ORM
// Never interpolate user input directly into SQL strings

// GOOD: Using Drizzle's parameterized queries
const result = await db
  .select()
  .from(trades)
  .where(eq(trades.symbol, userInput)) // Parameterized

// BAD: Never do this
// const result = await db.execute(sql`SELECT * FROM trades WHERE symbol = '${userInput}'`)
```

### Rate Limiting (Optional)

```typescript
// middleware.ts or in the API route
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
})

export async function rateLimitCheck(identifier: string): Promise<boolean> {
  const { success } = await ratelimit.limit(identifier)
  return success
}
```

---

## Performance Optimization

### Query Optimization

```typescript
// 1. Select only needed columns
const selectFields = columns.reduce((acc, col) => {
  const column = getColumn(table, col.accessorKey, fieldMapping)
  if (column) {
    acc[col.id] = column
  }
  return acc
}, {} as Record<string, PgColumn>)

// 2. Use covering indexes
// CREATE INDEX idx_trades_symbol_date ON trades(symbol, trade_date) INCLUDE (quantity, price);

// 3. Limit join depth
const MAX_JOIN_DEPTH = 2
```

### Caching Strategy

```typescript
import { unstable_cache } from "next/cache"

export const getCachedSSRMResponse = unstable_cache(
  async (cacheKey: string, request: SSRMRequest) => {
    return buildSSRMQuery(db, tableRegistry[request.tableName!].table, request)
  },
  ["ssrm"],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ["ssrm"],
  }
)

// Generate cache key from request
function generateCacheKey(request: SSRMRequest): string {
  return JSON.stringify({
    table: request.tableName,
    sort: request.sortModel,
    filter: request.filterModel,
    page: `${request.startRow}-${request.endRow}`,
    groups: request.groupKeys,
  })
}
```

### Batch Loading for Relations

```typescript
// Instead of N+1 queries, batch load related data
async function batchLoadRelations<TData extends Record<string, any>>(
  rows: TData[],
  relations: QueryBuilderOptions["relations"]
): Promise<TData[]> {
  if (!relations || rows.length === 0) return rows
  
  for (const [key, relation] of Object.entries(relations)) {
    const ids = [...new Set(rows.map(r => r[relation.localField]).filter(Boolean))]
    
    if (ids.length === 0) continue
    
    const relatedRows = await db
      .select()
      .from(relation.table)
      .where(inArray(relation.table[relation.foreignField], ids))
    
    const relatedMap = new Map(
      relatedRows.map(r => [r[relation.foreignField], r])
    )
    
    for (const row of rows) {
      row[key] = relatedMap.get(row[relation.localField])
    }
  }
  
  return rows
}
```

---

## Error Handling

### Error Types

```typescript
export class SSRMError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = "SSRMError"
  }
}

export const SSRMErrors = {
  TABLE_NOT_FOUND: (table: string) => 
    new SSRMError(`Table '${table}' not found`, "TABLE_NOT_FOUND", 404),
  
  FIELD_NOT_FOUND: (field: string) => 
    new SSRMError(`Field '${field}' not found`, "FIELD_NOT_FOUND", 400),
  
  INVALID_FILTER: (field: string, reason: string) => 
    new SSRMError(`Invalid filter on '${field}': ${reason}`, "INVALID_FILTER", 400),
  
  QUERY_TIMEOUT: () => 
    new SSRMError("Query timed out", "QUERY_TIMEOUT", 504),
  
  RATE_LIMITED: () => 
    new SSRMError("Too many requests", "RATE_LIMITED", 429),
}
```

### Error Response Format

```typescript
interface SSRMErrorResponse {
  error: string
  code: string
  details?: unknown
}

function handleSSRMError(error: unknown): NextResponse {
  if (error instanceof SSRMError) {
    return NextResponse.json(
      { error: error.message, code: error.code, details: error.details },
      { status: error.status }
    )
  }
  
  console.error("Unexpected SSRM error:", error)
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  )
}
```

---

## Database Indexes

Recommended indexes for optimal SSRM performance:

```sql
-- Trades table indexes
CREATE INDEX idx_trades_account_id ON trades(account_id);
CREATE INDEX idx_trades_instrument_id ON trades(instrument_id);
CREATE INDEX idx_trades_portfolio_id ON trades(portfolio_id);
CREATE INDEX idx_trades_trade_date ON trades(trade_date DESC);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_buy_sell ON trades(buy_sell);

-- Composite indexes for common queries
CREATE INDEX idx_trades_account_date ON trades(account_id, trade_date DESC);
CREATE INDEX idx_trades_symbol_date ON trades(symbol, trade_date DESC);

-- Full-text search index (optional)
CREATE INDEX idx_trades_search ON trades USING gin(
  to_tsvector('english', coalesce(symbol, '') || ' ' || coalesce(description, '') || ' ' || coalesce(notes, ''))
);
```

---

## API Response Examples

### Simple Query Response

```json
{
  "rowData": [
    {
      "id": "uuid-1",
      "trade_date": "2024-01-15",
      "symbol": "AAPL",
      "quantity": 100,
      "price": 185.50,
      "net_amount": 18550.00,
      "account": { "account_name": "Main Portfolio" },
      "instrument": { "symbol": "AAPL", "description": "Apple Inc." }
    }
  ],
  "rowCount": 1523,
  "metadata": {
    "queryTime": 45,
    "totals": {
      "quantity": 125000,
      "net_amount": 4523000.00
    }
  }
}
```

### Grouped Query Response

```json
{
  "rowData": [],
  "rowCount": 5,
  "groupedData": [
    {
      "isGroup": true,
      "groupKey": "AAPL",
      "groupField": "symbol",
      "groupValue": "AAPL",
      "childCount": 45,
      "aggregations": {
        "quantity": 12500,
        "net_amount": 2315000.00
      },
      "isExpandable": true
    },
    {
      "isGroup": true,
      "groupKey": "GOOGL",
      "groupField": "symbol",
      "groupValue": "GOOGL",
      "childCount": 32,
      "aggregations": {
        "quantity": 8500,
        "net_amount": 1208000.00
      },
      "isExpandable": true
    }
  ],
  "metadata": {
    "queryTime": 38
  }
}
```
