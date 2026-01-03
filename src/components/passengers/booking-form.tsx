"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBooking, createAgent, createBookingType } from "@/app/dashboard/bookings/actions"
import { createPassenger } from "@/app/dashboard/passengers/actions"
import { BookingFormData, Passenger, Agent, BookingType } from "@/types"
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

export function BookingForm({ passengers, agents = [], bookingTypes = [] }: { passengers: Passenger[], agents?: Agent[], bookingTypes?: BookingType[] }) {
    const [loading, setLoading] = useState(false)
    const [openCombobox, setOpenCombobox] = useState(false)
    const [selectedPaxId, setSelectedPaxId] = useState("")

    // Agent & Booking Type State
    const [openAgentCombobox, setOpenAgentCombobox] = useState(false)
    const [selectedAgentId, setSelectedAgentId] = useState("")
    const [openTypeCombobox, setOpenTypeCombobox] = useState(false)
    const [selectedTypeId, setSelectedTypeId] = useState("")

    // New create states
    const [newAgentOpen, setNewAgentOpen] = useState(false)
    const [newAgentName, setNewAgentName] = useState("")
    const [newTypeOpen, setNewTypeOpen] = useState(false)
    const [newTypeName, setNewTypeName] = useState("")

    // Passenger Fields State
    const [paxTitle, setPaxTitle] = useState("")
    const [paxSurname, setPaxSurname] = useState("")
    const [paxFirstName, setPaxFirstName] = useState("")
    const [paxContact, setPaxContact] = useState("")

    // Auto-fill when passenger selected
    useEffect(() => {
        if (selectedPaxId) {
            const pax = passengers.find(p => p.id === selectedPaxId)
            if (pax) {
                setPaxTitle(pax.title || "")
                setPaxSurname(pax.surname || "")
                setPaxFirstName(pax.first_name || "")
                setPaxContact(pax.contact_info || "")
            }
        }
    }, [selectedPaxId, passengers])

    async function handleCreateAgent() {
        if (!newAgentName) return;
        const res = await createAgent(newAgentName);
        if (res?.data) {
            setNewAgentOpen(false);
            setNewAgentName("");
            window.location.reload();
        }
    }

    async function handleCreateBookingType() {
        if (!newTypeName) return;
        const res = await createBookingType(newTypeName);
        if (res?.data) {
            setNewTypeOpen(false);
            setNewTypeName("");
            window.location.reload();
        }
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)

        let finalPaxId = selectedPaxId

        // If no passenger selected, try to create one from inline fields
        if (!finalPaxId) {
            if (paxSurname && paxFirstName) {
                const newPaxData = new FormData()
                newPaxData.append("title", paxTitle)
                newPaxData.append("surname", paxSurname)
                newPaxData.append("first_name", paxFirstName)
                newPaxData.append("contact_info", paxContact)
                newPaxData.append("phone_number", formData.get("phone_number") as string)

                const res = await createPassenger(newPaxData)
                if (res?.data) {
                    finalPaxId = res.data.id
                } else {
                    alert("Failed to create new passenger. Please check fields.")
                    setLoading(false)
                    return
                }
            } else {
                alert("Please select a passenger or fill in Surname and First Name")
                setLoading(false)
                return
            }
        }

        const selectedPax = passengers.find(p => p.id === finalPaxId);
        // If we just created one, we might not have it in 'passengers' array yet, so name might be fallback
        const derivedName = selectedPax ? selectedPax.name : `${paxTitle} ${paxSurname} ${paxFirstName}`.trim()

        const rawData: BookingFormData = {
            entry_date: formData.get("entry_date") as string,
            pax_name: derivedName,
            passenger_id: finalPaxId,
            pnr: formData.get("pnr") as string,
            ticket_number: formData.get("ticket_number") as string,
            departure_date: formData.get("departure_date") as string,
            return_date: formData.get("return_date") as string,
            airline: formData.get("airline") as string,
            fare: Number(formData.get("fare")),
            selling_price: Number(formData.get("selling_price")),
            payment_status: "PENDING", // Keep default or specific logic

            // New Mapped Fields
            ticket_status: formData.get("ticket_status") as 'PENDING' | 'ISSUED',
            ticket_issued_date: formData.get("ticket_issued_date") as string,
            advance_payment: Number(formData.get("advance_payment") || 0),
            platform: formData.get("platform") as string,

            origin: formData.get("origin") as string,
            destination: formData.get("destination") as string,
            agent_id: selectedAgentId,
            booking_type_id: selectedTypeId,
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
                    <Label htmlFor="ticket_status">Ticket Status</Label>
                    <select name="ticket_status" id="ticket_status" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                        <option value="PENDING">Pending</option>
                        <option value="ISSUED">Issued</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="ticket_issued_date">Ticket Issued Date</Label>
                    <Input id="ticket_issued_date" name="ticket_issued_date" type="date" />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input id="platform" name="platform" placeholder="e.g. GDS, Web" />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <Label htmlFor="airline">Airline</Label>
                <Input id="airline" name="airline" placeholder="EK" required />
            </div>

            {/* Passenger Section */}
            <div className="p-4 border rounded-lg space-y-4 bg-slate-50 dark:bg-slate-900/50">
                <div className="flex flex-col gap-2">
                    <Label>Select Existing Passenger (Optional)</Label>
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
                                    : "Select passenger to auto-fill..."}
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
                                                    if (p.id === selectedPaxId) {
                                                        setSelectedPaxId("")
                                                        setPaxTitle("")
                                                        setPaxSurname("")
                                                        setPaxFirstName("")
                                                        setPaxContact("")
                                                    } else {
                                                        setSelectedPaxId(p.id)
                                                    }
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
                </div>

                <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-2 col-span-1">
                        <Label>Title</Label>
                        <Input
                            placeholder="MR"
                            value={paxTitle}
                            onChange={(e) => {
                                setPaxTitle(e.target.value.toUpperCase())
                                if (selectedPaxId) setSelectedPaxId("")
                            }}
                        />
                    </div>
                    <div className="space-y-2 col-span-3">
                        <Label>Surname</Label>
                        <Input
                            placeholder="DOE"
                            value={paxSurname}
                            onChange={(e) => {
                                setPaxSurname(e.target.value.toUpperCase())
                                if (selectedPaxId) setSelectedPaxId("")
                            }}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input
                        placeholder="JOHN"
                        value={paxFirstName}
                        onChange={(e) => {
                            setPaxFirstName(e.target.value.toUpperCase())
                            if (selectedPaxId) setSelectedPaxId("")
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Contact (Email)</Label>
                    <Input
                        placeholder="email@example.com"
                        value={paxContact}
                        name="contact_info"
                        onChange={(e) => {
                            setPaxContact(e.target.value)
                            if (selectedPaxId) setSelectedPaxId("")
                        }}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                        name="phone_number"
                        placeholder="+971..."
                    />
                </div>
            </div>

            {/* Agent and Booking Type */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label>Agent</Label>
                    <div className="flex gap-2">
                        <Popover open={openAgentCombobox} onOpenChange={setOpenAgentCombobox}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openAgentCombobox} className="w-full justify-between">
                                    {selectedAgentId ? agents.find((a) => a.id === selectedAgentId)?.name : "Select agent..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search agent..." />
                                    <CommandList>
                                        <CommandEmpty>No agent found.</CommandEmpty>
                                        <CommandGroup>
                                            {agents.map((a) => (
                                                <CommandItem key={a.id} value={a.name} onSelect={() => { setSelectedAgentId(a.id === selectedAgentId ? "" : a.id); setOpenAgentCombobox(false) }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedAgentId === a.id ? "opacity-100" : "opacity-0")} />
                                                    {a.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Dialog open={newAgentOpen} onOpenChange={setNewAgentOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="icon" type="button"><Plus className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add New Agent</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Agent Name</Label>
                                        <Input value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} />
                                    </div>
                                    <Button onClick={handleCreateAgent} type="button" className="w-full">Create</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Label>Booking Type</Label>
                    <div className="flex gap-2">
                        <Popover open={openTypeCombobox} onOpenChange={setOpenTypeCombobox}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={openTypeCombobox} className="w-full justify-between">
                                    {selectedTypeId ? bookingTypes.find((t) => t.id === selectedTypeId)?.name : "Select type..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search type..." />
                                    <CommandList>
                                        <CommandEmpty>No type found.</CommandEmpty>
                                        <CommandGroup>
                                            {bookingTypes.map((t) => (
                                                <CommandItem key={t.id} value={t.name} onSelect={() => { setSelectedTypeId(t.id === selectedTypeId ? "" : t.id); setOpenTypeCombobox(false) }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedTypeId === t.id ? "opacity-100" : "opacity-0")} />
                                                    {t.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <Dialog open={newTypeOpen} onOpenChange={setNewTypeOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="icon" type="button"><Plus className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Booking Type</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Type Name</Label>
                                        <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} />
                                    </div>
                                    <Button onClick={handleCreateBookingType} type="button" className="w-full">Create</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Origin & Destination */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="origin">From (Origin)</Label>
                    <Input id="origin" name="origin" placeholder="DXB" />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="destination">To (Destination)</Label>
                    <Input id="destination" name="destination" placeholder="LHR" />
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

            {/* Advance Payment & Profit (Calculated visually or just inputs) */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="advance_payment">Advance Payment</Label>
                    <Input id="advance_payment" name="advance_payment" type="number" step="0.01" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-2">
                    <Label>Profit (Calculated)</Label>
                    <Input disabled placeholder="Auto-calculated" className="bg-slate-100 dark:bg-slate-800" />
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
