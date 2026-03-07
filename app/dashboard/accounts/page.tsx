import { createClient } from "@/lib/supabase/server"
import { AccountsClient } from "./accounts-client"

async function getAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
  
  return data || []
}

export default async function AccountsPage() {
  const accounts = await getAccounts()
  
  return <AccountsClient initialAccounts={accounts} />
}
