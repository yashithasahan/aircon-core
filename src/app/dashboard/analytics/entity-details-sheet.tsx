
'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../../components/ui/sheet"
import { EntityAnalytics, getEntityAnalytics } from "./actions"
import { useEffect, useState } from "react"
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { TransactionHistoryModal } from "../payments/transaction-history-modal"
import { Button } from "@/components/ui/button"

type EntityDetailsSheetProps = {
    isOpen: boolean
    onClose: () => void
    entityId: string
    entityName: string
    entityType: 'AGENT' | 'ISSUED_PARTNER'
    filters: any
    currentBalance: number
}

export function EntityDetailsSheet({
    isOpen,
    onClose,
    entityId,
    entityName,
    entityType,
    filters,
    currentBalance
}: EntityDetailsSheetProps) {
    const [analytics, setAnalytics] = useState<EntityAnalytics | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen && entityId) {
            setLoading(true)
            getEntityAnalytics(entityId, entityType, filters as any)
                .then(setAnalytics)
                .finally(() => setLoading(false))
        }
    }, [isOpen, entityId, filters, entityType])

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[800px] sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{entityName}</SheetTitle>
                    <SheetDescription>
                        {entityType === 'AGENT' ? 'Agent' : 'Issued Partner'} Details & Analytics
                    </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-8">
                    {/* Header Metrics */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                            <p className="text-sm font-medium text-slate-500">Current Balance</p>
                            <p className={`text-2xl font-bold ${currentBalance < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(currentBalance)}
                            </p>
                        </div>
                        <div className="flex items-center justify-end">
                            <TransactionHistoryModal
                                id={entityId}
                                name={entityName}
                                type={entityType === 'AGENT' ? 'agent' : 'issued_partner'}
                            >
                                <Button>
                                    View Transaction History
                                </Button>
                            </TransactionHistoryModal>
                        </div>
                    </div>

                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            Loading analytics...
                        </div>
                    ) : analytics ? (
                        <>
                            {/* Airline Distribution */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Airline Distribution</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart layout="vertical" data={analytics.airlineDistribution}>
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                                {analytics.airlineDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Booking Trend */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Booking Trend</h3>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.monthlyTrend}>
                                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#82ca9d" name="Bookings" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>

            </SheetContent>
        </Sheet>
    )
}
