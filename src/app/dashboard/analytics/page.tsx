import { getAnalyticsSummary, getAgentPerformanceReport, getIssuedPartnerPerformance, getPaymentReport } from "./actions";
import { BookingFilters } from "@/components/dashboard/booking-filters";
import { BookingsTab } from "./bookings-tab";
import { AgentTab } from "./agent-tab";
import { IssuedPartnerTab } from "./issued-partner-tab";
import { PaymentsTab } from "./payments-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAgents, getPlatforms, getIssuedPartners, getTicketReport } from "../bookings/actions";

export default async function AnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const sp = await searchParams;

    const query = sp?.query
    const status = sp?.status
    const platform = sp?.platform
    const airline = sp?.airline
    const from = sp?.from
    const to = sp?.to
    const agentId = sp?.agentId
    const issuedPartnerId = sp?.issuedPartnerId
    const page = sp?.page
    const limit = sp?.limit
    const paymentType = sp?.paymentType
    const transactionType = sp?.transactionType

    const filters = {
        query: (query as string) || '',
        status: status as string,
        platform: platform as string,
        airline: airline as string,
        startDate: from as string,
        endDate: to as string,
        agentId: agentId as string,
        issuedPartnerId: issuedPartnerId as string,
        transactionType: transactionType as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20
    };

    let activePaymentType = (paymentType as 'AGENT' | 'ISSUED_PARTNER') || 'AGENT';

    // Override if specific filter is set (Unified Filter behavior)
    if (agentId && agentId !== 'ALL') activePaymentType = 'AGENT';
    if (issuedPartnerId && issuedPartnerId !== 'ALL') activePaymentType = 'ISSUED_PARTNER';

    const [
        summary,
        agentPerformance,
        partnerPerformance,
        ticketsResult,
        agents,
        platforms,
        issuedPartners,
        paymentReport
    ] = await Promise.all([
        getAnalyticsSummary(filters),
        getAgentPerformanceReport(filters),
        getIssuedPartnerPerformance(filters),
        getTicketReport(filters),
        getAgents(),
        getPlatforms(),
        getIssuedPartners(),
        getPaymentReport(filters, activePaymentType)
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            </div>

            <Tabs defaultValue="tickets" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="tickets">Tickets</TabsTrigger>
                    <TabsTrigger value="agents">
                        Agents
                    </TabsTrigger>
                    <TabsTrigger value="issued_partners">
                        Issued Partners
                    </TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <TabsContent value="tickets" className="space-y-4">
                    <BookingFilters
                        platforms={platforms}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        showUnifiedEntityFilter={true}
                    />
                    <BookingsTab
                        summary={summary}
                        tickets={ticketsResult.data}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        platforms={platforms}
                    />
                </TabsContent>

                <TabsContent value="agents" className="space-y-4">
                    <AgentTab
                        data={agentPerformance}
                        filters={filters}
                        agents={agents}
                    />
                </TabsContent>

                <TabsContent value="issued_partners" className="space-y-4">
                    <IssuedPartnerTab
                        data={partnerPerformance}
                        filters={filters}
                        issuedPartners={issuedPartners}
                    />
                </TabsContent>

                <TabsContent value="payments" className="space-y-4">
                    <PaymentsTab
                        data={paymentReport}
                        filters={filters}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        activeEntityType={activePaymentType}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
