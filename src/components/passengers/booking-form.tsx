"use client"

import { useState, useEffect, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Check, ChevronsUpDown, Loader2, Plus, Trash2 } from "lucide-react"
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
const passengerSchema = z.object({
    passenger_id: z.string().optional(),
    pax_type: z.enum(["ADULT", "CHILD", "INFANT"]),
    title: z.string().min(1, "Title is required"),
    first_name: z.string().min(1, "First Name is required"),
    surname: z.string().min(1, "Surname is required"),
    ticket_number: z.string().min(1, "Ticket Number is required"),
    passport_number: z.string().min(1, "Passport Number is required"),
    passport_expiry: z.string().min(1, "Passport Expiry is required"),
    sale_price: z.coerce.number().min(0, "Sale Price must be positive"),
    cost_price: z.coerce.number().min(0, "Cost Price must be positive"),
    // Optional contact info if needed for creating new profiles?
    contact_info: z.string().email("Invalid email").optional().or(z.literal("")),
    phone_number: z.string().optional(),
    ticket_status: z.enum(["PENDING", "ISSUED", "VOID", "REFUNDED", "REISSUE"]).optional(),
    refund_amount_partner: z.coerce.number().optional(),
    refund_amount_customer: z.coerce.number().optional(),
    refund_date: z.string().optional(),
    void_date: z.string().optional(),
})

