import { AccountsClient } from "./accounts-client"
import { db } from "@/lib/db"
import { accounts as accountsTable } from "@/schema/schema"

async function getAccounts() {
  try {
    return await db
      .select()
      .from(accountsTable)
      .orderBy(accountsTable.created_at, 'desc')
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return []
  }
}

export default async function AccountsPage() {
  const accounts = await getAccounts()
  
  return <AccountsClient initialAccounts={accounts} />
}
