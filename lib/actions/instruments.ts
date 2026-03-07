"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { InstrumentFormData } from "@/lib/types"

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
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/instruments')
}

export async function updateInstrument(id: string, data: Partial<InstrumentFormData>) {
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
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/instruments')
}

export async function deleteInstrument(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('instruments')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/instruments')
}

export async function importInstruments(formData: FormData): Promise<{ imported: number }> {
  const supabase = await createClient()
  
  const file = formData.get('file') as File
  const format = formData.get('format') as string
  
  if (!file) {
    throw new Error('No file provided')
  }

  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  
  const instruments: Array<{
    symbol: string
    description: string | null
    asset_class: string
    exchange: string | null
    currency: string
    is_active: boolean
    is_tradeable: boolean
    multiplier: number
  }> = []

  // Skip header line
  const dataLines = lines.slice(1)
  
  for (const line of dataLines) {
    let parsed: { symbol: string; description: string; exchange: string; currency: string } | null = null
    
    if (format === 'nasdaq') {
      // NASDAQ format: Symbol|Security Name|Market Category|Test Issue|Financial Status|Round Lot Size|ETF|NextShares
      const parts = line.split('|')
      if (parts.length >= 2 && parts[0] && parts[3] !== 'Y') { // Skip test issues
        parsed = {
          symbol: parts[0].trim(),
          description: parts[1].trim(),
          exchange: 'NASDAQ',
          currency: 'USD',
        }
      }
    } else if (format === 'nyse') {
      // NYSE format varies, assume pipe-delimited
      const parts = line.split('|')
      if (parts.length >= 2 && parts[0]) {
        parsed = {
          symbol: parts[0].trim(),
          description: parts[1]?.trim() || '',
          exchange: 'NYSE',
          currency: 'USD',
        }
      }
    } else {
      // CSV format: Symbol, Description, Exchange, Currency
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''))
      if (parts.length >= 1 && parts[0]) {
        parsed = {
          symbol: parts[0],
          description: parts[1] || '',
          exchange: parts[2] || null,
          currency: parts[3] || 'USD',
        }
      }
    }

    if (parsed && parsed.symbol) {
      instruments.push({
        symbol: parsed.symbol,
        description: parsed.description || null,
        asset_class: 'Stocks',
        exchange: parsed.exchange,
        currency: parsed.currency,
        is_active: true,
        is_tradeable: false,
        multiplier: 1,
      })
    }
  }

  if (instruments.length === 0) {
    throw new Error('No valid instruments found in file')
  }

  // Insert in batches of 100, skipping duplicates
  let imported = 0
  const batchSize = 100
  
  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize)
    
    const { error, data } = await supabase
      .from('instruments')
      .upsert(batch, { 
        onConflict: 'symbol',
        ignoreDuplicates: true 
      })
      .select()

    if (error) {
      console.error('Batch insert error:', error)
    } else if (data) {
      imported += data.length
    }
  }

  revalidatePath('/dashboard/instruments')
  
  return { imported }
}

export async function getInstruments() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('instruments')
    .select('*')
    .order('symbol', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
