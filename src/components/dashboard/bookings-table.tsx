'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DeleteButton } from "@/components/ui/delete-button"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Booking, Passenger, Agent, IssuedPartner, Platform } from "@/types"

import { deleteBooking } from "@/app/dashboard/bookings/actions"
import { BookingForm } from "@/components/passengers/booking-form"

interface BookingsTableProps {
    bookings: Booking[]
    passengers?: Passenger[] // Optional because we might not have updated parent fully yet or logic
    agents?: Agent[]
    issuedPartners?: IssuedPartner[]
    platforms?: Platform[]
    readOnly?: boolean
}

export function BookingsTable({ bookings, passengers = [], agents = [], issuedPartners = [], platforms = [], readOnly = false }: BookingsTableProps) {
    // Edit Mode State
    const [editBooking, setEditBooking] = useState<Booking | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const router = useRouter()


    const handleEditClick = (e: React.MouseEvent, booking: Booking) => {
        e.stopPropagation() // Prevent row click
        setEditBooking(booking)
        setIsEditOpen(true)
    }

    const handleEditSuccess = () => {
        setIsEditOpen(false)
        setEditBooking(null)
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        <TableHead>PNR</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Passenger Name</TableHead>
                        {/* <TableHead>Ticket No</TableHead> */}
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issued By</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Airline</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Selling</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        {!readOnly && <TableHead className="w-[100px] text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bookings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={readOnly ? 8 : 9} className="text-center py-10 text-slate-500">
                                No bookings found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        bookings.map(booking => {
                            // Calculate aggregates if not already summed
                            // Assuming backend returns totals in booking.fare/selling_price for the whole booking
                            const paxCount = booking.passengers?.length || 0;
                            const status = booking.ticket_status || 'PENDING';
                            const profit = (booking.selling_price || 0) - (booking.fare || 0);

                            // Get first passenger name correctly
                            const firstPax = booking.passengers && booking.passengers.length > 0 ? booking.passengers[0] : null;
                            const displayName = firstPax
                                ? `${firstPax.title || ''} ${firstPax.first_name || ''} ${firstPax.surname || ''}`.trim()
                                : (booking.pax_name?.split(',')[0] || 'Unknown'); // Fallback to legacy string if passengers array missing

                            return (
                                <TableRow
                                    key={booking.id}
                                    className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                                    onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                                >
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <Badge variant="outline" className="w-fit font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {booking.pnr}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium text-xs text-slate-500">
                                        {booking.status_date ? new Date(booking.status_date).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="whitespace-normal min-w-[150px]">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm truncate max-w-[200px]" title={displayName}>{displayName}</span>
                                            {paxCount > 1 && (
                                                <Badge variant="secondary" className="text-[10px] px-1 h-5">
                                                    +{paxCount - 1}
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    {/* <TableCell className="text-xs font-mono text-slate-500">
                                        {booking.ticket_number || 'Multi'}
                                    </TableCell> */}
                                    <TableCell className="text-xs text-slate-500">
                                        {booking.passengers?.[0]?.phone_number || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] items-center justify-center min-w-[70px] ${status === 'ISSUED'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                                : status === 'REISSUE'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                                    : status === 'VOID'
                                                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                        : status === 'REFUNDED'
                                                            ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                                                }`}
                                        >
                                            {status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {booking.issued_partner?.name || '-'}
                                    </TableCell>
                                    <TableCell className="text-xs">{booking.platform || '-'}</TableCell>
                                    <TableCell className="text-xs">{booking.airline || '-'}</TableCell>
                                    <TableCell className="text-right text-slate-500 text-xs">{(booking.fare || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-right text-xs">{(booking.selling_price || 0).toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-medium text-green-600 dark:text-green-400 text-xs">
                                        {profit.toFixed(2)}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                                    onClick={(e) => handleEditClick(e, booking)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <DeleteButton id={booking.id} onDelete={deleteBooking} itemName="Booking" />
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            {/* Edit Booking Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Booking</DialogTitle>
                        <DialogDescription>
                            Make changes to the booking details below.
                        </DialogDescription>
                    </DialogHeader>
                    {editBooking && (
                        <BookingForm
                            passengers={passengers}
                            agents={agents}
                            issuedPartners={issuedPartners}
                            platforms={platforms}
                            initialData={editBooking}
                            bookingId={editBooking.id}
                            onSuccess={handleEditSuccess}
                            onCancel={() => setIsEditOpen(false)}
                            disableStatusChange={true}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}
