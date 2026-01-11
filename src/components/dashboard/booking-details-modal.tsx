'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface BookingDetailsModalProps {
    booking: Booking | null
    isOpen: boolean
    onClose: () => void
}
// BUT user asked for "option to change the status... new booking screen pop up...".
// I'll stick to a nice UI. I'll use DropdownMenu if Select is missing.
// Re-reading: "use standard divs" was my thought.
// Let's check if I can use DropdownMenu which IS there.

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Booking, BookingHistory } from "@/types"
import { cloneBookingWithNewStatus } from "@/app/dashboard/bookings/actions"
// ... imports ...

export function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
    const [status, setStatus] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (booking) {
            setStatus(booking.ticket_status || 'PENDING')
        }
    }, [booking])

    const handleSave = async () => {
        if (!booking) return
        if (status === booking.ticket_status) return // No change

        setIsLoading(true)
        try {
            // Use Clone Logic: Create NEW booking with updated status
            // The existing (duplicate PNR+Status) validation will catch if this exact state already exists.
            await cloneBookingWithNewStatus(booking.id, status)

            // Success: Close modal (list will refresh automatically via revalidatePath)
            onClose()
            toast.success("New booking status cloned successfully.")
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to clone booking status.")
        } finally {
            setIsLoading(false)
        }
    }

    if (!booking) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Booking Details - {booking.pnr}</DialogTitle>
                    <DialogDescription>
                        View and manage booking status.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Booking Info Summary */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="font-semibold">Passenger:</span> {booking.pax_name}
                        </div>
                        <div>
                            <span className="font-semibold">Airline:</span> {booking.airline}
                        </div>
                        <div>
                            <span className="font-semibold">Ticket No:</span> {booking.ticket_number || '-'}
                        </div>
                        <div>
                            <span className="font-semibold">Route:</span> {booking.origin} - {booking.destination}
                        </div>
                    </div>

                    {/* Status Change Section */}
                    <div className="flex items-end gap-4 border-t pt-4 border-slate-100 dark:border-slate-800">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="status">Booking Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ISSUED">Issued</SelectItem>
                                    <SelectItem value="VOID">Void</SelectItem>
                                    <SelectItem value="CANCELED">Canceled</SelectItem>
                                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleSave} disabled={isLoading || status === booking.ticket_status}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Status (Clone)
                            </Button>
                        </div>
                    </div>
                    {/* History Removed as requested */}
                </div>
            </DialogContent>
        </Dialog>
    )
}
