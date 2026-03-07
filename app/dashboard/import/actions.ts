"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface ParsedTrade {
  trade_date: string
  symbol: string
  description?: string
  asset_class?: string
  trade_type: string
  quantity: number
  price: number
  commission: number
  fees: number
  net_amount: number
  currency: string
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

interface ParsedData {
  trades: ParsedTrade[]
  dividends: ParsedDividend[]
  deposits: ParsedDeposit[]
  fees: ParsedFee[]
  interest: ParsedInterest[]
  withholdingTax: ParsedWithholdingTax[]
  forexBalances: any[]
  openPositions: any[]
}

export async function parseIBKRReport(htmlContent: string, accountId: string) {
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

    // Parse trades section
    const tradesMatch = htmlContent.match(/Trades[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/gi)
    if (tradesMatch) {
      for (const tableHtml of tradesMatch) {
        const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
        let headers: string[] = []
        
        for (const row of rows) {
          const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
          const values = cells.map(c => c.replace(/<[^>]*>/g, '').trim())
          
          if (row.includes('<th') || values.some(v => v.toLowerCase().includes('symbol'))) {
            headers = values.map(v => v.toLowerCase())
            continue
          }
          
          if (headers.length > 0 && values.length >= 5) {
            const symbolIdx = headers.findIndex(h => h.includes('symbol'))
            const dateIdx = headers.findIndex(h => h.includes('date') && h.includes('time'))
            const qtyIdx = headers.findIndex(h => h.includes('quantity'))
            const priceIdx = headers.findIndex(h => h.includes('price') && !h.includes('proceeds'))
            const commIdx = headers.findIndex(h => h.includes('comm'))
            const proceedsIdx = headers.findIndex(h => h.includes('proceeds') || h.includes('amount'))
            
            if (symbolIdx >= 0 && values[symbolIdx] && !values[symbolIdx].includes('Total')) {
              const qty = parseFloat(values[qtyIdx]?.replace(/,/g, '') || '0')
              const price = parseFloat(values[priceIdx]?.replace(/,/g, '') || '0')
              const comm = Math.abs(parseFloat(values[commIdx]?.replace(/,/g, '') || '0'))
              const proceeds = parseFloat(values[proceedsIdx]?.replace(/,/g, '') || '0')
              
              if (qty !== 0) {
                data.trades.push({
                  trade_date: values[dateIdx]?.split(',')[0] || new Date().toISOString().split('T')[0],
                  symbol: values[symbolIdx],
                  trade_type: qty > 0 ? 'Buy' : 'Sell',
                  quantity: Math.abs(qty),
                  price: Math.abs(price),
                  commission: comm,
                  fees: 0,
                  net_amount: Math.abs(proceeds),
                  currency: 'USD',
                })
              }
            }
          }
        }
      }
    }

    // Parse dividends section
    const dividendsMatch = htmlContent.match(/Dividends[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/gi)
    if (dividendsMatch) {
      for (const tableHtml of dividendsMatch) {
        const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
        let headers: string[] = []
        
        for (const row of rows) {
          const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
          const values = cells.map(c => c.replace(/<[^>]*>/g, '').trim())
          
          if (row.includes('<th') || values.some(v => v.toLowerCase().includes('description'))) {
            headers = values.map(v => v.toLowerCase())
            continue
          }
          
          if (headers.length > 0 && values.length >= 3) {
            const dateIdx = headers.findIndex(h => h.includes('date'))
            const descIdx = headers.findIndex(h => h.includes('description'))
            const amountIdx = headers.findIndex(h => h.includes('amount'))
            
            const amount = parseFloat(values[amountIdx]?.replace(/,/g, '') || '0')
            const description = values[descIdx] || ''
            
            if (amount !== 0 && !description.includes('Total')) {
              // Extract symbol from description
              const symbolMatch = description.match(/^(\w+)\s/)
              
              data.dividends.push({
                pay_date: values[dateIdx] || new Date().toISOString().split('T')[0],
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
      }
    }

    // Parse deposits/withdrawals section
    const depositsMatch = htmlContent.match(/Deposits\s*&amp;\s*Withdrawals[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/gi)
    if (depositsMatch) {
      for (const tableHtml of depositsMatch) {
        const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
        let headers: string[] = []
        
        for (const row of rows) {
          const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
          const values = cells.map(c => c.replace(/<[^>]*>/g, '').trim())
          
          if (row.includes('<th')) {
            headers = values.map(v => v.toLowerCase())
            continue
          }
          
          if (headers.length > 0 && values.length >= 3) {
            const dateIdx = headers.findIndex(h => h.includes('date'))
            const descIdx = headers.findIndex(h => h.includes('description'))
            const amountIdx = headers.findIndex(h => h.includes('amount'))
            
            const amount = parseFloat(values[amountIdx]?.replace(/,/g, '') || '0')
            
            if (amount !== 0 && !values[descIdx]?.includes('Total')) {
              data.deposits.push({
                transaction_date: values[dateIdx] || new Date().toISOString().split('T')[0],
                transaction_type: amount > 0 ? 'Deposit' : 'Withdrawal',
                amount: Math.abs(amount),
                currency: 'USD',
                description: values[descIdx],
              })
            }
          }
        }
      }
    }

    // Parse fees section
    const feesMatch = htmlContent.match(/Transaction\s*Fees[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/gi)
    if (feesMatch) {
      for (const tableHtml of feesMatch) {
        const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
        let headers: string[] = []
        
        for (const row of rows) {
          const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
          const values = cells.map(c => c.replace(/<[^>]*>/g, '').trim())
          
          if (row.includes('<th')) {
            headers = values.map(v => v.toLowerCase())
            continue
          }
          
          if (headers.length > 0 && values.length >= 3) {
            const dateIdx = headers.findIndex(h => h.includes('date'))
            const descIdx = headers.findIndex(h => h.includes('description'))
            const amountIdx = headers.findIndex(h => h.includes('amount'))
            
            const amount = parseFloat(values[amountIdx]?.replace(/,/g, '') || '0')
            
            if (amount !== 0 && !values[descIdx]?.includes('Total')) {
              data.fees.push({
                fee_date: values[dateIdx] || new Date().toISOString().split('T')[0],
                fee_type: 'Transaction Fee',
                amount: Math.abs(amount),
                currency: 'USD',
                description: values[descIdx],
              })
            }
          }
        }
      }
    }

    // Parse interest section
    const interestMatch = htmlContent.match(/<tr[^>]*class="[^"]*Interest[^"]*"[^>]*>[\s\S]*?<\/tr>/gi)
    if (interestMatch) {
      for (const row of interestMatch) {
        const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []
        const values = cells.map(c => c.replace(/<[^>]*>/g, '').trim())
        
        if (values.length >= 3) {
          const amount = parseFloat(values[values.length - 1]?.replace(/,/g, '') || '0')
          if (amount !== 0) {
            data.interest.push({
              interest_date: values[1] || new Date().toISOString().split('T')[0],
              amount,
              currency: values[0] || 'USD',
              description: values[2],
            })
          }
        }
      }
    }

    // Parse withholding tax section
    const taxMatch = htmlContent.match(/Withholding\s*Tax[\s\S]*?<table[^>]*>[\s\S]*?<\/table>/gi)
    if (taxMatch) {
      for (const tableHtml of taxMatch) {
        const rows = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || []
        let headers: string[] = []
        
        for (const row of rows) {
          const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
          const values = cells.map(c => c.replace(/<[^>]*>/g, '').trim())
          
          if (row.includes('<th')) {
            headers = values.map(v => v.toLowerCase())
            continue
          }
          
          if (headers.length > 0 && values.length >= 3) {
            const dateIdx = headers.findIndex(h => h.includes('date'))
            const descIdx = headers.findIndex(h => h.includes('description'))
            const amountIdx = headers.findIndex(h => h.includes('amount'))
            
            const amount = parseFloat(values[amountIdx]?.replace(/,/g, '') || '0')
            
            if (amount !== 0 && !values[descIdx]?.includes('Total')) {
              const symbolMatch = values[descIdx]?.match(/^(\w+)\s/)
              data.withholdingTax.push({
                tax_date: values[dateIdx] || new Date().toISOString().split('T')[0],
                amount: Math.abs(amount),
                currency: 'USD',
                symbol: symbolMatch?.[1],
                description: values[descIdx],
              })
            }
          }
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
  filename: string
  file_type: string
}) {
  const supabase = await createClient()
  
  const { data: result, error } = await supabase
    .from('activity_imports')
    .insert({
      account_id: data.account_id,
      filename: data.filename,
      file_type: data.file_type,
      status: 'processing',
      records_imported: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating import record:', error)
    return { error: error.message }
  }

  return { id: result.id }
}

export async function processImportedData(
  importId: string, 
  data: ParsedData,
  accountId: string
) {
  const supabase = await createClient()
  let totalRecords = 0
  const errors: string[] = []

  // Get or create instruments for the symbols
  const symbols = new Set([
    ...data.trades.map(t => t.symbol),
    ...data.dividends.map(d => d.symbol),
    ...data.withholdingTax.filter(w => w.symbol).map(w => w.symbol!),
  ])

  const { data: existingInstruments } = await supabase
    .from('instruments')
    .select('id, symbol')
    .in('symbol', Array.from(symbols))

  const instrumentMap = new Map(existingInstruments?.map(i => [i.symbol, i.id]) || [])

  // Create missing instruments
  const missingSymbols = Array.from(symbols).filter(s => !instrumentMap.has(s))
  if (missingSymbols.length > 0) {
    const { data: newInstruments, error: instError } = await supabase
      .from('instruments')
      .insert(missingSymbols.map(symbol => ({
        symbol,
        asset_class: 'Stocks',
        currency: 'USD',
        multiplier: 1,
        is_active: true,
        is_tradeable: true,
      })))
      .select('id, symbol')

    if (instError) {
      errors.push(`Failed to create instruments: ${instError.message}`)
    } else {
      newInstruments?.forEach(i => instrumentMap.set(i.symbol, i.id))
    }
  }

  // Import trades
  if (data.trades.length > 0) {
    const tradesToInsert = data.trades
      .filter(t => instrumentMap.has(t.symbol))
      .map(t => ({
        account_id: accountId,
        instrument_id: instrumentMap.get(t.symbol)!,
        trade_date: t.trade_date,
        trade_type: t.trade_type,
        quantity: t.quantity,
        price: t.price,
        gross_amount: t.quantity * t.price,
        commission: t.commission,
        fees: t.fees,
        net_amount: t.net_amount,
        currency: t.currency,
        import_id: importId,
      }))

    if (tradesToInsert.length > 0) {
      const { error: tradesError, data: insertedTrades } = await supabase
        .from('trades')
        .insert(tradesToInsert)
        .select()

      if (tradesError) {
        errors.push(`Failed to import trades: ${tradesError.message}`)
      } else {
        totalRecords += insertedTrades?.length || 0
      }
    }
  }

  // Import dividends
  if (data.dividends.length > 0) {
    const dividendsToInsert = data.dividends
      .filter(d => instrumentMap.has(d.symbol))
      .map(d => ({
        account_id: accountId,
        instrument_id: instrumentMap.get(d.symbol)!,
        ex_date: d.pay_date,
        pay_date: d.pay_date,
        gross_amount: d.gross_amount,
        net_amount: d.net_amount,
        withholding_tax: d.withholding_tax,
        currency: d.currency,
        description: d.description,
        import_id: importId,
      }))

    if (dividendsToInsert.length > 0) {
      const { error: divError, data: insertedDivs } = await supabase
        .from('dividends')
        .insert(dividendsToInsert)
        .select()

      if (divError) {
        errors.push(`Failed to import dividends: ${divError.message}`)
      } else {
        totalRecords += insertedDivs?.length || 0
      }
    }
  }

  // Import deposits/withdrawals
  if (data.deposits.length > 0) {
    const depositsToInsert = data.deposits.map(d => ({
      account_id: accountId,
      transaction_date: d.transaction_date,
      transaction_type: d.transaction_type,
      amount: d.amount,
      currency: d.currency,
      description: d.description,
      import_id: importId,
    }))

    const { error: depError, data: insertedDeps } = await supabase
      .from('cash_transactions')
      .insert(depositsToInsert)
      .select()

    if (depError) {
      errors.push(`Failed to import deposits: ${depError.message}`)
    } else {
      totalRecords += insertedDeps?.length || 0
    }
  }

  // Import fees
  if (data.fees.length > 0) {
    const feesToInsert = data.fees.map(f => ({
      account_id: accountId,
      fee_date: f.fee_date,
      fee_type: f.fee_type,
      amount: f.amount,
      currency: f.currency,
      description: f.description,
      import_id: importId,
    }))

    const { error: feeError, data: insertedFees } = await supabase
      .from('transaction_fees')
      .insert(feesToInsert)
      .select()

    if (feeError) {
      errors.push(`Failed to import fees: ${feeError.message}`)
    } else {
      totalRecords += insertedFees?.length || 0
    }
  }

  // Import interest
  if (data.interest.length > 0) {
    const interestToInsert = data.interest.map(i => ({
      account_id: accountId,
      interest_date: i.interest_date,
      amount: i.amount,
      currency: i.currency,
      interest_type: i.interest_type,
      description: i.description,
      import_id: importId,
    }))

    const { error: intError, data: insertedInt } = await supabase
      .from('interest')
      .insert(interestToInsert)
      .select()

    if (intError) {
      errors.push(`Failed to import interest: ${intError.message}`)
    } else {
      totalRecords += insertedInt?.length || 0
    }
  }

  // Import withholding tax
  if (data.withholdingTax.length > 0) {
    const taxToInsert = data.withholdingTax.map(w => ({
      account_id: accountId,
      instrument_id: w.symbol ? instrumentMap.get(w.symbol) : null,
      tax_date: w.tax_date,
      amount: w.amount,
      currency: w.currency,
      description: w.description,
      import_id: importId,
    }))

    const { error: taxError, data: insertedTax } = await supabase
      .from('withholding_tax')
      .insert(taxToInsert)
      .select()

    if (taxError) {
      errors.push(`Failed to import withholding tax: ${taxError.message}`)
    } else {
      totalRecords += insertedTax?.length || 0
    }
  }

  // Update import record
  await supabase
    .from('activity_imports')
    .update({
      status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      records_imported: totalRecords,
      errors: errors.length > 0 ? errors : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', importId)

  revalidatePath('/dashboard/import')
  revalidatePath('/dashboard/trades')
  revalidatePath('/dashboard/dividends')
  revalidatePath('/dashboard')

  return {
    error: errors.length > 0 ? errors.join('; ') : null,
    summary: `${totalRecords} records imported`,
  }
}
