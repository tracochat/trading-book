"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Platform } from "@/lib/types"

interface AccountFormData {
  account_id: string
  account_name: string
  platform: Platform
  account_type: string
  base_currency: string
  is_active: boolean
}

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
    console.error('Error creating account:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/accounts')
  return { success: true }
}

export async function updateAccount(id: string, data: AccountFormData) {
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
    console.error('Error updating account:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/accounts')
  return { success: true }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting account:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/accounts')
  return { success: true }
}
