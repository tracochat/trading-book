import { db, sql } from "@/lib/db"
import { openPositions, instruments, accounts, portfolios } from "@/schema/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Briefcase } from "lucide-react"

async function getOpenPositions() {
  const rows = await db
    .select({
      position: openPositions,
      instrument: instruments,
      account: accounts,
      portfolio: portfolios,
    })
    .from(openPositions)
    .leftJoin(instruments, sql`${instruments.id} = ${openPositions.instrument_id}`)
    .leftJoin(accounts, sql`${accounts.id} = ${openPositions.account_id}`)
    .leftJoin(portfolios, sql`${portfolios.id} = ${openPositions.portfolio_id}`)
    .orderBy(openPositions.as_of_date, 'desc')

  // flatten joined results
  return rows.map(r => ({
    ...r.position,
    instrument: r.instrument,
    account: r.account,
    portfolio: r.portfolio,
  }))
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function formatPercent(value: number | null) {
  if (value === null) return '-'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export default async function PositionsPage() {
  const positions = await getOpenPositions()

  const totalMarketValue = positions.reduce((sum, p) => sum + (p.market_value || 0), 0)
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Open Positions</h1>
        <p className="text-muted-foreground">
          Current holdings across all accounts and portfolios.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Market Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMarketValue, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalUnrealizedPnl, 'USD')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
          <CardDescription>
            {positions.length} position{positions.length !== 1 ? 's' : ''} as of latest update
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Briefcase className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No open positions</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Positions will appear here after importing activity reports.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Portfolio</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Market Price</TableHead>
                    <TableHead className="text-right">Market Value</TableHead>
                    <TableHead className="text-right">Unrealized P&L</TableHead>
                    <TableHead className="text-right">P&L %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{position.instrument?.symbol}</span>
                          {position.instrument?.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {position.instrument.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{position.account?.account_name || '-'}</TableCell>
                      <TableCell>{position.portfolio?.name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {position.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(position.cost_basis, position.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(position.market_price, position.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(position.market_value, position.currency)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${(position.unrealized_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(position.unrealized_pnl, position.currency)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${(position.unrealized_pnl_pct || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(position.unrealized_pnl_pct)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
