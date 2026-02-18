
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { AnalyticsFilters } from "@/app/dashboard/analytics/analytics-filters";
import { Agent, IssuedPartner } from "@/types";
import { PaymentReportTable } from "@/components/dashboard/reports/payment-report-table";
import { PaymentExportButton } from "@/components/dashboard/reports/payment-export-button";

interface PaymentsTabProps {
    transactions: any[];
    filters: any;
    agents: Agent[];
    issuedPartners: IssuedPartner[];
    page: number;
    count: number; // Total count for pagination? getPaymentReport might need update to return count
    // If pagination is not strictly required for MVP, we might skip or load all.
    // User asked "export all", implying potentially large dataset.
}

export function PaymentsTab({
    transactions,
    filters,
    agents,
    issuedPartners,
}: PaymentsTabProps) {
    // For now, assuming getPaymentReport returns limited latest transactions or all filtered.
    // If it's a long list, we might relying on filters.

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-medium">Payments Export</h3>
                    <p className="text-sm text-muted-foreground">
                        Export payment and transaction history (Topups, Deductions).
                    </p>
                </div>
                <PaymentExportButton filters={filters} />
            </div>

            <AnalyticsFilters
                agents={agents}
                issuedPartners={issuedPartners}
                showTransactionTypeFilter={true}
                showAgentFilter={true} // Allow filtering by either
                showIssuedPartnerFilter={true}
                showUnifiedEntityFilter={true}
            />

            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
                <CardHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-medium">Transaction Data</CardTitle>
                        <CardDescription>
                            {`Showing ${transactions.length} transactions`}
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <PaymentReportTable transactions={transactions} />
                </CardContent>
            </Card>
        </div>
    );
}
