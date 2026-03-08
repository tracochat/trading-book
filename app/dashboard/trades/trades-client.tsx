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
  Search,
  Filter,
  Calendar,
  Download,
  Upload,
} from 'lucide-react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { toast } from 'sonner'
import type { Trade, TradeType, Account, Instrument, Portfolio } from '@/lib/types'
import { createTrade, updateTrade, deleteTrade } from './actions'
import { cn } from '@/lib/utils'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterTradeType, setFilterTradeType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

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

  // Reset filters whenever data changes
  useEffect(() => {
    setSearchQuery('')
    setFilterAccount('all')
    setFilterTradeType('all')
    setDateRange({})
  }, [trades])

  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const matchesSearch =
        searchQuery === '' ||
        trade.instrument?.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trade.instrument?.description?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesAccount = filterAccount === 'all' || trade.account_id === filterAccount
      const matchesTradeType = filterTradeType === 'all' || trade.trade_type === filterTradeType

      const tradeDate = new Date(trade.trade_date)
      const matchesDateRange =
        (!dateRange.from || tradeDate >= dateRange.from) &&
        (!dateRange.to || tradeDate <= dateRange.to)

      return matchesSearch && matchesAccount && matchesTradeType && matchesDateRange
    })
  }, [trades, searchQuery, filterAccount, filterTradeType, dateRange])

  const columns: ColumnDef<Trade>[] = useMemo(
    () => [
      {
        accessorKey: 'trade_date',
        header: 'Date',
        cell: ({ row }) => format(new Date(row.getValue('trade_date')), 'yyyy-MM-dd'),
      },
      {
        accessorKey: 'symbol',
        header: 'Symbol',
        cell: ({ row }) => {
          const trade = row.original
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
        accessorKey: 'trade_type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="secondary" className={getTradeTypeColor(row.getValue('trade_type'))}>
            {row.getValue('trade_type')}
          </Badge>
        ),
      },
      {
        accessorKey: 'quantity',
        header: () => <div className="text-right">Qty</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono">{(row.getValue('quantity') as number).toLocaleString()}</div>
        ),
      },
      {
        accessorKey: 'trade_price',
        header: () => <div className="text-right">Price</div>,
        cell: ({ row }) => {
          const trade = row.original
          return (
            <div
              className={cn(
                'text-right font-mono',
                (row.getValue('trade_price') as number) < 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatCurrency(row.getValue('trade_price') as number, trade.currency)}
            </div>
          )
        },
      },
      {
        accessorKey: 'net_amount',
        header: () => <div className="text-right">Net Amount</div>,
        cell: ({ row }) => {
          const trade = row.original
          return (
            <div
              className={cn(
                'text-right font-mono',
                (row.getValue('net_amount') as number) < 0 ? 'text-red-600' : 'text-green-600'
              )}
            >
              {formatCurrency(row.getValue('net_amount') as number, trade.currency)}
            </div>
          )
        },
      },
      {
        accessorKey: 'account_id',
        header: 'Account',
        cell: ({ row }) => {
          const trade = row.original
          return <span className="text-sm">{trade.account?.account_name || '-'}</span>
        },
      },
      {
        accessorKey: 'portfolio_id',
        header: 'Portfolio',
        cell: ({ row }) => {
          const trade = row.original
          return <span className="text-sm">{trade.portfolio?.name || '-'}</span>
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const trade = row.original
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
    []
  )

  const table = useReactTable({
    data: filteredTrades,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

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
    router.refresh() // ensure fresh portfolios list after potential changes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { gross, net } = calculateAmounts()
    // build payload including required schema fields
    // ensure trade_type is never blank (defensive fallback)
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

  const getTradeTypeColor = (type?: TradeType) => {
    if (!type) return 'bg-gray-100 text-gray-800'
    if (type.includes('Buy'))
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  }

  const selectedInstrument = instruments.find((i) => i.id === formData.instrument_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trade Blotter</h1>
          <p className="text-muted-foreground">
            Record and manage all your trades across accounts.
          </p>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Trades</CardTitle>
          <CardDescription>
            {filteredTrades.length} of {trades.length} trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTradeType} onValueChange={setFilterTradeType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Trade Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {tradeTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                  <Calendar className="mr-2 size-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                    ) : (
                      format(dateRange.from, 'MMM d, yyyy')
                    )
                  ) : (
                    'Date range'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                />
                {(dateRange.from || dateRange.to) && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({})}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowLeftRight className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No trades found</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                {trades.length === 0
                  ? 'Start by recording your first trade or importing from a broker report.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {trades.length === 0 && (
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
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
                          {acc.account_name} ({acc.platform})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="portfolio_id">Portfolio</Label>
                  <Select
                    value={formData.portfolio_id}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        portfolio_id: value === 'none' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="instrument_id">Instrument *</Label>
                <Select
                  value={formData.instrument_id}
                  onValueChange={(value) => {
                    const inst = instruments.find((i) => i.id === value)
                    setFormData({
                      ...formData,
                      instrument_id: value,
                      currency: inst?.currency || formData.currency,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select instrument" />
                  </SelectTrigger>
                  <SelectContent>
                    {instruments.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>
                        {inst.symbol} - {inst.description || inst.asset_class}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                  <Label htmlFor="settle_date">Settle Date</Label>
                  <Input
                    id="settle_date"
                    type="date"
                    value={formData.settle_date}
                    onChange={(e) => setFormData({ ...formData, settle_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trade_type">Trade Type *</Label>
                  <Select
                    value={formData.trade_type}
                    onValueChange={(value: TradeType) =>
                      setFormData({ ...formData, trade_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.quantity || ''}
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
                    min="0"
                    step="0.0001"
                    value={formData.price || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="commission">Commission</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.commission || ''}
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
                    min="0"
                    step="0.01"
                    value={formData.fees || ''}
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
                    min="0"
                    step="0.0001"
                    value={formData.fx_rate || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, fx_rate: parseFloat(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              {formData.quantity > 0 && formData.price > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gross Amount:</span>
                      <span className="ml-2 font-mono font-medium">
                        {formatCurrency(calculateAmounts().gross, formData.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net Amount:</span>
                      <span className="ml-2 font-mono font-medium">
                        {formatCurrency(calculateAmounts().net, formData.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Optional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !formData.account_id || !formData.instrument_id}
              >
                {isLoading ? 'Saving...' : editingTrade ? 'Update' : 'Create'}
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
              Are you sure you want to delete this trade for {deletingTrade?.instrument?.symbol}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
