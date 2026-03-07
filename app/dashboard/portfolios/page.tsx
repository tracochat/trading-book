import { PortfoliosClient } from "./portfolios-client"
import { db, sql } from "@/lib/db"
import { portfolios as portfoliosTable, trades as tradesTable, accounts as accountsTable } from "@/schema/schema"

async function getPortfolios() {
  try {
    return await db.select().from(portfoliosTable).orderBy(portfoliosTable.name)
  } catch (error) {
    console.error('Error fetching portfolios:', error)
    return []
  }
}

async function getPortfolioStats() {
  try {
    const rows = await db
      .select({
        portfolio_id: tradesTable.portfolio_id,
        tradeCount: sql`count(${tradesTable.portfolio_id})`.as('tradeCount'),
      })
      .from(tradesTable)
      .groupBy(tradesTable.portfolio_id)

    const stats: Record<string, { tradeCount: number }> = {}
    rows.forEach(r => {
      if (r.portfolio_id) stats[r.portfolio_id] = { tradeCount: r.tradeCount }
    })
    return stats
  } catch (error) {
    console.error('Error fetching portfolio stats:', error)
    return {}
  }
}

async function getAccounts() {
  try {
    return await db.select().from(accountsTable).where(sql`${accountsTable.status} = 'active'`).orderBy(accountsTable.account_name)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
}

export default async function PortfoliosPage() {
  const [portfolios, stats, accounts] = await Promise.all([
    getPortfolios(),
    getPortfolioStats(),
    getAccounts(),
  ])
  
  return <PortfoliosClient initialPortfolios={portfolios} portfolioStats={stats} accounts={accounts} />
}
