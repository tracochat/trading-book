"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { BulkInstrument } from "@/lib/instrument-parser"

// Asset categories matching the database schema
type AssetCategory = 'Stocks' | 'Equity and Index Options' | 'Bonds' | 'Cash' | 'Futures' | 'Forex' | 'Funds' | 'Warrants' | 'CFD' | 'Other'

interface InstrumentFormData {
  symbol: string
  con_id?: string
  description?: string
  asset_category: AssetCategory
  listing_exchange?: string
  currency: string
  multiplier?: number
  isin?: string
  cusip?: string
  figi?: string
  issuer_country_code?: string
  is_active?: boolean
  is_traded?: boolean
}

export async function createInstrument(data: InstrumentFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('instruments').insert({
    symbol: data.symbol,
    con_id: data.con_id || null,
    description: data.description || null,
    asset_category: data.asset_category,
    listing_exchange: data.listing_exchange || null,
    currency: data.currency,
    multiplier: data.multiplier || 1,
    isin: data.isin || null,
    cusip: data.cusip || null,
    figi: data.figi || null,
    issuer_country_code: data.issuer_country_code || null,
    is_active: data.is_active ?? true,
    is_traded: data.is_traded ?? false,
  })

  if (error) {
    console.error('Error creating instrument:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/instruments')
  return { success: true }
}

export async function updateInstrument(id: string, data: InstrumentFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('instruments')
    .update({
      symbol: data.symbol,
      con_id: data.con_id || null,
      description: data.description || null,
      asset_category: data.asset_category,
      listing_exchange: data.listing_exchange || null,
      currency: data.currency,
      multiplier: data.multiplier || 1,
      isin: data.isin || null,
      cusip: data.cusip || null,
      figi: data.figi || null,
      issuer_country_code: data.issuer_country_code || null,
      is_active: data.is_active ?? true,
      is_traded: data.is_traded ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating instrument:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/instruments')
  return { success: true }
}

export async function deleteInstrument(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('instruments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting instrument:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/instruments')
  return { success: true }
}

export async function bulkImportInstruments(instruments: BulkInstrument[]) {
  const supabase = await createClient()
  
  // Get existing symbols to avoid duplicates
  const { data: existing } = await supabase
    .from('instruments')
    .select('symbol, currency, listing_exchange')
  
  const existingKeys = new Set(
    existing?.map(i => `${i.symbol}|${i.currency}|${i.listing_exchange || ''}`) || []
  )
  
  // Filter out duplicates (based on symbol + currency + listing_exchange)
  const newInstruments = instruments.filter(i => 
    !existingKeys.has(`${i.symbol}|${i.currency}|${i.listing_exchange || ''}`)
  )
  
  if (newInstruments.length === 0) {
    return { count: 0, skipped: instruments.length, error: null }
  }
  
  // Insert in batches of 100
  const batchSize = 100
  let totalInserted = 0
  
  for (let i = 0; i < newInstruments.length; i += batchSize) {
    const batch = newInstruments.slice(i, i + batchSize)
    const { error } = await supabase.from('instruments').insert(batch)
    
    if (error) {
      console.error('Error bulk importing instruments:', error)
      return { count: totalInserted, skipped: instruments.length - newInstruments.length, error: error.message }
    }
    
    totalInserted += batch.length
  }

  revalidatePath('/dashboard/instruments')
  return { count: totalInserted, skipped: instruments.length - newInstruments.length, error: null }
}
