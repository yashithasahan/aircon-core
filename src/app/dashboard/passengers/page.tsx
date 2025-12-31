"use client"

import { useState } from "react"
import { Plus, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PassengerForm } from "@/components/passengers/passenger-form"
import { cn } from "@/lib/utils"

// Mock Data
const initialPassengers = [
    { id: "1", date: "2024-01-02", paxName: "PERERA/ABINGE ANUSHA D MRS", pnr: "TI2LQA", tkt: "157-2092896446", dep: "2024-01-04", ret: "ONEWAY", airline: "QR", fare: 511.38, selling: 515.00, profit: 3.62 },
    { id: "2", date: "2024-01-02", paxName: "ROWEL/WARNAKULA ROHISHI T MISS", pnr: "TI2LQA", tkt: "157-2092896447", dep: "2024-01-04", ret: "ONEWAY", airline: "QR", fare: 511.38, selling: 515.00, profit: 3.62 },
    { id: "3", date: "2024-01-05", paxName: "SILVA JOSEPH CHRISTOPHER", pnr: "R3RZLZ", tkt: "1763573229904", dep: "2024-01-08", ret: "2024-03-31", airline: "EK DRCT", fare: 777.60, selling: 790.00, profit: 12.40 },
]

export default function PassengersPage() {
    const [open, setOpen] = useState(false)
    const [passengers] = useState(initialPassengers)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Passengers</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                    </Button>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button variant="premium" className="gap-2">
                                <Plus className="h-4 w-4" />
                                New Booking
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Booking</DialogTitle>
                                <DialogDescription>
                                    Enter passenger details to create a new record.
                                </DialogDescription>
                            </DialogHeader>
                            <PassengerForm onSubmit={() => setOpen(false)} onCancel={() => setOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input placeholder="Search passengers, PNR..." className="pl-9" />
                </div>
            </div>

            <div className="rounded-md border border-slate-200 shadow-sm bg-white overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Pax Name</TableHead>
                            <TableHead>PNR</TableHead>
                            <TableHead>Tkt No</TableHead>
                            <TableHead>Dep</TableHead>
                            <TableHead>Ret</TableHead>
                            <TableHead>Airline</TableHead>
                            <TableHead className="text-right">Fare</TableHead>
                            <TableHead className="text-right">Selling</TableHead>
                            <TableHead className="text-right font-bold text-emerald-600">Profit</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {passengers.map((pax) => (
                            <TableRow key={pax.id} className="cursor-pointer">
                                <TableCell className="font-medium text-slate-600">{pax.date}</TableCell>
                                <TableCell className="font-medium text-slate-900 uppercase">{pax.paxName}</TableCell>
                                <TableCell className="text-blue-600 font-mono">{pax.pnr}</TableCell>
                                <TableCell className="text-slate-500 text-xs">{pax.tkt}</TableCell>
                                <TableCell>{pax.dep}</TableCell>
                                <TableCell>{pax.ret}</TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2">
                                        {pax.airline}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right font-mono">€{pax.fare.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono">€{pax.selling.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-mono font-bold text-emerald-600 bg-emerald-50/50">
                                    €{pax.profit.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableCaption>A list of recent bookings.</TableCaption>
                </Table>
            </div>
        </div>
    )
}
