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
import type { Instrument, AssetCategory } from "@/lib/types"
import { createInstrument, updateInstrument, deleteInstrument, bulkImportInstruments, parseInstrumentFile } from "./actions"

const assetCategories: AssetCategory[] = ['Stocks', 'Equity and Index Options', 'Bonds', 'Cash', 'Futures', 'Forex', 'Funds', 'Warrants', 'CFD', 'Other']
const currencies = ['USD', 'SGD', 'HKD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD']
const exchanges = ['NYSE', 'NASDAQ', 'AMEX', 'ARCA', 'SGX', 'HKEX', 'LSE', 'TSE', 'SSE', 'SZSE', 'Other']

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
  const [filterAssetCategory, setFilterAssetCategory] = useState<string>('all')
  const [showTradedOnly, setShowTradedOnly] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importProgress, setImportProgress] = useState<string>('')
  
  const tradedSet = useMemo(() => new Set(tradedInstrumentIds), [tradedInstrumentIds])
  
  const [formData, setFormData] = useState({
    symbol: '',
    con_id: '',
    description: '',
    asset_category: 'Stocks' as AssetCategory,
    listing_exchange: '',
    currency: 'USD',
    multiplier: 1,
    isin: '',
    cusip: '',
    figi: '',
    issuer_country_code: '',
    is_active: true,
    is_traded: false,
  })

  const filteredInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const matchesSearch = searchQuery === '' || 
        inst.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (inst.description?.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesAssetCategory = filterAssetCategory === 'all' || inst.asset_category === filterAssetCategory
      
      const matchesTradedFilter = !showTradedOnly || inst.is_traded || tradedSet.has(inst.id)
      
      return matchesSearch && matchesAssetCategory && matchesTradedFilter
    })
  }, [instruments, searchQuery, filterAssetCategory, showTradedOnly, tradedSet])

  const resetForm = () => {
    setFormData({
      symbol: '',
      con_id: '',
      description: '',
      asset_category: 'Stocks',
      listing_exchange: '',
      currency: 'USD',
      multiplier: 1,
      isin: '',
      cusip: '',
      figi: '',
      issuer_country_code: '',
      is_active: true,
      is_traded: false,
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
      asset_category: instrument.asset_category,
      listing_exchange: instrument.listing_exchange || '',
      currency: instrument.currency,
      multiplier: instrument.multiplier,
      isin: instrument.isin || '',
      cusip: instrument.cusip || '',
      figi: instrument.figi || '',
      issuer_country_code: instrument.issuer_country_code || '',
      is_active: instrument.is_active,
      is_traded: instrument.is_traded,
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
      
      setImportProgress('Parsing data...')
      
      // Use the server-side parsing function
      const instrumentsToImport = parseInstrumentFile(text, importFile.name)
      
      if (instrumentsToImport.length === 0) {
        toast.error('No valid instruments found in file. Check the file format.')
        return
      }

      setImportProgress(`Importing ${instrumentsToImport.length} instruments...`)
      
      const result = await bulkImportInstruments(instrumentsToImport)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        const msg = result.skipped && result.skipped > 0 
          ? `Imported ${result.count} instruments (${result.skipped} duplicates skipped)`
          : `Successfully imported ${result.count} instruments`
        toast.success(msg)
        setIsImportDialogOpen(false)
        setImportFile(null)
        router.refresh()
      }
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Error processing file')
    } finally {
      setIsLoading(false)
      setImportProgress('')
    }
  }

  const getAssetCategoryColor = (assetCategory: AssetCategory) => {
    switch (assetCategory) {
      case 'Stocks': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Equity and Index Options': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'Bonds': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Futures': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'Forex': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400'
      case 'Funds': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'Cash': return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
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
                {showTradedOnly && ` (showing traded only)`}
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
            <Select value={filterAssetCategory} onValueChange={setFilterAssetCategory}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 size-4" />
                <SelectValue placeholder="Asset Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {assetCategories.map((ac) => (
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
                    <TableHead>Category</TableHead>
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
                        {(instrument.is_traded || tradedSet.has(instrument.id)) && (
                          <Badge variant="outline" className="ml-2 text-xs">Traded</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {instrument.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getAssetCategoryColor(instrument.asset_category)}>
                          {instrument.asset_category}
                        </Badge>
                      </TableCell>
                      <TableCell>{instrument.listing_exchange || '-'}</TableCell>
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="identifiers">Identifiers</TabsTrigger>
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
                      placeholder="IBKR Contract ID"
                      value={formData.con_id}
                      onChange={(e) => setFormData({ ...formData, con_id: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Apple Inc. Common Stock"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="asset_category">Asset Category *</Label>
                    <Select 
                      value={formData.asset_category} 
                      onValueChange={(value: AssetCategory) => setFormData({ ...formData, asset_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {assetCategories.map((ac) => (
                          <SelectItem key={ac} value={ac}>{ac}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="listing_exchange">Listing Exchange</Label>
                    <Select 
                      value={formData.listing_exchange || 'other'} 
                      onValueChange={(value) => setFormData({ ...formData, listing_exchange: value === 'other' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select exchange" />
                      </SelectTrigger>
                      <SelectContent>
                        {exchanges.map((ex) => (
                          <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="currency">Currency *</Label>
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
                      value={formData.multiplier}
                      onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="issuer_country_code">Country</Label>
                    <Input
                      id="issuer_country_code"
                      placeholder="e.g., US"
                      value={formData.issuer_country_code}
                      onChange={(e) => setFormData({ ...formData, issuer_country_code: e.target.value.toUpperCase() })}
                      maxLength={2}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6 pt-2">
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
                      id="is_traded"
                      checked={formData.is_traded}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_traded: checked })}
                    />
                    <Label htmlFor="is_traded">Mark as Traded</Label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="identifiers" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="isin">ISIN</Label>
                    <Input
                      id="isin"
                      placeholder="International Securities ID"
                      value={formData.isin}
                      onChange={(e) => setFormData({ ...formData, isin: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cusip">CUSIP</Label>
                    <Input
                      id="cusip"
                      placeholder="US/Canada identifier"
                      value={formData.cusip}
                      onChange={(e) => setFormData({ ...formData, cusip: e.target.value.toUpperCase() })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="figi">FIGI</Label>
                  <Input
                    id="figi"
                    placeholder="Financial Instrument Global Identifier"
                    value={formData.figi}
                    onChange={(e) => setFormData({ ...formData, figi: e.target.value.toUpperCase() })}
                  />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Instrument</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingInstrument?.symbol}? 
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Instruments</DialogTitle>
            <DialogDescription>
              Upload a file containing instrument data. Supported formats:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>NASDAQ Traded Symbols</strong> - nasdaqtraded.txt (pipe-delimited)</p>
              <p><strong>NASDAQ Other Listed</strong> - otherlisted.txt (pipe-delimited)</p>
              <p><strong>NYSE JSON</strong> - JSON array with normalizedTicker and instrumentName</p>
              <p><strong>CSV</strong> - With Symbol/Ticker column header</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="import-file">Select File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.txt,.json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
            </div>
            {importProgress && (
              <div className="text-sm text-muted-foreground">{importProgress}</div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setIsImportDialogOpen(false)
              setImportFile(null)
            }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || isLoading}>
              {isLoading ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
