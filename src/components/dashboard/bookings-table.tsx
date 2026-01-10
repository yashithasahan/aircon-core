'use client'

import { useState } from 'react'
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
import { Booking } from "@/types"
import { BookingDetailsModal } from "./booking-details-modal"
import { deleteBooking } from "@/app/dashboard/bookings/actions"

interface BookingsTableProps {
    bookings: Booking[]
}

export function BookingsTable({ bookings }: BookingsTableProps) {
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleRowClick = (booking: Booking) => {
        setSelectedBooking(booking)
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setSelectedBooking(null)
    }

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-800">
                        <TableHead>PNR</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Pax Name</TableHead>
                        <TableHead>Ticket No</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Airline</TableHead>
                        <TableHead className="text-right">Fare</TableHead>
                        <TableHead className="text-right">Selling</TableHead>
                        <TableHead className="text-right">Advance</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bookings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={13} className="text-center py-10 text-slate-500">
                                No bookings found. Create one to get started.
                            </TableCell>
                        </TableRow>
                    ) : (
                        bookings.map((booking) => (
                            <TableRow
                                key={booking.id}
                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-100 dark:border-slate-800"
                                onClick={() => handleRowClick(booking)}
                            >
                                <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {booking.pnr}
                                    </Badge>
                                </TableCell>
                                <TableCell className="font-medium">{booking.entry_date}</TableCell>
                                <TableCell>{booking.pax_name}</TableCell>
                                <TableCell className="font-mono text-xs">{booking.ticket_number || '-'}</TableCell>
                                <TableCell className="text-xs">{booking.ticket_issued_date || '-'}</TableCell>
                                <TableCell className="text-xs">{booking.platform || '-'}</TableCell>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={`text-[10px] items-center justify-center min-w-[70px] ${booking.ticket_status === 'ISSUED'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                                                : booking.ticket_status === 'VOID'
                                                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                    : booking.ticket_status === 'REFUNDED'
                                                        ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                                                        : booking.ticket_status === 'CANCELED'
                                                            ? 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
                                            }`}
                                    >
                                        {booking.ticket_status || 'PENDING'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{booking.airline || '-'}</TableCell>
                                <TableCell className="text-right text-slate-500">{booking.fare.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{booking.selling_price.toFixed(2)}</TableCell>
                                <TableCell className="text-right text-blue-600">{booking.advance_payment?.toFixed(2) || '0.00'}</TableCell>
                                <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                                    {booking.profit.toFixed(2)}
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DeleteButton id={booking.id} onDelete={deleteBooking} itemName="Booking" />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <BookingDetailsModal
                booking={selectedBooking}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </>
    )
}
