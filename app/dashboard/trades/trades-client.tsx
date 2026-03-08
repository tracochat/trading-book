'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Trade, TradeType, Account, Instrument, Portfolio } from '@/lib/types'
import { createTrade, updateTrade, deleteTrade } from './actions'
import { cn } from '@/lib/utils'

// Import DataGrid components
import { DataGridProvider } from '@/components/data-grid/hooks/use-data-grid'
import { DataGridTable } from '@/components/data-grid/data-grid'
import { DataGridToolbar } from '@/components/data-grid/data-grid-toolbar'
import { DataGridPivotPanel } from '@/components/data-grid/data-grid-pivot-panel'
import { useDataGridContext } from '@/components/data-grid/hooks/use-data-grid'
import type { DataGridConfig, ColumnConfig, PivotState } from '@/components/data-grid/types'

const tradeTypes: TradeType[] = [
  'Buy',
  'Sell',
  'Buy to Open',
  'Buy to Close',
  'Sell to Open',
  'Sell to Close',
]

interface TradesClientProps {
  initialTrades: Trade[]
  accounts: Pick<Account, 'id' | 'account_id' | 'account_name' | 'platform'>[]
  instruments: Pick<Instrument, 'id' | 'symbol' | 'description' | 'asset_class' | 'currency'>[]
  portfolios: Pick<Portfolio, 'id' | 'name'>[]
}

