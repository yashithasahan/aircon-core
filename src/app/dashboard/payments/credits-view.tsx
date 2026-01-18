"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TopUpModal } from "./top-up-modal";

interface CreditsViewProps {
    bookingTypes: any[]
}

export function CreditsView({ bookingTypes }: CreditsViewProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {bookingTypes.map((type: any) => (
                    <Card key={type.id} className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-bold">{type.name}</CardTitle>
                            <TopUpModal bookingTypeId={type.id} bookingTypeName={type.name} />
                        </CardHeader>
                        <CardContent>
                            <div className="mt-4">
                                <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Balance</div>
                                <div className={`text-3xl font-bold ${Number(type.balance) < 500 ? 'text-red-500' : 'text-emerald-600'}`}>
                                    €{Number(type.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Issued Today</span>
                                    <span className="font-medium">{type.daily_ticket_count || 0}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>History of top-ups and deductions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground p-4 text-center">Select a source above to view detailed history (Coming Soon)</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
