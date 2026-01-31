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
import { NewBookingDialog } from "@/components/passengers/new-booking-dialog";
import { BookingFilters } from "@/components/dashboard/booking-filters";
import {

} from "@/components/ui/dialog";
import { getBookings, deleteBooking, getAgents, getIssuedPartners, getPlatforms } from "./actions";
import { BookingsTable } from "@/components/dashboard/bookings-table";

import { Booking } from "@/types";

import { getPassengers } from "@/app/dashboard/passengers/actions";
import { SearchInput } from "@/components/dashboard/search-input";

export default async function BookingsPage({
    searchParams,
}: {
    searchParams?: Promise<{
        query?: string;
        status?: string;
        platform?: string;
        airline?: string;
        from?: string;
        to?: string;
        agentId?: string;
        issuedPartnerId?: string;
    }>;
}) {
    const query = (await searchParams)?.query || '';
    const filters = {
        query,
        status: (await searchParams)?.status,
        platform: (await searchParams)?.platform,
        airline: (await searchParams)?.airline,
        startDate: (await searchParams)?.from,
        endDate: (await searchParams)?.to,
        agentId: (await searchParams)?.agentId,
        issuedPartnerId: (await searchParams)?.issuedPartnerId,
    }

    const { data: bookings } = await getBookings(filters);
    const passengers = await getPassengers();
    const agents = await getAgents();
    const issuedPartners = await getIssuedPartners();
    const platforms = await getPlatforms();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    Bookings
                </h1>
                <div className="flex items-center gap-2">
                    {/* Add Booking Dialog */}
                    <NewBookingDialog
                        passengers={passengers}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        platforms={platforms}
                    />
                </div>
            </div>

            {/* Filter/Search Bar */}
            <BookingFilters platforms={platforms} agents={agents} issuedPartners={issuedPartners}>
                <SearchInput placeholder="Search by name, PNR, or ticket..." />
            </BookingFilters>

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-base font-medium">Recent Bookings</CardTitle>
                    <CardDescription>Manage daily transactions</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <BookingsTable
                        bookings={bookings}
                        passengers={passengers}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        platforms={platforms}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
