"use server"

import { revalidatePath } from "next/cache"
import type { AccountFormData } from "@/lib/types"
import { db } from "@/lib/db"
import { accounts as accountsTable } from "@/schema/schema"

export async function createAccount(data: AccountFormData) {
  try {
    await db.insert(accountsTable).values({
      account_id: data.account_id,
      account_name: data.account_name,
      platform: data.platform,
      account_type: data.account_type || null,
      base_currency: data.base_currency,
      is_active: data.is_active,
    })
  } catch (err) {
    throw err
  }

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}

export async function updateAccount(id: string, data: Partial<AccountFormData>) {
  try {
    await db
      .update(accountsTable)
      .set({
        account_id: data.account_id,
        account_name: data.account_name,
        platform: data.platform,
        account_type: data.account_type || null,
        base_currency: data.base_currency,
        is_active: data.is_active,
        updated_at: new Date(),
      })
      .where(accountsTable.id.eq(id))
  } catch (err) {
    throw err
  }

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}

export async function deleteAccount(id: string) {
  try {
    await db.delete(accountsTable).where(accountsTable.id.eq(id))
  } catch (err) {
    throw err
  }

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}

export async function getAccounts() {
  return await db.select().from(accountsTable).orderBy(accountsTable.created_at, 'desc')
}
