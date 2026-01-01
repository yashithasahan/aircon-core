"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface DeleteButtonProps {
    id: string
    onDelete: (id: string) => Promise<void>
    itemName?: string
}

export function DeleteButton({ id, onDelete, itemName = "item" }: DeleteButtonProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        setLoading(true)
        try {
            await onDelete(id) // Server action
            setOpen(false)
        } catch (error) {
            console.error(error)
            alert("Failed to delete " + itemName)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {itemName}?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this {itemName.toLowerCase()}? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Deleting..." : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
