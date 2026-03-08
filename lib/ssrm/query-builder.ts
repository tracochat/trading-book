import { sql, type SQL } from "drizzle-orm"

import type {
  CombinedFilter,
  FilterCondition,
  GroupedRow,
  PivotCol,
  RowGroupCol,
  SSRMRequest,
  SSRMResponse,
  ValueCol,
} from "./types"
import type { SSRMTableConfig } from "./registry"

interface ResolvedDimension {
  id: string
  field: string
  column: string
}

interface PivotColumnMeta {
  id: string
  valueId: string
  header: string
  labels: string[]
}

type SSRMRow = Record<string, unknown>

interface QueryExecutor {
  execute: (query: SQL) => Promise<{ rows: unknown[] }>
}

function alias(columnName: string): SQL {
  return sql.raw(`"${columnName}"`)
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function buildCondition(column: SQL, condition: FilterCondition | CombinedFilter): SQL {
  if ("conditions" in condition) {
    const nested = condition.conditions.map((item) => buildCondition(column, item))
    if (nested.length === 0) {
      return sql`true`
    }
    const operator = condition.operator === "OR" ? sql` OR ` : sql` AND `
    return sql`(${sql.join(nested, operator)})`
  }

  switch (condition.operator) {
    case "equals":
      return sql`${column} = ${condition.filter ?? null}`
    case "notEquals":
      return sql`${column} <> ${condition.filter ?? null}`
    case "contains":
      return sql`${column}::text ilike ${`%${escapeLike(String(condition.filter ?? ""))}%`} escape '\\'`
    case "notContains":
      return sql`${column}::text not ilike ${`%${escapeLike(String(condition.filter ?? ""))}%`} escape '\\'`
    case "startsWith":
      return sql`${column}::text ilike ${`${escapeLike(String(condition.filter ?? ""))}%`} escape '\\'`
    case "endsWith":
      return sql`${column}::text ilike ${`%${escapeLike(String(condition.filter ?? ""))}`} escape '\\'`
    case "blank":
      return sql`(${column} is null or ${column}::text = '')`
    case "notBlank":
      return sql`(${column} is not null and ${column}::text <> '')`
    case "lessThan":
      return sql`${column} < ${condition.filter ?? null}`
    case "lessThanOrEqual":
      return sql`${column} <= ${condition.filter ?? null}`
    case "greaterThan":
      return sql`${column} > ${condition.filter ?? null}`
    case "greaterThanOrEqual":
      return sql`${column} >= ${condition.filter ?? null}`
    case "inRange":
    case "between":
      return sql`${column} between ${condition.filter ?? null} and ${condition.filterTo ?? null}`
    case "before":
      return sql`${column} < ${condition.filter ?? null}`
    case "after":
      return sql`${column} > ${condition.filter ?? null}`
    case "inSet":
      return condition.values && condition.values.length > 0
        ? sql`${column}::text in ${sql`(${sql.join(condition.values.map((value) => sql`${value}`), sql`, `)})`}`
        : sql`true`
    case "notInSet":
      return condition.values && condition.values.length > 0
        ? sql`${column}::text not in ${sql`(${sql.join(condition.values.map((value) => sql`${value}`), sql`, `)})`}`
        : sql`true`
    default:
      return sql`true`
  }
}

function buildWhereClause(request: SSRMRequest, config: SSRMTableConfig): SQL {
  const conditions: SQL[] = []

  for (const [fieldId, condition] of Object.entries(request.filterModel || {})) {
    const mappedField = config.fieldMapping[fieldId]
    if (!mappedField) {
      continue
    }
    conditions.push(buildCondition(alias(mappedField.filterColumn), condition))
  }

  if (request.globalSearch?.trim()) {
    const search = `%${escapeLike(request.globalSearch.trim())}%`
    const searchableColumns = (request.globalSearchFields?.length
      ? request.globalSearchFields
          .map((field) => config.fieldMapping[field]?.filterColumn)
          .filter((field): field is string => Boolean(field))
      : config.searchableFields
    ).filter((field, index, all) => all.indexOf(field) === index)

    if (searchableColumns.length > 0) {
      conditions.push(
        sql`(${sql.join(
          searchableColumns.map((field) => sql`${alias(field)}::text ilike ${search} escape '\\'`),
          sql` OR `
        )})`
      )
    }
  }

  return conditions.length > 0 ? sql`where ${sql.join(conditions, sql` and `)}` : sql``
}

function buildOrderByClause(request: SSRMRequest, config: SSRMTableConfig): SQL {
  const orderItems = request.sortModel
    .map((sortItem) => {
      const mappedField = config.fieldMapping[sortItem.colId]
      if (!mappedField) {
        return null
      }
      const direction = sortItem.sort === "asc" ? sql.raw("asc") : sql.raw("desc")
      return sql`${alias(mappedField.sortColumn || mappedField.filterColumn)} ${direction}`
    })
    .filter((item): item is SQL => Boolean(item))

  if (orderItems.length === 0) {
    return config.querySource.defaultOrderBy
  }

  return sql`order by ${sql.join(orderItems, sql`, `)}`
}

function resolveMappedColumn(
  config: SSRMTableConfig,
  fieldId: string,
  accessorField?: string,
  preferSortColumn = false
): string | null {
  const mappedField = config.fieldMapping[fieldId] || (accessorField ? config.fieldMapping[accessorField] : undefined)
  if (mappedField) {
    return preferSortColumn
      ? mappedField.sortColumn || mappedField.filterColumn
      : mappedField.filterColumn
  }

  const fallback = accessorField || fieldId
  return fallback.includes(".") ? null : fallback
}

function resolveRowGroupColumns(rowGroupCols: RowGroupCol[], config: SSRMTableConfig): ResolvedDimension[] {
  return rowGroupCols
    .map((group) => {
      const column = resolveMappedColumn(config, group.id, group.field, true)
      if (!column) {
        return null
      }
      return {
        id: group.id,
        field: group.field,
        column,
      }
    })
    .filter((item): item is ResolvedDimension => Boolean(item))
}

function resolvePivotColumns(pivotCols: PivotCol[], config: SSRMTableConfig): ResolvedDimension[] {
  return pivotCols
    .map((pivot) => {
      const column = resolveMappedColumn(config, pivot.id, pivot.field, true)
      if (!column) {
        return null
      }
      return {
        id: pivot.id,
        field: pivot.field,
        column,
      }
    })
    .filter((item): item is ResolvedDimension => Boolean(item))
}

function buildAggregateExpression(fieldColumn: string, aggFunc: ValueCol["aggFunc"], outputId: string): SQL {
  switch (aggFunc) {
    case "count":
      return sql`count(${alias(fieldColumn)})::numeric as ${alias(outputId)}`
    case "avg":
      return sql`avg(${alias(fieldColumn)})::numeric as ${alias(outputId)}`
    case "min":
      return sql`min(${alias(fieldColumn)}) as ${alias(outputId)}`
    case "max":
      return sql`max(${alias(fieldColumn)}) as ${alias(outputId)}`
    case "first":
      return sql`min(${alias(fieldColumn)}) as ${alias(outputId)}`
    case "last":
      return sql`max(${alias(fieldColumn)}) as ${alias(outputId)}`
    case "sum":
    default:
      return sql`sum(${alias(fieldColumn)})::numeric as ${alias(outputId)}`
  }
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".")
  let cursor = target

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index]
    const next = cursor[key]
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      cursor[key] = {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }

  cursor[keys[keys.length - 1]] = value
}

