import { getBookingTypes } from "../bookings/actions";
import { getAgentsWithBalance } from "./actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BalanceCardsView } from "./credits-view";

export default async function PaymentsPage() {
    const bookingTypes = await getBookingTypes();
    const agents = await getAgentsWithBalance();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Payments</h2>
                <p className="text-slate-500">Manage balances for Issuing Partners and Agents.</p>
            </div>

            <Tabs defaultValue="issuing_partners" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="issuing_partners">Issuing Partners</TabsTrigger>
                    <TabsTrigger value="agents">Agents</TabsTrigger>
                    <TabsTrigger value="methods" disabled>Payment Methods</TabsTrigger>
                </TabsList>

                <TabsContent value="issuing_partners" className="space-y-4">
                    <BalanceCardsView
                        items={bookingTypes}
                        type="booking_type"
                        buttonLabel="Top Up"
                    />
                </TabsContent>

                <TabsContent value="agents" className="space-y-4">
                    <BalanceCardsView
                        items={agents}
                        type="agent"
                        buttonLabel="Add Payment"
                    />
                </TabsContent>

                <TabsContent value="methods">
                    <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed">
                        <p className="text-muted-foreground">Payment methods configuration coming soon.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
