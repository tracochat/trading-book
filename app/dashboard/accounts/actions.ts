"use server"

import { revalidatePath } from "next/cache"
import type { Platform } from "@/lib/types"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { accounts as accountsTable } from "@/schema/schema"

interface AccountFormData {
  account_id: string
  account_name: string
  platform: Platform
  account_type: string
  base_currency: string
  status: 'active' | 'inactive' | 'closed'
}

export async function createAccount(data: AccountFormData) {
  try {
    await db.insert(accountsTable).values({
      account_id: data.account_id,
      account_name: data.account_name,
      platform: data.platform,
      account_type: data.account_type || null,
      base_currency: data.base_currency,
      status: data.status || 'active',
    })
  } catch (error) {
    console.error('Error creating account:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/accounts')
  return { success: true }
}

export async function updateAccount(id: string, data: AccountFormData) {
  try {
    await db
      .update(accountsTable)
      .set({
        account_id: data.account_id,
        account_name: data.account_name,
        platform: data.platform,
        account_type: data.account_type || null,
        base_currency: data.base_currency,
        status: data.status || 'active',
        updated_at: new Date(),
      })
      .where(accountsTable.id.eq(id))
  } catch (error) {
    console.error('Error updating account:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/accounts')
  return { success: true }
}

export async function deleteAccount(id: string) {
  try {
    // fall back to raw SQL expression since helpers aren't available in this environment
    // (the uuid comparison caused errors previously)
    await db.delete(accountsTable)
      .where(sql`${accountsTable.id} = ${id}`)
  } catch (error) {
    console.error('Error deleting account:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/accounts')
  return { success: true }
}
