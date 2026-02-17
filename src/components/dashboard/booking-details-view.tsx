'use client'

import { useState } from 'react'
import { Booking, BookingHistory, PassengerDetail } from '@/types'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Pencil, Link } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { BookingForm } from "@/components/passengers/booking-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Agent, IssuedPartner, Platform } from "@/types"

interface LinkedBookingSummary {
    id: string;
    pnr: string;
    ticket_status: string;
    airline: string;
    booking_source: string;
    created_at: string;
    fare?: number;
    selling_price?: number;
}

interface BookingDetailsViewProps {
    booking: Booking;
    history: BookingHistory[];
    agents?: Agent[];
    issuedPartners?: IssuedPartner[];
    platforms?: Platform[];
    linkedBookings?: {
        parent: LinkedBookingSummary | null;
        children: LinkedBookingSummary[];
    }
}

export function BookingDetailsView({ booking, history, agents, issuedPartners, platforms, linkedBookings = { parent: null, children: [] } }: BookingDetailsViewProps) {
    const router = useRouter()
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isReissueOpen, setIsReissueOpen] = useState(false)

    // Calculate Totals (Net after refunds)
    const totalFare = booking.fare || 0;
    const totalSelling = booking.selling_price || 0;

    const refundPartner = booking.actual_refund_amount || 0;
    const refundCustomer = booking.customer_refund_amount || 0;

    const netCost = totalFare - refundPartner;
    const netSelling = totalSelling - refundCustomer;
    const netProfit = netSelling - netCost;

    // Helper for Status Color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ISSUED': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
            case 'VOID': return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
            case 'REFUNDED': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800';
            case 'CANCELED': return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
            default: return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
        }
    }

    return (
        <div className="space-y-6">
            {/* Header / Nav */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Booking {booking.pnr}</h1>
                        <Badge variant="outline" className={getStatusColor(booking.ticket_status || 'PENDING')}>
                            {booking.ticket_status || 'PENDING'}
                        </Badge>
                    </div>
                    <p className="text-slate-500 text-sm">Created on {new Date(booking.entry_date).toLocaleDateString()}</p>
                </div>
                <Button onClick={() => setIsEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Booking
                </Button>
                <Button variant="secondary" onClick={() => setIsReissueOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Reissue
                </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Net Cost</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{netCost.toFixed(2)}</div>
                        {refundPartner > 0 && <p className="text-xs text-red-500 mt-1">(-{refundPartner.toFixed(2)} Refund)</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Net Selling</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{netSelling.toFixed(2)}</div>
                        {refundCustomer > 0 && <p className="text-xs text-red-500 mt-1">(-{refundCustomer.toFixed(2)} Refund)</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Net Profit</CardTitle></CardHeader>
                    <CardContent><div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{netProfit.toFixed(2)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Passengers</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{booking.passengers?.length || 0}</div></CardContent>
                </Card>
            </div>

            {/* Reissue Grand Total Summary */}
            {linkedBookings?.parent && (
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                        <Link className="h-4 w-4" /> Account Summary (Total Ticket Value)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <span className="text-xs text-slate-500 uppercase tracking-wider block">Total Cost</span>
                            <span className="text-xl font-bold font-mono">
                                {((Number(linkedBookings.parent.fare) || 0) + totalFare).toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 block mt-1">
                                (Parent: {(Number(linkedBookings.parent.fare) || 0).toFixed(2)} + Reissue: {totalFare.toFixed(2)})
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase tracking-wider block">Total Sell</span>
                            <span className="text-xl font-bold font-mono">
                                {((Number(linkedBookings.parent.selling_price) || 0) + totalSelling).toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-400 block mt-1">
                                (Parent: {(Number(linkedBookings.parent.selling_price) || 0).toFixed(2)} + Reissue: {totalSelling.toFixed(2)})
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500 uppercase tracking-wider block">Total Profit</span>
                            <span className={`text-xl font-bold font-mono ${((Number(linkedBookings.parent.selling_price) || 0) + totalSelling) - ((Number(linkedBookings.parent.fare) || 0) + totalFare) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(((Number(linkedBookings.parent.selling_price) || 0) + totalSelling) - ((Number(linkedBookings.parent.fare) || 0) + totalFare)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm bg-white dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                    <h3 className="font-semibold mb-2">Flight Details</h3>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                        <span className="text-slate-500">Airline:</span> <span>{booking.airline || '-'}</span>
                        <span className="text-slate-500">Route:</span> <span>{booking.origin} - {booking.destination}</span>
                        <span className="text-slate-500">Dept Date:</span> <span>{booking.departure_date}</span>
                        <span className="text-slate-500">Return Date:</span> <span>{booking.return_date || '-'}</span>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Source Info</h3>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                        <span className="text-slate-500">Source:</span> <span>{booking.booking_source}</span>
                        <span className="text-slate-500">Agent:</span> <span>{booking.agent?.name || '-'}</span>
                        <span className="text-slate-500">Platform:</span> <span>{booking.platform || '-'}</span>
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">Issued Partner</h3>
                    <div className="grid grid-cols-[100px_1fr] gap-1">
                        <span className="text-slate-500">Partner:</span> <span>{booking.issued_partner?.name || '-'}</span>
                    </div>
                </div>
            </div>

            {/* Linked Bookings Section */}
            {
                (linkedBookings?.parent || (linkedBookings?.children && linkedBookings.children.length > 0)) && (
                    <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Link className="h-4 w-4 text-blue-500" /> Linked Bookings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Parent Link */}
                                {linkedBookings.parent && (
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-950 p-3 rounded border border-blue-100 dark:border-blue-800">
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Parent</Badge>
                                        <div className="flex-1 grid grid-cols-4 gap-4 text-sm items-center">
                                            <div className="font-medium">{linkedBookings.parent?.pnr}</div>
                                            <div className="text-slate-500">{linkedBookings.parent?.airline}</div>
                                            <div><Badge variant="outline" className={getStatusColor(linkedBookings.parent?.ticket_status || 'PENDING')}>{linkedBookings.parent?.ticket_status}</Badge></div>
                                            <Button variant="link" size="sm" className="justify-self-end" onClick={() => router.push(`/dashboard/bookings/${linkedBookings.parent?.id}`)}>
                                                View Booking
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Children Links */}
                                {linkedBookings.children && linkedBookings.children.length > 0 && (
                                    <div className="space-y-2">
                                        {/* <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reissues / Splits</div> */}
                                        {linkedBookings.children.map(child => (
                                            <div key={child.id} className="flex items-center gap-2 bg-white dark:bg-slate-950 p-3 rounded border border-slate-200 dark:border-slate-800 ml-6 relative">
                                                {/* Visual connection line */}
                                                <div className="absolute -left-4 top-1/2 w-4 h-[1px] bg-slate-300 dark:bg-slate-700"></div>
                                                <div className="absolute -left-4 -top-6 bottom-1/2 w-[1px] bg-slate-300 dark:bg-slate-700"></div>

                                                <Badge variant="outline" className="text-slate-500 border-slate-300">Reissue</Badge>
                                                <div className="flex-1 grid grid-cols-4 gap-4 text-sm items-center">
                                                    <div className="font-medium">{child.pnr}</div>
                                                    <div className="text-slate-500">{child.airline}</div>
                                                    <div><Badge variant="outline" className={getStatusColor(child.ticket_status || 'PENDING')}>{child.ticket_status}</Badge></div>
                                                    <Button variant="link" size="sm" className="justify-self-end" onClick={() => router.push(`/dashboard/bookings/${child.id}`)}>
                                                        View Booking
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            }



            <Tabs defaultValue="tickets" className="w-full">
                <TabsList>
                    <TabsTrigger value="tickets">Tickets ({booking.passengers?.length || 0})</TabsTrigger>
                    <TabsTrigger value="history">History / Changes</TabsTrigger>
                </TabsList>

                {/* Tickets Tab */}
                <TabsContent value="tickets" className="mt-4">
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Passenger Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Ticket No</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    <TableHead className="text-right">Selling</TableHead>
                                    {booking.passengers?.some(p => p.ticket_status === 'REFUNDED') && (
                                        <TableHead className="text-right">Refund</TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {booking.passengers && booking.passengers.length > 0 ? (
                                    booking.passengers.map((pax) => (
                                        <TableRow key={pax.id || Math.random()}>
                                            <TableCell className="font-medium">
                                                {pax.title} {pax.first_name} {pax.surname}
                                            </TableCell>
                                            <TableCell>{pax.pax_type}</TableCell>
                                            <TableCell className="font-mono">{pax.ticket_number}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(pax.ticket_status || booking.ticket_status || 'PENDING')}>
                                                    {pax.ticket_status || booking.ticket_status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{pax.cost_price?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">{pax.sale_price?.toFixed(2)}</TableCell>
                                            {booking.passengers?.some(p => p.ticket_status === 'REFUNDED') && (
                                                <TableCell className="text-right text-red-600">
                                                    {pax.ticket_status === 'REFUNDED' ? (pax.refund_amount_customer || 0).toFixed(2) : '-'}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={booking.passengers?.some(p => p.ticket_status === 'REFUNDED') ? 7 : 6} className="text-center py-8 text-slate-500">No passengers found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>History Log</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history && history.length > 0 ? (
                                    history.map((h) => (
                                        <div key={h.id} className="flex gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                            <div className="text-xs text-slate-500 w-32 shrink-0">
                                                {new Date(h.created_at).toLocaleString()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{h.action}</div>
                                                <div className="text-sm text-slate-500 mt-1">
                                                    Changed from <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{h.previous_status}</span> to <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">{h.new_status}</span>
                                                </div>
                                                {h.details && <div className="text-xs text-slate-400 mt-1">{h.details}</div>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-slate-500">No history recorded yet.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Booking Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Booking</DialogTitle>
                        <DialogDescription>
                            Make changes to the booking details below.
                        </DialogDescription>
                    </DialogHeader>
                    {booking && (
                        <BookingForm
                            passengers={[]} // Pass empty if we don't have global list, or fetch if needed for autocomplete props
                            agents={agents}
                            issuedPartners={issuedPartners}
                            platforms={platforms}
                            initialData={booking}
                            bookingId={booking.id}
                            onSuccess={() => {
                                setIsEditOpen(false);
                                router.refresh(); // Refresh page data
                            }}
                            onCancel={() => setIsEditOpen(false)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Reissue Booking Modal */}
            <Dialog open={isReissueOpen} onOpenChange={setIsReissueOpen}>
                <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Reissue Booking</DialogTitle>
                        <DialogDescription>
                            Create a NEW booking linked to this one. (Reissue / Split)
                        </DialogDescription>
                    </DialogHeader>
                    {booking && (
                        <BookingForm
                            passengers={[]}
                            agents={agents}
                            issuedPartners={issuedPartners}
                            platforms={platforms}
                            // Pre-fill with existing booking data, BUT treated as a NEW booking (no bookingId passed)
                            initialData={{
                                ...booking,
                                id: '', // Force new
                                pnr: booking.pnr, // Keep same PNR by default
                                parent_booking_id: booking.id, // LINK TO PARENT
                                created_at: undefined,
                                ticket_status: 'REISSUE', // Default to REISSUE
                                // Reset Financials
                                fare: 0,
                                selling_price: 0,
                                profit: 0,
                                // Reset Refunds
                                actual_refund_amount: 0,
                                customer_refund_amount: 0,
                                refund_date: undefined,
                                passengers: booking.passengers?.map(p => ({
                                    ...p,
                                    id: undefined, // New passenger records
                                    passenger_id: p.passenger_id, // Keep link to profile
                                    ticket_number: '', // Reset ticket numbers for reissue
                                    cost_price: 0, // Reset financials? Or keep? Reset is safer to avoid double counting if unchanged.
                                    sale_price: 0,
                                    ticket_status: 'REISSUE',
                                    // Reset pax refunds
                                    refund_amount_partner: 0,
                                    refund_amount_customer: 0,
                                    refund_date: undefined
                                })) || []
                            }}
                            onSuccess={() => {
                                setIsReissueOpen(false);
                                router.refresh();
                            }}
                            onCancel={() => setIsReissueOpen(false)}
                            isReissueMode={true}
                            parentBooking={booking}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div >
    )
}
