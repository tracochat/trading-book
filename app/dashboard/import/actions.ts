"use server"

import { revalidatePath } from "next/cache"

import { db, sql } from "@/lib/db"
import { detectPlatform } from "@/lib/import/detect-platform"
import { parseIbkrActivity, type IBKRExtracted } from "@/lib/import/ibkr-parser"
import type { Platform } from "@/lib/types"
import {
  activityImports,
  cashTransactions,
  dividendAccruals,
  dividends,
  forexBalances,
  instruments,
  interest,
  interestAccruals,
  navSnapshots,
  openPositions,
  trades,
  transactionFees,
  withholdingTax,
} from "@/schema/schema"

type SectionKey = keyof IBKRExtracted

const SECTION_METADATA: Array<{ key: SectionKey; title: string }> = [
  { key: "accountInformation", title: "Account Information" },
  { key: "netAssetValue", title: "Net Asset Value" },
  { key: "mtmPerformance", title: "MTM Performance" },
  { key: "realizedUnrealized", title: "Realized / Unrealized" },
  { key: "cashReport", title: "Cash Report" },
  { key: "openPositions", title: "Open Positions" },
  { key: "forexBalances", title: "Forex Balances" },
  { key: "trades", title: "Trades" },
  { key: "transactionFees", title: "Transaction Fees" },
  { key: "depositsWithdrawals", title: "Deposits / Withdrawals" },
  { key: "dividends", title: "Dividends" },
  { key: "withholdingTax", title: "Withholding Tax" },
  { key: "interest", title: "Interest" },
  { key: "interestAccruals", title: "Interest Accruals" },
  { key: "changeDividendAccruals", title: "Dividend Accruals" },
  { key: "financialInstrumentInfo", title: "Financial Instruments" },
  { key: "codes", title: "Codes" },
]

export interface ParsedSectionOverview {
  key: SectionKey
  title: string
  count: number
  preview: string[]
}

export interface ParsedImportPayload {
  platform: Platform
  periodStart: string | null
  periodEnd: string | null
  reportDate: string | null
  sections: IBKRExtracted
  overview: ParsedSectionOverview[]
}

