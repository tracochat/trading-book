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
import { Wallet, TrendingUp, DollarSign, Landmark } from "lucide-react"
import { format } from "date-fns"

async function getNavSnapshots() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('nav_snapshots')
    .select(`
      *,
      account:accounts(account_id, account_name),
      portfolio:portfolios(name)
    `)
    .order('as_of_date', { ascending: false })
    .limit(100)
  
  if (error) {
    console.error('Error fetching NAV:', error)
    return []
  }
  
  return data || []
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export default async function NavPage() {
  const snapshots = await getNavSnapshots()
  
  // Get latest snapshot for summary
  const latest = snapshots[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Net Asset Value</h1>
        <p className="text-muted-foreground">
          Track your portfolio value over time.
        </p>
      </div>

      {latest ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total NAV</CardTitle>
                <Wallet className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(latest.total_nav, latest.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  As of {format(new Date(latest.as_of_date), 'MMM d, yyyy')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash</CardTitle>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(latest.total_cash, latest.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {((latest.total_cash / latest.total_nav) * 100).toFixed(1)}% of NAV
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stocks</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(latest.total_stock, latest.currency)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {((latest.total_stock / latest.total_nav) * 100).toFixed(1)}% of NAV
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Other Assets</CardTitle>
                <Landmark className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    latest.total_options + latest.total_bonds + latest.total_funds + latest.total_other,
                    latest.currency
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Options, Bonds, Funds
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>NAV History</CardTitle>
              <CardDescription>Historical net asset value snapshots</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Account/Portfolio</TableHead>
                      <TableHead className="text-right">Cash</TableHead>
                      <TableHead className="text-right">Stocks</TableHead>
                      <TableHead className="text-right">Options</TableHead>
                      <TableHead className="text-right">Bonds</TableHead>
                      <TableHead className="text-right">Other</TableHead>
                      <TableHead className="text-right">Total NAV</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {snapshots.map((snapshot) => (
                      <TableRow key={snapshot.id}>
                        <TableCell className="font-mono">
                          {format(new Date(snapshot.as_of_date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>
                          {snapshot.account?.account_name || snapshot.portfolio?.name || 'All'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(snapshot.total_cash, snapshot.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(snapshot.total_stock, snapshot.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(snapshot.total_options, snapshot.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(snapshot.total_bonds, snapshot.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(snapshot.total_funds + snapshot.total_other, snapshot.currency)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(snapshot.total_nav, snapshot.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="size-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No NAV data yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              NAV snapshots will appear here after importing activity reports.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
