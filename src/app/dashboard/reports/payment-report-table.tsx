
"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"

interface PaymentReportTableProps {
    transactions: any[]
}

export function PaymentReportTable({ transactions }: PaymentReportTableProps) {

    return (
        <Table>
            <TableHeader>
                <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-800 whitespace-nowrap">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                            No transactions found.
                        </TableCell>
                    </TableRow>
                ) : (
                    transactions.map((tx) => (
                        <TableRow key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 border-slate-100 dark:border-slate-800">
                            <TableCell className="whitespace-nowrap">
                                {format(new Date(tx.created_at), "PPP HH:mm")}
                            </TableCell>
                            <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${tx.transaction_type === 'TOPUP' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                        tx.transaction_type === 'BOOKING_DEDUCTION' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                            tx.transaction_type === 'REFUND' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                'bg-slate-100 text-slate-800 border-slate-200'
                                    }`}>
                                    {tx.transaction_type}
                                </span>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate" title={tx.description}>
                                {tx.description}
                            </TableCell>
                            <TableCell>
                                {tx.agent?.name || tx.issued_partner?.name || '-'}
                            </TableCell>
                            <TableCell className={`text-right font-mono font-medium ${tx.transaction_type === 'TOPUP' || tx.transaction_type === 'REFUND' ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                {Number(tx.amount).toFixed(2)}
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    )
}
