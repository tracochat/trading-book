"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { Instrument, AssetClass } from "@/lib/types"
import { createInstrument, updateInstrument } from "@/lib/actions/instruments"

interface InstrumentDialogProps {
  children?: React.ReactNode
  instrument?: Instrument
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const assetClasses: AssetClass[] = ["Stocks", "Equity and Index Options", "Bonds", "Futures", "Forex", "CFD", "Crypto", "Other"]
const currencies = ["USD", "SGD", "HKD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD", "CHF"]

export function InstrumentDialog({ children, instrument, open, onOpenChange }: InstrumentDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    symbol: instrument?.symbol || "",
    con_id: instrument?.con_id || "",
    description: instrument?.description || "",
    asset_class: instrument?.asset_class || "Stocks" as AssetClass,
    exchange: instrument?.exchange || "",
    currency: instrument?.currency || "USD",
    multiplier: instrument?.multiplier || 1,
    listing_exchange: instrument?.listing_exchange || "",
    sector: instrument?.sector || "",
    industry: instrument?.industry || "",
    country: instrument?.country || "",
    isin: instrument?.isin || "",
    cusip: instrument?.cusip || "",
    sedol: instrument?.sedol || "",
    is_active: instrument?.is_active ?? true,
    is_tradeable: instrument?.is_tradeable ?? false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    startTransition(async () => {
      try {
        if (instrument) {
          await updateInstrument(instrument.id, formData)
          toast.success("Instrument updated successfully")
        } else {
          await createInstrument(formData)
          toast.success("Instrument created successfully")
        }
        setIsOpen(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "An error occurred")
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{instrument ? "Edit Instrument" : "Add Instrument"}</DialogTitle>
            <DialogDescription>
              {instrument 
                ? "Update the details of this financial instrument."
                : "Add a new financial instrument to your universe."}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="mt-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="asset_class">Asset Class *</Label>
                  <Select
                    value={formData.asset_class}
                    onValueChange={(value: AssetClass) => setFormData({ ...formData, asset_class: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset class" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetClasses.map((ac) => (
                        <SelectItem key={ac} value={ac}>
                          {ac}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="exchange">Exchange</Label>
                  <Input
                    id="exchange"
                    placeholder="e.g., NASDAQ"
                    value={formData.exchange}
                    onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="multiplier">Multiplier</Label>
                  <Input
                    id="multiplier"
                    type="number"
                    min="1"
                    step="1"
                    value={formData.multiplier}
                    onChange={(e) => setFormData({ ...formData, multiplier: parseInt(e.target.value) || 1 })}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sedol">SEDOL</Label>
                  <Input
                    id="sedol"
                    placeholder="e.g., 2046251"
                    value={formData.sedol}
                    onChange={(e) => setFormData({ ...formData, sedol: e.target.value.toUpperCase() })}
                  />
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
              <div className="flex items-center justify-between pt-4">
                <div>
                  <Label htmlFor="is_active">Active</Label>
                  <p className="text-sm text-muted-foreground">Instrument is available in the system</p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_tradeable">Traded</Label>
                  <p className="text-sm text-muted-foreground">Mark as currently traded in your portfolio</p>
                </div>
                <Switch
                  id="is_tradeable"
                  checked={formData.is_tradeable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_tradeable: checked })}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : instrument ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
