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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { Account } from "@/lib/types"
import { AccountDialog } from "./account-dialog"
import { DeleteAccountDialog } from "./delete-account-dialog"

interface AccountsTableProps {
  accounts: Account[]
}

const platformColors: Record<string, string> = {
  IBKR: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Futu: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Tiger: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
}

export function AccountsTable({ accounts }: AccountsTableProps) {
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<Account | null>(null)

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-lg font-semibold">No accounts yet</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Add your first trading account to get started.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account ID</TableHead>
              <TableHead>Account Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Base Currency</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-mono text-sm">{account.account_id}</TableCell>
                <TableCell className="font-medium">{account.account_name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={platformColors[account.platform] || platformColors.Other}>
                    {account.platform}
                  </Badge>
                </TableCell>
                <TableCell>{account.account_type || "-"}</TableCell>
                <TableCell>{account.base_currency}</TableCell>
                <TableCell>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Active" : "Inactive"}
                  </Badge>
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
                      <DropdownMenuItem onClick={() => setEditAccount(account)}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteAccount(account)}
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

      {editAccount && (
        <AccountDialog 
          account={editAccount} 
          open={!!editAccount}
          onOpenChange={(open) => !open && setEditAccount(null)}
        />
      )}

      {deleteAccount && (
        <DeleteAccountDialog 
          account={deleteAccount}
          open={!!deleteAccount}
          onOpenChange={(open) => !open && setDeleteAccount(null)}
        />
      )}
    </>
  )
}
