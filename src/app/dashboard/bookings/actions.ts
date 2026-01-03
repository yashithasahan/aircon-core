'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BookingFormData } from '@/types'

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
                platform: formData.platform
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
