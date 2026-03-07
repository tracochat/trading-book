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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// IBKR code definitions based on activity statement
const assetCategoryCodes = [
  { code: 'Stocks', description: 'Common and preferred stocks' },
  { code: 'Equity and Index Options', description: 'Exchange-traded options on stocks and indices' },
  { code: 'Bonds', description: 'Corporate and government bonds' },
  { code: 'Cash', description: 'Cash balances in various currencies' },
  { code: 'Futures', description: 'Futures contracts' },
  { code: 'Forex', description: 'Foreign exchange transactions' },
  { code: 'Funds', description: 'Mutual funds and ETFs' },
  { code: 'Warrants', description: 'Warrants and rights' },
  { code: 'CFD', description: 'Contracts for Difference' },
]

const transactionCodes = [
  { code: 'Deposits', description: 'Cash deposits into the account' },
  { code: 'Withdrawals', description: 'Cash withdrawals from the account' },
  { code: 'Electronic Fund Transfer', description: 'Electronic transfers in/out' },
  { code: 'Transfer Between Accounts', description: 'Transfers between linked accounts' },
  { code: 'Internal Transfer', description: 'Internal account transfers' },
  { code: 'Advisor Fee', description: 'Investment advisor fees' },
]

const tradeCodes = [
  { code: 'BUY', description: 'Purchase of security' },
  { code: 'SELL', description: 'Sale of security' },
  { code: 'BUY (Ca.)', description: 'Buy to close a short position' },
  { code: 'SELL (Ca.)', description: 'Sell to close a long position' },
]

const openCloseCodes = [
  { code: 'O', description: 'Opening transaction - establishing a new position' },
  { code: 'C', description: 'Closing transaction - reducing or eliminating a position' },
  { code: 'O;C', description: 'Transaction that both opens and closes positions' },
]

const interestCodes = [
  { code: 'Credit Interest', description: 'Interest earned on cash balances' },
  { code: 'Debit Interest', description: 'Interest charged on margin balance' },
  { code: 'Bond Interest', description: 'Coupon interest from bonds' },
  { code: 'Bond Coupon', description: 'Bond coupon payment received' },
  { code: 'Payment In Lieu Of Dividends', description: 'Payments received instead of dividends on loaned shares' },
]

const reconciliationCodes = [
  { code: 'matched', description: 'Record matches between system and imported report' },
  { code: 'missing_in_system', description: 'Record exists in report but not in system' },
  { code: 'missing_in_report', description: 'Record exists in system but not in report' },
  { code: 'mismatch', description: 'Record exists in both but values differ' },
  { code: 'duplicate', description: 'Duplicate record detected' },
  { code: 'resolved', description: 'Discrepancy has been reviewed and resolved' },
]

export default function CodesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Code Reference</h1>
        <p className="text-muted-foreground">
          Reference guide for codes used in activity statements and the trading system.
        </p>
      </div>

      <Tabs defaultValue="asset" className="space-y-4">
        <TabsList>
          <TabsTrigger value="asset">Asset Categories</TabsTrigger>
          <TabsTrigger value="trade">Trade Codes</TabsTrigger>
          <TabsTrigger value="transaction">Transactions</TabsTrigger>
          <TabsTrigger value="interest">Interest</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="asset">
          <Card>
            <CardHeader>
              <CardTitle>Asset Category Codes</CardTitle>
              <CardDescription>
                Classification codes for different types of financial instruments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Code</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetCategoryCodes.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell>
                        <Badge variant="secondary">{item.code}</Badge>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trade">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Buy/Sell Codes</CardTitle>
                <CardDescription>
                  Codes indicating the direction of a trade.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Code</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradeCodes.map((item) => (
                      <TableRow key={item.code}>
                        <TableCell>
                          <Badge variant="secondary">{item.code}</Badge>
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Open/Close Codes</CardTitle>
                <CardDescription>
                  Codes indicating whether a trade opens or closes a position.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Code</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openCloseCodes.map((item) => (
                      <TableRow key={item.code}>
                        <TableCell>
                          <Badge variant="secondary">{item.code}</Badge>
                        </TableCell>
                        <TableCell>{item.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transaction">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Type Codes</CardTitle>
              <CardDescription>
                Codes for different types of cash transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Code</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionCodes.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell>
                        <Badge variant="secondary">{item.code}</Badge>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interest">
          <Card>
            <CardHeader>
              <CardTitle>Interest Type Codes</CardTitle>
              <CardDescription>
                Codes for different types of interest transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Code</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interestCodes.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell>
                        <Badge variant="secondary">{item.code}</Badge>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation Status Codes</CardTitle>
              <CardDescription>
                Status codes used during import reconciliation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Code</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationCodes.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell>
                        <Badge variant="outline">{item.code}</Badge>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
