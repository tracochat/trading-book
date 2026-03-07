"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
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
import { toast } from "sonner"
import type { Instrument } from "@/lib/types"
import { deleteInstrument } from "@/lib/actions/instruments"

interface DeleteInstrumentDialogProps {
  instrument: Instrument
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteInstrumentDialog({ instrument, open, onOpenChange }: DeleteInstrumentDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteInstrument(instrument.id)
        toast.success("Instrument deleted successfully")
        onOpenChange(false)
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete instrument")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Instrument</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{instrument.symbol}</strong> ({instrument.description})?
            This will also delete all associated trades and positions.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
