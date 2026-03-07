import { db, sql } from "@/lib/db"
import { dividendAccruals, accounts as accountsTable } from "@/schema/schema"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign } from "lucide-react"
import { format } from "date-fns"

async function getDividendAccruals() {
  try {
    const rows = await db
      .select({
        da: dividendAccruals,
        account: {
          account_name: accountsTable.account_name,
          platform: accountsTable.platform,
        },
      })
      .from(dividendAccruals)
      .leftJoin(accountsTable, sql`${accountsTable.id} = ${dividendAccruals.account_id}`)
      .orderBy(dividendAccruals.ex_date, 'desc')
      .limit(200)

    return rows.map(r => ({ ...r.da, account: r.account }))
  } catch (error) {
    console.error('Error fetching accruals:', error)
    return []
  }
}

export default async function DividendAccrualsPage() {
  const accruals = await getDividendAccruals()

  // Group by currency for totals
  const totalsByCurrency: Record<string, { gross: number; net: number; tax: number }> = {}
  accruals.forEach(a => {
    if (!totalsByCurrency[a.currency]) {
      totalsByCurrency[a.currency] = { gross: 0, net: 0, tax: 0 }
    }
    totalsByCurrency[a.currency].gross += Number(a.gross_amount) || 0
    totalsByCurrency[a.currency].net += Number(a.net_amount) || 0
    totalsByCurrency[a.currency].tax += Number(a.tax) || 0
  })

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Change in Dividend Accruals</h1>
        <p className="text-muted-foreground">
          Pending dividend payments that have been accrued but not yet received.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(totalsByCurrency).map(([currency, totals]) => (
          <Card key={currency}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accrued ({currency})</CardTitle>
              <DollarSign className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.net, currency)}</div>
              <p className="text-xs text-muted-foreground">
                Gross: {formatCurrency(totals.gross, currency)} | Tax: {formatCurrency(totals.tax, currency)}
              </p>
            </CardContent>
          </Card>
        ))}
        {Object.keys(totalsByCurrency).length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No dividend accruals</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Dividend accruals will appear here when imported from activity statements.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {accruals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Accrued Dividends</CardTitle>
            <CardDescription>
              Showing {accruals.length} dividend accrual{accruals.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ex Date</TableHead>
                  <TableHead>Pay Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Gross Amount</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accruals.map((accrual) => (
                  <TableRow key={accrual.id}>
                    <TableCell>
                      {format(new Date(accrual.ex_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {accrual.pay_date ? format(new Date(accrual.pay_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="font-mono font-medium">{accrual.symbol}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {accrual.description || '-'}
                    </TableCell>
                    <TableCell>
                      {accrual.account ? (
                        <Badge variant="outline">{accrual.account.account_name}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right">{accrual.quantity || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(accrual.gross_amount, accrual.currency)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {accrual.tax ? formatCurrency(-accrual.tax, accrual.currency) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(accrual.net_amount, accrual.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
