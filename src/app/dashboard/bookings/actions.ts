'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BookingFormData, BookingHistory } from '@/types'

export async function createBooking(formData: BookingFormData) {
    const supabase = await createClient()

    // 1. Check for Duplicate Ticket Number (if provided)
    if (formData.ticket_number && formData.ticket_number.trim() !== '') {
        const { data: existingTickets } = await supabase
            .from('bookings')
            .select('id')
            .eq('ticket_number', formData.ticket_number.trim())
            .neq('ticket_status', 'CANCELED') // Optional: allow reusing ticket number if previous was canceled? Usually no, but maybe VOID. keeping strict for now.

        if (existingTickets && existingTickets.length > 0) {
            throw new Error(`A booking with Ticket Number ${formData.ticket_number} already exists.`)
        }
    }

    // 2. Check for Duplicate PNR + Passenger Name combo
    // We check pax_name because passenger_id might be new for the same actual person
    if (formData.pnr && formData.pax_name) {
        const { data: existingBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('pnr', formData.pnr.trim())
            .ilike('pax_name', formData.pax_name.trim()) // Case insensitive check
            .neq('ticket_status', 'CANCELED') // Allow re-booking if previous was canceled

        if (existingBookings && existingBookings.length > 0) {
            throw new Error(`Passenger ${formData.pax_name} is already booked on PNR ${formData.pnr}.`)
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

export async function updateBooking(id: string, formData: BookingFormData) {
    const supabase = await createClient()

    // We skip duplicate checks for now because the user might just be correcting a typo.
    // However, if they change the ticket number to one that already exists (and isn't this booking), we should block it.
    if (formData.ticket_number && formData.ticket_number.trim() !== '') {
        const { data: existingTickets } = await supabase
            .from('bookings')
            .select('id')
            .eq('ticket_number', formData.ticket_number.trim())
            .neq('id', id) // Exclude current booking
            .neq('ticket_status', 'CANCELED')

        if (existingTickets && existingTickets.length > 0) {
            throw new Error(`A booking with Ticket Number ${formData.ticket_number} already exists.`)
        }
    }

    const { error } = await supabase
        .from('bookings')
        .update({
            pax_name: formData.pax_name,
            passenger_id: formData.passenger_id || null,
            pnr: formData.pnr,
            ticket_number: formData.ticket_number,
            airline: formData.airline,
            entry_date: formData.entry_date,
            departure_date: formData.departure_date,
            return_date: formData.return_date || null,
            fare: formData.fare,
            selling_price: formData.selling_price,
            // payment_status: formData.payment_status, // Usually updated via payments logic, but we can allow edit

            origin: formData.origin,
            destination: formData.destination,
            agent_id: formData.agent_id || null,
            booking_type_id: formData.booking_type_id || null,

            ticket_status: formData.ticket_status,
            ticket_issued_date: formData.ticket_issued_date || null,
            advance_payment: formData.advance_payment,
            platform: formData.platform,

            refund_date: formData.refund_date || null,
            actual_refund_amount: formData.actual_refund_amount,
            customer_refund_amount: formData.customer_refund_amount,

            payment_method: formData.payment_method || null
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating booking:', error)
        throw new Error('Failed to update booking')
    }

    revalidatePath('/dashboard/bookings')
}


export async function getBookings(query?: string) {
    const supabase = await createClient()

    let dbQuery = supabase
        .from('bookings')
        .select(`
            *,
            agent:agents(name),
            booking_type:booking_types(name)
        `)

    if (query) {
        dbQuery = dbQuery.or(`pnr.ilike.%${query}%,ticket_number.ilike.%${query}%,pax_name.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery.order('created_at', { ascending: false })

    if (error) {
        console.error('Fetch error:', error)
        return []
    }

    return data
}

export async function deleteBooking(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/dashboard/bookings')
}

// --- Status & History ---

export async function updateBookingStatus(
    bookingId: string,
    newStatus: string,
    previousStatus: string,
    details?: string
) {
    const supabase = await createClient()

    // 1. Update booking status
    // Logic: If REFUNDED, we might also want to set refund_date if not present? 
    // For now, just status update. User can edit refund details separately if we build that UI, 
    // but the request asked for status change to trigger history.

    const updateData: any = { ticket_status: newStatus };
    if (newStatus === 'REFUNDED') {
        updateData.refund_date = new Date().toISOString();
    }

    const { error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

    if (updateError) throw new Error(updateError.message)

    // 2. Create History Log
    const { error: historyError } = await supabase
        .from('booking_history')
        .insert([{
            booking_id: bookingId,
            action: 'STATUS_CHANGE',
            previous_status: previousStatus,
            new_status: newStatus,
            details: details
        }])

    if (historyError) {
        console.error('Error creating history:', historyError)
        // continue, non-fatal
    }

    revalidatePath('/dashboard/bookings')
}

export async function getBookingHistory(bookingId: string): Promise<BookingHistory[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('booking_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching history:', error)
        return []
    }

    return data as BookingHistory[]
}

// --- Agents ---

export async function getAgents() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('agents').select('*').order('name')
    if (error) return []
    return data
}

export async function createAgent(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('agents').insert([{ name }]).select().single()
    if (error) return { error: error.message }
    return { data }
}

// --- Booking Types ---

export async function getBookingTypes() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('booking_types').select('*').order('name')
    if (error) return []
    return data
}

export async function createBookingType(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('booking_types').insert([{ name }]).select().single()
    if (error) return { error: error.message }
    return { data }
}
