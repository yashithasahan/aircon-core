'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'

export interface TicketReportRow {
    id: string;
    booking_id: string;
    ticket_number: string;
    ticket_status: string;
    pax_type: string;
    title: string;
    first_name: string;
    surname: string;
    cost_price: number;
    sale_price: number;
    booking: {
        pnr: string;
        entry_date: string;
        airline: string;
        booking_source: string;
        platform: string;
        agent: { name: string } | null;
        issued_partner: { name: string } | null;
        booking_type?: string;
        parent_booking_id?: string;
    }
}

interface ReportsTableProps {
    tickets: TicketReportRow[]
}

export function ReportsTable({ tickets }: ReportsTableProps) {
    const router = useRouter()

    const getStatusColor = (status: string) => {
        const s = status?.toUpperCase() || '';
        switch (s) {
            case 'ISSUED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'VOID': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            case 'REFUNDED': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
            case 'REISSUE': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
            case 'CANCELED': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
            default: return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
        }
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-800 whitespace-nowrap">
                    <TableHead>PNR</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Passenger Name</TableHead>
                    <TableHead>Ticket No</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Airline</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Selling</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tickets.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={11} className="text-center py-10 text-slate-500">
                            No tickets found for the selected filters.
                        </TableCell>
                    </TableRow>
                ) : (
                    tickets.map((ticket) => {
                        const cost = Number(ticket.cost_price) || 0;
                        const sell = Number(ticket.sale_price) || 0;
                        const profit = sell - cost;
                        // For VOID, profit is effectively 0 if cost/sell are disregarded, but usually cost=0 sell=0 for VOID.
                        // Assuming data is correct.

                        return (
                            <TableRow
                                key={ticket.id}
                                className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-800"
                                onClick={() => router.push(`/dashboard/bookings/${ticket.booking_id}`)}
                            >
                                <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                    {ticket.booking?.pnr}
                                </TableCell>
                                <TableCell className="text-slate-500">{new Date(ticket.booking?.entry_date).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span className="truncate max-w-[180px]" title={`${ticket.title || ''} ${ticket.first_name || ''} ${ticket.surname || ''}`}>
                                            {ticket.title} {ticket.first_name} {ticket.surname}
                                        </span>
                                        <span className="text-xs text-slate-400">{ticket.pax_type}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-500 font-mono text-xs">{ticket.ticket_number || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`font-normal ${getStatusColor(ticket.ticket_status)}`}>
                                        {ticket.ticket_status || 'PENDING'}
                                    </Badge>
                                    {(ticket.booking?.booking_type === 'REISSUE' || !!ticket.booking?.parent_booking_id) && (
                                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0 h-5 bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                            Reissue
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-slate-500">{ticket.booking?.issued_partner?.name || '-'}</TableCell>
                                <TableCell className="text-slate-500">{ticket.booking?.platform || '-'}</TableCell>
                                <TableCell className="text-slate-500">{ticket.booking?.airline || '-'}</TableCell>
                                <TableCell className="text-right font-mono text-slate-600 dark:text-slate-400">
                                    {cost.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {sell.toFixed(2)}
                                </TableCell>
                                <TableCell className={`text-right font-mono font-medium ${profit >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-400'}`}>
                                    {profit.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        )
                    })
                )}
            </TableBody>
        </Table>
    )
}
