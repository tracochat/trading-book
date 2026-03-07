"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { TradeFormData } from "@/lib/types"

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
  net_amount: number
}

export async function createTrade(data: TradeInput) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('trades').insert({
    account_id: data.account_id,
    portfolio_id: data.portfolio_id || null,
    instrument_id: data.instrument_id,
    trade_date: data.trade_date,
    settle_date: data.settle_date || null,
    trade_type: data.trade_type,
    quantity: data.quantity,
    price: data.price,
    gross_amount: data.gross_amount,
    commission: data.commission,
    fees: data.fees,
    net_amount: data.net_amount,
    currency: data.currency,
    fx_rate: data.fx_rate || null,
    notes: data.notes || null,
    external_id: data.external_id || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateTrade(id: string, data: Partial<TradeInput>) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('trades')
    .update({
      account_id: data.account_id,
      portfolio_id: data.portfolio_id || null,
      instrument_id: data.instrument_id,
      trade_date: data.trade_date,
      settle_date: data.settle_date || null,
      trade_type: data.trade_type,
      quantity: data.quantity,
      price: data.price,
      gross_amount: data.gross_amount,
      commission: data.commission,
      fees: data.fees,
      net_amount: data.net_amount,
      currency: data.currency,
      fx_rate: data.fx_rate || null,
      notes: data.notes || null,
      external_id: data.external_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTrade(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard')
  return { success: true }
}
