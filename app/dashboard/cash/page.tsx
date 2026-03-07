import { db, sql } from "@/lib/db"
import { cashTransactions, accounts, forexBalances } from "@/schema/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CreditCard } from "lucide-react"
import { format } from "date-fns"

async function getCashTransactions() {
  const rows = await db
    .select({ tx: cashTransactions, account: accounts })
    .from(cashTransactions)
    .leftJoin(accounts, sql`${accounts.id} = ${cashTransactions.account_id}`)
    .orderBy(cashTransactions.transaction_date, 'desc')
    .limit(100)

  return rows.map(r => ({ ...r.tx, account: r.account }))
}

async function getForexBalances() {
  const rows = await db
    .select({ bal: forexBalances, account: accounts })
    .from(forexBalances)
    .leftJoin(accounts, sql`${accounts.id} = ${forexBalances.account_id}`)
    .orderBy(forexBalances.as_of_date, 'desc')

  return rows.map(r => ({ ...r.bal, account: r.account }))
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export default async function CashReportPage() {
  const [transactions, forexBalances] = await Promise.all([
    getCashTransactions(),
    getForexBalances(),
  ])

  // Group transactions by type
  const byType = transactions.reduce((acc, t) => {
    if (!acc[t.transaction_type]) acc[t.transaction_type] = []
    acc[t.transaction_type].push(t)
    return acc
  }, {} as Record<string, typeof transactions>)

  // Calculate totals by currency
  const totalsByCurrency = transactions.reduce((acc, t) => {
    if (!acc[t.currency]) acc[t.currency] = 0
    
    // Add for deposits, subtract for withdrawals
    if (t.transaction_type === 'Deposit' || t.transaction_type === 'Transfer In' || 
        t.transaction_type === 'Interest' || t.transaction_type === 'Dividend') {
      acc[t.currency] += t.amount
    } else {
      acc[t.currency] -= t.amount
    }
    
    return acc
  }, {} as Record<string, number>)

  // Get unique forex balances (latest per currency per account)
  const latestForexBalances = forexBalances.reduce((acc, fb) => {
    const key = `${fb.account_id}-${fb.currency}`
    if (!acc[key] || new Date(fb.as_of_date) > new Date(acc[key].as_of_date)) {
      acc[key] = fb
    }
    return acc
  }, {} as Record<string, typeof forexBalances[0]>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash Report</h1>
        <p className="text-muted-foreground">
          Overview of cash balances and transactions across all accounts.
        </p>
      </div>

      {Object.keys(totalsByCurrency).length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(totalsByCurrency).map(([currency, total]) => (
            <Card key={currency}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{currency} Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(total, currency)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {Object.keys(latestForexBalances).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Forex Balances</CardTitle>
            <CardDescription>Current foreign currency holdings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                    <TableHead>As Of</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(latestForexBalances).map((fb) => (
                    <TableRow key={`${fb.account_id}-${fb.currency}`}>
                      <TableCell>{fb.account?.account_name || '-'}</TableCell>
                      <TableCell className="font-mono">{fb.currency}</TableCell>
                      <TableCell className="text-right font-mono">
                        {fb.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {fb.cost_basis ? formatCurrency(fb.cost_basis, 'USD') : '-'}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${(fb.unrealized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fb.unrealized_pnl ? formatCurrency(fb.unrealized_pnl, 'USD') : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(fb.as_of_date), "yyyy-MM-dd")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Cash Transactions</CardTitle>
          <CardDescription>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No cash transactions</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Cash transactions will appear here after importing activity reports.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.slice(0, 50).map((transaction) => {
                    const isPositive = ['Deposit', 'Transfer In', 'Interest', 'Dividend'].includes(transaction.transaction_type)
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(transaction.transaction_date), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell>{transaction.transaction_type}</TableCell>
                        <TableCell>{transaction.account?.account_name || '-'}</TableCell>
                        <TableCell className={`text-right font-mono ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {transaction.description || '-'}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {transactions.length > 50 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  Showing 50 of {transactions.length} transactions
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
