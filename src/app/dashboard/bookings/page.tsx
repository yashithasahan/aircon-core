import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BookingForm } from "@/components/passengers/booking-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { getBookings, deleteBooking, getAgents, getBookingTypes } from "./actions";

import { Booking } from "@/types";

import { getPassengers } from "@/app/dashboard/passengers/actions";

export default async function BookingsPage() {
    const bookings = await getBookings() as Booking[];
    const passengers = await getPassengers();
    const agents = await getAgents();
    const bookingTypes = await getBookingTypes();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Bookings
                </h1>
                <div className="flex items-center gap-2">
                    {/* Add Booking Dialog */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="premium" className="shadow-lg shadow-blue-500/20">
                                <Plus className="mr-2 h-4 w-4" />
                                New Booking
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Booking</DialogTitle>
                                <DialogDescription>
                                    Enter the passenger and flight details below.
                                </DialogDescription>
                            </DialogHeader>
                            <BookingForm
                                passengers={passengers}
                                agents={agents}
                                bookingTypes={bookingTypes}
                            />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filter/Search Bar */}
            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        type="search"
                        placeholder="Search by name, PNR, or ticket..."
                        className="pl-9 bg-white dark:bg-slate-950"
                    />
                </div>
                <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-base font-medium">Recent Bookings</CardTitle>
                    <CardDescription>Manage daily transactions</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
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
                                {/* <TableHead>Dep</TableHead> */}
                                {/* <TableHead>Ret</TableHead> */}
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
                                    <TableRow key={booking.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-100 dark:border-slate-800">
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
                                            <Badge variant={booking.ticket_status === 'ISSUED' ? 'default' : 'secondary'} className="text-[10px]">
                                                {booking.ticket_status || 'PENDING'}
                                            </Badge>
                                        </TableCell>
                                        {/* <TableCell>{booking.departure_date}</TableCell> */}
                                        {/* <TableCell>{booking.return_date || 'ONEWAY'}</TableCell> */}
                                        <TableCell>{booking.airline || '-'}</TableCell>
                                        <TableCell className="text-right text-slate-500">{booking.fare.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">{booking.selling_price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right text-blue-600">{booking.advance_payment?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                                            {booking.profit.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <DeleteButton id={booking.id} onDelete={deleteBooking} itemName="Booking" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
