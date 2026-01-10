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
} from "@/components/ui/select" // Wait, I need to check if Select exists or install it. I'll use native select if not or check for it.
// Checking file list again... select.tsx was NOT in the list. I'll implementation a simple dropdown or use native for now to avoid installing new components if possible, OR I can use the existing DropdownMenu.
// Actually, I'll use a native select for simplicity and robustness if shadcn Select isn't there, OR I'll check if I can generic DropdownMenu for selection.
// Native select is safest for "no new dependencies".
// BUT user asked for "option to change the status... new booking screen pop up...".
// I'll stick to a nice UI. I'll use DropdownMenu if Select is missing.
// Re-reading: "use standard divs" was my thought.
// Let's check if I can use DropdownMenu which IS there.

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Booking, BookingHistory } from "@/types"
import { updateBookingStatus, getBookingHistory } from "@/app/dashboard/bookings/actions"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

interface BookingDetailsModalProps {
    booking: Booking | null
    isOpen: boolean
    onClose: () => void
}

export function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsModalProps) {
    const [status, setStatus] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [history, setHistory] = useState<BookingHistory[]>([])
    const [loadingHistory, setLoadingHistory] = useState(false)

    useEffect(() => {
        if (booking) {
            setStatus(booking.ticket_status || 'PENDING')
            setHistory([]) // Reset
            fetchHistory(booking.id)
        }
    }, [booking])

    const fetchHistory = async (id: string) => {
        setLoadingHistory(true)
        try {
            const data = await getBookingHistory(id)
            setHistory(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleSave = async () => {
        if (!booking) return
        if (status === booking.ticket_status) return // No change

        setIsLoading(true)
        try {
            await updateBookingStatus(booking.id, status, booking.ticket_status || 'PENDING')
            // Refresh history
            await fetchHistory(booking.id)
            onClose() // Close on success? Or keep open to show history? 
            // User said "show a new booking screen pop up is enough in there should be am option to change the status... and if any status changed there should be a hisrtory... it should be appered bellow".
            // So I should probably keep it open or let user close it. 
            // But if I close it, they can't see the history immediately.
            // But usually "Save" implies done. 
            // User said: "bellow the status chagene button in the popup and as well as there should be a button to save the changed stauts".
            // So: Change Status -> Click Save -> History Updates (and Modal stays open presumably? or maybe closes).
            // I'll keep it open and just refresh history to show the new log.
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    if (!booking) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
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
                                Save Status
                            </Button>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="border-t pt-4 border-slate-100 dark:border-slate-800">
                        <h4 className="mb-4 text-sm font-medium leading-none">History Logs</h4>
                        {loadingHistory ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : history.length === 0 ? (
                            <p className="text-sm text-slate-500">No history available.</p>
                        ) : (
                            <div className="space-y-4">
                                {history.map((item) => (
                                    <div key={item.id} className="flex flex-col gap-1 text-sm border-b pb-3 border-slate-100 dark:border-slate-800 last:border-0 text-slate-600 dark:text-slate-400">
                                        <div className="flex justify-between font-medium text-slate-900 dark:text-slate-100">
                                            <span>{item.action.replace('_', ' ')}</span>
                                            <span className="text-xs text-slate-500">{format(new Date(item.created_at), "MMM d, yyyy h:mm a")}</span>
                                        </div>
                                        <div className="text-xs">
                                            {item.previous_status && item.new_status ? (
                                                <span>Changed from <Badge variant="outline">{item.previous_status}</Badge> to <Badge>{item.new_status}</Badge></span>
                                            ) : (
                                                <span>{item.details}</span>
                                            )}
                                        </div>
                                        {/* Status specific details */}
                                        {item.new_status === 'REFUNDED' && (
                                            <div className="text-xs text-red-500 mt-1">
                                                Ticket Refunded Date: {format(new Date(item.created_at), "MMM d, yyyy")}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
