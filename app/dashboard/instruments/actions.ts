"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { AssetClass } from "@/lib/types"

interface InstrumentFormData {
  symbol: string
  con_id: string
  description: string
  asset_class: AssetClass
  exchange: string
  currency: string
  multiplier: number
  listing_exchange: string
  sector: string
  industry: string
  country: string
  isin: string
  cusip: string
  sedol: string
  is_active: boolean
  is_tradeable: boolean
}

interface BulkInstrument {
  symbol: string
  description: string | null
  exchange: string | null
  sector: string | null
  industry: string | null
  country: string | null
  asset_class: AssetClass
  currency: string
  multiplier: number
  is_active: boolean
  is_tradeable: boolean
}

export async function createInstrument(data: InstrumentFormData) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('instruments').insert({
    symbol: data.symbol,
    con_id: data.con_id || null,
    description: data.description || null,
    asset_class: data.asset_class,
    exchange: data.exchange || null,
    currency: data.currency,
    multiplier: data.multiplier,
    listing_exchange: data.listing_exchange || null,
    sector: data.sector || null,
    industry: data.industry || null,
    country: data.country || null,
    isin: data.isin || null,
    cusip: data.cusip || null,
    sedol: data.sedol || null,
    is_active: data.is_active,
    is_tradeable: data.is_tradeable,
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
      asset_class: data.asset_class,
      exchange: data.exchange || null,
      currency: data.currency,
      multiplier: data.multiplier,
      listing_exchange: data.listing_exchange || null,
      sector: data.sector || null,
      industry: data.industry || null,
      country: data.country || null,
      isin: data.isin || null,
      cusip: data.cusip || null,
      sedol: data.sedol || null,
      is_active: data.is_active,
      is_tradeable: data.is_tradeable,
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
    .select('symbol')
  
  const existingSymbols = new Set(existing?.map(i => i.symbol) || [])
  
  // Filter out duplicates
  const newInstruments = instruments.filter(i => !existingSymbols.has(i.symbol))
  
  if (newInstruments.length === 0) {
    return { count: 0, error: null }
  }
  
  // Insert in batches of 100
  const batchSize = 100
  let totalInserted = 0
  
  for (let i = 0; i < newInstruments.length; i += batchSize) {
    const batch = newInstruments.slice(i, i + batchSize)
    const { error } = await supabase.from('instruments').insert(batch)
    
    if (error) {
      console.error('Error bulk importing instruments:', error)
      return { count: totalInserted, error: error.message }
    }
    
    totalInserted += batch.length
  }

  revalidatePath('/dashboard/instruments')
  return { count: totalInserted, error: null }
}
