"use server"

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Banknote, ArrowRightLeft, DollarSign } from "lucide-react"
import { format } from "date-fns"

async function getForexBalances() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('forex_balances')
    .select(`
      *,
      account:accounts(account_id, account_name)
    `)
    .order('as_of_date', { ascending: false })
    .limit(200)
  
  if (error) {
    console.error('Error fetching forex balances:', error)
    return []
  }
  
  return data || []
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export default async function ForexPage() {
  const balances = await getForexBalances()
  
  // Get latest balances by currency
  const latestByCurrency: Record<string, typeof balances[0]> = {}
  balances.forEach(b => {
    if (!latestByCurrency[b.currency]) {
      latestByCurrency[b.currency] = b
    }
  })

  const currencies = Object.values(latestByCurrency)
  const totalUSD = currencies.reduce((sum, b) => sum + (b.usd_value || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Forex Balances</h1>
        <p className="text-muted-foreground">
          Track your multi-currency cash balances and FX positions.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total (USD)</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalUSD, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {currencies.length} currencies
            </p>
          </CardContent>
        </Card>
        {currencies.slice(0, 3).map((balance) => (
          <Card key={balance.currency}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{balance.currency}</CardTitle>
              <Banknote className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(balance.balance, balance.currency)}
              </div>
              <p className="text-xs text-muted-foreground">
                {balance.usd_value ? formatCurrency(balance.usd_value, 'USD') : '-'} USD
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Currency Balances</CardTitle>
          <CardDescription>Current cash position by currency</CardDescription>
        </CardHeader>
        <CardContent>
          {currencies.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">USD Value</TableHead>
                    <TableHead className="text-right">FX Rate</TableHead>
                    <TableHead>As Of</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currencies.map((balance) => (
                    <TableRow key={`${balance.currency}-${balance.account_id}`}>
                      <TableCell className="font-medium">{balance.currency}</TableCell>
                      <TableCell>{balance.account?.account_name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(balance.balance, balance.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {balance.usd_value ? formatCurrency(balance.usd_value, 'USD') : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {balance.fx_rate?.toFixed(4) || '-'}
                      </TableCell>
                      <TableCell className="font-mono">
                        {format(new Date(balance.as_of_date), 'yyyy-MM-dd')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <ArrowRightLeft className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No forex balances</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Currency balances will appear after importing activity reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historical Balances</CardTitle>
          <CardDescription>Balance history over time</CardDescription>
        </CardHeader>
        <CardContent>
          {balances.length > 0 ? (
            <div className="rounded-md border overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">USD Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell className="font-mono">
                        {format(new Date(balance.as_of_date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>{balance.account?.account_name || '-'}</TableCell>
                      <TableCell className="font-medium">{balance.currency}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(balance.balance, balance.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {balance.usd_value ? formatCurrency(balance.usd_value, 'USD') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
