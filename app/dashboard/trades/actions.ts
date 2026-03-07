"use server"

import { revalidatePath } from "next/cache"
import type { TradeFormData } from "@/lib/types"
import { db, sql } from "@/lib/db"
import { trades as tradesTable } from "@/schema/schema"

interface TradeInput {
  account_id: string
  portfolio_id: string
  instrument_id: string
  trade_date: string
  settle_date: string
  trade_type: string
  quantity: number
  price: number
  commission: number
  fees: number
  currency: string
  fx_rate: number
  notes: string
  external_id: string
  gross_amount: number
  // derived fields required by the schema
  symbol: string
  description?: string
  asset_category: string
  buy_sell: string
}

export async function createTrade(data: TradeInput) {
  console.log('createTrade data:', data)
  try {
    await db.insert(tradesTable).values({
      account_id: data.account_id,
      portfolio_id: data.portfolio_id || null,
      instrument_id: data.instrument_id,
      // required lookup fields
      symbol: data.symbol,
      description: data.description || null,
      asset_category: data.asset_category,
      buy_sell: data.buy_sell,
      trade_date: data.trade_date,
      settle_date: data.settle_date || null,
      order_type: data.trade_type || 'Buy',
      quantity: data.quantity,
      trade_price: data.price,
      proceeds: data.gross_amount,
      comm_fee: data.commission,
      other_fees: data.fees,
      // net_amount is not a column in schema, drop it
      currency: data.currency,
      fx_rate_to_base: data.fx_rate || null,
      notes: data.notes || null,
      trade_id: data.external_id || null,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTrade(id: string, data: Partial<TradeInput>) {
  try {
    await db
      .update(tradesTable)
      .set({
        account_id: data.account_id,
        portfolio_id: data.portfolio_id || null,
        instrument_id: data.instrument_id,
        symbol: data.symbol,
        description: data.description || null,
        asset_category: data.asset_category,
        buy_sell: data.buy_sell,
        trade_date: data.trade_date,
        settle_date: data.settle_date || null,
        order_type: data.trade_type || 'Buy',
        quantity: data.quantity,
        trade_price: data.price,
        proceeds: data.gross_amount,
        comm_fee: data.commission,
        other_fees: data.fees,
        // net_amount removed
        currency: data.currency,
        fx_rate_to_base: data.fx_rate || null,
        notes: data.notes || null,
        trade_id: data.external_id || null,
        updated_at: new Date(),
      })
      .where(sql`${tradesTable.id} = ${id}`)
      
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTrade(id: string) {
  try {
    await db.delete(tradesTable).where(sql`${tradesTable.id} = ${id}`)
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard')
  return { success: true }
}
