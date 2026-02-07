import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Plane, TrendingUp, CreditCard, Wallet } from "lucide-react";
import { getDashboardStats, getRecentSales, getAgentCreditStats, getFinancialSummary } from "./actions";

import { MonthSelector } from "@/components/dashboard/month-selector";
import { format } from "date-fns";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string }>
}) {
    const { date: dateParam } = await searchParams;
    const stats = await getDashboardStats(dateParam);
    const recentSales = await getRecentSales(dateParam);
    const agentCredits = await getAgentCreditStats(dateParam);
    const portfolio = await getFinancialSummary();

    // Calculate display label for current selection
    const displayDate = dateParam
        ? new Date(dateParam + '-01')
        : new Date();
    const formattedDate = !isNaN(displayDate.getTime())
        ? format(displayDate, 'MMMM yyyy')
        : format(new Date(), 'MMMM yyyy');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
                    <div className="text-sm text-slate-500">
                        Real-time Overview
                    </div>
                </div>
                <MonthSelector />
            </div>

            {/* Monthly Performance */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-100" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€{stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-blue-100/80">
                            Sales for {formattedDate}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Total Bookings
                        </CardTitle>
                        <Plane className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalBookings}</div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Confirmed flights in {formattedDate}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Net Profit
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">€{stats.totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                            Margin: {stats.averageMargin.toFixed(1)}% ({formattedDate})
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Financial Status (Global) */}
            <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Financial Status</h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="border-0 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Partner Net Balance
                            </CardTitle>
                            <Wallet className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${portfolio.totalPartnerBalance < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                €{portfolio.totalPartnerBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Total funds currently held by partners
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Agent Receivables
                            </CardTitle>
                            <CreditCard className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-500">
                                €{portfolio.totalAgentDebt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Total outstanding debt from agents
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Agent Credits Section */}
            <div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Agent Credits & Balances</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {agentCredits.map((agent) => (
                        <Card key={agent.id} className="border-0 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {agent.name}
                                </CardTitle>
                                <div className={agent.balance < 500 ? "text-red-500" : "text-emerald-500"}>
                                    €{Number(agent.balance).toLocaleString()}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">{agent.todayCount}</div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tickets issued in {formattedDate}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] flex items-center justify-center text-slate-400">
                            <p className="text-sm">Chart visualization coming in next update...</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentSales.map((sale) => (
                                <div key={sale.id} className="flex items-center">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none truncate max-w-[150px]">{sale.pax_name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{sale.pnr}</p>
                                    </div>
                                    <div className="ml-auto font-medium text-emerald-600 dark:text-emerald-400">
                                        +€{sale.selling_price.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                            {recentSales.length === 0 && (
                                <p className="text-sm text-slate-500">No recent sales found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

