"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { cn } from "@/lib/utils"

import { createBooking, createAgent, createIssuedPartner, updateBooking, createPlatform } from "@/app/dashboard/bookings/actions"
import { createPassenger } from "@/app/dashboard/passengers/actions"
import { Passenger, Agent, IssuedPartner, Platform } from "@/types"

// --- Zod Schema ---
const bookingFormSchema = z.object({
    // Passenger - we will handle "new vs existing" logic in submit, but validate fields
    passenger_id: z.string().optional(),
    title: z.string().optional(),
    surname: z.string().optional(),
    first_name: z.string().optional(),
    contact_info: z.string().email("Invalid email").optional().or(z.literal("")),
    phone_number: z.string().optional(),
    passenger_type: z.enum(["ADULT", "CHILD", "INFANT"]),

    // Booking Details
    pnr: z.string().min(1, "PNR is required"),
    entry_date: z.string().min(1, "Booking date is required"),
    airline: z.string().min(1, "Airline is required"),
    ticket_status: z.enum(["PENDING", "ISSUED", "VOID", "REFUNDED", "CANCELED"]),
    ticket_issued_date: z.string().optional(),
    platform: z.string().min(1, "Platform is required"),
    ticket_number: z.string().optional(),

    origin: z.string().optional(),
    destination: z.string().optional(),
    departure_date: z.string().min(1, "Departure date is required"),
    return_date: z.string().optional(),

    // Financials
    fare: z.coerce.number().min(0, "Fare must be positive"),
    selling_price: z.coerce.number().min(0, "Selling price must be positive"),
    advance_payment: z.coerce.number().optional(),

    // Relations
    booking_source: z.enum(["WALK_IN", "FINDYOURFARES", "AGENT"]).default("AGENT"),
    agent_id: z.string().optional(), // validated in superRefine
    issued_partner_id: z.string().min(1, "Issued Partner is required"),

    // Refund (conditional validation is tricky in pure Zod without superRefine, but we can make them optional and check logic)
    refund_date: z.string().optional(),
    actual_refund_amount: z.coerce.number().optional(),
    customer_refund_amount: z.coerce.number().optional(),

    payment_method: z.enum(["Easy Pay", "Credit Card"]).optional(),
    currency: z.enum(["EUR", "LKR"]).default("EUR"),
}).superRefine((data, ctx) => {
    // If ticket status is REFUNDED, require refund date
    if (data.ticket_status === 'REFUNDED' && !data.refund_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Refund date is required when status is Refunded",
            path: ["refund_date"]
        });
    }

    // Validate passenger selection
    if (!data.passenger_id && (!data.surname || !data.first_name)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Select a passenger or enter new passenger details",
            path: ["surname"] // highlight surname 
        });
    }

    // Validate Agent requirement
    if (data.booking_source === 'AGENT' && !data.agent_id) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Agent is required when source is 'Others'",
            path: ["agent_id"]
        });
    }
});

type BookingFormValues = z.infer<typeof bookingFormSchema>

interface BookingFormProps {
    passengers: Passenger[]
    agents?: Agent[]
    issuedPartners?: IssuedPartner[]
    platforms?: Platform[]
    initialData?: any // Can be Booking type but might need reshaping
    bookingId?: string
    onSuccess?: () => void
    onCancel?: () => void
}

