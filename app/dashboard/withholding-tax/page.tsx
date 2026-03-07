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
import { FileText, DollarSign } from "lucide-react"
import { format } from "date-fns"

async function getWithholdingTax() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('withholding_tax')
    .select(`
      *,
      account:accounts(account_id, account_name),
      instrument:instruments(symbol, name)
    `)
    .order('date', { ascending: false })
    .limit(200)
  
  if (error) {
    console.error('Error fetching withholding tax:', error)
    return []
  }
  
  return data || []
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

export default async function WithholdingTaxPage() {
  const taxes = await getWithholdingTax()
  
  const totalTax = taxes.reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Group by country
  const byCountry: Record<string, number> = {}
  taxes.forEach(t => {
    const country = t.country || 'Unknown'
    byCountry[country] = (byCountry[country] || 0) + Math.abs(t.amount)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Withholding Tax</h1>
        <p className="text-muted-foreground">
          Track taxes withheld on dividends and other income.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Withheld</CardTitle>
            <DollarSign className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(totalTax, 'USD')}
            </div>
            <p className="text-xs text-muted-foreground">
              From {taxes.length} transactions
            </p>
          </CardContent>
        </Card>
        {Object.entries(byCountry).slice(0, 2).map(([country, amount]) => (
          <Card key={country}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{country}</CardTitle>
              <FileText className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(amount, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">
                {((amount / totalTax) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Withholding Tax Details</CardTitle>
          <CardDescription>All withholding tax transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {taxes.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxes.map((tax) => (
                    <TableRow key={tax.id}>
                      <TableCell className="font-mono">
                        {format(new Date(tax.date), 'yyyy-MM-dd')}
                      </TableCell>
                      <TableCell>{tax.account?.account_name || '-'}</TableCell>
                      <TableCell className="font-medium">{tax.instrument?.symbol || '-'}</TableCell>
                      <TableCell>{tax.country || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{tax.description}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        {formatCurrency(tax.amount, tax.currency)}
                      </TableCell>
                      <TableCell>{tax.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No withholding tax records</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Tax records will appear after importing activity reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
