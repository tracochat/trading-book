"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { CashTransactionType } from "@/lib/types"

interface CashTransactionFormData {
  account_id: string
  transaction_date: string
  transaction_type: CashTransactionType
  amount: number
  currency: string
  description: string
}

export async function createCashTransaction(data: CashTransactionFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('cash_transactions').insert({
    account_id: data.account_id,
    transaction_date: data.transaction_date,
    transaction_type: data.transaction_type,
    amount: data.amount,
    currency: data.currency,
    description: data.description || null,
  })

  if (error) {
    console.error('Error creating cash transaction:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/deposits')
  revalidatePath('/dashboard/cash')
  return { success: true }
}

export async function updateCashTransaction(id: string, data: CashTransactionFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('cash_transactions')
    .update({
      account_id: data.account_id,
      transaction_date: data.transaction_date,
      transaction_type: data.transaction_type,
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating cash transaction:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/deposits')
  revalidatePath('/dashboard/cash')
  return { success: true }
}

export async function deleteCashTransaction(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('cash_transactions')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting cash transaction:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/deposits')
  revalidatePath('/dashboard/cash')
  return { success: true }
}
