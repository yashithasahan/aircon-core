'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AgentPerformance } from "./actions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function AgentTab({ data }: { data: AgentPerformance[] }) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value)

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Agent Performance & Due Reports</CardTitle>
                <CardDescription>
                    Overview of agent bookings and outstanding balances.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Agent Name</TableHead>
                            <TableHead className="text-right">Total Bookings</TableHead>
                            <TableHead className="text-right">Total Revenue (Period)</TableHead>
                            <TableHead className="text-right">Total Due (Current Balance)</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((agent) => (
                            <TableRow key={agent.agentId}>
                                <TableCell className="font-medium">{agent.agentName}</TableCell>
                                <TableCell className="text-right">{agent.totalBookings}</TableCell>
                                <TableCell className="text-right">{formatCurrency(agent.totalRevenue)}</TableCell>
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
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No agents found for the selected criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
