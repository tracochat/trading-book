"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import {
  instruments,
  trades,
  dividends,
  cashTransactions,
  transactionFees,
  interest,
  withholdingTax,
  activityImports,
} from "@/schema/schema"

interface ParsedTrade {
  trade_date: string
  symbol: string
  description?: string
  asset_category: string
  buy_sell: string
  quantity: number
  price: number
  commission: number
  fees: number
  proceeds: number
  currency: string
  settle_date?: string
  exchange?: string
}

interface ParsedDividend {
  pay_date: string
  symbol: string
  description?: string
  gross_amount: number
  net_amount: number
  withholding_tax: number
  currency: string
}

interface ParsedDeposit {
  transaction_date: string
  transaction_type: string
  amount: number
  currency: string
  description?: string
}

interface ParsedFee {
  fee_date: string
  fee_type: string
  amount: number
  currency: string
  symbol?: string
  description?: string
}

interface ParsedInterest {
  interest_date: string
  amount: number
  currency: string
  interest_type?: string
  description?: string
}

interface ParsedWithholdingTax {
  tax_date: string
  amount: number
  currency: string
  symbol?: string
  description?: string
}

export interface ParsedData {
  trades: ParsedTrade[]
  dividends: ParsedDividend[]
  deposits: ParsedDeposit[]
  fees: ParsedFee[]
  interest: ParsedInterest[]
  withholdingTax: ParsedWithholdingTax[]
  forexBalances: any[]
  openPositions: any[]
  periodStart?: string
  periodEnd?: string
}

