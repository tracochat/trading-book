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
import { Banknote } from "lucide-react"
import { format } from "date-fns"

async function getDividends() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dividends')
    .select(`
      *,
      instrument:instruments(symbol, description),
      account:accounts(account_name, platform)
    `)
    .order('pay_date', { ascending: false })
  
  if (error) {
    console.error('Error fetching dividends:', error)
    return []
  }
  
  return data || []
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export default async function DividendsPage() {
  const dividends = await getDividends()

  const totalGross = dividends.reduce((sum, d) => sum + d.gross_amount, 0)
  const totalNet = dividends.reduce((sum, d) => sum + d.net_amount, 0)
  const totalWithholding = dividends.reduce((sum, d) => sum + d.withholding_tax, 0)

  // Group by year
  const byYear = dividends.reduce((acc, d) => {
    const year = new Date(d.pay_date || d.ex_date).getFullYear()
    if (!acc[year]) acc[year] = { gross: 0, net: 0, count: 0 }
    acc[year].gross += d.gross_amount
    acc[year].net += d.net_amount
    acc[year].count++
    return acc
  }, {} as Record<number, { gross: number; net: number; count: number }>)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dividends</h1>
        <p className="text-muted-foreground">
          Track dividend income across all your holdings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Dividends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dividends.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalGross, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Withholding Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalWithholding, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalNet, 'USD')}</div>
          </CardContent>
        </Card>
      </div>

      {Object.keys(byYear).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {Object.entries(byYear)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([year, data]) => (
                  <div key={year} className="rounded-lg border p-4">
                    <div className="text-lg font-semibold">{year}</div>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dividends</span>
                        <span>{data.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gross</span>
                        <span className="font-mono">{formatCurrency(data.gross, 'USD')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net</span>
                        <span className="font-mono text-green-600">{formatCurrency(data.net, 'USD')}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dividend History</CardTitle>
          <CardDescription>
            {dividends.length} dividend payment{dividends.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dividends.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Banknote className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No dividends recorded</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Dividends will appear here after importing activity reports.
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Withholding</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dividends.map((dividend) => (
                    <TableRow key={dividend.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(dividend.pay_date || dividend.ex_date), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{dividend.instrument?.symbol}</span>
                      </TableCell>
                      <TableCell>{dividend.account?.account_name || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(dividend.gross_amount, dividend.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {dividend.withholding_tax > 0 ? `-${formatCurrency(dividend.withholding_tax, dividend.currency)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(dividend.net_amount, dividend.currency)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {dividend.description || '-'}
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
