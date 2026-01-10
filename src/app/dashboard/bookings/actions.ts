'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BookingFormData, BookingHistory } from '@/types'

export async function createBooking(formData: BookingFormData) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('bookings')
        .insert([
            {
                pax_name: formData.pax_name, // This is still useful as a snapshot
                passenger_id: formData.passenger_id, // Ensure we link the passenger
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
                agent_id: formData.agent_id,
                booking_type_id: formData.booking_type_id,

                // Mapped Missing Fields
                ticket_status: formData.ticket_status,
                ticket_issued_date: formData.ticket_issued_date || null, // handle empty string date
                advance_payment: formData.advance_payment,
                platform: formData.platform,

                // Refund / Void Fields
                refund_date: formData.refund_date || null,
                actual_refund_amount: formData.actual_refund_amount,
                customer_refund_amount: formData.customer_refund_amount
            }
        ])

    if (error) {
        console.error('Error creating booking:', error)
        throw new Error('Failed to create booking')
    }

    revalidatePath('/dashboard/bookings')
}

export async function getBookings() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            *,
            agent:agents(name),
            booking_type:booking_types(name)
        `)
        .order('created_at', { ascending: false })

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
