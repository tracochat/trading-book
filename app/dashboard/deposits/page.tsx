import { createClient } from "@/lib/supabase/server"
import { DepositsClient } from "./deposits-client"

async function getCashTransactions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cash_transactions')
    .select(`
      *,
      account:accounts(account_id, account_name, platform)
    `)
    .in('transaction_type', ['Deposit', 'Withdrawal', 'Transfer In', 'Transfer Out'])
    .order('transaction_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching cash transactions:', error)
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

export default async function DepositsPage() {
  const [transactions, accounts] = await Promise.all([
    getCashTransactions(),
    getAccounts(),
  ])
  
  return <DepositsClient initialTransactions={transactions} accounts={accounts} />
}
