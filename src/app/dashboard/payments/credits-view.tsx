"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TopUpModal } from "./top-up-modal";
import { TransactionHistoryModal } from "./transaction-history-modal";

interface BalanceCardsViewProps {
    items: any[]
    type: 'issued_partner' | 'agent'
    buttonLabel?: string
    emptyMessage?: string
    comingSoon?: boolean // If true, disable transaction history or similar
}

export function BalanceCardsView({ items, type, buttonLabel = "Top Up" }: BalanceCardsViewProps) {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item: any) => (
                    <Card key={item.id} className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xl font-bold">{item.name}</CardTitle>
                            <TopUpModal
                                id={item.id}
                                name={item.name}
                                type={type}
                                buttonLabel={buttonLabel}
                            />
                        </CardHeader>
                        <CardContent className="p-0">
                            <TransactionHistoryModal id={item.id} name={item.name} type={type}>
                                <div className="p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="mt-0">
                                        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Balance</div>
                                        {type === 'agent' ? (
                                            <div className={`text-3xl font-bold ${Number(item.balance) < 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {Number(item.balance) < 0 ? '+' : '-'}€{Math.abs(Number(item.balance)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        ) : (
                                            <div className={`text-3xl font-bold ${Number(item.balance) < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                €{Number(item.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Issued Today</span>
                                            <span className="font-medium">{item.daily_ticket_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </TransactionHistoryModal>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>History of payments and deductions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground p-4 text-center">Select a source above to view detailed history (Coming Soon)</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