function aggregateGroup(rows: SSRMRow[], valueCols: ValueCol[]): Record<string, number> {
  const aggregations: Record<string, number> = {}

  for (const valueCol of valueCols) {
    const values = rows
      .map((row) => {
        // some pivot result ids contain dots or colons which getNestedValue would
        // interpret as a nested path; prefer a direct lookup if possible so the
        // literal key is respected.
        if (Object.prototype.hasOwnProperty.call(row, valueCol.field)) {
          return (row as any)[valueCol.field]
        }
        return getNestedValue(row, valueCol.field)
      })
      // convert numeric strings to numbers
      .map((val) => {
        if (typeof val === "string" && val !== "" && !Number.isNaN(Number(val))) {
          return Number(val)
        }
        return val
      })
      .filter((value): value is number => typeof value === "number" && !Number.isNaN(value))

    switch (valueCol.aggFunc) {
      case "count":
        aggregations[valueCol.id] = rows.length
        break
      case "avg":
        aggregations[valueCol.id] = values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : 0
        break
      case "min":
        aggregations[valueCol.id] = values.length > 0 ? Math.min(...values) : 0
        break
      case "max":
        aggregations[valueCol.id] = values.length > 0 ? Math.max(...values) : 0
        break
      case "first":
        aggregations[valueCol.id] = values[0] ?? 0
        break
      case "last":
        aggregations[valueCol.id] = values[values.length - 1] ?? 0
        break
      case "sum":
      default:
        aggregations[valueCol.id] = values.reduce((sum, value) => sum + value, 0)
        break
    }
  }

  return aggregations
}

