'use server'

import { db, sql } from '@/lib/db'
import { trades as tradesTable } from '@/schema/schema'
import { processSSRMRequest, createColumnMap } from '@/lib/ssrm'
import type { SSRMRequest, SSRMResponse } from '@/docs/GRID_DESIGN'
import type { SSRMColumn } from '@/lib/ssrm'

// Define all columns available for the trades grid
const TRADES_COLUMNS: SSRMColumn[] = [
  {
    field: 'id',
    headerName: 'ID',
    type: 'string',
    sortable: true,
    filterable: false,
    dbColumn: tradesTable.id,
  },
  {
    field: 'symbol',
    headerName: 'Symbol',
    type: 'string',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.symbol,
  },
  {
    field: 'description',
    headerName: 'Description',
    type: 'string',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.description,
  },
  {
    field: 'buy_sell',
    headerName: 'Buy/Sell',
    type: 'string',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.buy_sell,
  },
  {
    field: 'trade_date',
    headerName: 'Trade Date',
    type: 'date',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.trade_date,
  },
  {
    field: 'settle_date',
    headerName: 'Settle Date',
    type: 'date',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.settle_date,
  },
  {
    field: 'quantity',
    headerName: 'Quantity',
    type: 'number',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.quantity,
  },
  {
    field: 'trade_price',
    headerName: 'Price',
    type: 'number',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.trade_price,
  },
  {
    field: 'proceeds',
    headerName: 'Proceeds',
    type: 'number',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.proceeds,
  },
  {
    field: 'comm_fee',
    headerName: 'Commission',
    type: 'number',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.comm_fee,
  },
  {
    field: 'other_fees',
    headerName: 'Fees',
    type: 'number',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.other_fees,
  },
  {
    field: 'currency',
    headerName: 'Currency',
    type: 'string',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.currency,
  },
  {
    field: 'asset_category',
    headerName: 'Asset Category',
    type: 'string',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.asset_category,
  },
  {
    field: 'notes',
    headerName: 'Notes',
    type: 'string',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.notes,
  },
  {
    field: 'created_at',
    headerName: 'Created',
    type: 'date',
    sortable: true,
    filterable: true,
    dbColumn: tradesTable.created_at,
  },
]

const columnMap = createColumnMap(TRADES_COLUMNS)

export async function getTradesSsrm(
  accountId: string,
  request: SSRMRequest
): Promise<SSRMResponse<any>> {
  try {
    // Build base query - filter by account_id
    const baseQuery = db
      .select()
      .from(tradesTable)
      .where(sql`${tradesTable.account_id} = ${accountId}`)

    // Count query for total rows
    const countQuery = db
      .select({ count: sql`COUNT(*)` })
      .from(tradesTable)
      .where(sql`${tradesTable.account_id} = ${accountId}`)

    // Process the SSRM request
    const response = await processSSRMRequest(request, baseQuery, columnMap, countQuery)

    return response
  } catch (error) {
    console.error('Error in getTradesSsrm:', error)
    throw error
  }
}

export function getTradesColumns() {
  return TRADES_COLUMNS
}

export function getTradesColumnMap() {
  return columnMap
}
