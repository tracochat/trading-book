import { TradesClient } from "./trades-client"
import { db, sql } from "@/lib/db"
import { trades as tradesTable, accounts as accountsTable, instruments as instrumentsTable, portfolios as portfoliosTable } from "@/schema/schema"

async function getTradeCount() {
  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tradesTable)

    return rows[0]?.count ?? 0
  } catch (error) {
    console.error('Error fetching trade count:', error)
    return 0
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
  const [tradeCount, accounts, instruments, portfolios] = await Promise.all([
    getTradeCount(),
    getAccounts(),
    getInstruments(),
    getPortfolios(),
  ])
  
  return (
    <TradesClient 
      initialTradeCount={tradeCount}
      accounts={accounts}
      instruments={instruments}
      portfolios={portfolios}
    />
  )
}
