"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

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

interface BulkInstrument {
  symbol: string
  description: string | null
  listing_exchange: string | null
  issuer_country_code: string | null
  asset_category: AssetCategory
  currency: string
  multiplier: number
  is_active: boolean
  is_traded: boolean
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

// Parse NASDAQ Traded symbols file (nasdaqtraded.txt)
// Format: Nasdaq Traded|Symbol|Security Name|Listing Exchange|Market Category|ETF|Round Lot Size|Test Issue|Financial Status|CQS Symbol|NASDAQ Symbol|NextShares
export function parseNasdaqTradedFile(content: string): BulkInstrument[] {
  const lines = content.split('\n').filter(line => line.trim())
  const instruments: BulkInstrument[] = []
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('|')
    if (parts.length < 3) continue
    
    const nasdaqTraded = parts[0]?.trim()
    const symbol = parts[1]?.trim()
    const securityName = parts[2]?.trim()
    const listingExchange = parts[3]?.trim()
    const isETF = parts[5]?.trim() === 'Y'
    const testIssue = parts[7]?.trim() === 'Y'
    
    // Skip test issues and empty symbols
    if (testIssue || !symbol || symbol.length > 10) continue
    
    instruments.push({
      symbol,
      description: securityName || null,
      listing_exchange: listingExchange || 'NASDAQ',
      issuer_country_code: 'US',
      asset_category: isETF ? 'Funds' : 'Stocks',
      currency: 'USD',
      multiplier: 1,
      is_active: nasdaqTraded === 'Y',
      is_traded: false,
    })
  }
  
  return instruments
}

// Parse NASDAQ Other Listed symbols file (otherlisted.txt)
// Format: ACT Symbol|Security Name|Exchange|CQS Symbol|ETF|Round Lot Size|Test Issue|NASDAQ Symbol
export function parseNasdaqOtherListedFile(content: string): BulkInstrument[] {
  const lines = content.split('\n').filter(line => line.trim())
  const instruments: BulkInstrument[] = []
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('|')
    if (parts.length < 3) continue
    
    const symbol = parts[0]?.trim()
    const securityName = parts[1]?.trim()
    const exchange = parts[2]?.trim()
    const isETF = parts[4]?.trim() === 'Y'
    const testIssue = parts[6]?.trim() === 'Y'
    
    // Skip test issues and empty symbols
    if (testIssue || !symbol || symbol.length > 10) continue
    
    instruments.push({
      symbol,
      description: securityName || null,
      listing_exchange: exchange || null,
      issuer_country_code: 'US',
      asset_category: isETF ? 'Funds' : 'Stocks',
      currency: 'USD',
      multiplier: 1,
      is_active: true,
      is_traded: false,
    })
  }
  
  return instruments
}

// Parse NYSE JSON file
// Format: [{ normalizedTicker, instrumentName, url, ... }]
export function parseNyseJsonFile(content: string): BulkInstrument[] {
  const instruments: BulkInstrument[] = []
  
  try {
    const data = JSON.parse(content) as Array<{
      normalizedTicker?: string
      symbolExchangeTicker?: string
      instrumentName?: string
      url?: string
    }>
    
    for (const item of data) {
      const symbol = item.normalizedTicker || item.symbolExchangeTicker
      if (!symbol || symbol.length > 10) continue
      
      // Determine exchange from URL if available
      let exchange = 'NYSE'
      if (item.url) {
        if (item.url.includes('XNYS')) exchange = 'NYSE'
        else if (item.url.includes('XASE')) exchange = 'AMEX'
        else if (item.url.includes('XNAS')) exchange = 'NASDAQ'
        else if (item.url.includes('ARCX')) exchange = 'ARCA'
      }
      
      instruments.push({
        symbol,
        description: item.instrumentName || null,
        listing_exchange: exchange,
        issuer_country_code: 'US',
        asset_category: 'Stocks',
        currency: 'USD',
        multiplier: 1,
        is_active: true,
        is_traded: false,
      })
    }
  } catch (e) {
    console.error('Error parsing NYSE JSON:', e)
  }
  
  return instruments
}

// Parse generic CSV file (with auto-detect columns)
export function parseGenericCsvFile(content: string, separator: string = ','): BulkInstrument[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []
  
  const instruments: BulkInstrument[] = []
  
  // Parse header
  const headers = lines[0].split(separator).map(h => h.trim().toLowerCase())
  
  // Find column indices
  const symbolIdx = headers.findIndex(h => 
    h === 'symbol' || h === 'ticker' || h === 'act symbol' || h === 'nasdaq symbol'
  )
  const nameIdx = headers.findIndex(h => 
    h === 'name' || h === 'security name' || h === 'description' || h === 'company name'
  )
  const exchangeIdx = headers.findIndex(h => 
    h === 'exchange' || h === 'listing exchange' || h === 'market'
  )
  const countryIdx = headers.findIndex(h => 
    h === 'country' || h === 'country code'
  )
  
  if (symbolIdx === -1) {
    throw new Error('Could not find symbol column in file. Expected: Symbol, Ticker, ACT Symbol, or NASDAQ Symbol')
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(separator)
    const symbol = parts[symbolIdx]?.trim()
    
    if (!symbol || symbol.length > 10) continue
    
    instruments.push({
      symbol,
      description: nameIdx >= 0 ? parts[nameIdx]?.trim() || null : null,
      listing_exchange: exchangeIdx >= 0 ? parts[exchangeIdx]?.trim() || null : null,
      issuer_country_code: countryIdx >= 0 ? parts[countryIdx]?.trim() || 'US' : 'US',
      asset_category: 'Stocks',
      currency: 'USD',
      multiplier: 1,
      is_active: true,
      is_traded: false,
    })
  }
  
  return instruments
}

// Auto-detect file format and parse
export function parseInstrumentFile(content: string, filename: string): BulkInstrument[] {
  const lowerFilename = filename.toLowerCase()
  
  // Check if it's JSON
  if (lowerFilename.endsWith('.json') || content.trim().startsWith('[')) {
    return parseNyseJsonFile(content)
  }
  
  // Check if it's pipe-delimited (NASDAQ format)
  if (content.includes('|')) {
    // Check header to determine format
    const firstLine = content.split('\n')[0] || ''
    
    if (firstLine.includes('Nasdaq Traded')) {
      return parseNasdaqTradedFile(content)
    } else if (firstLine.includes('ACT Symbol')) {
      return parseNasdaqOtherListedFile(content)
    }
    
    // Generic pipe-delimited
    return parseGenericCsvFile(content, '|')
  }
  
  // Default to comma-separated
  return parseGenericCsvFile(content, ',')
}
