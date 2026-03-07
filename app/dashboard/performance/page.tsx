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
import { TrendingUp, TrendingDown, Activity, BarChart3 } from "lucide-react"
import { format } from "date-fns"

async function getPerformanceSummary() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('performance_summary')
    .select(`
      *,
      account:accounts(account_id, account_name),
      portfolio:portfolios(name)
    `)
    .order('period_end', { ascending: false })
    .limit(100)
  
  if (error) {
    console.error('Error fetching performance:', error)
    return []
  }
  
  return data || []
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export default async function PerformancePage() {
  const performance = await getPerformanceSummary()
  
  const latest = performance[0]
  
  // Calculate totals
  const totalRealizedPnL = performance.reduce((sum, p) => sum + (p.realized_pnl || 0), 0)
  const totalUnrealizedPnL = performance.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance Summary</h1>
        <p className="text-muted-foreground">
          Track your realized and unrealized P&L across accounts and portfolios.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(totalRealizedPnL + totalUnrealizedPnL) >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalRealizedPnL + totalUnrealizedPnL, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              Realized + Unrealized
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
            <TrendingUp className="size-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalRealizedPnL, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From closed positions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totalUnrealizedPnL, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From open positions
            </p>
          </CardContent>
        </Card>
        {latest && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Latest Return</CardTitle>
              {(latest.return_pct || 0) >= 0 ? (
                <TrendingUp className="size-4 text-success" />
              ) : (
                <TrendingDown className="size-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(latest.return_pct || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatPercent(latest.return_pct || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {latest.period_type} ending {format(new Date(latest.period_end), 'MMM d')}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance History</CardTitle>
          <CardDescription>P&L summary by period</CardDescription>
        </CardHeader>
        <CardContent>
          {performance.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Account/Portfolio</TableHead>
                    <TableHead className="text-right">Starting NAV</TableHead>
                    <TableHead className="text-right">Ending NAV</TableHead>
                    <TableHead className="text-right">Realized P&L</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                    <TableHead className="text-right">Return %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">
                        {format(new Date(item.period_start), 'MMM d')} - {format(new Date(item.period_end), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {item.account?.account_name || item.portfolio?.name || 'All'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.starting_nav || 0, item.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.ending_nav || 0, item.currency)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${(item.realized_pnl || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(item.realized_pnl || 0, item.currency)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${(item.unrealized_pnl || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(item.unrealized_pnl || 0, item.currency)}
                      </TableCell>
                      <TableCell className={`text-right font-mono font-medium ${(item.return_pct || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatPercent(item.return_pct || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No performance data yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Performance summaries will appear after importing activity reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
