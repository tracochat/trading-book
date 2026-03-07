"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Pencil, Trash2, Database, Upload, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { Instrument, AssetClass } from "@/lib/types"
import { createInstrument, updateInstrument, deleteInstrument, bulkImportInstruments } from "./actions"

const assetClasses: AssetClass[] = ['Stocks', 'Equity and Index Options', 'Bonds', 'Futures', 'Forex', 'CFD', 'Crypto', 'Other']
const currencies = ['USD', 'SGD', 'HKD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD']
const exchanges = ['NYSE', 'NASDAQ', 'AMEX', 'SGX', 'HKEX', 'LSE', 'TSE', 'SSE', 'SZSE', 'Other']

interface InstrumentsClientProps {
  initialInstruments: Instrument[]
  tradedInstrumentIds: string[]
}

export function InstrumentsClient({ initialInstruments, tradedInstrumentIds }: InstrumentsClientProps) {
  const router = useRouter()
  const [instruments] = useState<Instrument[]>(initialInstruments)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [editingInstrument, setEditingInstrument] = useState<Instrument | null>(null)
  const [deletingInstrument, setDeletingInstrument] = useState<Instrument | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAssetClass, setFilterAssetClass] = useState<string>('all')
  const [showTradedOnly, setShowTradedOnly] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState<string>('')
  
  const tradedSet = useMemo(() => new Set(tradedInstrumentIds), [tradedInstrumentIds])
  
  const [formData, setFormData] = useState({
    symbol: '',
    con_id: '',
    description: '',
    asset_class: 'Stocks' as AssetClass,
    exchange: '',
    currency: 'USD',
    multiplier: 1,
    listing_exchange: '',
    sector: '',
    industry: '',
    country: '',
    isin: '',
    cusip: '',
    sedol: '',
    is_active: true,
    is_tradeable: true,
  })

  const filteredInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const matchesSearch = searchQuery === '' || 
        inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inst.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesAssetClass = filterAssetClass === 'all' || inst.asset_class === filterAssetClass
      
      const matchesTradedFilter = !showTradedOnly || tradedSet.has(inst.id)
      
      return matchesSearch && matchesAssetClass && matchesTradedFilter
    })
  }, [instruments, searchQuery, filterAssetClass, showTradedOnly, tradedSet])

  const resetForm = () => {
    setFormData({
      symbol: '',
      con_id: '',
      description: '',
      asset_class: 'Stocks',
      exchange: '',
      currency: 'USD',
      multiplier: 1,
      listing_exchange: '',
      sector: '',
      industry: '',
      country: '',
      isin: '',
      cusip: '',
      sedol: '',
      is_active: true,
      is_tradeable: true,
    })
    setEditingInstrument(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (instrument: Instrument) => {
    setEditingInstrument(instrument)
    setFormData({
      symbol: instrument.symbol,
      con_id: instrument.con_id || '',
      description: instrument.description || '',
      asset_class: instrument.asset_class,
      exchange: instrument.exchange || '',
      currency: instrument.currency,
      multiplier: instrument.multiplier,
      listing_exchange: instrument.listing_exchange || '',
      sector: instrument.sector || '',
      industry: instrument.industry || '',
      country: instrument.country || '',
      isin: instrument.isin || '',
      cusip: instrument.cusip || '',
      sedol: instrument.sedol || '',
      is_active: instrument.is_active,
      is_tradeable: instrument.is_tradeable,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (instrument: Instrument) => {
    setDeletingInstrument(instrument)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingInstrument) {
        const result = await updateInstrument(editingInstrument.id, formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Instrument updated successfully')
          setIsDialogOpen(false)
          router.refresh()
        }
      } else {
        const result = await createInstrument(formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Instrument created successfully')
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
    if (!deletingInstrument) return
    setIsLoading(true)

    try {
      const result = await deleteInstrument(deletingInstrument.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Instrument deleted successfully')
        router.refresh()
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setDeletingInstrument(null)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    setIsLoading(true)
    setImportProgress('Reading file...')

    try {
      const text = await importFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        toast.error('File appears to be empty or invalid')
        return
      }

      setImportProgress('Parsing data...')
      const header = lines[0].split(',').map(h => h.trim().toLowerCase())
      const symbolIdx = header.findIndex(h => h === 'symbol' || h === 'ticker')
      const nameIdx = header.findIndex(h => h === 'name' || h === 'description' || h === 'company name')
      const exchangeIdx = header.findIndex(h => h === 'exchange' || h === 'market')
      const sectorIdx = header.findIndex(h => h === 'sector')
      const industryIdx = header.findIndex(h => h === 'industry')
      const countryIdx = header.findIndex(h => h === 'country')

      if (symbolIdx === -1) {
        toast.error('Could not find Symbol column in file')
        return
      }

      const instrumentsToImport = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        if (values[symbolIdx]) {
          instrumentsToImport.push({
            symbol: values[symbolIdx],
            description: nameIdx !== -1 ? values[nameIdx] : null,
            exchange: exchangeIdx !== -1 ? values[exchangeIdx] : null,
            sector: sectorIdx !== -1 ? values[sectorIdx] : null,
            industry: industryIdx !== -1 ? values[industryIdx] : null,
            country: countryIdx !== -1 ? values[countryIdx] : null,
            asset_class: 'Stocks' as AssetClass,
            currency: 'USD',
            multiplier: 1,
            is_active: true,
            is_tradeable: true,
          })
        }
      }

      setImportProgress(`Importing ${instrumentsToImport.length} instruments...`)
      
      const result = await bulkImportInstruments(instrumentsToImport)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Successfully imported ${result.count} instruments`)
        setIsImportDialogOpen(false)
        setImportFile(null)
        router.refresh()
      }
    } catch (error) {
      toast.error('Error processing file')
    } finally {
      setIsLoading(false)
      setImportProgress('')
    }
  }

  const getAssetClassColor = (assetClass: AssetClass) => {
    switch (assetClass) {
      case 'Stocks': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Equity and Index Options': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'Bonds': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Futures': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'Forex': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
      case 'Crypto': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financial Instruments</h1>
          <p className="text-muted-foreground">
            Manage your instrument universe and reference data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 size-4" />
            Import
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            Add Instrument
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Instrument Universe</CardTitle>
              <CardDescription>
                {filteredInstruments.length} of {instruments.length} instruments
                {showTradedOnly && ` (${tradedSet.size} traded)`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="traded-only"
                  checked={showTradedOnly}
                  onCheckedChange={setShowTradedOnly}
                />
                <Label htmlFor="traded-only" className="text-sm">Traded only</Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by symbol or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAssetClass} onValueChange={setFilterAssetClass}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 size-4" />
                <SelectValue placeholder="Asset Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Asset Classes</SelectItem>
                {assetClasses.map((ac) => (
                  <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredInstruments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No instruments found</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                {instruments.length === 0 
                  ? 'Import instruments from NYSE/NASDAQ or add them manually.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {instruments.length === 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                    <Upload className="mr-2 size-4" />
                    Import
                  </Button>
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 size-4" />
                    Add Instrument
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Asset Class</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstruments.slice(0, 100).map((instrument) => (
                    <TableRow key={instrument.id}>
                      <TableCell className="font-mono font-medium">
                        {instrument.symbol}
                        {tradedSet.has(instrument.id) && (
                          <Badge variant="outline" className="ml-2 text-xs">Traded</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {instrument.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getAssetClassColor(instrument.asset_class)}>
                          {instrument.asset_class}
                        </Badge>
                      </TableCell>
                      <TableCell>{instrument.exchange || '-'}</TableCell>
                      <TableCell>{instrument.currency}</TableCell>
                      <TableCell>
                        <Badge variant={instrument.is_active ? "default" : "secondary"}>
                          {instrument.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(instrument)}>
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(instrument)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredInstruments.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  Showing 100 of {filteredInstruments.length} instruments. Use search to find specific instruments.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingInstrument ? 'Edit Instrument' : 'Add New Instrument'}</DialogTitle>
            <DialogDescription>
              {editingInstrument 
                ? 'Update the instrument information below.' 
                : 'Enter the details for the financial instrument.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="identifiers">Identifiers</TabsTrigger>
                <TabsTrigger value="classification">Classification</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="symbol">Symbol *</Label>
                    <Input
                      id="symbol"
                      placeholder="e.g., AAPL"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="con_id">Contract ID</Label>
                    <Input
                      id="con_id"
                      placeholder="e.g., 265598"
                      value={formData.con_id}
                      onChange={(e) => setFormData({ ...formData, con_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Apple Inc."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="asset_class">Asset Class</Label>
                    <Select 
                      value={formData.asset_class} 
                      onValueChange={(value: AssetClass) => setFormData({ ...formData, asset_class: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assetClasses.map((ac) => (
                          <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                        {currencies.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="multiplier">Multiplier</Label>
                    <Input
                      id="multiplier"
                      type="number"
                      min="1"
                      value={formData.multiplier}
                      onChange={(e) => setFormData({ ...formData, multiplier: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="exchange">Exchange</Label>
                    <Select 
                      value={formData.exchange} 
                      onValueChange={(value) => setFormData({ ...formData, exchange: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exchange" />
                      </SelectTrigger>
                      <SelectContent>
                        {exchanges.map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="listing_exchange">Listing Exchange</Label>
                    <Input
                      id="listing_exchange"
                      placeholder="e.g., NASDAQ"
                      value={formData.listing_exchange}
                      onChange={(e) => setFormData({ ...formData, listing_exchange: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="identifiers" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="isin">ISIN</Label>
                    <Input
                      id="isin"
                      placeholder="e.g., US0378331005"
                      value={formData.isin}
                      onChange={(e) => setFormData({ ...formData, isin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cusip">CUSIP</Label>
                    <Input
                      id="cusip"
                      placeholder="e.g., 037833100"
                      value={formData.cusip}
                      onChange={(e) => setFormData({ ...formData, cusip: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sedol">SEDOL</Label>
                  <Input
                    id="sedol"
                    placeholder="e.g., 2046251"
                    value={formData.sedol}
                    onChange={(e) => setFormData({ ...formData, sedol: e.target.value.toUpperCase() })}
                  />
                </div>
              </TabsContent>

              <TabsContent value="classification" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sector">Sector</Label>
                    <Input
                      id="sector"
                      placeholder="e.g., Technology"
                      value={formData.sector}
                      onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      placeholder="e.g., Consumer Electronics"
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g., United States"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-6 pt-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_tradeable"
                      checked={formData.is_tradeable}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_tradeable: checked })}
                    />
                    <Label htmlFor="is_tradeable">Tradeable</Label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (editingInstrument ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Instruments</DialogTitle>
            <DialogDescription>
              Upload a CSV file with instrument data from NYSE, NASDAQ, or other exchanges.
              The file should have columns for Symbol, Name/Description, Exchange, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="import-file">CSV File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.txt"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            {importProgress && (
              <p className="text-sm text-muted-foreground">{importProgress}</p>
            )}
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Expected columns:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Symbol or Ticker (required)</li>
                <li>Name or Description</li>
                <li>Exchange or Market</li>
                <li>Sector, Industry, Country (optional)</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || isLoading}>
              {isLoading ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instrument</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingInstrument?.symbol}"? 
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
