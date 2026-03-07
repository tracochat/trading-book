import { DepositsClient } from "./deposits-client"
import { db, sql } from "@/lib/db"
import { cashTransactions, accounts as accountsTable } from "@/schema/schema"

async function getCashTransactions() {
  try {
    const rows = await db
      .select({
        ct: cashTransactions,
        account: {
          account_id: accountsTable.account_id,
          account_name: accountsTable.account_name,
          platform: accountsTable.platform,
        },
      })
      .from(cashTransactions)
      .leftJoin(accountsTable, sql`${accountsTable.id} = ${cashTransactions.account_id}`)
      .where(sql`${cashTransactions.transaction_type} IN ('Deposit','Withdrawal','Transfer In','Transfer Out')`)
      .orderBy(cashTransactions.transaction_date, 'desc')
    return rows.map(r => ({
      ...r.ct,
      account: r.account,
    }))
  } catch (error) {
    console.error('Error fetching cash transactions:', error)
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

export default async function DepositsPage() {
  const [transactions, accounts] = await Promise.all([
    getCashTransactions(),
    getAccounts(),
  ])
  
  return <DepositsClient initialTransactions={transactions} accounts={accounts} />
}
