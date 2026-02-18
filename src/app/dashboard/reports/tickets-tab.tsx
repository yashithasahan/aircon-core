
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ReportsTable } from "@/components/dashboard/reports/reports-table";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { ExportButton } from "@/components/dashboard/reports/export-button";
import { BookingFilters } from "@/components/dashboard/booking-filters";
import { TicketReportRow } from "@/components/dashboard/reports/reports-table"; // Import type if exported, or redefine/import from shared types
import { Agent, IssuedPartner, Platform } from "@/types";

interface TicketsTabProps {
    tickets: any[]; // Using any for now to match strict type later or import
    count: number;
    page: number;
    limit: number;
    filters: any;
    agents: Agent[];
    issuedPartners: IssuedPartner[];
    platforms: Platform[];
}

export function TicketsTab({
    tickets,
    count,
    page,
    limit,
    filters,
    agents,
    issuedPartners,
    platforms
}: TicketsTabProps) {
    const totalPages = Math.ceil((count || 0) / limit);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-medium">Tickets Export</h3>
                    <p className="text-sm text-muted-foreground">
                        Export detailed ticket issuance data.
                    </p>
                </div>
                <ExportButton filters={filters} />
            </div>

            <BookingFilters platforms={platforms} agents={agents} issuedPartners={issuedPartners} showUnifiedEntityFilter={true} />

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-medium">Ticket Report Data</CardTitle>
                        <CardDescription>
                            {`Showing ${tickets.length} of ${count} tickets`}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ReportsTable
                        tickets={tickets}
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
