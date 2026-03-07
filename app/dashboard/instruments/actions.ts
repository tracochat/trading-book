"use server"

import { revalidatePath } from "next/cache"
import type { BulkInstrument } from "@/lib/instrument-parser"
import { db } from "@/lib/db"
import { instruments as instrumentsTable } from "@/schema/schema"

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
  try {
    await db.insert(instrumentsTable).values({
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
  } catch (error) {
    console.error('Error creating instrument:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/instruments')
  return { success: true }
}

export async function updateInstrument(id: string, data: InstrumentFormData) {
  try {
    await db
      .update(instrumentsTable)
      .set({
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
        updated_at: new Date(),
      })
      .where(instrumentsTable.id.eq(id))
      
  } catch (error) {
    console.error('Error updating instrument:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/instruments')
  return { success: true }
}

export async function deleteInstrument(id: string) {
  try {
    await db.delete(instrumentsTable).where(instrumentsTable.id.eq(id))
  } catch (error) {
    console.error('Error deleting instrument:', error)
    return { error: error instanceof Error ? error.message : String(error) }
  }

  revalidatePath('/dashboard/instruments')
  return { success: true }
}

export async function bulkImportInstruments(instruments: BulkInstrument[]) {
  // fetch existing symbols to avoid duplicates
  const existingRows = await db.select({
    symbol: instrumentsTable.symbol,
    currency: instrumentsTable.currency,
    listing_exchange: instrumentsTable.listing_exchange,
  }).from(instrumentsTable)

  const existingKeys = new Set(
    existingRows.map(r => `${r.symbol}|${r.currency}|${r.listing_exchange || ''}`)
  )

  const seen = new Set<string>()
  const toInsert: BulkInstrument[] = []
  for (const inst of instruments) {
    const key = `${inst.symbol}|${inst.currency}|${inst.listing_exchange || ''}`
    if (existingKeys.has(key) || seen.has(key)) continue
    seen.add(key)
    toInsert.push(inst)
  }

  const skipped = instruments.length - toInsert.length
  if (toInsert.length === 0) return { count: 0, skipped, error: null }

  const batchSize = 100
  let totalInserted = 0
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize)
    try {
      await db.insert(instrumentsTable).values(
        ...batch.map(inst => ({
          symbol: inst.symbol,
          con_id: null,
          description: inst.description,
          asset_category: inst.asset_category,
          listing_exchange: inst.listing_exchange,
          currency: inst.currency,
          multiplier: inst.multiplier,
          isin: null,
          cusip: null,
          figi: null,
          issuer_country_code: inst.issuer_country_code,
          is_active: inst.is_active,
          is_traded: inst.is_traded,
        }))
      )
    } catch (error) {
      console.error('Error bulk importing instruments:', error)
      return { count: totalInserted, skipped, error: error instanceof Error ? error.message : String(error) }
    }
    totalInserted += batch.length
  }

  revalidatePath('/dashboard/instruments')
  return { count: totalInserted, skipped, error: null }
}
