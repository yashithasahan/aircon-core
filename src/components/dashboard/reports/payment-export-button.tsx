
"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import * as XLSX from "xlsx"
import { getPaymentReport } from "@/app/dashboard/analytics/actions"
import { format } from "date-fns"
import { toast } from "sonner"
import { BookingFilters } from "@/app/dashboard/bookings/actions"

interface PaymentExportButtonProps {
    filters: BookingFilters
}

export function PaymentExportButton({ filters }: PaymentExportButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        try {
            setLoading(true)

            // Determine entity type based on filters (or default to Agent if mixed? usually payment report requires type)
            // But here we might want ALL. getPaymentReport requires type.
            // We might need to fetch twice if user wants ALL (both types).
            // Or update getPaymentReport to accept 'ALL'.
            // For now, let's assume 'AGENT' if agentId is set or nothing set, and 'ISSUED_PARTNER' if partner set?
            // User requested "by the agent OR issued partner".

            // Let's try to fetch both and merge if filters are loose.
            const fetchAgents = !filters.issuedPartnerId || filters.agentId;
            const fetchPartners = !filters.agentId || filters.issuedPartnerId;

            let allTransactions: any[] = [];

            if (fetchAgents) {
                const results = await getPaymentReport(filters, 'AGENT');
                allTransactions = [...allTransactions, ...results.transactions.map((t: any) => ({ ...t, _entityType: 'AGENT' }))];
            }

            if (fetchPartners) {
                // Only run if not strictly filtering for Agents
                // If filters.issuedPartnerId is set, fetchAgents is false (unless agentId also set, which is weird)
                const results = await getPaymentReport(filters, 'ISSUED_PARTNER');
                allTransactions = [...allTransactions, ...results.transactions.map((t: any) => ({ ...t, _entityType: 'ISSUED_PARTNER' }))];
            }

            if (allTransactions.length === 0) {
                toast.error("No transactions to export")
                return
            }

            // Sort by date desc
            allTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Transform data for Excel
            const excelData = allTransactions.map((tx: any) => ({
                "Date": format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm'),
                "Type": tx.transaction_type,
                "Description": tx.description,
                "Amount": Number(tx.amount || 0),
                "Entity Type": tx._entityType,
                "Entity Name": tx.agent?.name || tx.issued_partner?.name || '-',
                "Reference": tx.reference_id || ''
            }))

            const worksheet = XLSX.utils.json_to_sheet(excelData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Payments")

            const filename = `Payment_Export_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`
            XLSX.writeFile(workbook, filename)

            toast.success("Payment report exported successfully")
        } catch (error) {
            console.error("Export failed", error)
            toast.error("Failed to export report")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading}
            className="gap-2"
        >
            {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            Export Payments
        </Button>
    )
}
