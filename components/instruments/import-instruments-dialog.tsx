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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { importInstruments } from "@/lib/actions/instruments"

interface ImportInstrumentsDialogProps {
  children?: React.ReactNode
}

const exchangeFormats = [
  { value: "nasdaq", label: "NASDAQ Listed", description: "nasdaqlisted.txt format" },
  { value: "nyse", label: "NYSE Listed", description: "NYSE listing format" },
  { value: "csv", label: "Generic CSV", description: "Symbol, Name, Exchange, Currency" },
]

export function ImportInstrumentsDialog({ children }: ImportInstrumentsDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState("csv")
  const [preview, setPreview] = useState<string[]>([])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    
    // Read first few lines for preview
    const text = await selectedFile.text()
    const lines = text.split('\n').slice(0, 6)
    setPreview(lines)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('format', format)
        
        const result = await importInstruments(formData)
        toast.success(`Successfully imported ${result.imported} instruments`)
        setOpen(false)
        setFile(null)
        setPreview([])
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Import failed")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Import Instruments</DialogTitle>
            <DialogDescription>
              Upload a file containing instrument listings from exchanges like NASDAQ or NYSE.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="format">File Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {exchangeFormats.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <div className="flex flex-col">
                        <span>{f.label}</span>
                        <span className="text-xs text-muted-foreground">{f.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".txt,.csv"
                  onChange={handleFileChange}
                  className="flex-1"
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileText className="size-4" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {preview.length > 0 && (
              <div className="grid gap-2">
                <Label>Preview</Label>
                <div className="rounded-md border bg-muted/50 p-3 font-mono text-xs overflow-x-auto">
                  {preview.map((line, i) => (
                    <div key={i} className="whitespace-nowrap">
                      {line || <span className="text-muted-foreground">(empty line)</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Alert>
              <AlertCircle className="size-4" />
              <AlertDescription>
                For CSV format, ensure columns are: Symbol, Description, Exchange, Currency (optional).
                Existing instruments with matching symbols will be skipped.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !file}>
              <Upload className="mr-2 size-4" />
              {isPending ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
