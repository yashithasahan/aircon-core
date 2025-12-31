"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"

export function PassengerForm({ onSubmit, onCancel }: { onSubmit: () => void, onCancel: () => void }) {
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false)
            onSubmit()
        }, 1000)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="paxName">Passenger Name</Label>
                    <Input id="paxName" placeholder="SURNAME/NAME MR" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pnr">PNR</Label>
                    <Input id="pnr" placeholder="XYZ123" required className="uppercase" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ticket">Ticket No</Label>
                    <Input id="ticket" placeholder="157-..." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dep">Departure</Label>
                    <Input id="dep" type="date" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="ret">Return</Label>
                    <Input id="ret" type="text" placeholder="Date or ONEWAY" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="airline">Airline</Label>
                    <Input id="airline" placeholder="FZ" className="uppercase" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fare">Fare (Buy)</Label>
                    <Input id="fare" type="number" step="0.01" prefix="€" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="selling">Selling Price</Label>
                    <Input id="selling" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="payment">Payment Status</Label>
                    <Input id="payment" placeholder="PAID / DEPOSIT" />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isLoading} variant="premium">
                    {isLoading ? "Saving..." : "Save Booking"}
                </Button>
            </DialogFooter>
        </form>
    )
}
