"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { AccountFormData } from "@/lib/types"

export async function createAccount(data: AccountFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('accounts').insert({
    account_id: data.account_id,
    account_name: data.account_name,
    platform: data.platform,
    account_type: data.account_type || null,
    base_currency: data.base_currency,
    is_active: data.is_active,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}

export async function updateAccount(id: string, data: Partial<AccountFormData>) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('accounts')
    .update({
      account_id: data.account_id,
      account_name: data.account_name,
      platform: data.platform,
      account_type: data.account_type || null,
      base_currency: data.base_currency,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/accounts')
  revalidatePath('/dashboard')
}

export async function getAccounts() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