export function BookingForm({ passengers, agents = [], issuedPartners = [], platforms = [], initialData, bookingId, onSuccess, onCancel }: BookingFormProps) {
    const [loading, setLoading] = useState(false)
    const [addMoreMode, setAddMoreMode] = useState(false)

    const router = useRouter() // Initialize router

    // UI States for Comboboxes
    const [openPaxCombobox, setOpenPaxCombobox] = useState(false)
    const [openAgentCombobox, setOpenAgentCombobox] = useState(false)
    const [openPartnerCombobox, setOpenPartnerCombobox] = useState(false)
    const [openPlatformCombobox, setOpenPlatformCombobox] = useState(false)

    // New Entity States
    const [newAgentOpen, setNewAgentOpen] = useState(false)
    const [newAgentName, setNewAgentName] = useState("")
    const [newPartnerOpen, setNewPartnerOpen] = useState(false)
    const [newPartnerName, setNewPartnerName] = useState("")
    const [newPlatformOpen, setNewPlatformOpen] = useState(false)
    const [newPlatformName, setNewPlatformName] = useState("")

    // Use ref for immediate state access in onSubmit during form submission
    const addMoreModeRef = useRef(false)

    // Heuristic to parse name if not a linked passenger
    let initialSurname = initialData?.surname || ""
    let initialFirstName = initialData?.first_name || ""
    let initialTitle = initialData?.title || ""

    if (initialData && !initialData.passenger_id && initialData.pax_name) {
        const parts = initialData.pax_name.trim().split(/\s+/)
        if (parts.length > 0) {
            const titles = ['MR', 'MRS', 'MS', 'MSTR', 'MISS', 'DR', 'PROF']
            // Check if first part is a title
            if (titles.includes(parts[0].toUpperCase())) {
                initialTitle = parts[0].toUpperCase()
                parts.shift() // Remove title
            }

            if (parts.length === 1) {
                initialSurname = parts[0]
            } else if (parts.length >= 2) {
                // Assume last part is First Name, rest is Surname (common in airline ticketing: Surname/FirstName or Surname FirstName)
                // But user entered "Title Surname FirstName" in the form originally?
                // Code: `${data.title || ''} ${data.surname} ${data.first_name}`.trim()
                // So "MR DOE JOHN" -> Title=MR, Surname=DOE, FirstName=JOHN

                initialFirstName = parts.pop() || "" // Last part
                initialSurname = parts.join(" ") // Rest is surname
            }
        }
    }

    const defaultValues: Partial<BookingFormValues> = {
        passenger_type: initialData?.passenger_type || "ADULT",
        entry_date: initialData?.entry_date ? initialData.entry_date.split('T')[0] : new Date().toISOString().split('T')[0],
        ticket_status: initialData?.ticket_status || "PENDING",
        fare: initialData?.fare || 0,
        selling_price: initialData?.selling_price || 0,
        passenger_id: initialData?.passenger_id || "",
        surname: initialSurname,
        first_name: initialFirstName,
        title: initialTitle,
        contact_info: initialData?.contact_info || "", // Unlinked pax might lose this if not stored in booking? DB schema check needed. 
        // Note: 'contact_info' (email) and 'phone_number' are not on bookings table, they are on passengers table.
        // So for unlinked passengers, we actually lose contact info unless we saved it to `pax_name` (we didn't) or booking has these columns.
        // Checking createBooking: it saves `pax_name`, `passenger_id`. It does NOT save phone/email to bookings table.
        // So editing unlinked passenger = lost contact info. That's a limitation of current schema.

        phone_number: "", // See above

        pnr: initialData?.pnr || "",
        airline: initialData?.airline || "",
        ticket_number: initialData?.ticket_number || "",
        origin: initialData?.origin || "",
        destination: initialData?.destination || "",
        departure_date: initialData?.departure_date ? initialData.departure_date.split('T')[0] : "",
        return_date: initialData?.return_date ? initialData.return_date.split('T')[0] : "",
        advance_payment: initialData?.advance_payment || 0,

        booking_source: initialData?.booking_source || "AGENT",
        agent_id: initialData?.agent_id || initialData?.agent?.id || "", // agent might be object or id? Types says agent_id.
        issued_partner_id: initialData?.issued_partner_id || initialData?.issued_partner?.id || initialData?.booking_type_id || initialData?.booking_type?.id || "",

        ticket_issued_date: initialData?.ticket_issued_date ? initialData.ticket_issued_date.split('T')[0] : "",
        platform: initialData?.platform || "",

        refund_date: initialData?.refund_date ? initialData.refund_date.split('T')[0] : "",
        actual_refund_amount: initialData?.actual_refund_amount || 0,
        customer_refund_amount: initialData?.customer_refund_amount || 0,
        currency: initialData?.currency || "EUR",
    }

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingFormSchema) as any,
        defaultValues
    })

    const { watch, setValue, reset } = form
    const control = form.control as any
    const selectedPaxId = watch("passenger_id")
    const ticketStatus = watch("ticket_status")
    const fare = watch("fare") || 0
    const sellingPrice = watch("selling_price") || 0
    const advancePayment = watch("advance_payment") || 0
    const profit = sellingPrice - fare

    const bookingSource = watch("booking_source")

    const selectedPartnerId = watch("issued_partner_id")
    const selectedPartner = issuedPartners.find(t => t.id === selectedPartnerId)

    // Auto-fill passenger details
    useEffect(() => {
        if (selectedPaxId) {
            const pax = passengers.find(p => p.id === selectedPaxId)
            if (pax) {
                setValue("title", pax.title || "")
                setValue("surname", pax.surname || "")
                setValue("first_name", pax.first_name || "")
                setValue("contact_info", pax.contact_info || "")
                setValue("phone_number", pax.phone_number || "")
            }
        }
    }, [selectedPaxId, passengers, setValue])

    function handleReset() {
        reset(defaultValues)
    }

    async function handleCreateAgent() {
        if (!newAgentName) return;
        const res = await createAgent(newAgentName);
        if (res?.data) {
            setNewAgentOpen(false);
            setNewAgentName("");
            router.refresh(); // Refresh server components to show new agent
            toast.success("Agent created")
        }
    }

    async function handleCreatePartner() {
        if (!newPartnerName) return;
        const res = await createIssuedPartner(newPartnerName);
        if (res?.data) {
            setNewPartnerOpen(false);
            setNewPartnerName("");
            router.refresh(); // Refresh server components to show new type
            toast.success("Issued Partner created")
        }
    }

    async function handleCreatePlatform() {
        if (!newPlatformName) return;
        const res = await createPlatform(newPlatformName);
        if (res?.data) {
            setNewPlatformOpen(false);
            setNewPlatformName("");
            router.refresh();
            // Also select it immediately? 
            // We can't easily auto-select because the parents pass props. 
            // But router.refresh() will re-render this component with new platforms in prop.
            // Ideally we wait for that or optimistically add it. 
            // For now, let user select it.
            toast.success("Platform created")
        }
    }



    async function onSubmit(data: BookingFormValues) {
        setLoading(true)
        try {
            let finalPaxId = data.passenger_id

            // Create new passenger if needed AND if we are not just keeping existing one
            if (!finalPaxId && (!bookingId)) {
                const newPaxData = new FormData()
                newPaxData.append("title", data.title || "")
                newPaxData.append("surname", data.surname || "")
                newPaxData.append("first_name", data.first_name || "")
                newPaxData.append("contact_info", data.contact_info || "")
                newPaxData.append("phone_number", data.phone_number || "")
                newPaxData.append("passenger_type", data.passenger_type)

                const res = await createPassenger(newPaxData)
                if (res?.data) {
                    finalPaxId = res.data.id
                } else {
                    throw new Error("Failed to create passenger")
                }
            } else if (!finalPaxId && bookingId) {
                // If editing and no passenger selected (maybe unlinked?), we might create one too?
                // For now, let's assume if they input name details on edit, they want to create/update passenger?
                // This gets complex. Let's assume on Edit, we stick with the ID or if they clear it, they create new.
                if (data.surname || data.first_name) {
                    const newPaxData = new FormData()
                    newPaxData.append("title", data.title || "")
                    newPaxData.append("surname", data.surname || "")
                    newPaxData.append("first_name", data.first_name || "")
                    newPaxData.append("contact_info", data.contact_info || "")
                    newPaxData.append("phone_number", data.phone_number || "")
                    newPaxData.append("passenger_type", data.passenger_type)

                    const res = await createPassenger(newPaxData)
                    if (res?.data) {
                        finalPaxId = res.data.id
                    }
                }
            }

            const selectedPax = passengers.find(p => p.id === finalPaxId);
            const derivedName = selectedPax ? selectedPax.name : `${data.title || ''} ${data.surname} ${data.first_name}`.trim()

            const bookingData: any = {
                ...data,
                pax_name: derivedName,
                passenger_id: finalPaxId || null,
                // Ensure numbers are numbers
                fare: Number(data.fare),
                selling_price: Number(data.selling_price),
                advance_payment: Number(data.advance_payment || 0),
                actual_refund_amount: Number(data.actual_refund_amount || 0),
                customer_refund_amount: Number(data.customer_refund_amount || 0),
            }

            if (bookingId) {
                await updateBooking(bookingId, bookingData)
                toast.success("Booking updated successfully")
                router.refresh()
                if (onSuccess) onSuccess()
            } else {
                await createBooking(bookingData)

                if (addMoreModeRef.current) {
                    // Reset passenger fields but keep others
                    setValue("passenger_id", "")
                    setValue("title", "")
                    setValue("surname", "")
                    setValue("first_name", "")
                    setValue("contact_info", "")
                    setValue("phone_number", "")
                    setValue("ticket_number", "") // Typically unique per ticket

                    toast.success("Booking saved! Add the next passenger.")
                } else {
                    handleReset()
                    toast.success("Booking saved successfully")
                    router.refresh()
                    if (onSuccess) onSuccess()
                }
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to save booking. Please check details.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">

                {/* General Details - Row 1 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField<BookingFormValues>
                        control={control}
                        name="pnr"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>PNR (Reference)</FormLabel>
                                <FormControl>
                                    <Input placeholder="ABC1234" {...field} autoFocus />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="entry_date"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Booking Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="airline"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Airline</FormLabel>
                                <FormControl>
                                    <Input placeholder="EK" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="ticket_status"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Ticket Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={!!bookingId}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="ISSUED">Issued</SelectItem>
                                        <SelectItem value="VOID">Void</SelectItem>
                                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Agent & Source - Row 2 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField<BookingFormValues>
                        control={control}
                        name="booking_source"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Booking Source <span className="text-red-500">*</span></FormLabel>
                                <Select onValueChange={field.onChange} value={field.value as string} disabled={!!bookingId}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="WALK_IN">Walk-in</SelectItem>
                                        <SelectItem value="FINDYOURFARES">FindYourFares</SelectItem>
                                        <SelectItem value="AGENT">Others (Agent)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {bookingSource === 'AGENT' && (
                        <FormField<BookingFormValues>
                            control={control}
                            name="agent_id"
                            render={({ field }: { field: any }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Agent <span className="text-red-500">*</span></FormLabel>
                                    <div className="flex gap-2">
                                        <Popover open={openAgentCombobox} onOpenChange={setOpenAgentCombobox}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn(
                                                            "w-full justify-between",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value
                                                            ? agents.find((a) => a.id === field.value)?.name
                                                            : "Select agent..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search agent..." />
                                                    <CommandList>
                                                        <CommandEmpty>No agent found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {agents.map((a) => (
                                                                <CommandItem
                                                                    value={a.name}
                                                                    key={a.id}
                                                                    onSelect={() => {
                                                                        form.setValue("agent_id", a.id)
                                                                        setOpenAgentCombobox(false)
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            "mr-2 h-4 w-4",
                                                                            a.id === field.value ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
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
                                                        <FormLabel>Agent Name</FormLabel>
                                                        <Input value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} />
                                                    </div>
                                                    <Button onClick={handleCreateAgent} type="button" className="w-full">Create</Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    <FormField<BookingFormValues>
                        control={control}
                        name="issued_partner_id"
                        render={({ field }: { field: any }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Issued Partners <span className="text-red-500">*</span></FormLabel>
                                <div className="flex gap-2">
                                    <Popover open={openPartnerCombobox} onOpenChange={setOpenPartnerCombobox}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? issuedPartners.find((t) => t.id === field.value)?.name
                                                        : "Select partner..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search partner..." />
                                                <CommandList>
                                                    <CommandEmpty>No partner found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {issuedPartners.map((t) => (
                                                            <CommandItem
                                                                value={t.name}
                                                                key={t.id}
                                                                onSelect={() => {
                                                                    form.setValue("issued_partner_id", t.id, { shouldValidate: true })
                                                                    setOpenPartnerCombobox(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        t.id === field.value ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                {t.name}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <Dialog open={newPartnerOpen} onOpenChange={setNewPartnerOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary" size="icon" type="button"><Plus className="h-4 w-4" /></Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Add Issued Partner</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <FormLabel>Partner Name</FormLabel>
                                                    <Input value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} />
                                                </div>
                                                <Button onClick={handleCreatePartner} type="button" className="w-full">Create</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {selectedPartner?.name?.trim().toUpperCase() === 'IATA' ? (
                        <FormField<BookingFormValues>
                            control={control}
                            name="payment_method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Payment Method <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value as string}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Easy Pay">Easy Pay</SelectItem>
                                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : <div />}

                    <FormField<BookingFormValues>
                        control={control}
                        name="platform"
                        render={({ field }: { field: any }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Platform <span className="text-red-500">*</span></FormLabel>
                                <div className="flex gap-2">
                                    <Popover open={openPlatformCombobox} onOpenChange={setOpenPlatformCombobox}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? (() => {
                                                            // We store the platform NAME in the DB (text column),
                                                            // but here we are selecting from a list of objects {id, name}.
                                                            // The form schema expects `platform` string (the name).
                                                            // So we match by name.
                                                            return platforms.find((p) => p.name === field.value)?.name || field.value
                                                        })()
                                                        : "Select platform..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[200px] p-0">
                                            <Command>
                                                <CommandInput placeholder="Search platform..." />
                                                <CommandList>
                                                    <CommandEmpty>No platform found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {platforms.map((p) => (
                                                            <CommandItem
                                                                value={p.name}
                                                                key={p.id}
                                                                onSelect={() => {
                                                                    form.setValue("platform", p.name)
                                                                    setOpenPlatformCombobox(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        p.name === field.value ? "opacity-100" : "opacity-0"
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
                                    <Dialog open={newPlatformOpen} onOpenChange={setNewPlatformOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary" size="icon" type="button"><Plus className="h-4 w-4" /></Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader><DialogTitle>Add New Platform</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div className="space-y-2">
                                                    <FormLabel>Platform Name</FormLabel>
                                                    <Input value={newPlatformName} onChange={(e) => setNewPlatformName(e.target.value)} />
                                                </div>
                                                <Button onClick={handleCreatePlatform} type="button" className="w-full">Create</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Dates & Ticket Detail - Row 3 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField<BookingFormValues>
                        control={control}
                        name="ticket_issued_date"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Issued Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="ticket_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ticket Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="176-..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {/* Origin/Dest will be moved here from lower section */}
                </div>

                {ticketStatus === 'REFUNDED' && (
                    <div className="grid grid-cols-3 gap-4 p-4 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/10">
                        <FormField<BookingFormValues>
                            control={control}
                            name="refund_date"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Refund Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField<BookingFormValues>
                            control={control}
                            name="actual_refund_amount"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Actual Refund</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField<BookingFormValues>
                            control={control}
                            name="customer_refund_amount"
                            render={({ field }: { field: any }) => (
                                <FormItem>
                                    <FormLabel>Customer Refund</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                )}

                {/* Passenger - Row 1 Generic */}
                <FormField<BookingFormValues>
                    control={control}
                    name="passenger_id"
                    render={({ field }: { field: any }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Select Existing Passenger (Optional)</FormLabel>
                            <Popover open={openPaxCombobox} onOpenChange={setOpenPaxCombobox}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-full justify-between",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value
                                                ? passengers.find((p) => p.id === field.value)?.name
                                                : "Select passenger to auto-fill..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search passenger..." />
                                        <CommandList>
                                            <CommandEmpty>No passenger found.</CommandEmpty>
                                            <CommandGroup>
                                                {passengers.map((p) => (
                                                    <CommandItem
                                                        value={p.name}
                                                        key={p.id}
                                                        onSelect={() => {
                                                            if (p.id === field.value) {
                                                                form.setValue("passenger_id", "")
                                                                form.setValue("title", "")
                                                                form.setValue("surname", "")
                                                                form.setValue("first_name", "")
                                                            } else {
                                                                form.setValue("passenger_id", p.id)
                                                            }
                                                            setOpenPaxCombobox(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                p.id === field.value ? "opacity-100" : "opacity-0"
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
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Passenger - Row 2 Details (4 Cols) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField<BookingFormValues>
                        control={control}
                        name="title"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="MR" {...field} onChange={e => { field.onChange(e); if (selectedPaxId) form.setValue("passenger_id", "") }} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="first_name"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="JOHN" {...field} onChange={e => { field.onChange(e); if (selectedPaxId) form.setValue("passenger_id", "") }} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="surname"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Surname</FormLabel>
                                <FormControl>
                                    <Input placeholder="DOE" {...field} onChange={e => { field.onChange(e); if (selectedPaxId) form.setValue("passenger_id", "") }} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="passenger_type"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="ADULT" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ADULT">ADULT</SelectItem>
                                        <SelectItem value="CHILD">CHILD</SelectItem>
                                        <SelectItem value="INFANT">INFANT</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Contact Details - Row 3 (New) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField<BookingFormValues>
                        control={control}
                        name="contact_info"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input type="email" placeholder="passenger@example.com" {...field} onChange={e => { field.onChange(e); if (selectedPaxId) form.setValue("passenger_id", "") }} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="phone_number"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <Input type="tel" placeholder="+94 77..." {...field} onChange={e => { field.onChange(e); if (selectedPaxId) form.setValue("passenger_id", "") }} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Route - Row 4 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField<BookingFormValues>
                        control={control}
                        name="origin"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>From</FormLabel>
                                <FormControl>
                                    <Input placeholder="DXB" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="destination"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>To</FormLabel>
                                <FormControl>
                                    <Input placeholder="LHR" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="departure_date"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Departure Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="return_date"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Return Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Financials - Row 5 */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <FormField<BookingFormValues>
                        control={control}
                        name="currency"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Currency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="EUR" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="LKR">LKR</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="fare"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Buying Price (Fare)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="selling_price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Selling Price</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="advance_payment"
                        render={({ field }: { field: any }) => (
                            <FormItem>
                                <FormLabel>Advance Payment</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormItem>
                        <FormLabel>Profit (Calculated)</FormLabel>
                        <FormControl>
                            <Input disabled value={profit.toFixed(2)} className="bg-slate-100 dark:bg-slate-800" />
                        </FormControl>
                    </FormItem>
                </div>

                <div className="flex justify-between items-center mt-4">
                    <Button variant="ghost" type="button" onClick={handleReset}>Reset / Clear</Button>
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={onCancel || handleReset} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={loading}
                            onClick={() => {
                                addMoreModeRef.current = true;
                            }}
                        >
                            {loading && addMoreModeRef.current ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save & Add Another"}
                        </Button>
                        <Button
                            type="submit"
                            variant="premium"
                            disabled={loading}
                            onClick={() => {
                                addMoreModeRef.current = false;
                            }}
                        >
                            {loading && !addMoreModeRef.current ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save & Close"}
                        </Button>
                    </div>
                </div>

            </form>
        </Form >
    )
}
