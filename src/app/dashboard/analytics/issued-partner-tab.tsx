'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IssuedPartnerPerformance } from "./actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { EntityDetailsSheet } from "./entity-details-sheet"
import { useState } from "react"
import { AnalyticsFilters } from "./analytics-filters"
import { IssuedPartner, Agent } from "@/types"

export function IssuedPartnerTab({ data, filters = {}, issuedPartners = [] }: { data: IssuedPartnerPerformance[], filters?: any, issuedPartners?: IssuedPartner[] }) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value)

    const [selectedPartner, setSelectedPartner] = useState<IssuedPartnerPerformance | null>(null)

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Data for charts
    const topByVolume = [...data].sort((a, b) => b.totalBookings - a.totalBookings).slice(0, 5)

    // Pie Chart Data (Cost Distribution)
    // Group small values into "Others"
    const costData = [...data].sort((a, b) => b.totalCost - a.totalCost)
    const pieData = costData.slice(0, 4).map(d => ({ name: d.partnerName, value: d.totalCost }))
    const othersCost = costData.slice(4).reduce((sum, d) => sum + d.totalCost, 0)
    if (othersCost > 0) {
        pieData.push({ name: 'Others', value: othersCost })
    }

    return (
        <div className="space-y-6">
            <AnalyticsFilters
                agents={[]} // Not needed
                issuedPartners={issuedPartners}
                showAgentFilter={false}
                showIssuedPartnerFilter={true}
            />

            <div className="grid gap-4 md:grid-cols-2">
                {/* Cost Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle>Cost Distribution</CardTitle>
                        <CardDescription>Share of total spend by Issuing Partner.</CardDescription>
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

                {/* Top Partners by Volume */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Partners (Volume)</CardTitle>
                        <CardDescription>Partners with highest booking volume.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={topByVolume}>
                                    <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="partnerName" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                    <Tooltip />
                                    <Bar dataKey="totalBookings" fill="#82ca9d" radius={[0, 4, 4, 0]} name="Bookings" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Issued Partner Performance</CardTitle>
                    <CardDescription>
                        Overview of partner spend and current balances.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Partner Name</TableHead>
                                <TableHead className="text-right">Total Bookings</TableHead>
                                <TableHead className="text-right">Total Cost (Period)</TableHead>
                                <TableHead className="text-right">Our Balance</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((partner) => (
                                <TableRow
                                    key={partner.partnerId}
                                    className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    onClick={() => setSelectedPartner(partner)}
                                >
                                    <TableCell className="font-medium">{partner.partnerName}</TableCell>
                                    <TableCell className="text-right">{partner.totalBookings}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(partner.totalCost)}</TableCell>
                                    <TableCell className={`text-right font-bold ${partner.currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatCurrency(partner.currentBalance)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {/* Logic: Negative Balance means we OWE them (BAD/Warning), Positive means we have credit (GOOD)? 
                                            Wait, "Balance" logic usually: 
                                            Debit (Charge) -> Reduces Balance. 
                                            If Balance starts at 0, Purchase of 100 -> Balance -100 (We owe 100).
                                            So Negative = Debt. Positive = Prepaid Credit.
                                        */}
                                        {partner.currentBalance < -1000 ? (
                                            <Badge variant="destructive">High Debt</Badge>
                                        ) : partner.currentBalance < 0 ? (
                                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">Owe Money</Badge>
                                        ) : (
                                            <Badge variant="outline" className="border-green-500 text-green-600">Credit Available</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No partners found for the selected criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedPartner && (
                <EntityDetailsSheet
                    isOpen={!!selectedPartner}
                    onClose={() => setSelectedPartner(null)}
                    entityId={selectedPartner.partnerId}
                    entityName={selectedPartner.partnerName}
                    entityType="ISSUED_PARTNER"
                    filters={filters}
                    currentBalance={selectedPartner.currentBalance}
                />
            )}
        </div>
    )
}
