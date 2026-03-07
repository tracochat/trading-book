import { TradesClient } from "./trades-client"
import { db, sql } from "@/lib/db"
import { trades as tradesTable, accounts as accountsTable, instruments as instrumentsTable, portfolios as portfoliosTable } from "@/schema/schema"

async function getTrades() {
  try {
    const rows = await db
      .select({
        trade: tradesTable,
        account: {
          id: accountsTable.id,
          account_id: accountsTable.account_id,
          account_name: accountsTable.account_name,
          platform: accountsTable.platform,
        },
        instrument: {
          id: instrumentsTable.id,
          symbol: instrumentsTable.symbol,
          description: instrumentsTable.description,
          asset_category: instrumentsTable.asset_category,
        },
        portfolio: {
          id: portfoliosTable.id,
          name: portfoliosTable.name,
        },
      })
      .from(tradesTable)
      .leftJoin(accountsTable, sql`${accountsTable.id} = ${tradesTable.account_id}`)
      .leftJoin(instrumentsTable, sql`${instrumentsTable.id} = ${tradesTable.instrument_id}`)
      .leftJoin(portfoliosTable, sql`${portfoliosTable.id} = ${tradesTable.portfolio_id}`)
      .orderBy(tradesTable.trade_date, 'desc')
    // ⚠️ debug: log fetched trades for inspection
    return rows.map(r => {
      // rename columns for client convenience and compute net amount
      const price = r.trade.trade_price
      const net_amount =
        (r.trade.proceeds ?? 0) +
        (r.trade.comm_fee ?? 0) +
        (r.trade.other_fees ?? 0)
      return {
        ...r.trade,
        trade_type: r.trade.order_type || 'Buy',
        price,
        net_amount,
        account: r.account,
        instrument: r.instrument,
        portfolio: r.portfolio,
      }
    })
  } catch (error) {
    console.error('Error fetching trades:', error)
    return []
  }
}

async function getAccounts() {
  try {
    const rows = await db
      .select({
        id: accountsTable.id,
        account_id: accountsTable.account_id,
        account_name: accountsTable.account_name,
        platform: accountsTable.platform,
      })
      .from(accountsTable)
      .where(sql`${accountsTable.status} = 'active'`)
      .orderBy(accountsTable.account_name)
    return rows
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
}

async function getInstruments() {
  try {
    const rows = await db
      .select({
        id: instrumentsTable.id,
        symbol: instrumentsTable.symbol,
        description: instrumentsTable.description,
        asset_category: instrumentsTable.asset_category,
        currency: instrumentsTable.currency,
      })
      .from(instrumentsTable)
      .where(sql`${instrumentsTable.is_active} = true`)
      .orderBy(instrumentsTable.symbol)
    return rows
  } catch (error) {
    console.error('Error fetching instruments:', error)
    return []
  }
}

async function getPortfolios() {
  try {
    const rows = await db
      .select({ id: portfoliosTable.id, name: portfoliosTable.name })
      .from(portfoliosTable)
      .where(sql`${portfoliosTable.status} = 'active'`)
      .orderBy(portfoliosTable.name)
    return rows
  } catch (error) {
    console.error('Error fetching portfolios:', error)
    return []
  }
}

export default async function TradesPage() {
  const [trades, accounts, instruments, portfolios] = await Promise.all([
    getTrades(),
    getAccounts(),
    getInstruments(),
    getPortfolios(),
  ])
  
  return (
    <TradesClient 
      initialTrades={trades}
      accounts={accounts}
      instruments={instruments}
      portfolios={portfolios}
    />
  )
}
