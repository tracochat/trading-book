"use server"

import { revalidatePath } from "next/cache"
import type { InstrumentFormData } from "@/lib/types"
import { db } from "@/lib/db"
import { instruments as instrumentsTable } from "@/schema/schema"

export async function createInstrument(data: InstrumentFormData) {
  try {
    await db.insert(instrumentsTable).values({
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
  } catch (err) {
    throw err
  }

  revalidatePath('/dashboard/instruments')
}

export async function updateInstrument(id: string, data: Partial<InstrumentFormData>) {
  try {
    await db
      .update(instrumentsTable)
      .set({
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
        updated_at: new Date(),
      })
      .where(instrumentsTable.id.eq(id))
  } catch (err) {
    throw err
  }

  revalidatePath('/dashboard/instruments')
}

export async function deleteInstrument(id: string) {
  try {
    await db.delete(instrumentsTable).where(instrumentsTable.id.eq(id))
  } catch (err) {
    throw err
  }

  revalidatePath('/dashboard/instruments')
}

export async function importInstruments(formData: FormData): Promise<{ imported: number }> {
  const file = formData.get('file') as File
  const format = formData.get('format') as string

  if (!file) {
    throw new Error('No file provided')
  }

  const text = await file.text()
  const lines = text.split('\n').filter(line => line.trim())
  const dataLines = lines.slice(1)

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

  for (const line of dataLines) {
    let parsed: { symbol: string; description: string; exchange: string; currency: string } | null = null
    if (format === 'nasdaq') {
      const parts = line.split('|')
      if (parts.length >= 2 && parts[0] && parts[3] !== 'Y') {
        parsed = {
          symbol: parts[0].trim(),
          description: parts[1].trim(),
          exchange: 'NASDAQ',
          currency: 'USD',
        }
      }
    } else if (format === 'nyse') {
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

  let imported = 0
  const batchSize = 100
  for (let i = 0; i < instruments.length; i += batchSize) {
    const batch = instruments.slice(i, i + batchSize)
    try {
      await db.insert(instrumentsTable).values(...batch).onConflictDoNothing({
        target: instrumentsTable.symbol,
      })
    } catch (err) {
      console.error('Batch insert error:', err)
    }
    imported += batch.length
  }

  revalidatePath('/dashboard/instruments')
  return { imported }
}

export async function getInstruments() {
  try {
    return await db.select().from(instrumentsTable).orderBy(instrumentsTable.symbol)
  } catch (err) {
    throw err
  }
}
