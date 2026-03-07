"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Plus, MoreHorizontal, Pencil, Trash2, PiggyBank, ArrowDownLeft, ArrowUpRight } from "lucide-react"
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
import { toast } from "sonner"
import type { CashTransaction, CashTransactionType, Account } from "@/lib/types"
import { createCashTransaction, updateCashTransaction, deleteCashTransaction } from "./actions"

const transactionTypes: CashTransactionType[] = ['Deposit', 'Withdrawal', 'Transfer In', 'Transfer Out']
const currencies = ['USD', 'SGD', 'HKD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD']

interface DepositsClientProps {
  initialTransactions: CashTransaction[]
  accounts: Pick<Account, 'id' | 'account_id' | 'account_name' | 'platform'>[]
}

export function DepositsClient({ initialTransactions, accounts }: DepositsClientProps) {
  const router = useRouter()
  const [transactions] = useState<CashTransaction[]>(initialTransactions)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<CashTransaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<CashTransaction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filterAccount, setFilterAccount] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const [formData, setFormData] = useState({
    account_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'Deposit' as CashTransactionType,
    amount: 0,
    currency: 'USD',
    description: '',
  })

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesAccount = filterAccount === 'all' || t.account_id === filterAccount
      const matchesType = filterType === 'all' || t.transaction_type === filterType
      return matchesAccount && matchesType
    })
  }, [transactions, filterAccount, filterType])

  const totals = useMemo(() => {
    const deposits = filteredTransactions
      .filter(t => t.transaction_type === 'Deposit' || t.transaction_type === 'Transfer In')
      .reduce((sum, t) => sum + t.amount, 0)
    const withdrawals = filteredTransactions
      .filter(t => t.transaction_type === 'Withdrawal' || t.transaction_type === 'Transfer Out')
      .reduce((sum, t) => sum + t.amount, 0)
    return { deposits, withdrawals, net: deposits - withdrawals }
  }, [filteredTransactions])

  const resetForm = () => {
    setFormData({
      account_id: accounts[0]?.id || '',
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'Deposit',
      amount: 0,
      currency: 'USD',
      description: '',
    })
    setEditingTransaction(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (transaction: CashTransaction) => {
    setEditingTransaction(transaction)
    setFormData({
      account_id: transaction.account_id,
      transaction_date: transaction.transaction_date,
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description || '',
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (transaction: CashTransaction) => {
    setDeletingTransaction(transaction)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingTransaction) {
        const result = await updateCashTransaction(editingTransaction.id, formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Transaction updated successfully')
          setIsDialogOpen(false)
          router.refresh()
        }
      } else {
        const result = await createCashTransaction(formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Transaction created successfully')
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
    if (!deletingTransaction) return
    setIsLoading(true)

    try {
      const result = await deleteCashTransaction(deletingTransaction.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Transaction deleted successfully')
        router.refresh()
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setDeletingTransaction(null)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  }

  const getTypeIcon = (type: CashTransactionType) => {
    if (type === 'Deposit' || type === 'Transfer In') {
      return <ArrowDownLeft className="size-4 text-green-600" />
    }
    return <ArrowUpRight className="size-4 text-red-600" />
  }

  const getTypeColor = (type: CashTransactionType) => {
    if (type === 'Deposit' || type === 'Transfer In') {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    }
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deposits & Withdrawals</h1>
          <p className="text-muted-foreground">
            Track cash movements in and out of your accounts.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownLeft className="size-4 text-green-600" />
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.deposits, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowUpRight className="size-4 text-red-600" />
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totals.withdrawals, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.net, 'USD')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterAccount} onValueChange={setFilterAccount}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.account_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PiggyBank className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                {transactions.length === 0 
                  ? 'Record deposits and withdrawals to track your cash flow.'
                  : 'Try adjusting your filters.'}
              </p>
              {transactions.length === 0 && (
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 size-4" />
                  Add Transaction
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
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(transaction.transaction_date), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getTypeColor(transaction.transaction_type)}>
                          {getTypeIcon(transaction.transaction_type)}
                          <span className="ml-1">{transaction.transaction_type}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.account?.account_name || '-'}</TableCell>
                      <TableCell className={`text-right font-mono ${
                        transaction.transaction_type === 'Deposit' || transaction.transaction_type === 'Transfer In'
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'Deposit' || transaction.transaction_type === 'Transfer In' ? '+' : '-'}
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {transaction.description || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(transaction)}>
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(transaction)}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
            <DialogDescription>
              {editingTransaction 
                ? 'Update the transaction details below.' 
                : 'Record a deposit or withdrawal.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="transaction_date">Date *</Label>
                  <Input
                    id="transaction_date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="transaction_type">Type *</Label>
                  <Select 
                    value={formData.transaction_type} 
                    onValueChange={(value: CashTransactionType) => setFormData({ ...formData, transaction_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
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
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !formData.account_id}>
                {isLoading ? 'Saving...' : (editingTransaction ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deletingTransaction?.transaction_type.toLowerCase()}? 
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