export async function parseIBKRReport(htmlContent: string): Promise<{ data: ParsedData | null; error: string | null }> {
  try {
    const data: ParsedData = {
      trades: [],
      dividends: [],
      deposits: [],
      fees: [],
      interest: [],
      withholdingTax: [],
      forexBalances: [],
      openPositions: [],
    }

    // Extract period from the report
    const periodMatch = htmlContent.match(/Statement\s*Period[\s\S]*?(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/i)
    if (periodMatch) {
      data.periodStart = periodMatch[1]
      data.periodEnd = periodMatch[2]
    }

    // Helper function to extract cell values
    const extractCellValues = (row: string): string[] => {
      const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
      return cells.map(c => c.replace(/<[^>]*>/g, '').trim())
    }

    // Helper function to parse numbers
    const parseNumber = (val: string): number => {
      if (!val) return 0
      // Remove commas and handle parentheses for negative numbers
      let cleaned = val.replace(/,/g, '').trim()
      if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
        cleaned = '-' + cleaned.slice(1, -1)
      }
      const num = parseFloat(cleaned)
      return isNaN(num) ? 0 : num
    }

    // Helper to parse date in various formats
    const parseDate = (val: string): string => {
      if (!val) return new Date().toISOString().split('T')[0]
      // Try YYYY-MM-DD format first
      if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
        return val.split(',')[0].split(' ')[0]
      }
      // Try MM/DD/YYYY format
      const mdyMatch = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (mdyMatch) {
        return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`
      }
      return val.split(',')[0].split(' ')[0]
    }

    // Parse Trades section - look for the specific table structure
    const tradesTableMatch = htmlContent.match(/class="[^"]*sectionHeading[^"]*"[^>]*>\s*Trades\s*<[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i)
    if (tradesTableMatch) {
      const tableHtml = tradesTableMatch[1]
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      let headers: string[] = []
      let currentAssetCategory = 'Stocks'
      
      for (const row of rows) {
        // Check for asset category header
        const assetMatch = row.match(/row-summary[^>]*>(Stocks|Equity and Index Options|Bonds|Forex|Futures|Funds)/i)
        if (assetMatch) {
          currentAssetCategory = assetMatch[1]
          continue
        }
        
        const values = extractCellValues(row)
        
        // Check if this is a header row
        if (row.includes('header') || values.some(v => v.toLowerCase() === 'symbol')) {
          headers = values.map(v => v.toLowerCase())
          continue
        }
        
        // Skip total/subtotal rows
        if (values.some(v => v.toLowerCase().includes('total') || v.toLowerCase().includes('subtotal'))) {
          continue
        }
        
        if (headers.length > 0 && values.length >= 5) {
          const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)))
          
          const symbolIdx = getIdx(['symbol'])
          const dateIdx = getIdx(['date/time', 'datetime', 'trade date'])
          const qtyIdx = getIdx(['quantity', 'qty'])
          const priceIdx = getIdx(['t. price', 'trade price', 'price'])
          const proceedsIdx = getIdx(['proceeds'])
          const commIdx = getIdx(['comm/fee', 'commission', 'comm'])
          const codeIdx = getIdx(['code'])
          
          const symbol = values[symbolIdx]
          const qty = parseNumber(values[qtyIdx])
          const price = parseNumber(values[priceIdx])
          
          // Skip if no valid symbol or quantity
          if (!symbol || symbol === '' || qty === 0) continue
          
          const code = codeIdx >= 0 ? values[codeIdx] : ''
          const isBuy = qty > 0
          
          data.trades.push({
            trade_date: parseDate(values[dateIdx]),
            symbol: symbol,
            asset_category: currentAssetCategory,
            buy_sell: isBuy ? 'BUY' : 'SELL',
            quantity: Math.abs(qty),
            price: Math.abs(price),
            proceeds: Math.abs(parseNumber(values[proceedsIdx])),
            commission: Math.abs(parseNumber(values[commIdx])),
            fees: 0,
            currency: 'USD',
          })
        }
      }
    }

    // Parse Dividends section
    const dividendsTableMatch = htmlContent.match(/class="[^"]*sectionHeading[^"]*"[^>]*>\s*Dividends\s*<[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i)
    if (dividendsTableMatch) {
      const tableHtml = dividendsTableMatch[1]
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      let headers: string[] = []
      
      for (const row of rows) {
        const values = extractCellValues(row)
        
        if (row.includes('header') || values.some(v => v.toLowerCase() === 'date')) {
          headers = values.map(v => v.toLowerCase())
          continue
        }
        
        if (values.some(v => v.toLowerCase().includes('total'))) continue
        
        if (headers.length > 0 && values.length >= 3) {
          const dateIdx = headers.findIndex(h => h.includes('date'))
          const descIdx = headers.findIndex(h => h.includes('description'))
          const amountIdx = headers.findIndex(h => h.includes('amount'))
          
          const amount = parseNumber(values[amountIdx])
          const description = values[descIdx] || ''
          
          if (amount === 0) continue
          
          // Extract symbol from description (usually first word)
          const symbolMatch = description.match(/^([A-Z0-9.]+)[\s(]/)
          
          data.dividends.push({
            pay_date: parseDate(values[dateIdx]),
            symbol: symbolMatch?.[1] || 'UNKNOWN',
            description,
            gross_amount: amount,
            net_amount: amount,
            withholding_tax: 0,
            currency: 'USD',
          })
        }
      }
    }

    // Parse Deposits & Withdrawals section
    const depositsTableMatch = htmlContent.match(/class="[^"]*sectionHeading[^"]*"[^>]*>\s*Deposits\s*(?:&amp;|&)\s*Withdrawals\s*<[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i)
    if (depositsTableMatch) {
      const tableHtml = depositsTableMatch[1]
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      let headers: string[] = []
      
      for (const row of rows) {
        const values = extractCellValues(row)
        
        if (row.includes('header') || values.some(v => v.toLowerCase() === 'settle date')) {
          headers = values.map(v => v.toLowerCase())
          continue
        }
        
        if (values.some(v => v.toLowerCase().includes('total'))) continue
        
        if (headers.length > 0 && values.length >= 3) {
          const dateIdx = headers.findIndex(h => h.includes('settle date'))
          const descIdx = headers.findIndex(h => h.includes('description'))
          const amountIdx = headers.findIndex(h => h.includes('amount'))
          
          const amount = parseNumber(values[amountIdx])
          if (amount === 0) continue
          
          // Determine transaction type
          let txType = 'Other'
          const desc = (values[descIdx] || '').toLowerCase()
          if (desc.includes('electronic fund transfer') || desc.includes('eft')) {
            txType = 'Electronic Fund Transfer'
          } else if (desc.includes('internal transfer') || desc.includes('transfer between')) {
            txType = 'Internal Transfer'
          } else if (amount > 0) {
            txType = 'Deposits'
          } else {
            txType = 'Withdrawals'
          }
          
          data.deposits.push({
            transaction_date: parseDate(values[dateIdx]),
            transaction_type: txType,
            amount: amount, // Keep sign
            currency: 'USD',
            description: values[descIdx],
          })
        }
      }
    }

    // Parse Transaction Fees section
    const feesTableMatch = htmlContent.match(/class="[^"]*sectionHeading[^"]*"[^>]*>\s*Transaction\s*Fees\s*<[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i)
    if (feesTableMatch) {
      const tableHtml = feesTableMatch[1]
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      let headers: string[] = []
      
      for (const row of rows) {
        const values = extractCellValues(row)
        
        if (row.includes('header') || values.some(v => v.toLowerCase() === 'date')) {
          headers = values.map(v => v.toLowerCase())
          continue
        }
        
        if (values.some(v => v.toLowerCase().includes('total'))) continue
        
        if (headers.length > 0 && values.length >= 3) {
          const dateIdx = headers.findIndex(h => h.includes('date'))
          const symbolIdx = headers.findIndex(h => h.includes('symbol'))
          const descIdx = headers.findIndex(h => h.includes('description'))
          const amountIdx = headers.findIndex(h => h.includes('amount'))
          
          const amount = parseNumber(values[amountIdx])
          if (amount === 0) continue
          
          data.fees.push({
            fee_date: parseDate(values[dateIdx]),
            fee_type: 'Transaction Fee',
            amount: Math.abs(amount),
            currency: 'USD',
            symbol: symbolIdx >= 0 ? values[symbolIdx] : undefined,
            description: values[descIdx],
          })
        }
      }
    }

    // Parse Interest section
    const interestTableMatch = htmlContent.match(/class="[^"]*sectionHeading[^"]*"[^>]*>\s*Interest\s*<[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i)
    if (interestTableMatch) {
      const tableHtml = interestTableMatch[1]
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      let headers: string[] = []
      
      for (const row of rows) {
        const values = extractCellValues(row)
        
        if (row.includes('header') || values.some(v => v.toLowerCase() === 'date')) {
          headers = values.map(v => v.toLowerCase())
          continue
        }
        
        if (values.some(v => v.toLowerCase().includes('total'))) continue
        
        if (headers.length > 0 && values.length >= 3) {
          const dateIdx = headers.findIndex(h => h.includes('date'))
          const descIdx = headers.findIndex(h => h.includes('description'))
          const amountIdx = headers.findIndex(h => h.includes('amount'))
          
          const amount = parseNumber(values[amountIdx])
          if (amount === 0) continue
          
          // Determine interest type from description
          const desc = (values[descIdx] || '').toLowerCase()
          let interestType = 'Other'
          if (desc.includes('credit')) interestType = 'Credit Interest'
          else if (desc.includes('debit')) interestType = 'Debit Interest'
          else if (desc.includes('bond')) interestType = 'Bond Interest'
          
          data.interest.push({
            interest_date: parseDate(values[dateIdx]),
            amount,
            currency: 'USD',
            interest_type: interestType,
            description: values[descIdx],
          })
        }
      }
    }

    // Parse Withholding Tax section
    const taxTableMatch = htmlContent.match(/class="[^"]*sectionHeading[^"]*"[^>]*>\s*Withholding\s*Tax\s*<[\s\S]*?(<table[^>]*>[\s\S]*?<\/table>)/i)
    if (taxTableMatch) {
      const tableHtml = taxTableMatch[1]
      const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
      let headers: string[] = []
      
      for (const row of rows) {
        const values = extractCellValues(row)
        
        if (row.includes('header') || values.some(v => v.toLowerCase() === 'date')) {
          headers = values.map(v => v.toLowerCase())
          continue
        }
        
        if (values.some(v => v.toLowerCase().includes('total'))) continue
        
        if (headers.length > 0 && values.length >= 3) {
          const dateIdx = headers.findIndex(h => h.includes('date'))
          const descIdx = headers.findIndex(h => h.includes('description'))
          const amountIdx = headers.findIndex(h => h.includes('amount'))
          
          const amount = parseNumber(values[amountIdx])
          if (amount === 0) continue
          
          // Extract symbol from description
          const desc = values[descIdx] || ''
          const symbolMatch = desc.match(/^([A-Z0-9.]+)[\s(]/)
          
          data.withholdingTax.push({
            tax_date: parseDate(values[dateIdx]),
            amount: Math.abs(amount),
            currency: 'USD',
            symbol: symbolMatch?.[1],
            description: desc,
          })
        }
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error parsing IBKR report:', error)
    return { data: null, error: 'Failed to parse report' }
  }
}

export async function createActivityImport(data: {
  account_id: string
  file_name: string
  platform: string
  period_start?: string
  period_end?: string
}) {
  const [row] = await db
    .insert(activityImports)
    .values({
      account_id: data.account_id,
      file_name: data.file_name,
      platform: data.platform,
      period_start: data.period_start || null,
      period_end: data.period_end || null,
      import_status: 'processing',
      records_imported: 0,
      records_failed: 0,
    })
    .returning({ id: activityImports.id })
  
  return { id: row?.id }
}

export async function processImportedData(
  importId: string, 
  data: ParsedData,
  accountId: string
) {
  let totalRecords = 0
  let failedRecords = 0
  const errors: string[] = []

  // gather symbols and filter
  const symbols = new Set([
    ...data.trades.map(t => t.symbol),
    ...data.dividends.map(d => d.symbol),
    ...data.withholdingTax.filter(w => w.symbol).map(w => w.symbol!),
    ...data.fees.filter(f => f.symbol).map(f => f.symbol!),
  ])
  symbols.delete('UNKNOWN')
  symbols.delete('')

  const existing = await db
    .select({ id: instruments.id, symbol: instruments.symbol })
    .from(instruments)
    .where(instruments.symbol.in(Array.from(symbols)))

  const instrumentMap = new Map(existing.map(i => [i.symbol, i.id]))

  const missingSymbols = Array.from(symbols).filter(s => s && !instrumentMap.has(s))
  if (missingSymbols.length) {
    const created = await db
      .insert(instruments)
      .values(
        missingSymbols.map(symbol => ({
          symbol,
          asset_category: 'Stocks',
          currency: 'USD',
          multiplier: 1,
          is_active: true,
          is_traded: true,
        }))
      )
      .returning({ id: instruments.id, symbol: instruments.symbol })

    created.forEach(i => instrumentMap.set(i.symbol, i.id))
  }

  // helper to upsert batch data
  const upsertBatch = async (table: any, rows: any[]) => {
    if (rows.length === 0) return 0
    try {
      await db.insert(table).values(rows)
      return rows.length
    } catch (err: any) {
      errors.push(`Failed to insert into ${table.name}: ${err.message}`)
      return rows.length
    }
  }

  totalRecords += await upsertBatch(trades, data.trades.map(t => ({
    account_id: accountId,
    instrument_id: instrumentMap.get(t.symbol) || null,
    symbol: t.symbol,
    description: t.description || null,
    asset_category: t.asset_category,
    trade_date: t.trade_date,
    settle_date: t.settle_date || null,
    quantity: t.quantity,
    trade_price: t.price,
    currency: t.currency,
    proceeds: t.proceeds,
    comm_fee: t.commission,
    other_fees: t.fees,
    buy_sell: t.buy_sell,
    source: 'import',
    is_reconciled: true,
  })))

  totalRecords += await upsertBatch(dividends, data.dividends.map(d => ({
    account_id: accountId,
    instrument_id: instrumentMap.get(d.symbol) || null,
    symbol: d.symbol,
    description: d.description || null,
    currency: d.currency,
    pay_date: d.pay_date,
    gross_amount: d.gross_amount,
    net_amount: d.net_amount,
    tax: d.withholding_tax,
  })))

  totalRecords += await upsertBatch(cashTransactions, data.deposits.map(d => ({
    account_id: accountId,
    transaction_date: d.transaction_date,
    currency: d.currency,
    amount: d.amount,
    transaction_type: d.transaction_type,
    description: d.description || null,
  })))

  totalRecords += await upsertBatch(transactionFees, data.fees.map(f => ({
    account_id: accountId,
    instrument_id: f.symbol ? instrumentMap.get(f.symbol) || null : null,
    symbol: f.symbol || null,
    fee_date: f.fee_date,
    fee_type: f.fee_type,
    amount: f.amount,
    currency: f.currency,
    description: f.description || null,
  })))

  totalRecords += await upsertBatch(interest, data.interest.map(i => ({
    account_id: accountId,
    interest_date: i.interest_date,
    amount: i.amount,
    currency: i.currency,
    interest_type: i.interest_type || null,
    description: i.description || null,
  })))

  totalRecords += await upsertBatch(withholdingTax, data.withholdingTax.map(w => ({
    account_id: accountId,
    instrument_id: w.symbol ? instrumentMap.get(w.symbol) || null : null,
    symbol: w.symbol || 'UNKNOWN',
    tax_date: w.tax_date,
    amount: w.amount,
    currency: w.currency,
    description: w.description || null,
  })))

  const finalStatus = errors.length > 0
    ? (totalRecords > 0 ? 'partial' : 'failed')
    : 'completed'

  await db
    .update(activityImports)
    .set({
      import_status: finalStatus,
      records_imported: totalRecords,
      records_failed: failedRecords,
      error_log: errors.length ? { errors } : null,
    })
    .where(sql`${activityImports.id} = ${importId}`)

  revalidatePath('/dashboard/import')
  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard/dividends')
  revalidatePath('/dashboard/deposits')
  revalidatePath('/dashboard')

  return {
    success: totalRecords > 0,
    error: errors.length > 0 ? errors.join('; ') : null,
    totalRecords,
    failedRecords,
  }
}
