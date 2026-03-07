"use server"

import { db, sql } from "@/lib/db"
import { interest, accounts } from "@/schema/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Percent, TrendingUp, TrendingDown } from "lucide-react"
import { format } from "date-fns"

async function getInterest() {
  const rows = await db
    .select({ item: interest, account: accounts })
    .from(interest)
    .leftJoin(accounts, sql`${accounts.id} = ${interest.account_id}`)
    .orderBy(interest.interest_date, 'desc')
    .limit(200)

  return rows.map(r => ({ ...r.item, account: r.account }))
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export default async function InterestPage() {
  const interest = await getInterest()
  
  const totalReceived = interest.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0)
  const totalPaid = interest.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Interest</h1>
        <p className="text-muted-foreground">
          Track interest earned and paid on your accounts.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Received</CardTitle>
            <TrendingUp className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(totalReceived, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From {interest.filter(i => i.amount > 0).length} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Paid</CardTitle>
            <TrendingDown className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalPaid, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From {interest.filter(i => i.amount < 0).length} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Interest</CardTitle>
            <Percent className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalReceived - totalPaid >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalReceived - totalPaid, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Total {interest.length} records
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interest Transactions</CardTitle>
          <CardDescription>All interest received and paid</CardDescription>
        </CardHeader>
        <CardContent>
          {interest.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interest.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {format(new Date(item.date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>{item.account?.account_name || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                      <TableCell className={`text-right font-mono ${item.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(item.amount, item.currency)}
                      </TableCell>
                      <TableCell>{item.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Percent className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No interest records</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Interest transactions will appear after importing activity reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
