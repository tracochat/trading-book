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
import { toast } from "sonner"
import type { Account, Platform } from "@/lib/types"
import { createAccount, updateAccount } from "@/lib/actions/accounts"

interface AccountDialogProps {
  children?: React.ReactNode
  account?: Account
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const platforms: Platform[] = ["IBKR", "Futu", "Tiger", "Other"]
const currencies = ["USD", "SGD", "HKD", "EUR", "GBP", "JPY", "CNY", "AUD", "CAD"]

export function AccountDialog({ children, account, open, onOpenChange }: AccountDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [internalOpen, setInternalOpen] = useState(false)
  
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen

  const [formData, setFormData] = useState({
    account_id: account?.account_id || "",
    account_name: account?.account_name || "",
    platform: account?.platform || "IBKR" as Platform,
    account_type: account?.account_type || "",
    base_currency: account?.base_currency || "USD",
    is_active: account?.is_active ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    startTransition(async () => {
      try {
        if (account) {
          await updateAccount(account.id, formData)
          toast.success("Account updated successfully")
        } else {
          await createAccount(formData)
          toast.success("Account created successfully")
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
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{account ? "Edit Account" : "Add Account"}</DialogTitle>
            <DialogDescription>
              {account 
                ? "Update the details of your trading account."
                : "Add a new trading account to track your positions and trades."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="account_id">Account ID</Label>
              <Input
                id="account_id"
                placeholder="e.g., U1234567"
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
            <div className="grid gap-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(value: Platform) => setFormData({ ...formData, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account_type">Account Type</Label>
              <Input
                id="account_type"
                placeholder="e.g., Margin, Cash"
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="base_currency">Base Currency</Label>
              <Select
                value={formData.base_currency}
                onValueChange={(value) => setFormData({ ...formData, base_currency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : account ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
