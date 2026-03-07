import { createClient } from "@/lib/supabase/server"
import { PortfoliosClient } from "./portfolios-client"

async function getPortfolios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching portfolios:', error)
    return []
  }
  
  return data || []
}

async function getPortfolioStats() {
  const supabase = await createClient()
  
  // Get trade counts per portfolio
  const { data: tradeCounts } = await supabase
    .from('trades')
    .select('portfolio_id')
  
  const stats: Record<string, { tradeCount: number }> = {}
  
  tradeCounts?.forEach(t => {
    if (t.portfolio_id) {
      if (!stats[t.portfolio_id]) {
        stats[t.portfolio_id] = { tradeCount: 0 }
      }
      stats[t.portfolio_id].tradeCount++
    }
  })
  
  return stats
}

async function getAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('status', 'active')
    .order('account_name', { ascending: true })
  
  if (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
  
  return data || []
}

export default async function PortfoliosPage() {
  const [portfolios, stats, accounts] = await Promise.all([
    getPortfolios(),
    getPortfolioStats(),
    getAccounts(),
  ])
  
  return <PortfoliosClient initialPortfolios={portfolios} portfolioStats={stats} accounts={accounts} />
}
