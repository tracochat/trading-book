import { createClient } from "@/lib/supabase/server"
import { TradesClient } from "./trades-client"

async function getTrades() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trades')
    .select(`
      *,
      account:accounts(id, account_id, account_name, platform),
      instrument:instruments(id, symbol, description, asset_class),
      portfolio:portfolios(id, name)
    `)
    .order('trade_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching trades:', error)
    return []
  }
  
  return data || []
}

async function getAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('id, account_id, account_name, platform')
    .eq('is_active', true)
    .order('account_name')
  
  if (error) return []
  return data || []
}

async function getInstruments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('instruments')
    .select('id, symbol, description, asset_class, currency')
    .eq('is_active', true)
    .order('symbol')
  
  if (error) return []
  return data || []
}

async function getPortfolios() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('portfolios')
    .select('id, name')
    .eq('is_active', true)
    .order('name')
  
  if (error) return []
  return data || []
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
