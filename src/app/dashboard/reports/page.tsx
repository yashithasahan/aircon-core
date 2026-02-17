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

    // Parallel data fetching
    // Get general data
    const [agents, issuedPartners, platforms] = await Promise.all([
        getAgents(),
        getIssuedPartners(),
        getPlatforms()
    ]);

    // Conditionals based on active tab? or fetch all?
    // Let's fetch both to be safe or optimize later. 
    // Pagination applies to both, but they might need separate pagination states in URL...
    // For now, sharing pagination state (might reset when switching tabs if not handled).

    const { data: tickets, count: ticketCount } = await getTicketReport(filters);

    // For payments, we need to decide if we fetch AGENT or PARTNER or BOTH.
    // The requirement says "export all... by agent OR issued partner".
    // If we have filters, we respect them. If no entity filter, maybe we show all?
    // getPaymentReport currently takes ONE type. 
    // We can fetch both and merge them in UI if "ALL" logic is needed, 
    // or just fetch what fits the filter.

    // Let's fetch both and combine for the general view, similar to PaymentExportButton logic.
    // BUT getPaymentReport doesn't support pagination yet! It limits to 20 or similar hardcoded in some places?
    // Checked getPaymentReport: it applies filters but NO LIMIT/PAGE in the query?
    // Wait, getPaymentReport in analytics/actions.ts:
    // .order('created_at', { ascending: false }) -> No .range()!
    // It returns ALL matching transactions? That might be heavy.
    // Let's assume for "Export" tab we want a list.

    // We should probably optimize `getPaymentReport` to support pagination if the list grows.
    // For now, let's fetch 'AGENT' and 'ISSUED_PARTNER' if applicable.

    let paymentTransactions: any[] = [];

    const fetchAgents = !filters.issuedPartnerId || filters.agentId;
    const fetchPartners = !filters.agentId || filters.issuedPartnerId;

    if (fetchAgents) {
        const results = await getPaymentReport(filters, 'AGENT');
        paymentTransactions = [...paymentTransactions, ...results.transactions.map((t: any) => ({ ...t, _entityType: 'AGENT' }))];
    }

    if (fetchPartners) {
        const results = await getPaymentReport(filters, 'ISSUED_PARTNER');
        paymentTransactions = [...paymentTransactions, ...results.transactions.map((t: any) => ({ ...t, _entityType: 'ISSUED_PARTNER' }))];
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
