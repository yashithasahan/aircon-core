import { getBookings, getAgents, getIssuedPartners, getPlatforms, getTicketReport } from "@/app/dashboard/bookings/actions";
import { getPaymentReport } from "@/app/dashboard/analytics/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketsTab } from "./tickets-tab";
import { PaymentsTab } from "./payments-tab";

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
        issuedPartnerId?: string;
        transactionType?: string;
        page?: string;
        limit?: string;
        tab?: string;
    }>;
}) {
    const sp = await searchParams;

    const page = Number(sp?.page) || 1;
    const limit = Number(sp?.limit) || 20;
    const activeTab = sp?.tab || 'tickets';

    const filters = {
        query: sp?.query || '',
        status: sp?.status,
        platform: sp?.platform,
        airline: sp?.airline,
        startDate: sp?.from,
        endDate: sp?.to,
        agentId: sp?.agentId,
        issuedPartnerId: sp?.issuedPartnerId,
        transactionType: sp?.transactionType,
        page,
        limit
    };

    // Parallel data fetching for all required data
    const fetchAgents = !filters.issuedPartnerId || filters.agentId;
    const fetchPartners = !filters.agentId || filters.issuedPartnerId;

    const [agents, issuedPartners, platforms, { data: tickets, count: ticketCount }, agentPayments, partnerPayments] = await Promise.all([
        getAgents(),
        getIssuedPartners(),
        getPlatforms(),
        getTicketReport(filters),
        fetchAgents ? getPaymentReport(filters, 'AGENT') : Promise.resolve({ moneyIn: 0, moneyOut: 0, netFlow: 0, transactions: [] }),
        fetchPartners ? getPaymentReport(filters, 'ISSUED_PARTNER') : Promise.resolve({ moneyIn: 0, moneyOut: 0, netFlow: 0, transactions: [] })
    ]);

    let paymentTransactions: any[] = [];

    if (fetchAgents) {
        paymentTransactions = [...paymentTransactions, ...agentPayments.transactions.map((t: any) => ({ ...t, _entityType: 'AGENT' }))];
    }

    if (fetchPartners) {
        paymentTransactions = [...paymentTransactions, ...partnerPayments.transactions.map((t: any) => ({ ...t, _entityType: 'ISSUED_PARTNER' }))];
    }

    // Sort combined
    paymentTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                        Export
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Generate and export detailed data reports.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="tickets" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="tickets">Tickets</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <TabsContent value="tickets">
                    <TicketsTab
                        tickets={tickets}
                        count={ticketCount || 0}
                        page={page}
                        limit={limit}
                        filters={filters}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        platforms={platforms}
                    />
                </TabsContent>

                <TabsContent value="payments">
                    <PaymentsTab
                        transactions={paymentTransactions}
                        filters={filters}
                        agents={agents}
                        issuedPartners={issuedPartners}
                        page={page}
                        count={paymentTransactions.length}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
