"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, MoreHorizontal, Pencil, Trash2, Briefcase, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Portfolio, PortfolioStatus, Account } from "@/lib/types"
import { createPortfolio, updatePortfolio, deletePortfolio } from "./actions"
import Link from "next/link"

const currencies = ['USD', 'SGD', 'HKD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD']

interface PortfoliosClientProps {
  initialPortfolios: Portfolio[]
  portfolioStats: Record<string, { tradeCount: number }>
  accounts: Account[]
}

export function PortfoliosClient({ initialPortfolios, portfolioStats, accounts }: PortfoliosClientProps) {
  const router = useRouter()
  const [portfolios] = useState<Portfolio[]>(initialPortfolios)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null)
  const [deletingPortfolio, setDeletingPortfolio] = useState<Portfolio | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    account_id: '',
    base_currency: 'USD',
    strategy: '',
    status: 'active' as PortfolioStatus,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      account_id: '',
      base_currency: 'USD',
      strategy: '',
      status: 'active',
    })
    setEditingPortfolio(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio)
    setFormData({
      name: portfolio.name,
      description: portfolio.description || '',
      account_id: portfolio.account_id || '',
      base_currency: portfolio.base_currency,
      strategy: portfolio.strategy || '',
      status: portfolio.status,
    })
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (portfolio: Portfolio) => {
    setDeletingPortfolio(portfolio)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingPortfolio) {
        const result = await updatePortfolio(editingPortfolio.id, formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Portfolio updated successfully')
          setIsDialogOpen(false)
          router.refresh()
        }
      } else {
        const result = await createPortfolio(formData)
        if (result.error) {
          toast.error(result.error)
        } else {
          toast.success('Portfolio created successfully')
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
    if (!deletingPortfolio) return
    setIsLoading(true)

    try {
      const result = await deletePortfolio(deletingPortfolio.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Portfolio deleted successfully')
        router.refresh()
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setDeletingPortfolio(null)
    }
  }

  const getStatusColor = (status: PortfolioStatus) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'inactive': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'closed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolios</h1>
          <p className="text-muted-foreground">
            Organize and track your investments across different strategies.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          New Portfolio
        </Button>
      </div>

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="size-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No portfolios yet</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create portfolios to organize and track your trades by strategy or purpose.
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              Create Your First Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {portfolios.map((portfolio) => {
            const stats = portfolioStats[portfolio.id] || { tradeCount: 0 }
            const account = accounts.find(a => a.id === portfolio.account_id)
            return (
              <Card key={portfolio.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                      {portfolio.description && (
                        <CardDescription className="line-clamp-2">
                          {portfolio.description}
                        </CardDescription>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(portfolio)}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(portfolio)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className={getStatusColor(portfolio.status)}>
                      {portfolio.status.charAt(0).toUpperCase() + portfolio.status.slice(1)}
                    </Badge>
                    <Badge variant="outline">{portfolio.base_currency}</Badge>
                    {portfolio.strategy && (
                      <Badge variant="outline">{portfolio.strategy}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {account && (
                      <p>Account: {account.account_name}</p>
                    )}
                    <p>{stats.tradeCount} trade{stats.tradeCount !== 1 ? 's' : ''}</p>
                  </div>
                  <Link 
                    href={`/dashboard/trades?portfolio=${portfolio.id}`}
                    className="flex items-center text-sm text-primary hover:underline"
                  >
                    View trades <ArrowRight className="ml-1 size-4" />
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPortfolio ? 'Edit Portfolio' : 'Create New Portfolio'}</DialogTitle>
            <DialogDescription>
              {editingPortfolio 
                ? 'Update the portfolio information below.' 
                : 'Create a portfolio to organize your trades by strategy.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Tech Growth"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the portfolio's purpose or strategy..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="account_id">Linked Account</Label>
                  <Select 
                    value={formData.account_id || 'none'} 
                    onValueChange={(value) => setFormData({ ...formData, account_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No linked account</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} ({account.platform})
                        </SelectItem>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Input
                    id="strategy"
                    placeholder="e.g., Long-term, Swing"
                    value={formData.strategy}
                    onChange={(e) => setFormData({ ...formData, strategy: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value: PortfolioStatus) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : (editingPortfolio ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPortfolio?.name}"? 
              Trades assigned to this portfolio will be unassigned but not deleted.
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
