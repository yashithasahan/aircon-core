import { getAnalyticsSummary, getAgentPerformanceReport } from "./actions";
import { BookingFilters } from "@/components/dashboard/booking-filters";
import { BookingsTab } from "./bookings-tab";
import { AgentTab } from "./agent-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAgents, getBookings, getIssuedPartners, getPlatforms } from "../bookings/actions";
import { getPassengers } from "../passengers/actions";

export default async function AnalyticsPage({
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
        page?: string;
        limit?: string;
    }>;
}) {
    const sp = await searchParams;
    const filters = {
        query: sp?.query || '',
        status: sp?.status,
        platform: sp?.platform,
        airline: sp?.airline,
        startDate: sp?.from,
        endDate: sp?.to,
        agentId: sp?.agentId,
        issuedPartnerId: sp?.issuedPartnerId,
        page: Number(sp?.page) || 1,
        limit: Number(sp?.limit) || 20
    };

    const summary = await getAnalyticsSummary(filters);
    const agentPerformance = await getAgentPerformanceReport(filters);

    // Fetch data for filters and bookings table
    const agents = await getAgents();
    const platforms = await getPlatforms();
    const issuedPartners = await getIssuedPartners();
    const passengers = await getPassengers();
    const { data: bookings, count } = await getBookings(filters);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Analytics
            </h1>

            <Tabs defaultValue="bookings" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    <TabsTrigger value="agents" disabled className="opacity-50 cursor-not-allowed">
                        Agents
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="bookings" className="space-y-4">
                    <BookingFilters
                        platforms={platforms}
                        agents={agents}
                        issuedPartners={issuedPartners}
                    />
                    <BookingsTab
                        summary={summary}
                        bookings={bookings}
                        passengers={passengers}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        platforms={platforms}
                    />
                </TabsContent>

                <TabsContent value="agents" className="space-y-4">
                    <AgentTab data={agentPerformance} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
