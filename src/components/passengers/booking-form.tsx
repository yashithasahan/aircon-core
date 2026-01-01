"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBooking } from "@/app/dashboard/bookings/actions"
import { createPassenger } from "@/app/dashboard/passengers/actions"
import { BookingFormData, Passenger } from "@/types"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog"

export function BookingForm({ passengers }: { passengers: Passenger[] }) {
    const [loading, setLoading] = useState(false)
    const [openCombobox, setOpenCombobox] = useState(false)
    const [selectedPaxId, setSelectedPaxId] = useState("")

    // New Passenger State
    const [newPaxOpen, setNewPaxOpen] = useState(false)
    const [newPaxName, setNewPaxName] = useState("")

    async function handleCreatePassenger() {
        if (!newPaxName) return;
        const formData = new FormData();
        formData.append("name", newPaxName);

        // Ideally handled by server action completely
        const res = await createPassenger(formData);
        if (res?.data) {
            // Optimistic Update: Add to local list immediately and select
            // We would need to update the local list, but simpler to reload or just mock it for now
            setNewPaxOpen(false);
            setNewPaxName("");
        }
    }


    async function handleSubmit(formData: FormData) {
        if (!selectedPaxId) {
            alert("Please select a passenger");
            return;
        }

        setLoading(true)

        const selectedPax = passengers.find(p => p.id === selectedPaxId);

        const rawData: BookingFormData = {
            entry_date: formData.get("entry_date") as string,
            pax_name: selectedPax ? selectedPax.name : "Unknown", // Fallback, but we use ID mostly
            pnr: formData.get("pnr") as string,
            ticket_number: formData.get("ticket_number") as string,
            departure_date: formData.get("departure_date") as string,
            return_date: formData.get("return_date") as string,
            airline: formData.get("airline") as string,
            fare: Number(formData.get("fare")),
            selling_price: Number(formData.get("selling_price")),
            payment_status: "PENDING",
            passenger_id: selectedPaxId
        }

        try {
            await createBooking(rawData)
            window.location.reload();
        } catch (error) {
            console.error(error)
            alert("Failed to create booking")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form action={handleSubmit} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="entry_date">Booking Date</Label>
                    <Input id="entry_date" name="entry_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="airline">Airline</Label>
                    <Input id="airline" name="airline" placeholder="EK" required />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Label>Passenger</Label>
                <div className="flex gap-2">
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox}
                                className="w-full justify-between"
                            >
                                {selectedPaxId
                                    ? passengers.find((p) => p.id === selectedPaxId)?.name
                                    : "Select passenger..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                            <Command>
                                <CommandInput placeholder="Search passenger..." />
                                <CommandList>
                                    <CommandEmpty>No passenger found.</CommandEmpty>
                                    <CommandGroup>
                                        {passengers.map((p) => (
                                            <CommandItem
                                                key={p.id}
                                                value={p.name}
                                                onSelect={() => {
                                                    setSelectedPaxId(p.id === selectedPaxId ? "" : p.id)
                                                    setOpenCombobox(false)
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedPaxId === p.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {p.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <Dialog open={newPaxOpen} onOpenChange={setNewPaxOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" size="icon" type="button">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Passenger</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        placeholder="SURNAME/NAME"
                                        value={newPaxName}
                                        onChange={(e) => setNewPaxName(e.target.value)}
                                    />
                                </div>
                                <Button onClick={handleCreatePassenger} type="button" className="w-full">Create</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="pnr">PNR</Label>
                    <Input id="pnr" name="pnr" placeholder="ABC123" required />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="ticket_number">Ticket Number</Label>
                    <Input id="ticket_number" name="ticket_number" placeholder="176-..." />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="departure_date">Departure Date</Label>
                    <Input id="departure_date" name="departure_date" type="date" required />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="return_date">Return Date</Label>
                    <Input id="return_date" name="return_date" type="date" placeholder="Leave empty for Oneway" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="fare">Buying Price (Fare)</Label>
                    <Input id="fare" name="fare" type="number" step="0.01" required />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="selling_price">Selling Price</Label>
                    <Input id="selling_price" name="selling_price" type="number" step="0.01" required />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" type="button">Cancel</Button>
                <Button type="submit" variant="premium" disabled={loading}>
                    {loading ? "Saving..." : "Save Booking"}
                </Button>
            </div>
        </form>
    )
}
