"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MoreHorizontal, Pencil, Trash2, Search } from "lucide-react"
import type { Instrument } from "@/lib/types"
import { InstrumentDialog } from "./instrument-dialog"
import { DeleteInstrumentDialog } from "./delete-instrument-dialog"

interface InstrumentsTableProps {
  instruments: Instrument[]
}

const assetClassColors: Record<string, string> = {
  Stocks: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Equity and Index Options": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  Bonds: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Futures: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Forex: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  CFD: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  Crypto: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export function InstrumentsTable({ instruments }: InstrumentsTableProps) {
  const [editInstrument, setEditInstrument] = useState<Instrument | null>(null)
  const [deleteInstrument, setDeleteInstrument] = useState<Instrument | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [assetClassFilter, setAssetClassFilter] = useState<string>("all")

  const filteredInstruments = instruments.filter((instrument) => {
    const matchesSearch = 
      instrument.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instrument.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instrument.isin?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesAssetClass = 
      assetClassFilter === "all" || instrument.asset_class === assetClassFilter
    
    return matchesSearch && matchesAssetClass
  })

  const assetClasses = [...new Set(instruments.map((i) => i.asset_class))]

  if (instruments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-lg font-semibold">No instruments yet</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Add instruments manually or import from a file.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, name, ISIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={assetClassFilter} onValueChange={setAssetClassFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asset Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Asset Classes</SelectItem>
            {assetClasses.map((assetClass) => (
              <SelectItem key={assetClass} value={assetClass}>
                {assetClass}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Asset Class</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>ISIN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInstruments.map((instrument) => (
              <TableRow key={instrument.id}>
                <TableCell className="font-mono font-medium">{instrument.symbol}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={instrument.description || ""}>
                  {instrument.description || "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={assetClassColors[instrument.asset_class] || assetClassColors.Other}>
                    {instrument.asset_class}
                  </Badge>
                </TableCell>
                <TableCell>{instrument.exchange || "-"}</TableCell>
                <TableCell>{instrument.currency}</TableCell>
                <TableCell className="font-mono text-xs">{instrument.isin || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {instrument.is_active && (
                      <Badge variant="outline" className="text-xs">Active</Badge>
                    )}
                    {instrument.is_tradeable && (
                      <Badge variant="default" className="text-xs">Traded</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditInstrument(instrument)}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteInstrument(instrument)}
                        className="text-destructive focus:text-destructive"
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
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredInstruments.length} of {instruments.length} instruments
      </div>

      {editInstrument && (
        <InstrumentDialog 
          instrument={editInstrument} 
          open={!!editInstrument}
          onOpenChange={(open) => !open && setEditInstrument(null)}
        />
      )}

      {deleteInstrument && (
        <DeleteInstrumentDialog 
          instrument={deleteInstrument}
          open={!!deleteInstrument}
          onOpenChange={(open) => !open && setDeleteInstrument(null)}
        />
      )}
    </>
  )
}
