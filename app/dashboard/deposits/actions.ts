"use server"

import { revalidatePath } from "next/cache"
import type { CashTransactionType } from "@/lib/types"
import { db } from "@/lib/db"
import { cashTransactions as cashTable } from "@/schema/schema"

interface CashTransactionFormData {
  account_id: string
  transaction_date: string
  transaction_type: CashTransactionType
  amount: number
  currency: string
  description: string
}

export async function createCashTransaction(data: CashTransactionFormData) {
  try {
    await db.insert(cashTable).values({
      account_id: data.account_id,
      transaction_date: data.transaction_date,
      transaction_type: data.transaction_type,
      amount: data.amount,
      currency: data.currency,
      description: data.description || null,
    })
  } catch (error) {
    console.error('Error creating cash transaction:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/deposits')
  revalidatePath('/dashboard/cash')
  return { success: true }
}

export async function updateCashTransaction(id: string, data: CashTransactionFormData) {
  try {
    await db
      .update(cashTable)
      .set({
        account_id: data.account_id,
        transaction_date: data.transaction_date,
        transaction_type: data.transaction_type,
        amount: data.amount,
        currency: data.currency,
        description: data.description || null,
        updated_at: new Date(),
      })
      .where(cashTable.id.eq(id))
      
  } catch (error) {
    console.error('Error updating cash transaction:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/deposits')
  revalidatePath('/dashboard/cash')
  return { success: true }
}

export async function deleteCashTransaction(id: string) {
  try {
    await db.delete(cashTable).where(cashTable.id.eq(id))
  } catch (error) {
    console.error('Error deleting cash transaction:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/deposits')
  revalidatePath('/dashboard/cash')
  return { success: true }
}