// Helper functions
const getTradeTypeColor = (type?: TradeType) => {
  if (!type) return 'bg-gray-100 text-gray-800'
  if (type.includes('Buy'))
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

// Inner component that uses the DataGrid context
function TradesDataGridInner({
  accounts,
  instruments,
  portfolios,
  onEdit,
  onDelete,
  onCreate,
}: {
  accounts: TradesClientProps['accounts']
  instruments: TradesClientProps['instruments']
  portfolios: TradesClientProps['portfolios']
  onEdit: (trade: Trade) => void
  onDelete: (trade: Trade) => void
  onCreate: () => void
}) {
  const { state, actions, config } = useDataGridContext<Trade>()

  const handlePivotApply = (pivotState: PivotState) => {
    actions.setPivotState(pivotState)
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="mb-4">
          <DataGridToolbar
            columns={config.columns}
            toolbar={{
              showSearch: true,
              showColumnToggle: true,
              showPivotToggle: true,
              filters: [
                {
                  id: 'account_id',
                  label: 'Account',
                  type: 'select',
                  field: 'account_id',
                  options: accounts.map(acc => ({
                    label: acc.account_name,
                    value: acc.id,
                  })),
                },
                {
                  id: 'trade_type',
                  label: 'Trade Type',
                  type: 'select',
                  field: 'trade_type',
                  options: tradeTypes.map(type => ({
                    label: type,
                    value: type,
                  })),
                },
                {
                  id: 'trade_date',
                  label: 'Date Range',
                  type: 'daterange',
                  field: 'trade_date',
                },
              ],
              customActions: (
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <a href="/dashboard/import">
                      <Upload className="mr-2 size-4" />
                      Import
                    </a>
                  </Button>
                  <Button onClick={onCreate}>
                    <Plus className="mr-2 size-4" />
                    New Trade
                  </Button>
                </div>
              ),
            }}
          />
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0">
          <DataGridTable<Trade> />
        </div>
      </div>

      {/* Pivot Panel */}
      {state.pivotPanelOpen && (
        <div className="w-[300px] shrink-0">
          <DataGridPivotPanel
            columns={config.columns}
            onApply={handlePivotApply}
            onClose={actions.togglePivotPanel}
          />
        </div>
      )}
    </div>
  )
}

export function TradesClient({
  initialTrades,
  accounts,
  instruments,
  portfolios,
}: TradesClientProps) {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>(initialTrades)

  // Keep local trades array in sync when props are refreshed
  useEffect(() => {
    setTrades(initialTrades)
  }, [initialTrades])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [deletingTrade, setDeletingTrade] = useState<Trade | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    account_id: '',
    portfolio_id: '',
    instrument_id: '',
    trade_date: new Date().toISOString().split('T')[0],
    settle_date: '',
    trade_type: 'Buy' as TradeType,
    quantity: 0,
    price: 0,
    commission: 0,
    fees: 0,
    currency: 'USD',
    fx_rate: 1,
    notes: '',
    external_id: '',
  })

  // Define columns for DataGrid
  const columns: ColumnConfig<Trade>[] = useMemo(
    () => [
      {
        id: 'trade_date',
        accessorKey: 'trade_date',
        header: 'Date',
        enableSorting: true,
        enableFiltering: true,
        filterConfig: {
          type: 'date',
          placeholder: 'Filter by date...',
        },
        dateFormat: 'yyyy-MM-dd',
        cell: (value) => {
          if (!value) return '-'
          return format(new Date(value as string), 'yyyy-MM-dd')
        },
      },
      {
        id: 'symbol',
        accessorKey: 'instrument.symbol',
        header: 'Symbol',
        enableSorting: true,
        enableFiltering: true,
        filterConfig: {
          type: 'text',
          placeholder: 'Search symbol...',
        },
        cell: (value, row) => {
          const trade = row as Trade
          return (
            <div>
              <span className="font-medium">{trade.instrument?.symbol || '-'}</span>
              {trade.instrument?.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {trade.instrument.description}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: 'trade_type',
        accessorKey: 'trade_type',
        header: 'Type',
        enableSorting: true,
        enableFiltering: true,
        filterConfig: {
          type: 'select',
          options: tradeTypes.map(type => ({ label: type, value: type })),
        },
        cell: (value) => (
          <Badge variant="secondary" className={getTradeTypeColor(value as TradeType)}>
            {value as string}
          </Badge>
        ),
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: 'Qty',
        align: 'right',
        enableSorting: true,
        enableFiltering: true,
        enableAggregation: true,
        aggregation: 'sum',
        filterConfig: {
          type: 'number',
          placeholder: 'Filter qty...',
        },
        cell: (value) => (
          <span className="font-mono">{(value as number).toLocaleString()}</span>
        ),
      },
      {
        id: 'trade_price',
        accessorKey: 'trade_price',
        header: 'Price',
        align: 'right',
        enableSorting: true,
        enableFiltering: true,
        filterConfig: {
          type: 'number',
          placeholder: 'Filter price...',
        },
        numberFormat: {
          style: 'currency',
          currency: 'USD',
        },
        cell: (value, row) => {
          const trade = row as Trade
          const price = value as number
          return (
            <span
              className={cn(
                'font-mono',
                price < 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatCurrency(price, trade.currency)}
            </span>
          )
        },
      },
      {
        id: 'net_amount',
        accessorKey: 'net_amount',
        header: 'Net Amount',
        align: 'right',
        enableSorting: true,
        enableFiltering: true,
        enableAggregation: true,
        aggregation: 'sum',
        filterConfig: {
          type: 'number',
          placeholder: 'Filter amount...',
        },
        cell: (value, row) => {
          const trade = row as Trade
          const amount = value as number
          return (
            <span
              className={cn(
                'font-mono',
                amount < 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatCurrency(amount, trade.currency)}
            </span>
          )
        },
      },
      {
        id: 'account_id',
        accessorKey: 'account.account_name',
        header: 'Account',
        enableSorting: true,
        enableFiltering: true,
        enableGrouping: true,
        filterConfig: {
          type: 'select',
          options: accounts.map(acc => ({ label: acc.account_name, value: acc.id })),
        },
        cell: (value, row) => {
          const trade = row as Trade
          return <span className="text-sm">{trade.account?.account_name || '-'}</span>
        },
      },
      {
        id: 'portfolio_id',
        accessorKey: 'portfolio.name',
        header: 'Portfolio',
        enableSorting: true,
        enableFiltering: true,
        enableGrouping: true,
        defaultVisible: false,
        filterConfig: {
          type: 'select',
          options: portfolios.map(p => ({ label: p.name, value: p.id })),
        },
        cell: (value, row) => {
          const trade = row as Trade
          return <span className="text-sm">{trade.portfolio?.name || '-'}</span>
        },
      },
      {
        id: 'commission',
        accessorKey: 'commission',
        header: 'Commission',
        align: 'right',
        enableSorting: true,
        enableAggregation: true,
        aggregation: 'sum',
        defaultVisible: false,
        cell: (value, row) => {
          const trade = row as Trade
          return (
            <span className="font-mono text-muted-foreground">
              {formatCurrency(value as number, trade.currency)}
            </span>
          )
        },
      },
      {
        id: 'fees',
        accessorKey: 'fees',
        header: 'Fees',
        align: 'right',
        enableSorting: true,
        enableAggregation: true,
        aggregation: 'sum',
        defaultVisible: false,
        cell: (value, row) => {
          const trade = row as Trade
          return (
            <span className="font-mono text-muted-foreground">
              {formatCurrency(value as number, trade.currency)}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableFiltering: false,
        enableHiding: false,
        width: 50,
        cell: (_, row) => {
          const trade = row as Trade
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditDialog(trade)}>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openDeleteDialog(trade)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [accounts, portfolios]
  )

  // DataGrid configuration
  const gridConfig: DataGridConfig<Trade> = useMemo(
    () => ({
      id: 'trades-grid',
      columns,
      dataSource: {
        type: 'client',
        data: trades,
      },
      features: {
        sorting: true,
        filtering: true,
        pagination: true,
        columnVisibility: true,
        rowSelection: false,
        rowGrouping: true,
        pivoting: true,
        globalSearch: true,
      },
      pagination: {
        pageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
        showPageSizeSelector: true,
        showRowCount: true,
      },
      getRowId: (row) => row.id,
    }),
    [columns, trades]
  )

  const resetForm = () => {
    setFormData({
      account_id: accounts[0]?.id || '',
      portfolio_id: '',
      instrument_id: '',
      trade_date: new Date().toISOString().split('T')[0],
      settle_date: '',
      trade_type: 'Buy',
      quantity: 0,
      price: 0,
      commission: 0,
      fees: 0,
      currency: 'USD',
      fx_rate: 1,
      notes: '',
      external_id: '',
    })
    setEditingTrade(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
    router.refresh()
  }

  const openEditDialog = (trade: Trade) => {
    setEditingTrade(trade)
    setFormData({
      account_id: trade.account_id,
      portfolio_id: trade.portfolio_id || '',
      instrument_id: trade.instrument_id,
      trade_date: trade.trade_date,
      settle_date: trade.settle_date || '',
      trade_type: trade.order_type || trade.trade_type || 'Buy',
      quantity: trade.quantity,
      price: trade.price,
      commission: trade.commission,
      fees: trade.fees,
      currency: trade.currency,
      fx_rate: trade.fx_rate || 1,
      notes: trade.notes || '',
      external_id: trade.external_id || '',
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (trade: Trade) => {
    setDeletingTrade(trade)
    setIsDeleteDialogOpen(true)
  }

  const calculateAmounts = () => {
    const gross = formData.quantity * formData.price
    const net = gross + formData.commission + formData.fees
    return { gross, net }
  }

  const selectedInstrument = instruments.find((i) => i.id === formData.instrument_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { gross, net } = calculateAmounts()
    const submitData = {
      ...formData,
      trade_type: formData.trade_type || 'Buy',
      gross_amount: gross,
      net_amount: net,
      symbol: selectedInstrument?.symbol || '',
      description: selectedInstrument?.description || '',
      asset_category: selectedInstrument?.asset_class || '',
      buy_sell: (formData.trade_type || 'Buy').startsWith('Buy') ? 'BUY' : 'SELL',
    }

    try {
      if (editingTrade) {
        const result = await updateTrade(editingTrade.id, submitData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Trade updated successfully')
          setIsDialogOpen(false)
          router.refresh()
        }
      } else {
        const result = await createTrade(submitData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Trade created successfully')
          setIsDialogOpen(false)
          router.refresh()
        }
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTrade) return
    setIsLoading(true)

    try {
      const result = await deleteTrade(deletingTrade.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Trade deleted successfully')
        router.refresh()
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setDeletingTrade(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade Blotter</h1>
          <p className="text-muted-foreground">
            Record and manage all your trades across accounts.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trades</CardTitle>
          <CardDescription>
            {trades.length} total trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowLeftRight className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No trades found</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Start by recording your first trade or importing from a broker report.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="/dashboard/import">
                    <Upload className="mr-2 size-4" />
                    Import
                  </a>
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 size-4" />
                  New Trade
                </Button>
              </div>
            </div>
          ) : (
            <DataGridProvider config={gridConfig}>
              <TradesDataGridInner
                accounts={accounts}
                instruments={instruments}
                portfolios={portfolios}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
                onCreate={openCreateDialog}
              />
            </DataGridProvider>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrade ? 'Edit Trade' : 'Record New Trade'}</DialogTitle>
            <DialogDescription>
              {editingTrade ? 'Update the trade details below.' : 'Enter the details for your trade.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="account_id">Account *</Label>
                  <Select
                    value={formData.account_id}
                    onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="portfolio_id">Portfolio</Label>
                  <Select
                    value={formData.portfolio_id}
                    onValueChange={(value) => setFormData({ ...formData, portfolio_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="instrument_id">Instrument *</Label>
                  <Select
                    value={formData.instrument_id}
                    onValueChange={(value) => {
                      const inst = instruments.find((i) => i.id === value)
                      setFormData({
                        ...formData,
                        instrument_id: value,
                        currency: inst?.currency || 'USD',
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select instrument" />
                    </SelectTrigger>
                    <SelectContent>
                      {instruments.map((inst) => (
                        <SelectItem key={inst.id} value={inst.id}>
                          {inst.symbol} - {inst.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trade_type">Trade Type *</Label>
                  <Select
                    value={formData.trade_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, trade_type: value as TradeType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {tradeTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="trade_date">Trade Date *</Label>
                  <Input
                    id="trade_date"
                    type="date"
                    value={formData.trade_date}
                    onChange={(e) => setFormData({ ...formData, trade_date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="settle_date">Settlement Date</Label>
                  <Input
                    id="settle_date"
                    type="date"
                    value={formData.settle_date}
                    onChange={(e) => setFormData({ ...formData, settle_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="any"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="any"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="JPY">JPY</SelectItem>
                      <SelectItem value="CNY">CNY</SelectItem>
                      <SelectItem value="HKD">HKD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="commission">Commission</Label>
                  <Input
                    id="commission"
                    type="number"
                    step="any"
                    value={formData.commission}
                    onChange={(e) =>
                      setFormData({ ...formData, commission: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fees">Fees</Label>
                  <Input
                    id="fees"
                    type="number"
                    step="any"
                    value={formData.fees}
                    onChange={(e) =>
                      setFormData({ ...formData, fees: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fx_rate">FX Rate</Label>
                  <Input
                    id="fx_rate"
                    type="number"
                    step="any"
                    value={formData.fx_rate}
                    onChange={(e) =>
                      setFormData({ ...formData, fx_rate: parseFloat(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="rounded-lg bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span>Gross Amount:</span>
                  <span className="font-mono">
                    {formatCurrency(calculateAmounts().gross, formData.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Net Amount:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(calculateAmounts().net, formData.currency)}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : editingTrade ? 'Update Trade' : 'Create Trade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade for{' '}
              <strong>{deletingTrade?.instrument?.symbol}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
