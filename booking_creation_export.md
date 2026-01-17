
# Booking Creation System Code

This document contains the core files used to create a booking in the Acon Core application. It includes the backend server actions, the database types, and the frontend form component.

## 1. Type Definitions (`src/types/index.ts`)

```typescript
export interface Agent {
    id: string;
    created_at: string;
    name: string;
}

export interface BookingType {
    id: string;
    created_at: string;
    name: string;
}

export interface Booking {
    id: string;
    created_at: string;
    pax_name: string; // Keeping for display, but derived or fallback
    pnr: string;
    ticket_number?: string;
    airline?: string;
    entry_date: string;
    departure_date: string;
    return_date?: string;
    fare: number;
    selling_price: number;
    profit: number;
    payment_status: string;
    passenger_id?: string; // FK

    // New fields
    ticket_status?: 'PENDING' | 'ISSUED' | 'VOID' | 'REFUNDED' | 'CANCELED';
    ticket_issued_date?: string;
    advance_payment?: number;
    platform?: string;
    payment_method?: string; // e.g. 'Easy Pay', 'Credit Card'

    // Refund fields
    refund_date?: string;
    actual_refund_amount?: number;
    customer_refund_amount?: number;

    // Existing fields
    origin?: string;
    destination?: string;
    agent_id?: string;
    booking_type_id?: string;

    // Joined fields (optional, depending on query)
    agent?: Agent;
    booking_type?: BookingType;
}

export interface Passenger {
    id: string;
    created_at: string;

    // Split name
    title?: string;
    first_name?: string;
    surname?: string;
    name: string; // Computed or legacy, kept for compatibility

    passport_number?: string;
    contact_info?: string;
    phone_number?: string;
    passenger_type?: 'ADULT' | 'CHILD' | 'INFANT';
}

export type BookingFormData = Omit<Booking, "id" | "created_at" | "profit" | "agent" | "booking_type">;

export interface BookingHistory {
    id: string;
    booking_id: string;
    action: string;
    previous_status?: string;
    new_status?: string;
    details?: string;
    created_at: string;
}
```

## 2. Server Actions (Backend Logic)

### Booking Actions (`src/app/dashboard/bookings/actions.ts`)

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BookingFormData, BookingHistory } from '@/types'

export async function createBooking(formData: BookingFormData) {
    const supabase = await createClient()

    // 1. Check for Duplicate Ticket Number (if provided)
    if (formData.ticket_number && formData.ticket_number.trim() !== '') {
        const { data: existingTicketBookings } = await supabase
            .from('bookings')
            .select('id, pnr')
            .eq('ticket_number', formData.ticket_number.trim())

        if (existingTicketBookings && existingTicketBookings.length > 0) {
            // Rule: Ticket Number can be reused ONLY if it belongs to the SAME PNR.
            // If it is used on a DIFFERENT PNR, it's a duplicate error.
            const differentPnrBooking = existingTicketBookings.find(b => b.pnr !== formData.pnr);
            if (differentPnrBooking) {
                throw new Error(`Ticket Number ${formData.ticket_number} is already used on a different PNR (${differentPnrBooking.pnr}).`);
            }
        }
    }

    // 2. Check for Duplicate PNR + Status combo (ignoring name)
    if (formData.pnr) {
        const { data: existingPnrBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('pnr', formData.pnr.trim())
            .eq('ticket_status', formData.ticket_status)

        if (existingPnrBookings && existingPnrBookings.length > 0) {
            throw new Error(`A booking with PNR ${formData.pnr} and status ${formData.ticket_status} already exists.`);
        }
    }

    const { error } = await supabase
        .from('bookings')
        .insert([
            {
                pax_name: formData.pax_name,
                passenger_id: formData.passenger_id || null, // FIX: handle empty string
                pnr: formData.pnr,
                ticket_number: formData.ticket_number,
                airline: formData.airline,
                entry_date: formData.entry_date,
                departure_date: formData.departure_date,
                return_date: formData.return_date || null,
                fare: formData.fare,
                selling_price: formData.selling_price,
                payment_status: formData.payment_status || 'PENDING',

                // New Fields
                origin: formData.origin,
                destination: formData.destination,
                agent_id: formData.agent_id || null, // FIX: handle empty string
                booking_type_id: formData.booking_type_id || null, // FIX: handle empty string

                // Mapped Missing Fields
                ticket_status: formData.ticket_status,
                ticket_issued_date: formData.ticket_issued_date || null,
                advance_payment: formData.advance_payment,
                platform: formData.platform,

                // Refund / Void Fields
                refund_date: formData.refund_date || null,
                actual_refund_amount: formData.actual_refund_amount,
                customer_refund_amount: formData.customer_refund_amount,

                payment_method: formData.payment_method || null
            }
        ])

    if (error) {
        console.error('Error creating booking:', error)
        throw new Error('Failed to create booking')
    }

    revalidatePath('/dashboard/bookings')
}
```

### Passenger Actions (`src/app/dashboard/passengers/actions.ts`)

Used to create a new passenger if one doesn't exist during booking creation.

```typescript
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPassenger(formData: FormData) {
    const supabase = await createClient()

    const title = formData.get('title') as string
    const surname = formData.get('surname') as string
    const first_name = formData.get('first_name') as string
    const passport_number = formData.get('passport_number') as string
    const phone_number = formData.get('phone_number') as string
    const passenger_type = formData.get('passenger_type') as string || 'ADULT'
    const contact_info = formData.get('contact_info') as string

    // Construct full name for legacy support or display
    const name = `${title} ${surname} ${first_name}`.trim()

    if (!surname || !first_name) return { error: "Surname and First Name are required" }

    const { data, error } = await supabase
        .from('passengers')
        .insert([{
            title,
            surname,
            first_name,
            name,
            passport_number,
            contact_info,
            phone_number,
            passenger_type
        }])
        .select()
        .single()

    if (error) {
        console.error('Error creating passenger:', error)
        return { error: error.message }
    }

    revalidatePath('/dashboard/passengers')
    return { data }
}
```

## 3. Booking Form Component (`src/components/passengers/booking-form.tsx`)

This is the main React component that handles the UI, validation (Zod), and calls the server actions.
*Note: Some standard UI imports (Button, Input, etc.) are assumed to be present in the project.*

```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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

import { createBooking, createAgent, createBookingType, updateBooking } from "@/app/dashboard/bookings/actions"
import { createPassenger } from "@/app/dashboard/passengers/actions"
import { Passenger, Agent, BookingType } from "@/types"

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
    platform: z.string().optional(),
    ticket_number: z.string().optional(),

    origin: z.string().optional(),
    destination: z.string().optional(),
    departure_date: z.string().min(1, "Departure date is required"),
    return_date: z.string().optional(),

    // Financials
    fare: z.coerce.number().min(0, "Fare must be positive"),
    selling_price: z.coerce.number().min(0, "Selling price must be positive"),
    advance_payment: z.coerce.number().optional(),

    // Relations - MANDATORY
    agent_id: z.string().min(1, "Agent is required"),
    booking_type_id: z.string().min(1, "Booking type is required"),

    // Refund
    refund_date: z.string().optional(),
    actual_refund_amount: z.coerce.number().optional(),
    customer_refund_amount: z.coerce.number().optional(),

    payment_method: z.enum(["Easy Pay", "Credit Card"]).optional(),
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
            path: ["surname"]
        });
    }
});

