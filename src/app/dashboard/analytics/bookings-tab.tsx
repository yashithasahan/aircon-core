'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AnalyticsSummary } from "./actions"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts"
import { BookingsTable } from "@/components/dashboard/bookings-table"
import { Agent, IssuedPartner, Platform, Passenger } from "@/types"

interface BookingsTabProps {
    summary: AnalyticsSummary
    bookings: any[]
    passengers: Passenger[]
    agents: Agent[]
    issuedPartners: IssuedPartner[]
    platforms: Platform[]
}

export function BookingsTab({ summary, bookings, passengers, agents, issuedPartners, platforms }: BookingsTabProps) {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                {/* Bookings Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bookings Trend</CardTitle>
                        <CardDescription>
                            Number of bookings per day for the selected period.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={summary.revenueTrend}>
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => {
                                            const date = new Date(value)
                                            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                        }}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        allowDecimals={false}
                                    />
                                    <Tooltip
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Line type="monotone" dataKey="bookingsCount" stroke="#3b82f6" strokeWidth={2} name="Bookings" activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Platform Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bookings by Platform</CardTitle>
                        <CardDescription>
                            Distribution of bookings across different sources.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={summary.bookingsByPlatform}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {summary.bookingsByPlatform.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Bookings by Airline */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bookings by Airline</CardTitle>
                        <CardDescription>
                            Distribution of bookings by Airline.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={summary.bookingsByAirline}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#82ca9d"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {summary.bookingsByAirline.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Issuing Partner Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Issuing Partners</CardTitle>
                        <CardDescription>
                            Bookings distribution by Issuing Partner.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={summary.bookingsByIssuedPartner}>
                                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} name="Bookings" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Bookings List */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm mb-20">
                <CardHeader>
                    <CardTitle>Detailed Bookings</CardTitle>
                    <CardDescription>
                        List of bookings matching the selected filters.
                    </CardDescription>
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
                </CardContent>
            </Card>

            {/* Fixed Summary Footer */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 shadow-lg md:pl-72">
                <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                    <div className="flex items-center gap-8">
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Total Cost</span>
                            <span className="font-bold text-lg text-slate-700 dark:text-slate-300">
                                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(summary.totalCost)}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Total Revenue</span>
                            <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(summary.totalRevenue)}
                            </span>
                        </div>
                        <div>
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Total Profit</span>
                            <span className="font-bold text-lg text-green-600 dark:text-green-400">
                                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(summary.totalProfit)}
                            </span>
                        </div>
                    </div>
                    <div className="text-muted-foreground text-xs">
                        Based on {summary.totalBookings} records
                    </div>
                </div>
            </div>
        </div>
    )
}
