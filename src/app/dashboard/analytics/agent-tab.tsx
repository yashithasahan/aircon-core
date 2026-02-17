'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentPerformance } from "./actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { EntityDetailsSheet } from "./entity-details-sheet"
import { useState } from "react"
import { BookingFilters } from "@/components/dashboard/booking-filters"
import { AnalyticsFilters } from "./analytics-filters"
import { Agent } from "@/types"

export function AgentTab({ data, filters = {}, agents = [] }: { data: AgentPerformance[], filters?: any, agents?: Agent[] }) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value)

    const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null)

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Data for charts
    const topByRevenue = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5)

    // Pie Chart Data (Revenue Share)
    const revenueData = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)
    const pieData = revenueData.slice(0, 4).map(d => ({ name: d.agentName, value: d.totalRevenue }))
    const othersRevenue = revenueData.slice(4).reduce((sum, d) => sum + d.totalRevenue, 0)
    if (othersRevenue > 0) {
        pieData.push({ name: 'Others', value: othersRevenue })
    }

    return (
        <div className="space-y-6">
            <AnalyticsFilters
                agents={agents}
                showAgentFilter={true}
                showIssuedPartnerFilter={false}
            />

            <div className="grid gap-4 md:grid-cols-2">
                {/* Revenue Contribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Contribution</CardTitle>
                        <CardDescription>Share of total revenue by Agent.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Agents (Revenue vs Profit) */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Agents Performance</CardTitle>
                        <CardDescription>Revenue vs Profit comparison.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topByRevenue}>
                                    <XAxis dataKey="agentName" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                    <Bar dataKey="totalRevenue" fill="#0088FE" name="Revenue" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="totalProfit" fill="#00C49F" name="Profit" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Agent Performance & Due Reports</CardTitle>
                    <CardDescription>
                        Overview of agent bookings, profit, and outstanding balances.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agent Name</TableHead>
                                <TableHead className="text-right">Total Bookings</TableHead>
                                <TableHead className="text-right">Total Revenue</TableHead>
                                <TableHead className="text-right">Total Profit</TableHead>
                                <TableHead className="text-right">Total Due (Balance)</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((agent) => (
                                <TableRow
                                    key={agent.agentId}
                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={() => setSelectedAgent(agent)}
                                >
                                    <TableCell className="font-medium">{agent.agentName}</TableCell>
                                    <TableCell className="text-right">{agent.totalBookings}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(agent.totalRevenue)}</TableCell>
                                    <TableCell className="text-right text-green-600">{formatCurrency(agent.totalProfit)}</TableCell>
                                    <TableCell className="text-right font-bold text-red-600">
                                        {formatCurrency(agent.totalDue)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {agent.totalDue > 1000 ? (
                                            <Badge variant="destructive">High Due</Badge>
                                        ) : agent.totalDue > 0 ? (
                                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">Outstanding</Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-green-500 text-green-600">Good</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No agents found for the selected criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedAgent && (
                <EntityDetailsSheet
                    isOpen={!!selectedAgent}
                    onClose={() => setSelectedAgent(null)}
                    entityId={selectedAgent.agentId}
                    entityName={selectedAgent.agentName}
                    entityType="AGENT"
                    filters={filters}
                    currentBalance={selectedAgent.totalDue}
                />
            )}
        </div>
    )
}
