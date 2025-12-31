import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, Plane, TrendingUp } from "lucide-react";

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
                <div className="text-sm text-slate-500">
                    Last updated: Today, 12:00 PM
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-100">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-100" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">€13,206.11</div>
                        <p className="text-xs text-blue-100/80">
                            +20.1% from last month
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Passenegers
                        </CardTitle>
                        <Users className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">450</div>
                        <p className="text-xs text-slate-500">
                            +12 new this week
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            FZ Balance (Profit)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">€1,610.03</div>
                        <p className="text-xs text-emerald-600/80">
                            Net Profit Margin: 12%
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            Total Flights
                        </CardTitle>
                        <Plane className="h-4 w-4 text-slate-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">12</div>
                        <p className="text-xs text-slate-500">
                            Active bookings
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity / Placeholder Graph */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] flex items-center justify-center text-slate-400">
                            [Chart Placeholder - Sales over time]
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Mock List */}
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">Passenger Name</p>
                                        <p className="text-xs text-slate-500">Tkt: 157-209292...</p>
                                    </div>
                                    <div className="ml-auto font-medium">+€511.38</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
