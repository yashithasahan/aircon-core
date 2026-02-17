"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import * as XLSX from "xlsx"
import { getBookings, BookingFilters, getTicketReport } from "@/app/dashboard/bookings/actions"
import { format } from "date-fns"
import { toast } from "sonner"

interface ExportButtonProps {
    filters: BookingFilters
}

export function ExportButton({ filters }: ExportButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        try {
            setLoading(true)

            // Fetch ALL data matching filters (no pagination)
            const exportFilters = { ...filters }
            delete exportFilters.page
            delete exportFilters.limit

            // We need to request a reasonable limit or modify server action to allow unlimited. 
            // getBookings/getTicketReport applies pagination only if page AND limit are present.
            // So if we delete them, it should return all.

            const { data } = await getTicketReport(exportFilters)

            if (!data || data.length === 0) {
                toast.error("No data to export")
                return
            }

            // Transform data for Excel
            const excelData = data.map((ticket: any) => ({
                "PNR": ticket.booking?.pnr,
                "Entry Date": ticket.booking?.entry_date ? format(new Date(ticket.booking.entry_date), 'yyyy-MM-dd') : '',
                "Passenger": `${ticket.title || ''} ${ticket.first_name || ''} ${ticket.surname || ''}`.trim(),
                "Ticket Number": ticket.ticket_number,
                "Status": ticket.ticket_status,
                "Airline": ticket.booking?.airline,
                "Route": ticket.booking?.origin && ticket.booking?.destination ? `${ticket.booking.origin} - ${ticket.booking.destination}` : '',
                "Cost": Number(ticket.cost_price || 0),
                "Selling Price": Number(ticket.sale_price || 0),
                "Profit": (Number(ticket.sale_price || 0) - Number(ticket.cost_price || 0)),
                "Platform": ticket.booking?.platform,
                "Issued Partner": ticket.booking?.issued_partner?.name || '-',
                "Agent": ticket.booking?.agent?.name || '-',
                "Booking Source": ticket.booking?.booking_source
            }))

            const worksheet = XLSX.utils.json_to_sheet(excelData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Export")

            const filename = `Ticket_Export_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`
            XLSX.writeFile(workbook, filename)

            toast.success("Report exported successfully")
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
            Export to Excel
        </Button>
    )
}
