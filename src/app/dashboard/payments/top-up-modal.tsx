"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { topUpCredit } from "./actions"

interface TopUpModalProps {
    bookingTypeId: string
    bookingTypeName: string
}

export function TopUpModal({ bookingTypeId, bookingTypeName }: TopUpModalProps) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState("")
    const [loading, setLoading] = useState(false)

    async function handleTopUp() {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setLoading(true)
        try {
            await topUpCredit(bookingTypeId, Number(amount), `Manual Top Up via Dashboard`)
            toast.success(`Successfully topped up €${amount} to ${bookingTypeName}`)
            setOpen(false)
            setAmount("")
        } catch (error: any) {
            toast.error(error.message || "Failed to top up")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                    <Plus className="h-4 w-4" />
                    Top Up
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Top Up {bookingTypeName}</DialogTitle>
                    <DialogDescription>
                        Add funds to this account balance. This will allow issuing more tickets.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">
                            Amount (€)
                        </Label>
                        <Input
                            id="amount"
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="col-span-3"
                            placeholder="e.g. 1000"
                            autoFocus
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" onClick={handleTopUp} disabled={loading}>
                        {loading ? "Processing..." : "Confirm Top Up"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
