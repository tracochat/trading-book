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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, CheckCircle2, AlertCircle, XCircle, HelpCircle } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

async function getReconciliationLogs(importId?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from('reconciliation_log')
    .select(`
      *,
      import:activity_imports(filename, account:accounts(account_name))
    `)
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (importId) {
    query = query.eq('import_id', importId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching reconciliation logs:', error)
    return []
  }
  
  return data || []
}

async function getRecentImports() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_imports')
    .select(`
      *,
      account:accounts(account_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) return []
  return data || []
}

interface PageProps {
  searchParams: Promise<{ import?: string }>
}

export default async function ReconciliationPage({ searchParams }: PageProps) {
  const params = await searchParams
  const importId = params.import
  
  const [logs, recentImports] = await Promise.all([
    getReconciliationLogs(importId),
    getRecentImports(),
  ])

  const statusCounts = logs.reduce((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Matched': return <CheckCircle2 className="size-4 text-green-600" />
      case 'Missing in System': return <AlertCircle className="size-4 text-yellow-600" />
      case 'Missing in Report': return <HelpCircle className="size-4 text-blue-600" />
      case 'Mismatch': return <XCircle className="size-4 text-red-600" />
      case 'Resolved': return <CheckCircle2 className="size-4 text-green-600" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Matched': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Missing in System': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'Missing in Report': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Mismatch': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'Resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reconciliation</h1>
        <p className="text-muted-foreground">
          Review and resolve differences between imported data and system records.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" />
              Matched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['Matched'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="size-4 text-yellow-600" />
              Missing in System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['Missing in System'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HelpCircle className="size-4 text-blue-600" />
              Missing in Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['Missing in Report'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="size-4 text-red-600" />
              Mismatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['Mismatch'] || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-600" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts['Resolved'] || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
            <CardDescription>Select an import to review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentImports.length === 0 ? (
              <p className="text-sm text-muted-foreground">No imports yet</p>
            ) : (
              recentImports.map((imp) => (
                <Link
                  key={imp.id}
                  href={`/dashboard/reconciliation?import=${imp.id}`}
                  className={`block rounded-lg border p-3 hover:bg-muted/50 transition-colors ${
                    importId === imp.id ? 'border-primary bg-muted/50' : ''
                  }`}
                >
                  <div className="font-medium text-sm truncate">{imp.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {imp.account?.account_name} • {format(new Date(imp.created_at), "MMM d")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {imp.records_imported} records
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Reconciliation Log</CardTitle>
            <CardDescription>
              {logs.length} item{logs.length !== 1 ? 's' : ''} to review
              {importId && ' for selected import'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="size-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No reconciliation items</h3>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  {importId 
                    ? 'All records from this import have been processed.'
                    : 'Import an activity report to start reconciliation.'}
                </p>
                {!importId && (
                  <Button asChild>
                    <Link href="/dashboard/import">Import Activity Report</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Differences</TableHead>
                      <TableHead>Resolution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.created_at), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell className="capitalize">{log.entity_type}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusColor(log.status)}>
                            {getStatusIcon(log.status)}
                            <span className="ml-1">{log.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {log.differences ? JSON.stringify(log.differences) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.resolution || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
