"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Upload, FileText, AlertCircle, CheckCircle2, Clock, ArrowRight } from "lucide-react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import type { Account, ActivityImport } from "@/lib/types"
import {
  parseIBKRReport,
  createActivityImport,
  processImportedData,
  type ParsedImportPayload,
} from "./actions"

interface ImportClientProps {
  accounts: Pick<Account, 'id' | 'account_id' | 'account_name' | 'platform'>[]
  recentImports: (ActivityImport & { account?: Pick<Account, 'account_id' | 'account_name' | 'platform'> })[]
}

export function ImportClient({ accounts, recentImports }: ImportClientProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string>('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [parseProgress, setParseProgress] = useState(0)
  const [parseStatus, setParseStatus] = useState<string>('')
  const [parsedData, setParsedData] = useState<ParsedImportPayload | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [importSummary, setImportSummary] = useState<string>('')

  const resetState = () => {
    setSelectedAccount('')
    setImportFile(null)
    setParseProgress(0)
    setParseStatus('')
    setParsedData(null)
    setParseErrors([])
    setStep('upload')
    setImportSummary('')
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
  }

  const handleParse = async () => {
    if (!importFile || !selectedAccount) return
    
    setIsLoading(true)
    setParseProgress(10)
    setParseStatus('Reading file...')
    setParseErrors([])

    try {
      const text = await importFile.text()
      setParseProgress(30)
      setParseStatus('Detecting platform and extracting sections...')
      
      const result = await parseIBKRReport(text)
      
      setParseProgress(100)
      
      if (result.error) {
        setParseErrors([result.error])
        toast.error('Error parsing file')
      } else {
        setParsedData(result.data)
        setStep('preview')
        toast.success('File parsed successfully')
      }
    } catch (error) {
      setParseErrors(['Failed to parse file. Please ensure it is a valid IBKR activity report.'])
      toast.error('Error parsing file')
    } finally {
      setIsLoading(false)
      setParseStatus('')
    }
  }

  const handleImport = async () => {
    if (!parsedData || !selectedAccount || !importFile) return
    
    setIsLoading(true)
    setStep('importing')
    setParseProgress(0)
    setParseStatus('Creating import record...')

    try {
      // Create import record
      setParseProgress(10)
      setParseStatus('Creating import record...')
      const importResult = await createActivityImport({
        account_id: selectedAccount,
        file_name: importFile.name,
        platform: parsedData.platform,
        period_start: parsedData.periodStart,
        period_end: parsedData.periodEnd,
      })

      if (importResult.error) {
        throw new Error(importResult.error)
      }

      const importId = importResult.id

      // Process the data
      setParseProgress(30)
      setParseStatus('Importing parsed sections...')
      
      const processResult = await processImportedData(importId!, parsedData, selectedAccount)
      
      setParseProgress(100)
      
      if (processResult.error) {
        setParseErrors([processResult.error])
        toast.error('Some errors occurred during import')
      } else {
        setStep('complete')
        setImportSummary(processResult.summary)
        toast.success(`Import complete: ${processResult.summary}`)
      }
      
      router.refresh()
    } catch (error) {
      setParseErrors([error instanceof Error ? error.message : 'Import failed'])
      toast.error('Import failed')
    } finally {
      setIsLoading(false)
      setParseStatus('')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'processing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="size-4" />
      case 'processing': return <Clock className="size-4" />
      case 'failed': return <AlertCircle className="size-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Import Activity</h1>
          <p className="text-muted-foreground">
            Upload broker activity reports to import trades, dividends, and transactions.
          </p>
        </div>
        <Button onClick={() => { resetState(); setIsDialogOpen(true); }}>
          <Upload className="mr-2 size-4" />
          Import Report
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Supported Formats</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• IBKR Activity Statement (HTML)</li>
              <li>• Other broker formats are not implemented yet</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">What Gets Imported</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Trades & Executions</li>
              <li>• Dividends & Distributions</li>
              <li>• Deposits & Withdrawals</li>
              <li>• Fees, Interest & Taxes</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">After Import</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Review imported records</li>
              <li>• Reconcile with existing data</li>
              <li>• Assign trades to portfolios</li>
              <li>• Resolve any conflicts</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Imports</CardTitle>
          <CardDescription>
            History of imported activity reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentImports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No imports yet</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Upload your first broker activity report to get started.
              </p>
              <Button onClick={() => { resetState(); setIsDialogOpen(true); }}>
                <Upload className="mr-2 size-4" />
                Import Report
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Filename</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentImports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(imp.imported_at), "yyyy-MM-dd HH:mm")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {imp.file_name}
                    </TableCell>
                    <TableCell>
                      {imp.account?.account_name || '-'}
                    </TableCell>
                    <TableCell>{imp.records_imported}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(imp.import_status)}>
                        {getStatusIcon(imp.import_status)}
                        <span className="ml-1">{imp.import_status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/dashboard/reconciliation?import=${imp.id}`}>
                          Review
                          <ArrowRight className="ml-1 size-3" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetState(); setIsDialogOpen(open); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Activity Report</DialogTitle>
            <DialogDescription>
              Upload a broker activity report to import trades and transactions.
            </DialogDescription>
          </DialogHeader>

          {step === 'upload' && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="account">Account *</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
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
                <Label htmlFor="file">Activity Report File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".html,.htm,.csv"
                  onChange={handleFileSelect}
                />
                <p className="text-xs text-muted-foreground">
                  Supported: IBKR HTML Activity Statement, CSV exports
                </p>
              </div>

              {parseErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {parseErrors.map((err, i) => <p key={i}>{err}</p>)}
                  </AlertDescription>
                </Alert>
              )}

              {isLoading && (
                <div className="space-y-2">
                  <Progress value={parseProgress} />
                  <p className="text-sm text-muted-foreground">{parseStatus}</p>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && parsedData && (
            <div className="py-4">
              <Alert className="mb-4">
                <CheckCircle2 className="size-4" />
                <AlertTitle>File Parsed Successfully</AlertTitle>
                <AlertDescription>
                  {parsedData.platform} statement detected. Review the extracted sections before importing.
                </AlertDescription>
              </Alert>

              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Platform</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">{parsedData.platform}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Period Start</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">{parsedData.periodStart || '-'}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Period End</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">{parsedData.periodEnd || parsedData.reportDate || '-'}</div>
                  </CardContent>
                </Card>
              </div>

              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-4">
                  {parsedData.overview.map((section) => (
                    <div key={section.key}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <h4 className="font-medium">{section.title}</h4>
                        <Badge variant="outline">{section.count}</Badge>
                      </div>
                      {section.preview.length > 0 ? (
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {section.preview.map((line, index) => (
                            <p key={index}>{line}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No records found in this section.</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-8 space-y-4">
              <Progress value={parseProgress} />
              <p className="text-center text-muted-foreground">{parseStatus}</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="py-8 text-center">
              <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Import Complete</h3>
              <p className="text-muted-foreground mt-1">
                {importSummary || 'Your data has been imported successfully.'}
              </p>
            </div>
          )}

          <DialogFooter>
            {step === 'upload' && (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleParse} 
                  disabled={!importFile || !selectedAccount || isLoading}
                >
                  {isLoading ? 'Parsing...' : 'Parse File'}
                </Button>
              </>
            )}
            
            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={isLoading}>
                  {isLoading ? 'Importing...' : 'Import Data'}
                </Button>
              </>
            )}

            {step === 'complete' && (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
                <Button asChild>
                  <a href="/dashboard/reconciliation">
                    Review & Reconcile
                  </a>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