const bookingFormSchema = z.object({
    passengers: z.array(passengerSchema).min(1, "At least one passenger is required"),

    // Booking Details
    pnr: z.string().min(1, "PNR is required"),
    entry_date: z.string().min(1, "Booking date is required"),
    airline: z.string().min(1, "Airline is required"),
    ticket_status: z.enum(["PENDING", "ISSUED", "VOID", "REFUNDED", "REISSUE"]),
    booking_type: z.enum(["ORIGINAL", "REISSUE"]).default("ORIGINAL"),
    ticket_issued_date: z.string().optional(),
    platform: z.string().min(1, "Platform is required"),
    ticket_number: z.string().optional(), // Optional on root, specific on passenger

    origin: z.string().optional(),
    destination: z.string().optional(),
    departure_date: z.string().min(1, "Departure date is required"),
    return_date: z.string().optional(),

    // Financials (Calculated totals, but kept for schema structure if needed, or removed)
    // We remove them from validation here as they are derived.
    // However, onSubmit might want to pass them for legacy reasons? No, createBooking ignores them.
    advance_payment: z.coerce.number().optional(),

    // Relations
    booking_source: z.enum(["WALK_IN", "FINDYOURFARES", "AGENT"]).default("AGENT"),
    agent_id: z.string().optional(),
    issued_partner_id: z.string().min(1, "Issued Partner is required"),

    // Refund
    refund_date: z.string().optional(),
    actual_refund_amount: z.coerce.number().optional(),
    customer_refund_amount: z.coerce.number().optional(),

    // Void
    void_date: z.string().optional(),

    payment_method: z.enum(["Easy Pay", "Credit Card"]).optional(),
    currency: z.enum(["EUR", "LKR"]).default("EUR"),
    parent_booking_id: z.string().optional(),
}).superRefine((data, ctx) => {
    // If ticket status is REFUNDED, require refund date
    if (data.ticket_status === 'REFUNDED' && !data.refund_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Refund date is required when status is Refunded",
            path: ["refund_date"]
        });
    }

    // If ticket status is VOID, require void date
    if (data.ticket_status === 'VOID' && !data.void_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Void date is required when status is Void",
            path: ["void_date"]
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

    // Validate Issued Date for Issued/Reissue status
    if ((data.ticket_status === 'ISSUED' || data.ticket_status === 'REISSUE') && !data.ticket_issued_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Issued Date is required when status is Issued/Reissue",
            path: ["ticket_issued_date"]
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
    disableStatusChange?: boolean
    isReissueMode?: boolean
    parentBooking?: any // Booking type, simplify for now or import
}

export function BookingForm({ passengers, agents = [], issuedPartners = [], platforms = [], initialData, bookingId, onSuccess, onCancel, disableStatusChange, isReissueMode, parentBooking }: BookingFormProps) {
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
    const [openPaxIndex, setOpenPaxIndex] = useState<number | null>(null)


    // Heuristic for Single Passenger Legacy Data or Multiple Passengers Logic
    const initialPassengers = (initialData?.passengers && initialData.passengers.length > 0)
        ? initialData.passengers.map((p: any) => ({
            passenger_id: p.passenger_id || "",
            pax_type: p.pax_type || "ADULT",
            title: p.title || "",
            first_name: p.first_name || "",
            surname: p.surname || "",
            ticket_number: p.ticket_number || "",
            passport_number: p.passport_number || "",
            passport_expiry: p.passport_expiry ? p.passport_expiry.split('T')[0] : "",
            sale_price: Number(p.sale_price) || 0,
            cost_price: Number(p.cost_price) || 0,
            contact_info: p.contact_info || "",
            phone_number: p.phone_number || "",
            ticket_status: p.ticket_status || "PENDING",
            refund_amount_partner: Number(p.refund_amount_partner) || 0,
            refund_amount_customer: Number(p.refund_amount_customer) || 0,
            refund_date: p.refund_date ? p.refund_date.split('T')[0] : "",
            void_date: p.void_date ? p.void_date.split('T')[0] : "",
        }))
        : [{
            // Fallback for old data or new booking
            passenger_id: initialData?.passenger_id || "",
            pax_type: initialData?.passenger_type || "ADULT",
            title: initialData?.title || "",
            first_name: initialData?.first_name || (initialData?.pax_name ? initialData.pax_name.split(' ').pop() : ""),
            surname: initialData?.surname || (initialData?.pax_name ? initialData.pax_name.split(' ').slice(1).join(' ') : ""),
            // Logic for name splitting is unreliable, but better than nothing for legacy.
            // If we really want to parse properly, we can reuse logic, but let's simplify.
            // Actually, let's just use empty if undefined.
            contact_info: initialData?.contact_info || "",
            phone_number: initialData?.phone_number || "",
            ticket_number: initialData?.ticket_number || "",
            passport_number: "",
            passport_expiry: "",
            sale_price: Number(initialData?.selling_price) || 0,
            cost_price: Number(initialData?.fare) || 0,
        }];

    const defaultValues: Partial<BookingFormValues> = {
        passengers: initialPassengers,
        pnr: initialData?.pnr || "",
        entry_date: initialData?.entry_date ? initialData.entry_date.split('T')[0] : new Date().toISOString().split('T')[0],
        airline: initialData?.airline || "",
        ticket_status: isReissueMode ? "REISSUE" : (initialData?.ticket_status || "PENDING"),
        booking_type: isReissueMode ? "REISSUE" : (initialData?.booking_type || "ORIGINAL"),
        ticket_issued_date: initialData?.ticket_issued_date ? initialData.ticket_issued_date.split('T')[0] : "",
        platform: initialData?.platform || "",
        ticket_number: initialData?.ticket_number || "", // Kept for root but unused in UI if multi-pax

        origin: initialData?.origin || "",
        destination: initialData?.destination || "",
        departure_date: initialData?.departure_date ? initialData.departure_date.split('T')[0] : "",
        return_date: initialData?.return_date ? initialData.return_date.split('T')[0] : "",

        // These are calculated but can have defaults
        advance_payment: initialData?.advance_payment || 0,

        booking_source: initialData?.booking_source || "AGENT",
        agent_id: initialData?.agent_id || initialData?.agent?.id || "",
        issued_partner_id: initialData?.issued_partner_id || initialData?.issued_partner?.id || initialData?.booking_type_id || initialData?.booking_type?.id || "",

        refund_date: initialData?.refund_date ? initialData.refund_date.split('T')[0] : "",
        actual_refund_amount: initialData?.actual_refund_amount || 0,
        customer_refund_amount: initialData?.customer_refund_amount || 0,
        void_date: initialData?.void_date ? initialData.void_date.split('T')[0] : "",
        payment_method: initialData?.payment_method || "Easy Pay",
        currency: initialData?.currency || "EUR",
        parent_booking_id: parentBooking?.id || initialData?.parent_booking_id || "",
    }

    const form = useForm<BookingFormValues>({
        resolver: zodResolver(bookingFormSchema) as any,
        defaultValues
    })

    const { watch, setValue, getValues, reset, control, handleSubmit } = form; // Added control/handleSubmit here if needed outside default

    const { fields, append, remove } = useFieldArray({
        control,
        name: "passengers"
    })

    const ticketStatus = watch("ticket_status")
    const bookingSource = watch("booking_source")
    const selectedPartnerId = watch("issued_partner_id")
    const selectedPartner = issuedPartners.find(t => t.id === selectedPartnerId)
    const advancePayment = watch("advance_payment") || 0

    // Calculate totals for display
    const watchedPassengers = watch("passengers");
    // Ensure watchedPassengers is defined (it might be undefined initially)
    const currentPassengers = watchedPassengers || fields;

    const totalFare = currentPassengers?.reduce((sum, p) => sum + (Number(p.cost_price) || 0), 0) || 0;
    const totalSellingPrice = currentPassengers?.reduce((sum, p) => sum + (Number(p.sale_price) || 0), 0) || 0;
    const totalProfit = totalSellingPrice - totalFare;

    function handleReset() {
        reset(defaultValues)
    }

    async function handleCreateAgent() {
        if (!newAgentName) return;
        const res = await createAgent(newAgentName);
        if (res?.data) {
            setNewAgentOpen(false);
            setNewAgentName("");
            router.refresh();
            toast.success("Agent created")
        }
    }

    async function handleCreatePartner() {
        if (!newPartnerName) return;
        const res = await createIssuedPartner(newPartnerName);
        if (res?.data) {
            setNewPartnerOpen(false);
            setNewPartnerName("");
            router.refresh();
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
            toast.success("Platform created")
        }
    }

    async function onSubmit(data: BookingFormValues) {
        setLoading(true)
        try {
            // Process passengers: create profiles if needed
            const processedPassengers = await Promise.all(data.passengers.map(async (pax) => {
                let finalPaxId = pax.passenger_id;

                // Create new passenger if needed (no ID but has name)
                if (!finalPaxId && (pax.surname || pax.first_name)) {
                    const newPaxData = new FormData()
                    newPaxData.append("title", pax.title || "")
                    newPaxData.append("surname", pax.surname || "")
                    newPaxData.append("first_name", pax.first_name || "")
                    newPaxData.append("contact_info", pax.contact_info || "")
                    newPaxData.append("phone_number", pax.phone_number || "")
                    newPaxData.append("passenger_type", pax.pax_type)

                    const res = await createPassenger(newPaxData)
                    if (res?.data) {
                        finalPaxId = res.data.id
                    }
                }
                return {
                    ...pax,
                    passenger_id: finalPaxId || "", // Ensure string/null
                    sale_price: Number(pax.sale_price) || 0,
                    cost_price: Number(pax.cost_price) || 0
                };
            }));

            // Prepare submit data
            const bookingData: any = {
                ...data, // includes pnr, airline, etc.
                passengers: processedPassengers,

                // Derived header fields for display/legacy
                pax_name: processedPassengers.map(p => `${p.title} ${p.first_name} ${p.surname}`.trim()).join(', '),
                passenger_id: processedPassengers.length > 0 ? processedPassengers[0].passenger_id : null,
                ticket_number: processedPassengers.length > 0 ? processedPassengers[0].ticket_number : "",

                fare: totalFare,
                selling_price: totalSellingPrice,
                advance_payment: Number(data.advance_payment || 0),
                customer_refund_amount: Number(data.customer_refund_amount || 0),
                void_date: data.void_date || null
            }

            if (bookingId) {
                await updateBooking(bookingId, bookingData)
                router.refresh()
                toast.success("Booking updated successfully")
                if (onSuccess) onSuccess()
            } else {
                await createBooking(bookingData)
                if (addMoreModeRef.current) {
                    // Reset passengers only? Or full reset?
                    // Usually "Add Another" means keep context but clear specific pax details?
                    // Or completely fresh?
                    // Let's reset to defaults (1 empty passenger)
                    reset({
                        ...defaultValues,
                        passengers: [{
                            pax_type: "ADULT", title: "", first_name: "", surname: "",
                            ticket_number: "", passport_number: "", passport_expiry: "",
                            sale_price: 0, cost_price: 0,
                            contact_info: "", phone_number: ""
                        }]
                    });
                    toast.success("Booking saved! Ready for next.")
                } else {
                    handleReset()
                    router.refresh()
                    toast.success("Booking saved successfully")
                    if (onSuccess) onSuccess()
                }
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Failed to save booking.")
        } finally {
            setLoading(false)
        }
    }


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* --- Section 1: Booking Details --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-white/50 dark:bg-slate-900/50">
                    <FormField<BookingFormValues>
                        control={control}
                        name="pnr"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>PNR (Reference)</FormLabel>
                                <FormControl>
                                    <Input placeholder="ABC1234" {...field} value={field.value as string} autoFocus />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField<BookingFormValues>
                        control={control}
                        name="entry_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Booking Date</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} value={field.value as string} disabled={ticketStatus !== 'PENDING'} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {ticketStatus === 'VOID' && (
                        <FormField<BookingFormValues>
                            control={control}
                            name="void_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Void Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value as string} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    {ticketStatus === 'REFUNDED' && (
                        <FormField<BookingFormValues>
                            control={control}
                            name="refund_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Refund Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} value={field.value as string} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                    <FormField<BookingFormValues>
                        control={control}
                        name="airline"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Airline</FormLabel>
                                <FormControl>
                                    <Input placeholder="EK" {...field} value={field.value as string} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="ticket_status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ticket Status</FormLabel>
                                <Select onValueChange={(val) => {
                                    field.onChange(val);
                                    // Auto-update all passengers status
                                    const currentPassengers = getValues("passengers");
                                    if (currentPassengers) {
                                        currentPassengers.forEach((_, index) => {
                                            setValue(`passengers.${index}.ticket_status`, val as any);
                                        });
                                    }

                                    // Auto-set booking_type based on status
                                    if (val === 'REISSUE') {
                                        setValue('booking_type', 'REISSUE');
                                    } else {
                                        // Optional: Only revert to ORIGINAL if it was REISSUE? 
                                        // Or enforce ORIGINAL for non-reissue status? 
                                        // Let's enforce it to keep data clean as per user intent "no longer needed this" (the manual override).
                                        setValue('booking_type', 'ORIGINAL');
                                    }
                                }} value={field.value as string} disabled={disableStatusChange || isReissueMode}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="ISSUED">Issued</SelectItem>
                                        <SelectItem value="REISSUE">Reissue</SelectItem>
                                        <SelectItem value="VOID">Void</SelectItem>
                                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>

                        )}
                    />
                </div >



                {/* --- Section 2: Passengers --- */}
                < div className="space-y-4" >
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Passengers</h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const firstPax = getValues("passengers")?.[0];
                                append({
                                    pax_type: "ADULT", title: "", first_name: "", surname: "",
                                    ticket_number: "", passport_number: "", passport_expiry: "",
                                    sale_price: 0, cost_price: 0,
                                    contact_info: firstPax?.contact_info || "",
                                    phone_number: firstPax?.phone_number || ""
                                })
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Add Passenger
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="relative p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/40 space-y-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-2 text-muted-foreground hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
                                    onClick={() => remove(index)}
                                    disabled={fields.length === 1} // Prevent removing last passenger? Maybe allow if we want empty state but schema requires min(1)
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>

                                {/* Row 1: Search & Name */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pr-8">
                                    <div className="flex flex-col space-y-2">
                                        <FormLabel>Select Passenger</FormLabel>
                                        <Popover open={openPaxIndex === index} onOpenChange={(open) => setOpenPaxIndex(open ? index : null)}>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                                    <span className="truncate">
                                                        {watch(`passengers.${index}.first_name`) || watch(`passengers.${index}.surname`)
                                                            ? `${watch(`passengers.${index}.first_name`)} ${watch(`passengers.${index}.surname`)}`
                                                            : "Select..."}
                                                    </span>
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search..." />
                                                    <CommandList>
                                                        <CommandEmpty>No passenger found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {passengers.map((p) => (
                                                                <CommandItem
                                                                    key={p.id}
                                                                    value={p.name}
                                                                    onSelect={() => {
                                                                        setValue(`passengers.${index}.passenger_id` as any, p.id)
                                                                        setValue(`passengers.${index}.title` as any, p.title || "")
                                                                        setValue(`passengers.${index}.first_name` as any, p.first_name || "")
                                                                        setValue(`passengers.${index}.surname` as any, p.surname || "")
                                                                        setValue(`passengers.${index}.contact_info` as any, p.contact_info || "")
                                                                        setValue(`passengers.${index}.phone_number` as any, p.phone_number || "")
                                                                        setValue(`passengers.${index}.passport_number` as any, p.passport_number || "")
                                                                        if (p.passport_expiry) {
                                                                            try {
                                                                                const dateStr = new Date(p.passport_expiry as string).toISOString().split('T')[0];
                                                                                setValue(`passengers.${index}.passport_expiry`, dateStr);
                                                                            } catch (e) {
                                                                                console.error("Invalid passport expiry date", p.passport_expiry);
                                                                            }
                                                                        } else {
                                                                            setValue(`passengers.${index}.passport_expiry`, "");
                                                                        }

                                                                        // Reset ID if manually changed? Handled by onChange in inputs below
                                                                        setOpenPaxIndex(null)
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", watch(`passengers.${index}.passenger_id`) === p.id ? "opacity-100" : "opacity-0")} />
                                                                    {p.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.title`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Title</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="MR" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.first_name`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.surname`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Surname</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Row 2: Type, Ticket No, Status, Financials */}
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.pax_type`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Pax Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Type" />
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
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.ticket_number`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Ticket Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="176-" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.ticket_status`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={disableStatusChange || isReissueMode}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="PENDING">Pending</SelectItem>
                                                        <SelectItem value="ISSUED">Issued</SelectItem>
                                                        <SelectItem value="REISSUE">Reissue</SelectItem>
                                                        <SelectItem value="VOID">Void</SelectItem>
                                                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.cost_price`}
                                        render={({ field }) => {
                                            // Find original cost if reissue
                                            const currentPaxId = getValues(`passengers.${index}.passenger_id`);
                                            const originalPax = parentBooking?.passengers?.find((p: any) => p.passenger_id === currentPaxId);

                                            return (
                                                <FormItem>
                                                    <FormLabel>{isReissueMode ? "Reissue Cost" : "Cost (Fare)"}</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} />
                                                    </FormControl>
                                                    {isReissueMode && originalPax && (
                                                        <p className="text-[10px] text-slate-500">
                                                            Old Cost: {originalPax.cost_price?.toFixed(2)}
                                                        </p>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )
                                        }}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.sale_price`}
                                        render={({ field }) => {
                                            const currentPaxId = getValues(`passengers.${index}.passenger_id`);
                                            const originalPax = parentBooking?.passengers?.find((p: any) => p.passenger_id === currentPaxId);

                                            return (
                                                <FormItem>
                                                    <FormLabel>{isReissueMode ? "Reissue Price" : "Sell Price"}</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} />
                                                    </FormControl>
                                                    {isReissueMode && originalPax && (
                                                        <p className="text-[10px] text-slate-500">
                                                            Old Sell: {originalPax.sale_price?.toFixed(2)}
                                                        </p>
                                                    )}
                                                    <FormMessage />
                                                </FormItem>
                                            )
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-2">
                                    <div className="text-xs text-muted-foreground uppercase">Profit</div>
                                    <div className={cn("text-sm font-bold",
                                        (Number(watch(`passengers.${index}.sale_price`) || 0) - Number(watch(`passengers.${index}.cost_price`) || 0)) >= 0
                                            ? "text-green-600" : "text-red-500")}>
                                        {(Number(watch(`passengers.${index}.sale_price`) || 0) - Number(watch(`passengers.${index}.cost_price`) || 0)).toFixed(2)}
                                    </div>
                                </div>


                                {/* Row 3: Refund Details (Conditional) */}
                                {watch(`passengers.${index}.ticket_status`) === 'REFUNDED' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20 mb-4">
                                        <FormField
                                            control={control}
                                            name={`passengers.${index}.refund_amount_partner`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Refund From Partner</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name={`passengers.${index}.refund_amount_customer`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Refund To Customer</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={control}
                                            name={`passengers.${index}.refund_date`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Refund Date</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} value={field.value as string} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Row 3.5: Void Details (Conditional) */}
                                {watch(`passengers.${index}.ticket_status`) === 'VOID' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/20 mb-4">
                                        <FormField
                                            control={control}
                                            name={`passengers.${index}.void_date`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Void Date</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} value={field.value as string} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}

                                {/* Row 4: Passport Information & Contact */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.passport_number`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Passport No</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="N..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.passport_expiry`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Passport Expiry</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.phone_number`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+94..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name={`passengers.${index}.contact_info`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="a@b.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div >

                {/* --- Section 3: Route & Entity & Payment --- */}
                < div className="grid grid-cols-1 md:grid-cols-3 gap-6" >
                    {/* Route */}
                    < div className="space-y-4 border p-4 rounded-lg bg-white/50 dark:bg-slate-900/50" >
                        <h4 className="font-medium">Route</h4>
                        <FormField control={control} name="origin" render={({ field }) => (
                            <FormItem><FormLabel>From</FormLabel><FormControl><Input placeholder="Origin" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="destination" render={({ field }) => (
                            <FormItem><FormLabel>To</FormLabel><FormControl><Input placeholder="Dest" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-2">
                            <FormField control={control} name="departure_date" render={({ field }) => (
                                <FormItem><FormLabel>Depart</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={control} name="return_date" render={({ field }) => (
                                <FormItem><FormLabel>Return</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div >

                    {/* Agent/Source */}
                    < div className="space-y-4 border p-4 rounded-lg bg-white/50 dark:bg-slate-900/50" >
                        <h4 className="font-medium">Source</h4>
                        <FormField<BookingFormValues>
                            control={control}
                            name="booking_source"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Source</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value as string} disabled={!!bookingId}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="WALK_IN">Walk-in</SelectItem>
                                            <SelectItem value="FINDYOURFARES">FindYourFares</SelectItem>
                                            <SelectItem value="AGENT">Agent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {
                            bookingSource === 'AGENT' && (
                                <FormField<BookingFormValues>
                                    control={control}
                                    name="agent_id"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Agent</FormLabel>
                                            <div className="flex gap-2">
                                                <Popover open={openAgentCombobox} onOpenChange={setOpenAgentCombobox}>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                                <span className="truncate">
                                                                    {field.value ? agents.find((a) => a.id === field.value)?.name : "Select..."}
                                                                </span>
                                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[200px] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Search..." />
                                                            <CommandList>
                                                                <CommandEmpty>No agent found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {agents.map((a) => (
                                                                        <CommandItem key={a.id} value={a.name} onSelect={() => { form.setValue("agent_id", a.id); setOpenAgentCombobox(false) }}>
                                                                            <Check className={cn("mr-2 h-4 w-4", a.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                            {a.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                                <Dialog open={newAgentOpen} onOpenChange={setNewAgentOpen}>
                                                    <DialogTrigger asChild><Button variant="secondary" size="icon" type="button"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Add Agent</DialogTitle></DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <div className="space-y-2"><FormLabel>Name</FormLabel><Input value={newAgentName} onChange={(e) => setNewAgentName(e.target.value)} /></div>
                                                            <Button onClick={handleCreateAgent} type="button" className="w-full">Create</Button>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )
                        }
                        <FormField<BookingFormValues>
                            control={control}
                            name="issued_partner_id"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Issued By</FormLabel>
                                    <div className="flex gap-2">
                                        <Popover open={openPartnerCombobox} onOpenChange={setOpenPartnerCombobox}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                        <span className="truncate">
                                                            {field.value ? issuedPartners.find((t) => t.id === field.value)?.name : "Select..."}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            {/* ... Partner Combobox Content (Shortened for replacement) ... */}
                                            <PopoverContent className="w-[200px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search..." />
                                                    <CommandList>
                                                        <CommandEmpty>None found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {issuedPartners.map((t) => (
                                                                <CommandItem key={t.id} value={t.name} onSelect={() => { form.setValue("issued_partner_id", t.id, { shouldValidate: true }); setOpenPartnerCombobox(false) }}>
                                                                    <Check className={cn("mr-2 h-4 w-4", t.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                    {t.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <Dialog open={newPartnerOpen} onOpenChange={setNewPartnerOpen}>
                                            <DialogTrigger asChild><Button variant="secondary" size="icon" type="button"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Add Partner</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2"><FormLabel>Name</FormLabel><Input value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} /></div>
                                                    <Button onClick={handleCreatePartner} type="button" className="w-full">Create</Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField<BookingFormValues>
                            control={control}
                            name="platform"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Platform</FormLabel>
                                    <div className="flex gap-2">
                                        <Popover open={openPlatformCombobox} onOpenChange={setOpenPlatformCombobox}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                        <span className="truncate">
                                                            {field.value ? (platforms.find((p) => p.name === field.value)?.name || (field.value as string)) : "Select..."}
                                                        </span>
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search..." />
                                                    <CommandList>
                                                        <CommandEmpty>None found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {platforms.map((p) => (
                                                                <CommandItem key={p.id} value={p.name} onSelect={() => { form.setValue("platform", p.name); setOpenPlatformCombobox(false) }}>
                                                                    <Check className={cn("mr-2 h-4 w-4", p.name === field.value ? "opacity-100" : "opacity-0")} />
                                                                    {p.name}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <Dialog open={newPlatformOpen} onOpenChange={setNewPlatformOpen}>
                                            <DialogTrigger asChild><Button variant="secondary" size="icon" type="button"><Plus className="h-4 w-4" /></Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Add Platform</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2"><FormLabel>Name</FormLabel><Input value={newPlatformName} onChange={(e) => setNewPlatformName(e.target.value)} /></div>
                                                    <Button onClick={handleCreatePlatform} type="button" className="w-full">Create</Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div >

                    {/* Financials & Payment */}
                    < div className="space-y-4 border p-4 rounded-lg bg-white/50 dark:bg-slate-900/50" >
                        <h4 className="font-medium">Financials</h4>
                        <FormField control={control} name="currency" render={({ field }) => (
                            <FormItem><FormLabel>Currency</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="LKR">LKR</SelectItem></SelectContent></Select>
                                <FormMessage /></FormItem>
                        )} />
                        {
                            selectedPartner?.name?.trim().toUpperCase() === 'IATA' && (
                                <FormField control={control} name="payment_method" render={({ field }) => (
                                    <FormItem><FormLabel>Method</FormLabel><Select onValueChange={field.onChange} value={field.value as string}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Easy Pay">Easy Pay</SelectItem><SelectItem value="Credit Card">Credit Card</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                                )} />
                            )
                        }
                        <FormField control={control} name="advance_payment" render={({ field }) => (
                            <FormItem><FormLabel>Advance</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={control} name="ticket_issued_date" render={({ field }) => (
                            <FormItem><FormLabel>Issued Date</FormLabel><FormControl><Input type="date" {...field} value={field.value as string} disabled={ticketStatus !== 'ISSUED' && ticketStatus !== 'REISSUE'} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div >
                </div >



                {/* --- Total Summary --- */}
                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-100 dark:bg-slate-800 p-6 rounded-lg gap-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-8">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isReissueMode ? "Reissue Cost" : "Total Buy"}</span>
                                <span className="text-xl font-bold font-mono">{totalFare.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isReissueMode ? "Reissue Sell" : "Total Sell"}</span>
                                <span className="text-xl font-bold font-mono">{totalSellingPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Profit</span>
                                <span className={cn("text-xl font-bold font-mono", totalProfit >= 0 ? "text-green-600" : "text-red-500")}>
                                    {totalProfit.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        {isReissueMode && parentBooking && (
                            <div className="flex gap-8 pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Ticket Cost</span>
                                    <span className="text-sm font-bold font-mono text-slate-600 dark:text-slate-400">
                                        {((Number(parentBooking.fare) || 0) + totalFare).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Ticket Sell</span>
                                    <span className="text-sm font-bold font-mono text-slate-600 dark:text-slate-400">
                                        {((Number(parentBooking.selling_price) || 0) + totalSellingPrice).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" type="button" onClick={onCancel || handleReset} disabled={loading} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={loading}
                            onClick={() => { addMoreModeRef.current = true; }}
                            className="flex-1 sm:flex-none"
                        >
                            {loading && addMoreModeRef.current ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save & Add"}
                        </Button>
                        <Button
                            type="submit"
                            variant="premium" // Assuming this variant exists or default
                            disabled={loading}
                            onClick={() => { addMoreModeRef.current = false; }}
                            className="flex-1 sm:flex-none"
                        >
                            {loading && !addMoreModeRef.current ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save & Close"}
                        </Button>
                    </div>
                </div>

            </form >
        </Form >
    )
}
