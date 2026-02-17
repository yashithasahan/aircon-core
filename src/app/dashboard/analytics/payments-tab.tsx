"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsFilters } from "./analytics-filters"
import { Agent, IssuedPartner } from "@/types"
import { PaymentReport } from "./actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface PaymentsTabProps {
    data: PaymentReport
    filters: any
    agents: Agent[]
    issuedPartners: IssuedPartner[]
    activeEntityType: 'AGENT' | 'ISSUED_PARTNER'
}

export function PaymentsTab({
    data,
    filters,
    agents,
    issuedPartners,
    activeEntityType,
}: PaymentsTabProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value)

    const handleEntityTypeChange = (type: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('paymentType', type)
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="space-y-6">
            {/* Entity Type Toggle & Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <Tabs
                    value={activeEntityType}
                    onValueChange={handleEntityTypeChange}
                    className="w-[400px]"
                >
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="AGENT">Agents</TabsTrigger>
                        <TabsTrigger value="ISSUED_PARTNER">Issued Partners</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <AnalyticsFilters
                agents={agents}
                issuedPartners={issuedPartners}
                showAgentFilter={activeEntityType === 'AGENT'}
                showIssuedPartnerFilter={activeEntityType === 'ISSUED_PARTNER'}
                showDate={true}
                showTransactionTypeFilter={true}
            />

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Money In (Top-ups)</CardTitle>
                        <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.moneyIn)}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeEntityType === 'AGENT'
                                ? "Total payments received from agents"
                                : "Total top-ups added to partners"
                            }
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Money Out (Usage)</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.moneyOut)}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeEntityType === 'AGENT'
                                ? "Total ticket issuance costs (Debt)"
                                : "Total deducted from partner balance"
                            }
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${data.netFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(data.netFlow)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Net movement in period
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                        No transactions found for this period.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">
                                                {activeEntityType === 'AGENT'
                                                    ? tx.agent?.name || 'Unknown'
                                                    : tx.issued_partner?.name || 'Unknown'
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                let badgeColor = 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
                                                let label = tx.transaction_type;

                                                if (tx.transaction_type === 'TOPUP') {
                                                    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
                                                } else if (tx.transaction_type === 'BOOKING_DEDUCTION') {
                                                    badgeColor = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
                                                    label = 'BOOKING';
                                                } else if (tx.transaction_type === 'REFUND') {
                                                    badgeColor = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
                                                }

                                                return (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badgeColor}`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="max-w-[300px]">
                                            <span className="truncate block" title={tx.description}>{tx.description}</span>
                                        </TableCell>
                                        <TableCell className={`text-right font-mono font-medium ${
                                            // Heuristic: TOPUP is "Green" (Positive flow), DEDUCTION is "Red" (Usage)
                                            // This matches the Summary Cards logic usually
                                            tx.transaction_type === 'TOPUP' || tx.transaction_type === 'REFUND'
                                                ? 'text-emerald-600'
                                                : 'text-red-600'
                                            }`}>
                                            {formatCurrency(Number(tx.amount))}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
