import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getPassengers } from "./actions";
import { Passenger } from "@/types";
import { CreatePassengerDialog } from "@/components/passengers/create-passenger-dialog";
import { DeleteButton } from "@/components/ui/delete-button";
import { deletePassenger } from "./actions";

export default async function PassengersPage() {
    const passengers = await getPassengers();

    return (
        <div className="container mx-auto py-10">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Passengers</CardTitle>
                        <CardDescription>
                            Manage your passengers list.
                        </CardDescription>
                    </div>
                    <CreatePassengerDialog />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Passport</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="text-right">Created</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {passengers.map((pax, index) => (
                                <TableRow key={pax.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-100 dark:border-slate-800">
                                    <TableCell className="font-mono text-xs text-slate-500">{index + 1}</TableCell>
                                    <TableCell className="font-medium">{pax.name}</TableCell>
                                    <TableCell>{pax.passport_number || '-'}</TableCell>
                                    <TableCell>{pax.contact_info || '-'}</TableCell>
                                    <TableCell className="text-right text-xs text-slate-500">
                                        {new Date(pax.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <DeleteButton id={pax.id} onDelete={deletePassenger} itemName="Passenger" />
                                    </TableCell>
                                </TableRow>
                            ))}
                            {passengers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                        No passengers found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
