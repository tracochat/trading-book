"use server"

import { db, sql } from "@/lib/db"
import { transactionFees, accounts } from "@/schema/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Receipt, DollarSign, Percent } from "lucide-react"
import { format } from "date-fns"

async function getTransactionFees() {
  const rows = await db
    .select({ fee: transactionFees, account: accounts })
    .from(transactionFees)
    .leftJoin(accounts, sql`${accounts.id} = ${transactionFees.account_id}`)
    .orderBy(transactionFees.fee_date, 'desc')
    .limit(200)

  return rows.map(r => ({ ...r.fee, account: r.account }))
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export default async function FeesPage() {
  const fees = await getTransactionFees()
  
  const totalFees = fees.reduce((sum, f) => sum + Math.abs(f.amount), 0)

  // Group by fee type
  const byType: Record<string, number> = {}
  fees.forEach(f => {
    const type = f.fee_type || 'Other'
    byType[type] = (byType[type] || 0) + Math.abs(f.amount)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transaction Fees</h1>
        <p className="text-muted-foreground">
          Track all trading fees, commissions, and other charges.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            <DollarSign className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalFees, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From {fees.length} transactions
            </p>
          </CardContent>
        </Card>
        {Object.entries(byType).slice(0, 3).map(([type, amount]) => (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">{type}</CardTitle>
              <Receipt className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(amount, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                {((amount / totalFees) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Details</CardTitle>
          <CardDescription>All transaction fees and commissions</CardDescription>
        </CardHeader>
        <CardContent>
          {fees.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-mono">
                        {format(new Date(fee.date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>{fee.account?.account_name || '-'}</TableCell>
                      <TableCell className="capitalize">{fee.fee_type}</TableCell>
                      <TableCell className="font-medium">{fee.symbol || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{fee.description}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {formatCurrency(fee.amount, fee.currency)}
                      </TableCell>
                      <TableCell>{fee.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Receipt className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No fee records</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Fee records will appear after importing activity reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
