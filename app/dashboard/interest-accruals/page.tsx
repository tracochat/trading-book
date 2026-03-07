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
import { Badge } from "@/components/ui/badge"
import { Percent } from "lucide-react"
import { format } from "date-fns"

async function getInterestAccruals() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('interest_accruals')
    .select(`
      *,
      account:accounts(account_name, platform)
    `)
    .order('accrual_date', { ascending: false })
    .limit(200)
  
  if (error) {
    console.error('Error fetching interest accruals:', error)
    return []
  }
  
  return data || []
}

export default async function InterestAccrualsPage() {
  const accruals = await getInterestAccruals()

  // Group by currency for totals
  const totalsByCurrency: Record<string, { accrued: number; ending: number }> = {}
  accruals.forEach(a => {
    if (!totalsByCurrency[a.currency]) {
      totalsByCurrency[a.currency] = { accrued: 0, ending: 0 }
    }
    totalsByCurrency[a.currency].accrued += Number(a.interest_accrued) || 0
    totalsByCurrency[a.currency].ending += Number(a.ending_accrual_balance) || 0
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
        <h1 className="text-2xl font-semibold tracking-tight">Interest Accruals</h1>
        <p className="text-muted-foreground">
          Accrued interest on bonds and other fixed income instruments.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(totalsByCurrency).map(([currency, totals]) => (
          <Card key={currency}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interest Accrued ({currency})</CardTitle>
              <Percent className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.accrued, currency)}</div>
              <p className="text-xs text-muted-foreground">
                Ending balance: {formatCurrency(totals.ending, currency)}
              </p>
            </CardContent>
          </Card>
        ))}
        {Object.keys(totalsByCurrency).length === 0 && (
          <Card className="md:col-span-3">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Percent className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No interest accruals</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Interest accruals will appear here when imported from activity statements.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {accruals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Accrued Interest</CardTitle>
            <CardDescription>
              Showing {accruals.length} interest accrual record{accruals.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Starting Balance</TableHead>
                  <TableHead className="text-right">Interest Accrued</TableHead>
                  <TableHead className="text-right">Ending Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accruals.map((accrual) => (
                  <TableRow key={accrual.id}>
                    <TableCell>
                      {format(new Date(accrual.accrual_date), 'MMM d, yyyy')}
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
                    <TableCell className="text-right">
                      {formatCurrency(accrual.starting_accrual_balance || 0, accrual.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={accrual.interest_accrued >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(accrual.interest_accrued, accrual.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(accrual.ending_accrual_balance, accrual.currency)}
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
