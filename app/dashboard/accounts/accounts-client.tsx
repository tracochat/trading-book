"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Pencil, Trash2, Building2 } from "lucide-react"
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
import type { Account, Platform } from "@/lib/types"
import { createAccount, updateAccount, deleteAccount } from "./actions"

const platforms: Platform[] = ['IBKR', 'Futu', 'Tiger', 'Other']
const currencies = ['USD', 'SGD', 'HKD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD']

interface AccountsClientProps {
  initialAccounts: Account[]
}

export function AccountsClient({ initialAccounts }: AccountsClientProps) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    account_id: '',
    account_name: '',
    platform: 'IBKR' as Platform,
    account_type: '',
    base_currency: 'USD',
    status: 'active' as 'active' | 'inactive' | 'closed',
  })

  const resetForm = () => {
    setFormData({
      account_id: '',
      account_name: '',
      platform: 'IBKR',
      account_type: '',
      base_currency: 'USD',
      status: 'active',
    })
    setEditingAccount(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (account: Account) => {
    setEditingAccount(account)
    setFormData({
      account_id: account.account_id,
      account_name: account.account_name,
      platform: account.platform,
      account_type: account.account_type || '',
      base_currency: account.base_currency,
      status: account.status || 'active',
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (account: Account) => {
    setDeletingAccount(account)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingAccount) {
        const result = await updateAccount(editingAccount.id, formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Account updated successfully')
          setIsDialogOpen(false)
          router.refresh()
        }
      } else {
        const result = await createAccount(formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Account created successfully')
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
    if (!deletingAccount) return
    setIsLoading(true)

    try {
      const result = await deleteAccount(deletingAccount.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Account deleted successfully')
        router.refresh()
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setDeletingAccount(null)
    }
  }

  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case 'IBKR': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'Futu': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'Tiger': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Account Information</h1>
          <p className="text-muted-foreground">
            Manage your trading accounts across different platforms.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          Add Account
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trading Accounts</CardTitle>
          <CardDescription>
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="size-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No accounts yet</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                Add your first trading account to get started.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 size-4" />
                Add Account
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.account_id}</TableCell>
                    <TableCell className="font-medium">{account.account_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getPlatformColor(account.platform)}>
                        {account.platform}
                      </Badge>
                    </TableCell>
                    <TableCell>{account.account_type || '-'}</TableCell>
                    <TableCell>{account.base_currency}</TableCell>
                    <TableCell>
                      <Badge variant={account.status === 'active' ? "default" : "secondary"}>
                        {account.status === 'active' ? 'Active' : account.status === 'inactive' ? 'Inactive' : 'Closed'}
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
                          <DropdownMenuItem onClick={() => openEditDialog(account)}>
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(account)}
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
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription>
              {editingAccount 
                ? 'Update the account information below.' 
                : 'Enter the details for your trading account.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="account_id">Account ID</Label>
                <Input
                  id="account_id"
                  placeholder="e.g., U6162038"
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  placeholder="e.g., Main Trading Account"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select 
                    value={formData.platform} 
                    onValueChange={(value: Platform) => setFormData({ ...formData, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="base_currency">Base Currency</Label>
                  <Select 
                    value={formData.base_currency} 
                    onValueChange={(value) => setFormData({ ...formData, base_currency: value })}
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
                <Label htmlFor="account_type">Account Type (optional)</Label>
                <Input
                  id="account_type"
                  placeholder="e.g., Margin, Cash"
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (editingAccount ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the account "{deletingAccount?.account_name}"? 
              This action cannot be undone and will remove all associated data.
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
