import { getBookingTypes } from "../bookings/actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditsView } from "./credits-view";

export default async function PaymentsPage() {
    const bookingTypes = await getBookingTypes();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Payments</h2>
                <p className="text-slate-500">Manage payment methods, transactions, and credit balances.</p>
            </div>

            <Tabs defaultValue="credits" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="credits">Credits & Top-up</TabsTrigger>
                    <TabsTrigger value="methods" disabled>Payment Methods</TabsTrigger>
                </TabsList>
                <TabsContent value="credits" className="space-y-4">
                    <CreditsView bookingTypes={bookingTypes} />
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
