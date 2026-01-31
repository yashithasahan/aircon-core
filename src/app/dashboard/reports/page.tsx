import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { BookingFilters } from "@/components/dashboard/booking-filters";
import { getBookings, getAgents, getIssuedPartners, getPlatforms } from "@/app/dashboard/bookings/actions";
import { BookingsTable } from "@/components/dashboard/bookings-table";
import { getPassengers } from "@/app/dashboard/passengers/actions";
import { ExportButton } from "@/components/dashboard/reports/export-button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { AlertCircle } from "lucide-react";

export default async function ReportsPage({
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
        bookingTypeId?: string;
        page?: string;
        limit?: string;
    }>;
}) {
    const sp = await searchParams;

    // Check if any filter is applied (excluding pagination)
    const hasFilters =
        sp?.status ||
        sp?.platform ||
        sp?.airline ||
        sp?.from ||
        sp?.to ||
        sp?.agentId ||
        sp?.bookingTypeId ||
        sp?.query;

    const page = Number(sp?.page) || 1;
    const limit = Number(sp?.limit) || 20;

    const filters = {
        query: sp?.query || '',
        status: sp?.status,
        platform: sp?.platform,
        airline: sp?.airline,
        startDate: sp?.from,
        endDate: sp?.to,
        agentId: sp?.agentId,
        bookingTypeId: sp?.bookingTypeId,
        page,
        limit
    };

    // Always fetch data (paginated)
    const { data: bookings, count } = await getBookings(filters);

    const passengers = await getPassengers();
    const agents = await getAgents();
    const issuedPartners = await getIssuedPartners();
    const platforms = await getPlatforms();

    const totalPages = Math.ceil((count || 0) / limit);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Reports
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Generate and export booking reports.
                    </p>
                </div>
                <ExportButton filters={filters} />
            </div>

            {/* Filters */}
            <BookingFilters platforms={platforms} agents={agents} issuedPartners={issuedPartners} />

            {/* Results */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-medium">Report Data</CardTitle>
                        <CardDescription>
                            {`Showing ${bookings.length} of ${count} records`}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <BookingsTable
                        bookings={bookings}
                        passengers={passengers}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        platforms={platforms}
                        readOnly={true}
                    />
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                            <PaginationControls
                                currentPage={page}
                                totalPages={totalPages}
                                hasNextPage={page < totalPages}
                                hasPrevPage={page > 1}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