type BookingFormValues = z.infer<typeof bookingFormSchema>

interface BookingFormProps {
    passengers: Passenger[]
    agents?: Agent[]
    bookingTypes?: BookingType[]
    initialData?: any
    bookingId?: string
    onSuccess?: () => void
    onCancel?: () => void
}

export function BookingForm({ passengers, agents = [], bookingTypes = [], initialData, bookingId, onSuccess, onCancel }: BookingFormProps) {
    const [loading, setLoading] = useState(false)
    const [addMoreMode, setAddMoreMode] = useState(false)

    const router = useRouter()

    // UI States for Comboboxes
    const [openPaxCombobox, setOpenPaxCombobox] = useState(false)
    const [openAgentCombobox, setOpenAgentCombobox] = useState(false)
    const [openTypeCombobox, setOpenTypeCombobox] = useState(false)

    // New Entity States
    const [newAgentOpen, setNewAgentOpen] = useState(false)
    const [newAgentName, setNewAgentName] = useState("")
    const [newTypeOpen, setNewTypeOpen] = useState(false)
    const [newTypeName, setNewTypeName] = useState("")

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
            if (titles.includes(parts[0].toUpperCase())) {
                initialTitle = parts[0].toUpperCase()
                parts.shift()
            }

            if (parts.length === 1) {
                initialSurname = parts[0]
            } else if (parts.length >= 2) {
                initialFirstName = parts.pop() || ""
                initialSurname = parts.join(" ")
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
        contact_info: initialData?.contact_info || "",
        phone_number: "",

        pnr: initialData?.pnr || "",
        airline: initialData?.airline || "",
        ticket_number: initialData?.ticket_number || "",
        origin: initialData?.origin || "",
        destination: initialData?.destination || "",
        departure_date: initialData?.departure_date ? initialData.departure_date.split('T')[0] : "",
        return_date: initialData?.return_date ? initialData.return_date.split('T')[0] : "",
        advance_payment: initialData?.advance_payment || 0,
        agent_id: initialData?.agent_id || initialData?.agent?.id || "",
        booking_type_id: initialData?.booking_type_id || initialData?.booking_type?.id || "",

        ticket_issued_date: initialData?.ticket_issued_date ? initialData.ticket_issued_date.split('T')[0] : "",
        platform: initialData?.platform || "",

        refund_date: initialData?.refund_date ? initialData.refund_date.split('T')[0] : "",
        actual_refund_amount: initialData?.actual_refund_amount || 0,
        customer_refund_amount: initialData?.customer_refund_amount || 0,
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

    const selectedBookingTypeId = watch("booking_type_id")
    const selectedBookingType = bookingTypes.find(t => t.id === selectedBookingTypeId)

    // Auto-fill passenger details
    useEffect(() => {
        if (selectedPaxId) {
            const pax = passengers.find(p => p.id === selectedPaxId)
            if (pax) {
                setValue("title", pax.title || "")
                setValue("surname", pax.surname || "")
                setValue("first_name", pax.first_name || "")
                setValue("contact_info", pax.contact_info || "")
            }
        }
    }, [selectedPaxId, passengers, setValue])

    function handleReset() {
        reset(defaultValues)
    }

    // Agent creation handlers (omitted for brevity, assuming standard dialog handling)
    // ...

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
                {/* 
                     FORM FIELDS OMITTED FOR BREVITY
                     (Include standard FormField components mapping to the schema fields here) 
                     Refer to original file for full JSX 
                */}
                
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
```
