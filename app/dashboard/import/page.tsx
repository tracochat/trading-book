import { createClient } from "@/lib/supabase/server"
import { ImportClient } from "./import-client"

async function getAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('id, account_id, account_name, platform')
    .eq('status', 'active')
    .order('account_name')
  
  if (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
  return data || []
}

async function getRecentImports() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_imports')
    .select(`
      *,
      account:accounts(account_id, account_name, platform)
    `)
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (error) return []
  return data || []
}

export default async function ImportPage() {
  const [accounts, recentImports] = await Promise.all([
    getAccounts(),
    getRecentImports(),
  ])
  
  return <ImportClient accounts={accounts} recentImports={recentImports} />
}
