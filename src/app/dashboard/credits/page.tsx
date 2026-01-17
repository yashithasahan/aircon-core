import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getBookingTypes } from "../bookings/actions";
import { TopUpModal } from "./top-up-modal";
import { getCreditTransactions } from "./actions";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function CreditsPage() {
    // Fetch booking types (Issued From sources)
    // Note: getBookingTypes currently selects all. It should include 'balance' if the type definition updated matching DB.
    // The previous update to 'BookingType' interface matches DB schema but getBookingTypes query 'select(*)' will fetch all columns including balance.
    // So we just need to use it.

    // We might need to fetch transactions for each? Or just show balance.
    // Let's show a list of Cards for each Source.
    const bookingTypes = await getBookingTypes();

    // Sort by name?
    // bookingTypes is any[]? No, typed in actions.

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Credits & Balances</h2>
                <p className="text-slate-500">Manage balances for ticket issuance sources.</p>
            </div>

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

                            {/* Transactions Preview? */}
                            {/* We can make a separate component to load transactions lazily or just link to details? 
                                For now, Keep it simple.
                            */}
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
                        {/* 
                            Ideally, we want a unified transaction log or per-card. 
                            Implementing a unified log might be heavy if not paginated.
                            I'll leave it as a placeholder or implement if requested.
                            User said "Credits tab where user can top up...". 
                        */}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
