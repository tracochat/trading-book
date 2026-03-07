import { db, sql } from "@/lib/db"
import { ImportClient } from "./import-client"
import { accounts, activityImports } from "@/schema/schema"

async function getAccounts() {
  const rows = await db
    .select({
      id: accounts.id,
      account_id: accounts.account_id,
      account_name: accounts.account_name,
      platform: accounts.platform,
    })
    .from(accounts)
    .where(sql`${accounts.status} = 'active'`)
    .orderBy(accounts.account_name)

  return rows
}

async function getRecentImports() {
  const rows = await db
    .select({
      imp: activityImports,
      account: { account_name: accounts.account_name, platform: accounts.platform },
    })
    .from(activityImports)
    .leftJoin(accounts, sql`${accounts.id} = ${activityImports.account_id}`)
    .orderBy(activityImports.imported_at, 'desc')
    .limit(20)

  return rows.map(r => ({ ...r.imp, account: r.account }))
}

export default async function ImportPage() {
  const [accounts, recentImports] = await Promise.all([
    getAccounts(),
    getRecentImports(),
  ])
  
  return <ImportClient accounts={accounts} recentImports={recentImports} />
}
