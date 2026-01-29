"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import * as XLSX from "xlsx"
import { getBookings, BookingFilters } from "@/app/dashboard/bookings/actions"
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
            // Current implementation of getBookings applies pagination only if page AND limit are present.
            // So if we delete them, it should return all.

            const { data } = await getBookings(exportFilters)

            if (!data || data.length === 0) {
                toast.error("No data to export")
                return
            }

            // Transform data for Excel
            const excelData = data.map((booking: any) => ({
                "PNR": booking.pnr,
                "Entry Date": booking.entry_date,
                "Passenger": booking.pax_name,
                "Airline": booking.airline,
                "Ticket Number": booking.ticket_number,
                "Status": booking.ticket_status,
                "Platform": booking.platform,
                "Type": booking.booking_type?.name || '-',
                "Agent": booking.agent?.name || '-',
                "Fare": booking.fare,
                "Selling Price": booking.selling_price,
                "Profit": booking.profit
            }))

            const worksheet = XLSX.utils.json_to_sheet(excelData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reports")

            const filename = `Report_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`
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
