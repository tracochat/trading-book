import { getTableColumns, type SQL } from "drizzle-orm"

import { trades } from "@/schema/schema"
import { tradesQuerySource } from "./query-sources"

export interface SSRMFieldMapping {
  filterColumn: string
  sortColumn?: string
}

export type SSRMColumnType = "string" | "number" | "boolean" | "date" | "json" | "unknown"

export interface SSRMQuerySource {
  baseQuery: SQL
  fromClause: SQL
  outputColumns: SQL
  defaultOrderBy: SQL
}

export interface SSRMColumnMetadata {
  type: SSRMColumnType
}

export interface SSRMTableConfig {
  name: string
  searchableFields: string[]
  fieldMapping: Record<string, SSRMFieldMapping>
  columns: Record<string, SSRMColumnMetadata>
  querySource: SSRMQuerySource
}

function inferColumnType(column: unknown): SSRMColumnType {
  const dataType = (column as { dataType?: string })?.dataType
  switch (dataType) {
    case "string":
      return "string"
    case "number":
      return "number"
    case "boolean":
      return "boolean"
    case "date":
      return "date"
    case "json":
      return "json"
    default:
      return "unknown"
  }
}

function buildSchemaFieldMapping(table: unknown): Record<string, SSRMFieldMapping> {
  const columns = getTableColumns(table as never)
  return Object.fromEntries(
    Object.keys(columns).map((columnName) => [columnName, { filterColumn: columnName, sortColumn: columnName }])
  )
}

function buildSchemaColumnMetadata(
  table: unknown,
  extras: Record<string, SSRMColumnType> = {}
): Record<string, SSRMColumnMetadata> {
  const columns = getTableColumns(table as never)
  return {
    ...Object.fromEntries(
      Object.entries(columns).map(([columnName, column]) => [columnName, { type: inferColumnType(column) }])
    ),
    ...Object.fromEntries(
      Object.entries(extras).map(([columnName, type]) => [columnName, { type }])
    ),
  }
}

export const tableRegistry: Record<string, SSRMTableConfig> = {
  trades: {
    name: "trades",
    searchableFields: [
      "symbol",
      "description",
      "instrument_symbol",
      "instrument_description",
      "account_name",
      "portfolio_name",
      "trade_type",
      "notes",
      "external_id",
    ],
    fieldMapping: {
      ...buildSchemaFieldMapping(trades),
      trade_date: { filterColumn: "trade_date", sortColumn: "trade_date" },
      symbol: { filterColumn: "instrument_symbol", sortColumn: "instrument_symbol" },
      trade_type: { filterColumn: "trade_type", sortColumn: "trade_type" },
      quantity: { filterColumn: "quantity", sortColumn: "quantity" },
      trade_price: { filterColumn: "trade_price", sortColumn: "trade_price" },
      net_amount: { filterColumn: "net_amount", sortColumn: "net_amount" },
      account_id: { filterColumn: "account_id", sortColumn: "account_name" },
      portfolio_id: { filterColumn: "portfolio_id", sortColumn: "portfolio_name" },
      commission: { filterColumn: "commission", sortColumn: "commission" },
      fees: { filterColumn: "fees", sortColumn: "fees" },
      external_id: { filterColumn: "external_id", sortColumn: "external_id" },
      currency: { filterColumn: "currency", sortColumn: "currency" },
      notes: { filterColumn: "notes", sortColumn: "notes" },
      "instrument.symbol": { filterColumn: "instrument_symbol", sortColumn: "instrument_symbol" },
      "instrument.description": { filterColumn: "instrument_description", sortColumn: "instrument_description" },
      "account.account_name": { filterColumn: "account_name", sortColumn: "account_name" },
      "portfolio.name": { filterColumn: "portfolio_name", sortColumn: "portfolio_name" },
    },
    columns: buildSchemaColumnMetadata(trades, {
      trade_type: "string",
      price: "number",
      commission: "number",
      fees: "number",
      fx_rate: "number",
      external_id: "string",
      net_amount: "number",
      account_name: "string",
      portfolio_name: "string",
      instrument_symbol: "string",
      instrument_description: "string",
    }),
    querySource: tradesQuerySource,
  },
}
