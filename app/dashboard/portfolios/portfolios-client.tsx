"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Plus, MoreHorizontal, Pencil, Trash2, Briefcase, ArrowRight } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import type { Portfolio } from "@/lib/types"
import { createPortfolio, updatePortfolio, deletePortfolio } from "./actions"

interface PortfoliosClientProps {
  initialPortfolios: Portfolio[]
  portfolioStats: Record<string, { tradeCount: number }>
}

export function PortfoliosClient({ initialPortfolios, portfolioStats }: PortfoliosClientProps) {
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
    benchmark: '',
    inception_date: '',
    is_active: true,
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      benchmark: '',
      inception_date: '',
      is_active: true,
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
      benchmark: portfolio.benchmark || '',
      inception_date: portfolio.inception_date || '',
      is_active: portfolio.is_active,
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
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={portfolio.is_active ? "default" : "secondary"}>
                        {portfolio.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {portfolio.benchmark && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Benchmark</span>
                        <span className="font-mono">{portfolio.benchmark}</span>
                      </div>
                    )}
                    {portfolio.inception_date && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Inception</span>
                        <span>{format(new Date(portfolio.inception_date), "MMM d, yyyy")}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Trades</span>
                      <span>{stats.tradeCount}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                      <a href={`/dashboard/trades?portfolio=${portfolio.id}`}>
                        View Trades
                        <ArrowRight className="ml-2 size-3" />
                      </a>
                    </Button>
                  </div>
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
                : 'Create a portfolio to organize your trades and track performance.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Portfolio Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Growth Strategy"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the portfolio strategy or purpose..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="benchmark">Benchmark</Label>
                  <Input
                    id="benchmark"
                    placeholder="e.g., SPY, QQQ"
                    value={formData.benchmark}
                    onChange={(e) => setFormData({ ...formData, benchmark: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inception_date">Inception Date</Label>
                  <Input
                    id="inception_date"
                    type="date"
                    value={formData.inception_date}
                    onChange={(e) => setFormData({ ...formData, inception_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
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
