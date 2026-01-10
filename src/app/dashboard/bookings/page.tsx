import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { getBookings, deleteBooking, getAgents, getBookingTypes } from "./actions";
import { BookingsTable } from "@/components/dashboard/bookings-table";

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
                    <BookingsTable bookings={bookings} />
                </CardContent>
            </Card>
        </div>
    );
}
