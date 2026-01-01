'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BookingFormData } from '@/types'

export async function createBooking(formData: BookingFormData) {
    const supabase = await createClient()

    // Basic validation or transformation could happen here
    // e.g., ensure dates are valid

    const { error } = await supabase
        .from('bookings')
        .insert([
            {
                pax_name: formData.pax_name,
                pnr: formData.pnr,
                ticket_number: formData.ticket_number,
                airline: formData.airline,
                entry_date: formData.entry_date,
                departure_date: formData.departure_date,
                return_date: formData.return_date || null,
                fare: formData.fare,
                selling_price: formData.selling_price,
                payment_status: formData.payment_status || 'PENDING'
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
    const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false })

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