function buildGroupedTree(
  rows: SSRMRow[],
  groupColumns: RowGroupCol[],
  valueCols: ValueCol[],
  parentKey = ""
): GroupedRow<SSRMRow>[] {
  if (groupColumns.length === 0) {
    return []
  }

  const [currentGroup, ...rest] = groupColumns
  const buckets = new Map<string, SSRMRow[]>()

  for (const row of rows) {
    const rawValue = getNestedValue(row, currentGroup.field)
    const groupValue = rawValue === null || rawValue === undefined || rawValue === ""
      ? "(blank)"
      : String(rawValue)
    const bucket = buckets.get(groupValue)
    if (bucket) {
      bucket.push(row)
    } else {
      buckets.set(groupValue, [row])
    }
  }

  return Array.from(buckets.entries()).map(([groupValue, groupRows]) => {
    const groupKey = parentKey ? `${parentKey}::${currentGroup.id}:${groupValue}` : `${currentGroup.id}:${groupValue}`
    const nestedChildren = rest.length > 0
      ? buildGroupedTree(groupRows, rest, valueCols, groupKey)
      : groupRows

    return {
      isGroup: true,
      groupKey,
      groupField: currentGroup.id,
      groupValue,
      childCount: groupRows.length,
      aggregations: aggregateGroup(groupRows, valueCols),
      children: nestedChildren,
      isExpandable: Array.isArray(nestedChildren) && nestedChildren.length > 0,
    }
  })
}

function getNestedValue(row: SSRMRow, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || value === undefined) {
      return undefined
    }
    return (value as Record<string, unknown>)[key]
  }, row)
}

async function executeRows<T>(database: QueryExecutor, query: SQL): Promise<T[]> {
  const result = await database.execute(query)
  return result.rows as T[]
}

function buildSelectQuery(
  config: SSRMTableConfig,
  selectedColumns: SQL,
  whereClause: SQL,
  orderByClause: SQL,
  limit?: number,
  offset?: number
): SQL {
  return sql`${config.querySource.baseQuery}
    select ${selectedColumns}
    ${config.querySource.fromClause}
    ${whereClause}
    ${orderByClause}
    ${typeof limit === "number" ? sql`limit ${limit}` : sql``}
    ${typeof offset === "number" ? sql`offset ${offset}` : sql``}`
}

function buildCountQuery(config: SSRMTableConfig, whereClause: SQL): SQL {
  return sql`${config.querySource.baseQuery}
    select count(*)::int as row_count
    ${config.querySource.fromClause}
    ${whereClause}`
}