function extractStatementPeriod(htmlContent: string) {
  const periodMatch = htmlContent.match(
    /Statement\s*Period[\s\S]*?(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})/i
  )

  return {
    periodStart: periodMatch?.[1] ?? null,
    periodEnd: periodMatch?.[2] ?? null,
  }
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== "string") return null

  const text = value.trim()
  if (!text || text === "--") return null

  const normalized = text.startsWith("(") && text.endsWith(")")
    ? `-${text.slice(1, -1)}`
    : text

  const numeric = Number(normalized.replace(/,/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const direct = trimmed.match(/\d{4}-\d{2}-\d{2}/)
  if (direct) return direct[0]

  const mdy = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (mdy) {
    return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`
  }

  return null
}

function splitDateTime(value: unknown) {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) {
    return { tradeDate: null as string | null, tradeTime: null as string | null }
  }

  const [datePart, timePart] = text.split(",").map((item) => item.trim())
  return {
    tradeDate: parseDate(datePart),
    tradeTime: timePart || null,
  }
}

function extractSymbol(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^([A-Z0-9.\-]+)/)
  return match?.[1] ?? null
}

function inferBaseCurrency(sections: IBKRExtracted) {
  const baseCurrencyRow = sections.accountInformation.find((row) => {
    const key = typeof row?.key === "string" ? row.key.toLowerCase() : ""
    return key.includes("base") && key.includes("currency")
  })

  const accountBaseCurrency = typeof baseCurrencyRow?.value === "string" ? baseCurrencyRow.value.trim() : ""
  if (accountBaseCurrency) return accountBaseCurrency

  return sections.cashReport.find((row) => typeof row?.currency === "string" && row.currency)?.currency ?? "USD"
}

function inferReportDate(sections: IBKRExtracted, fallbackPeriodEnd: string | null) {
  const candidates = new Set<string>()

  const collect = (value: unknown) => {
    const date = parseDate(value)
    if (date) candidates.add(date)
  }

  sections.trades.forEach((row) => collect(row.datetime))
  sections.transactionFees.forEach((row) => collect(row.DateTime))
  sections.depositsWithdrawals.forEach((row) => collect(row.Date))
  sections.dividends.forEach((row) => collect(row.Date))
  sections.withholdingTax.forEach((row) => collect(row.Date))
  sections.interest.forEach((row) => collect(row.Date))
  sections.changeDividendAccruals.forEach((row) => {
    collect(row.Date)
    collect(row["Ex Date"])
    collect(row["Pay Date"])
  })

  const ordered = Array.from(candidates).sort()
  return fallbackPeriodEnd ?? ordered.at(-1) ?? null
}

function summarizeRecord(row: Record<string, unknown>) {
  const fields = Object.entries(row)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)

  return fields.join(" | ") || "No preview available"
}

function buildOverview(sections: IBKRExtracted): ParsedSectionOverview[] {
  return SECTION_METADATA.map(({ key, title }) => {
    const rows = sections[key] as Array<Record<string, unknown>>
    return {
      key,
      title,
      count: rows.length,
      preview: rows.slice(0, 3).map(summarizeRecord),
    }
  })
}

function mapCashTransactionType(description: unknown, amount: number) {
  const text = typeof description === "string" ? description.toLowerCase() : ""

  if (text.includes("internal transfer") || text.includes("transfer between")) {
    return amount >= 0 ? "Transfer In" : "Transfer Out"
  }

  if (text.includes("transfer")) {
    return amount >= 0 ? "Transfer In" : "Transfer Out"
  }

  return amount >= 0 ? "Deposit" : "Withdrawal"
}

function normalizeAssetCategory(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Other"
  return value.trim()
}

function getInstrumentDetails(sections: IBKRExtracted) {
  const bySymbol = new Map<string, Record<string, unknown>>()

  for (const instrument of sections.financialInstrumentInfo) {
    const symbol = typeof instrument.Symbol === "string" ? instrument.Symbol.trim() : ""
    if (symbol) {
      bySymbol.set(symbol, instrument)
    }
  }

  return bySymbol
}

export async function parseIBKRReport(
  htmlContent: string
): Promise<{ data: ParsedImportPayload | null; error: string | null }> {
  try {
    const platform = detectPlatform(htmlContent)
    if (platform !== "IBKR") {
      return {
        data: null,
        error:
          platform === "Other"
            ? "This file is not a supported IBKR activity statement."
            : `${platform} imports are not implemented yet.`,
      }
    }

    const sections = parseIbkrActivity(htmlContent)
    const { periodStart, periodEnd } = extractStatementPeriod(htmlContent)
    const reportDate = inferReportDate(sections, periodEnd)

    return {
      data: {
        platform,
        periodStart,
        periodEnd,
        reportDate,
        sections,
        overview: buildOverview(sections),
      },
      error: null,
    }
  } catch (error) {
    console.error("Error parsing broker report:", error)
    return { data: null, error: "Failed to parse report." }
  }
}

export async function createActivityImport(data: {
  account_id: string
  file_name: string
  platform: Platform
  period_start?: string | null
  period_end?: string | null
}) {
  try {
    const [row] = await db
      .insert(activityImports)
      .values({
        account_id: data.account_id,
        file_name: data.file_name,
        platform: data.platform,
        period_start: data.period_start ?? null,
        period_end: data.period_end ?? null,
        import_status: "processing",
        records_imported: 0,
        records_failed: 0,
      })
      .returning({ id: activityImports.id })

    return { id: row?.id ?? null, error: null }
  } catch (error) {
    console.error("Error creating activity import:", error)
    return { id: null, error: "Failed to create import record." }
  }
}

export async function processImportedData(
  importId: string,
  payload: ParsedImportPayload,
  accountId: string
) {
  const errors: string[] = []
  let totalRecords = 0
  let failedRecords = 0

  const { sections } = payload
  const reportDate = payload.reportDate ?? new Date().toISOString().slice(0, 10)
  const baseCurrency = inferBaseCurrency(sections)
  const instrumentDetails = getInstrumentDetails(sections)

  const symbols = new Set<string>()
  const addSymbol = (value: unknown) => {
    const symbol = typeof value === "string" ? value.trim() : ""
    if (symbol) symbols.add(symbol)
  }

  sections.financialInstrumentInfo.forEach((row) => addSymbol(row.Symbol))
  sections.trades.forEach((row) => addSymbol(row.symbol))
  sections.transactionFees.forEach((row) => addSymbol(row.Symbol))
  sections.dividends.forEach((row) => addSymbol(extractSymbol(row.Description)))
  sections.withholdingTax.forEach((row) => addSymbol(extractSymbol(row.Description)))
  sections.changeDividendAccruals.forEach((row) => addSymbol(row.Symbol))
  sections.openPositions.forEach((row) => addSymbol(row.Symbol))

  const symbolList = Array.from(symbols)
  const instrumentMap = new Map<string, string>()

  if (symbolList.length > 0) {
    const existing = await db
      .select({ id: instruments.id, symbol: instruments.symbol })
      .from(instruments)
      .where(sql`${instruments.symbol} in (${sql.join(symbolList.map((symbol) => sql`${symbol}`), sql`, `)})`)

    existing.forEach((row) => instrumentMap.set(row.symbol, row.id))
  }

  const missingSymbols = symbolList.filter((symbol) => !instrumentMap.has(symbol))
  if (missingSymbols.length > 0) {
    const created = await db
      .insert(instruments)
      .values(
        missingSymbols.map((symbol) => {
          const info = instrumentDetails.get(symbol)
          return {
            symbol,
            con_id: typeof info?.Conid === "string" && info.Conid ? info.Conid : null,
            description:
              typeof info?.Description === "string" && info.Description ? info.Description : symbol,
            asset_category: normalizeAssetCategory(info?.type),
            listing_exchange:
              typeof info?.["Listing Exch"] === "string" && info["Listing Exch"]
                ? String(info["Listing Exch"])
                : null,
            multiplier: parseNumber(info?.Multiplier) ?? 1,
            currency: baseCurrency,
            security_id:
              typeof info?.["Security ID"] === "string" && info["Security ID"]
                ? String(info["Security ID"])
                : null,
            underlying_symbol:
              typeof info?.Underlying === "string" && info.Underlying ? info.Underlying : null,
            is_traded: true,
            is_active: true,
          }
        })
      )
      .returning({ id: instruments.id, symbol: instruments.symbol })

    created.forEach((row) => instrumentMap.set(row.symbol, row.id))
  }

  const insertRows = async (label: string, table: any, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) return

    try {
      await db.insert(table).values(rows as never)
      totalRecords += rows.length
    } catch (error) {
      console.error(`Error inserting ${label}:`, error)
      failedRecords += rows.length
      errors.push(`Failed to import ${label.toLowerCase()}.`)
    }
  }

  const withholdingByKey = new Map<string, number>()
  sections.withholdingTax.forEach((row) => {
    const symbol = extractSymbol(row.Description)
    const date = parseDate(row.Date)
    const amount = Math.abs(parseNumber(row.Amount) ?? 0)
    if (!symbol || !date || !amount) return
    const key = `${date}|${symbol}`
    withholdingByKey.set(key, (withholdingByKey.get(key) ?? 0) + amount)
  })

  const tradeRows = sections.trades
    .map((row) => {
      const quantity = parseNumber(row.quantity)
      const { tradeDate, tradeTime } = splitDateTime(row.datetime)
      const symbol = typeof row.symbol === "string" ? row.symbol.trim() : ""
      const info = instrumentDetails.get(symbol)

      if (!symbol || quantity === null || !tradeDate) return null

      return {
        account_id: accountId,
        instrument_id: instrumentMap.get(symbol) ?? null,
        symbol,
        description:
          typeof info?.Description === "string" && info.Description ? info.Description : symbol,
        asset_category: normalizeAssetCategory(info?.type),
        trade_date: tradeDate,
        settle_date: tradeDate,
        trade_time: tradeTime,
        exchange:
          typeof info?.["Listing Exch"] === "string" && info["Listing Exch"]
            ? String(info["Listing Exch"])
            : null,
        quantity: Math.abs(quantity),
        trade_price: parseNumber(row.tprice) ?? 0,
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        fx_rate_to_base: 1,
        proceeds: parseNumber(row.proceeds),
        comm_fee: Math.abs(parseNumber(row.comissions) ?? 0),
        other_fees: 0,
        basis: parseNumber(row.bassis),
        realized_pnl: parseNumber(row.realisedpnl),
        mtm_pnl: parseNumber(row.mtmpnl),
        buy_sell: quantity >= 0 ? "BUY" : "SELL",
        open_close: typeof row.code === "string" && row.code ? row.code : null,
        source: "import",
        is_reconciled: true,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const dividendRows = sections.dividends
    .map((row) => {
      const symbol = extractSymbol(row.Description)
      const payDate = parseDate(row.Date)
      const grossAmount = parseNumber(row.Amount)

      if (!symbol || !payDate || grossAmount === null) return null

      const tax = withholdingByKey.get(`${payDate}|${symbol}`) ?? 0
      const info = instrumentDetails.get(symbol)

      return {
        account_id: accountId,
        instrument_id: instrumentMap.get(symbol) ?? null,
        symbol,
        description:
          typeof row.Description === "string" && row.Description
            ? row.Description
            : typeof info?.Description === "string"
              ? info.Description
              : symbol,
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        pay_date: payDate,
        tax,
        fee: 0,
        gross_amount: grossAmount,
        net_amount: grossAmount - tax,
        fx_rate_to_base: 1,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const depositRows = sections.depositsWithdrawals
    .map((row) => {
      const transactionDate = parseDate(row.Date)
      const amount = parseNumber(row.Amount)

      if (!transactionDate || amount === null) return null

      return {
        account_id: accountId,
        transaction_date: transactionDate,
        settle_date: transactionDate,
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        amount: Math.abs(amount),
        transaction_type: mapCashTransactionType(row.Description, amount),
        description: typeof row.Description === "string" ? row.Description : null,
        fx_rate_to_base: 1,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const feeRows = sections.transactionFees
    .map((row) => {
      const feeDate = parseDate(row.DateTime)
      const symbol = typeof row.Symbol === "string" ? row.Symbol.trim() : ""
      const amount = parseNumber(row.Amount)

      if (!feeDate || amount === null) return null

      return {
        account_id: accountId,
        instrument_id: symbol ? instrumentMap.get(symbol) ?? null : null,
        symbol: symbol || null,
        description: typeof row.Description === "string" ? row.Description : null,
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        fee_date: feeDate,
        amount,
        fee_type: "Transaction Fee",
        fx_rate_to_base: 1,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const interestRows = sections.interest
    .map((row) => {
      const interestDate = parseDate(row.Date)
      const amount = parseNumber(row.Amount)

      if (!interestDate || amount === null) return null

      return {
        account_id: accountId,
        instrument_id: null,
        symbol: extractSymbol(row.Description),
        description: typeof row.Description === "string" ? row.Description : null,
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        interest_date: interestDate,
        amount,
        interest_type:
          typeof row.Description === "string" && row.Description.toLowerCase().includes("debit")
            ? "Debit Interest"
            : typeof row.Description === "string" && row.Description.toLowerCase().includes("credit")
              ? "Credit Interest"
              : "Other",
        fx_rate_to_base: 1,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const withholdingRows = sections.withholdingTax
    .map((row) => {
      const taxDate = parseDate(row.Date)
      const amount = parseNumber(row.Amount)
      const symbol = extractSymbol(row.Description)

      if (!taxDate || amount === null || !symbol) return null

      return {
        account_id: accountId,
        instrument_id: instrumentMap.get(symbol) ?? null,
        symbol,
        description: typeof row.Description === "string" ? row.Description : null,
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        tax_date: taxDate,
        amount: Math.abs(amount),
        tax_type: "Withholding Tax",
        fx_rate_to_base: 1,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const accrualByCurrency = new Map<
    string,
    { starting: number; accrued: number; ending: number }
  >()

  sections.interestAccruals.forEach((row) => {
    const currency = typeof row.currency === "string" && row.currency ? row.currency : baseCurrency
    const label = typeof row.label === "string" ? row.label.toLowerCase() : ""
    const value = parseNumber(row.value) ?? 0
    const current = accrualByCurrency.get(currency) ?? { starting: 0, accrued: 0, ending: 0 }

    if (label.includes("starting")) current.starting = value
    if (label.includes("interest accrued")) current.accrued = value
    if (label.includes("ending")) current.ending = value

    accrualByCurrency.set(currency, current)
  })

  const interestAccrualRows = Array.from(accrualByCurrency.entries()).map(([currency, value]) => ({
    account_id: accountId,
    instrument_id: null,
    symbol: "INTEREST",
    description: "Imported IBKR interest accrual summary",
    currency,
    accrual_date: reportDate,
    starting_accrual_balance: value.starting,
    interest_accrued: value.accrued,
    ending_accrual_balance: value.ending,
    fx_rate_to_base: 1,
  }))

  const dividendAccrualRows = sections.changeDividendAccruals
    .map((row) => {
      const symbol = typeof row.Symbol === "string" ? row.Symbol.trim() : ""
      const exDate = parseDate(row["Ex Date"])

      if (!symbol || !exDate) return null

      return {
        account_id: accountId,
        instrument_id: instrumentMap.get(symbol) ?? null,
        symbol,
        description: typeof row.type === "string" ? row.type : null,
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        ex_date: exDate,
        pay_date: parseDate(row["Pay Date"]),
        quantity: parseNumber(row.Quantity),
        tax: Math.abs(parseNumber(row.Tax) ?? 0),
        fee: Math.abs(parseNumber(row.Fee) ?? 0),
        gross_rate: parseNumber(row["Gross Rate"]),
        gross_amount: Math.abs(parseNumber(row["Gross Amount"]) ?? 0),
        net_amount: Math.abs(parseNumber(row["Net Amount"]) ?? 0),
        fx_rate_to_base: 1,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const forexRows = sections.forexBalances.map((row) => ({
    account_id: accountId,
    as_of_date: reportDate,
    currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
    quantity: parseNumber(row.Quantity) ?? 0,
    cost_basis: parseNumber(row["Cost Basis in SGD"]),
    close_price: parseNumber(row["Close Price"]),
    value: parseNumber(row["Value in SGD"]),
    unrealized_pnl: parseNumber(row["Unrealized P/L in SGD"]),
    fx_rate_to_base: parseNumber(row["Close Price"]) ?? 1,
  }))

  const openPositionRows = sections.openPositions
    .map((row) => {
      const symbol = typeof row.Symbol === "string" ? row.Symbol.trim() : ""
      const costBasisMoney = parseNumber(row["Cost Basis"])
      const unrealizedPnl = parseNumber(row["Unrealized P/L"])

      if (!symbol) return null

      return {
        account_id: accountId,
        instrument_id: instrumentMap.get(symbol) ?? null,
        portfolio_id: null,
        as_of_date: reportDate,
        symbol,
        description:
          typeof instrumentDetails.get(symbol)?.Description === "string"
            ? String(instrumentDetails.get(symbol)?.Description)
            : symbol,
        asset_category: normalizeAssetCategory(instrumentDetails.get(symbol)?.type),
        currency: typeof row.currency === "string" && row.currency ? row.currency : baseCurrency,
        quantity: parseNumber(row.Quantity) ?? 0,
        cost_basis_price: parseNumber(row["Cost Price"]),
        cost_basis_money: costBasisMoney,
        close_price: parseNumber(row["Close Price"]),
        market_value: parseNumber(row.Value),
        unrealized_pnl: unrealizedPnl,
        unrealized_pnl_pct:
          costBasisMoney && unrealizedPnl !== null ? (unrealizedPnl / costBasisMoney) * 100 : null,
        fx_rate_to_base: 1,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  const navValues = new Map<string, number>()
  sections.netAssetValue.forEach((row) => {
    const item = typeof row.Item === "string" ? row.Item.toLowerCase() : ""
    const value = parseNumber(row["Current Total"]) ?? parseNumber(row.Total)
    if (!item || value === null) return
    navValues.set(item, value)
  })

  const navRow = sections.netAssetValue.length > 0
    ? [{
        account_id: accountId,
        as_of_date: reportDate,
        cash: navValues.get("cash") ?? 0,
        stock: navValues.get("stock") ?? 0,
        options: navValues.get("options") ?? 0,
        bonds: navValues.get("bonds") ?? 0,
        funds: navValues.get("funds") ?? 0,
        futures: navValues.get("futures") ?? 0,
        accrued_interest: navValues.get("accrued interest") ?? 0,
        dividend_accruals: navValues.get("dividend accruals") ?? 0,
        total_nav:
          navValues.get("net liquidation value") ??
          navValues.get("net asset value") ??
          [
            navValues.get("cash") ?? 0,
            navValues.get("stock") ?? 0,
            navValues.get("options") ?? 0,
            navValues.get("bonds") ?? 0,
            navValues.get("funds") ?? 0,
            navValues.get("futures") ?? 0,
            navValues.get("accrued interest") ?? 0,
            navValues.get("dividend accruals") ?? 0,
          ].reduce((sum, value) => sum + value, 0),
        currency: baseCurrency,
      }]
    : []

  await insertRows("Trades", trades, tradeRows)
  await insertRows("Dividends", dividends, dividendRows)
  await insertRows("Cash Transactions", cashTransactions, depositRows)
  await insertRows("Transaction Fees", transactionFees, feeRows)
  await insertRows("Interest", interest, interestRows)
  await insertRows("Withholding Tax", withholdingTax, withholdingRows)
  await insertRows("Interest Accruals", interestAccruals, interestAccrualRows)
  await insertRows("Dividend Accruals", dividendAccruals, dividendAccrualRows)
  await insertRows("Forex Balances", forexBalances, forexRows)
  await insertRows("Open Positions", openPositions, openPositionRows)
  await insertRows("NAV Snapshots", navSnapshots, navRow)

  const finalStatus = errors.length > 0 ? (totalRecords > 0 ? "partial" : "failed") : "completed"

  await db
    .update(activityImports)
    .set({
      import_status: finalStatus,
      records_imported: totalRecords,
      records_failed: failedRecords,
      error_log: errors.length > 0 ? errors.map((message) => ({ message })) : null,
    })
    .where(sql`${activityImports.id} = ${importId}`)

  ;[
    "/dashboard",
    "/dashboard/import",
    "/dashboard/trades",
    "/dashboard/deposits",
    "/dashboard/dividends",
    "/dashboard/fees",
    "/dashboard/withholding-tax",
    "/dashboard/interest",
    "/dashboard/interest-accruals",
    "/dashboard/positions",
    "/dashboard/forex",
    "/dashboard/nav",
  ].forEach((path) => revalidatePath(path))

  const summary = `${totalRecords} record${totalRecords === 1 ? "" : "s"} imported`

  return {
    success: totalRecords > 0,
    error: errors.length > 0 ? errors.join(" ") : null,
    summary,
    totalRecords,
    failedRecords,
  }
}