async function buildConfiguredQuery(
  database: QueryExecutor,
  request: SSRMRequest,
  config: SSRMTableConfig
): Promise<SSRMResponse<SSRMRow>> {
  const whereClause = buildWhereClause(request, config)
  const orderByClause = buildOrderByClause(request, config)
  const rowGroupCols = request.rowGroupCols

  if (rowGroupCols.length > 0 && request.pivotCols.length === 0) {
    const valueCols = request.valueCols.length > 0 ? request.valueCols : []
    const rows = await executeRows<SSRMRow>(
      database,
      buildSelectQuery(config, config.querySource.outputColumns, whereClause, orderByClause)
    )
    const groupedData = buildGroupedTree(rows, rowGroupCols, valueCols)

    return {
      rowData: [],
      rowCount: groupedData.length,
      groupedData,
      metadata: {
        totals: valueCols.length > 0 ? aggregateGroup(rows, valueCols) : {},
      },
    }
  }

  // Pivot mode returns aggregated, wide rows similar to AG Grid SSRM pivoting.
  if (request.pivotCols.length > 0) {
    const resolvedRowGroups = resolveRowGroupColumns(rowGroupCols, config)
    const resolvedPivotCols = resolvePivotColumns(request.pivotCols, config)
    const valueCols = request.valueCols.length > 0
      ? request.valueCols
      : [{ id: "__count", field: "id", aggFunc: "count" as const }]

    const rowGroupSelects = resolvedRowGroups.map((group) => sql`${alias(group.column)} as ${alias(group.id)}`)
    const rowGroupGroupBy = resolvedRowGroups.map((group) => alias(group.column))
    const pivotSelects = resolvedPivotCols.map((pivot, index) => sql`${alias(pivot.column)} as ${alias(`__pivot_${index}`)}`)
    const pivotGroupBy = resolvedPivotCols.map((pivot) => alias(pivot.column))
    const aggregateSelects = valueCols
      .map((valueCol) => {
        const fieldColumn = resolveMappedColumn(config, valueCol.id, valueCol.field)
        if (!fieldColumn) {
          return null
        }
        return buildAggregateExpression(fieldColumn, valueCol.aggFunc, valueCol.id)
      })
      .filter((item): item is SQL => Boolean(item))

    const selectParts = [...rowGroupSelects, ...pivotSelects, ...aggregateSelects]
    const groupByParts = [...rowGroupGroupBy, ...pivotGroupBy]
    const pivotOrderByClause = groupByParts.length > 0
      ? sql`order by ${sql.join(groupByParts, sql`, `)}`
      : sql``

    const pivotQuery = sql`${config.querySource.baseQuery}
      select ${sql.join(selectParts, sql`, `)}
      ${config.querySource.fromClause}
      ${whereClause}
      ${groupByParts.length > 0 ? sql`group by ${sql.join(groupByParts, sql`, `)}` : sql``}
      ${pivotOrderByClause}
    `

    const rawRows = await executeRows<Record<string, unknown>>(database, pivotQuery)

    const rowMap = new Map<string, Record<string, unknown>>()
    const pivotColumnMeta: PivotColumnMeta[] = []
    const pivotMetaMap = new Map<string, PivotColumnMeta>()

    for (const row of rawRows) {
      const rowKey = resolvedRowGroups.length > 0
        ? resolvedRowGroups.map((group) => String(row[group.id] ?? "(blank)")).join("::")
        : "__root__"

      if (!rowMap.has(rowKey)) {
        const base: Record<string, unknown> = {}
        for (const group of resolvedRowGroups) {
          const groupValue = row[group.id]
          base[group.id] = groupValue
          setNestedValue(base, group.field, groupValue)
        }
        rowMap.set(rowKey, base)
      }

      const pivotLabels = resolvedPivotCols.map((_, index) => {
        const rawValue = row[`__pivot_${index}`]
        return rawValue === null || rawValue === undefined || rawValue === ""
          ? "(blank)"
          : String(rawValue)
      })
      const pivotKey = pivotLabels.join("||")
      const entry = rowMap.get(rowKey)!

      for (const valueCol of valueCols) {
        const pivotResultId = `${valueCol.id}::${pivotKey}`
        entry[pivotResultId] = row[valueCol.id]

        if (!pivotMetaMap.has(pivotResultId)) {
          const meta: PivotColumnMeta = {
            id: pivotResultId,
            valueId: valueCol.id,
            header: valueCol.id === "__count" ? "Count" : valueCol.id,
            labels: pivotLabels,
          }
          pivotMetaMap.set(pivotResultId, meta)
          pivotColumnMeta.push(meta)
        }
      }
    }

    const resultRows = Array.from(rowMap.values())
    const total = resultRows.length
    const paged = resultRows.slice(request.startRow, request.endRow)
    const pivotResultCols = pivotColumnMeta.map((item) => item.id)
    const pivotValues = resolvedPivotCols.reduce<Record<string, string[]>>((acc, pivot, index) => {
      acc[pivot.id] = Array.from(new Set(pivotColumnMeta.map((item) => item.labels[index]).filter(Boolean)))
      return acc
    }, {})

    // if there are any row groups, also produce groupedData so the frontend
    // can render a collapsible tree. use the same resultRows (already grouped by
    // rowGroups) to build the tree; valueCols include pivoted fields which will
    // be available on the leaf rows. additionally augument the valueCols list
    // with each generated pivot result column so parent groups can aggregate
    // across the pivoted values as well.
    let groupedData: GroupedRow<SSRMRow>[] | undefined
    if (resolvedRowGroups.length > 0) {
      // create pseudo value columns for pivot result ids using the same aggFunc
      // as their base value column (defaulting to sum)
      const pivotValueCols: ValueCol[] = pivotColumnMeta.map((pm) => {
        const base = valueCols.find((vc) => vc.id === pm.valueId)
        return {
          id: pm.id,
          field: pm.id,
          aggFunc: (base?.aggFunc as ValueCol['aggFunc']) || 'sum',
        }
      })

      groupedData = buildGroupedTree(resultRows, resolvedRowGroups, [...valueCols, ...pivotValueCols])
    }

    return {
      rowData: groupedData && groupedData.length > 0 ? [] : paged as SSRMRow[],
      rowCount: total,
      groupedData,
      pivotResultCols,
      metadata: {
        pivotValues,
        pivotColumns: pivotColumnMeta,
      },
    }
  }

  const limit = Math.max(request.endRow - request.startRow, 1)
  const offset = request.startRow

  const [rowData, countRows] = await Promise.all([
    executeRows<SSRMRow>(database, buildSelectQuery(config, config.querySource.outputColumns, whereClause, orderByClause, limit, offset)),
    executeRows<{ row_count: number }>(database, buildCountQuery(config, whereClause)),
  ])

  return {
    rowData,
    rowCount: countRows[0]?.row_count ?? 0,
    metadata: {},
  }
}

export async function buildSSRMQuery<TData>(
  database: QueryExecutor,
  tableConfig: SSRMTableConfig,
  request: SSRMRequest
): Promise<SSRMResponse<TData>> {
  return await buildConfiguredQuery(database, request, tableConfig) as SSRMResponse<TData>
}
