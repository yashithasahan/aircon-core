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

    // 3. Credit Check & Deduction / Debt Accumulation
    if (formData.ticket_status === 'ISSUED' && formData.currency !== 'LKR') {
        const cost = Number(formData.fare) || 0
        const price = Number(formData.selling_price) || 0

        // A. Issuing Partner Logic (Prepaid - Deduct Buying Price)
        if (formData.booking_type_id) {
            const { data: bookingType, error: btError } = await supabase
                .from('booking_types')
                .select('balance, name')
                .eq('id', formData.booking_type_id)
                .single()

            if (btError || !bookingType) throw new Error('Invalid Issued From source.')

            // Removed "Insufficient Funds" check as requested - balance can go negative (Red)

            const newBalance = Number(bookingType.balance) - cost
            const { error: balError } = await supabase
                .from('booking_types')
                .update({ balance: newBalance })
                .eq('id', formData.booking_type_id)

            if (balError) throw new Error('Failed to update credit balance.')

            await supabase.from('credit_transactions').insert([{
                booking_type_id: formData.booking_type_id,
                amount: -cost,
                transaction_type: 'BOOKING_DEDUCTION',
                description: `Booking issuance for PNR ${formData.pnr}`,
                reference_id: null
            }])
        }

        // B. Agent Logic (Credit/Debt - Add Selling Price to Balance)
        if (formData.agent_id) {
            const { data: agent, error: agError } = await supabase
                .from('agents')
                .select('balance, name')
                .eq('id', formData.agent_id)
                .single()

            if (!agError && agent) {
                // Agent Balance = Debt. Issuing a ticket INCREASES debt.
                const newAgentBalance = Number(agent.balance) + price;

                await supabase
                    .from('agents')
                    .update({ balance: newAgentBalance })
                    .eq('id', formData.agent_id)

                await supabase.from('credit_transactions').insert([{
                    agent_id: formData.agent_id,
                    amount: price, // Positive amount adds to debt
                    transaction_type: 'BOOKING_DEDUCTION', // Still technically a deduction from "credit limit" perspective, or "Booking Charge"
                    description: `Booking issuance for PNR ${formData.pnr}`,
                    reference_id: null
                }])
            }
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

                payment_method: formData.payment_method || null,
                currency: formData.currency || 'EUR'
            }
        ])

    if (error) {
        console.error('Error creating booking:', error)
        throw new Error('Failed to create booking')
    }

    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/payments')
}

export async function updateBooking(id: string, formData: BookingFormData) {
    const supabase = await createClient()

    // We skip duplicate checks for now because the user might just be correcting a typo.
    // However, if they change the ticket number to one that already exists (and isn't this booking), we should block it.
    // 1. Check for Duplicate Ticket Number
    if (formData.ticket_number && formData.ticket_number.trim() !== '') {
        const { data: existingTicketBookings } = await supabase
            .from('bookings')
            .select('id, pnr')
            .eq('ticket_number', formData.ticket_number.trim())
            .neq('id', id)

        if (existingTicketBookings && existingTicketBookings.length > 0) {
            const differentPnrBooking = existingTicketBookings.find(b => b.pnr !== formData.pnr);
            if (differentPnrBooking) {
                throw new Error(`Ticket Number ${formData.ticket_number} is already used on a different PNR (${differentPnrBooking.pnr}).`);
            }
        }
    }

    // 2. Check for Duplicate PNR + Status
    if (formData.pnr) {
        const { data: existingPnrBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('pnr', formData.pnr.trim())
            .eq('ticket_status', formData.ticket_status)
            .neq('id', id)

        if (existingPnrBookings && existingPnrBookings.length > 0) {
            throw new Error(`A booking with PNR ${formData.pnr} and status ${formData.ticket_status} already exists.`);
        }
    }

    // 3. Credit Check for Status Change
    const { data: currentBooking } = await supabase
        .from('bookings')
        .select('ticket_status, booking_type_id, agent_id, currency')
        .eq('id', id)
        .single()

    if (currentBooking) {
        // Only trigger if status changing to ISSUED and currency is not LKR (or if currency changed to non-LKR, but let's assume currency doesn't change on invalid status)
        const effectiveCurrency = formData.currency || currentBooking.currency || 'EUR';

        if (currentBooking.ticket_status !== 'ISSUED' && formData.ticket_status === 'ISSUED' && effectiveCurrency !== 'LKR') {

            // A. Partner Deduction
            const typeId = formData.booking_type_id || currentBooking.booking_type_id;
            if (typeId) {
                const { data: bookingType } = await supabase
                    .from('booking_types')
                    .select('balance, name')
                    .eq('id', typeId)
                    .single()

                if (bookingType) {
                    const cost = Number(formData.fare) || 0;
                    // Removed insufficient funds check

                    await supabase
                        .from('booking_types')
                        .update({ balance: Number(bookingType.balance) - cost })
                        .eq('id', typeId)

                    await supabase.from('credit_transactions').insert([{
                        booking_type_id: typeId,
                        amount: -cost,
                        transaction_type: 'BOOKING_DEDUCTION',
                        description: `Booking issuance (update) for PNR ${formData.pnr}`,
                        reference_id: id
                    }])
                }
            }

            // B. Agent Debt
            const agentId = formData.agent_id || currentBooking.agent_id;
            if (agentId) {
                const { data: agent } = await supabase
                    .from('agents')
                    .select('balance, name')
                    .eq('id', agentId)
                    .single()

                if (agent) {
                    const price = Number(formData.selling_price) || 0;
                    const newAgentBalance = Number(agent.balance) + price;

                    await supabase
                        .from('agents')
                        .update({ balance: newAgentBalance })
                        .eq('id', agentId)

                    await supabase.from('credit_transactions').insert([{
                        agent_id: agentId,
                        amount: price,
                        transaction_type: 'BOOKING_DEDUCTION',
                        description: `Booking issuance (update) for PNR ${formData.pnr}`,
                        reference_id: id
                    }])
                }
            }
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
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/payments')
}


export type BookingFilters = {
    query?: string;
    status?: string;
    platform?: string;
    airline?: string;
    startDate?: string;
    endDate?: string;
    agentId?: string;
    bookingTypeId?: string;
}

export async function getBookings(filters: BookingFilters | string = {}) {
    // Backward compatibility: if string, treat as query
    const { query, status, platform, airline, startDate, endDate, agentId, bookingTypeId } =
        typeof filters === 'string' ? { query: filters } as BookingFilters : filters;

    const supabase = await createClient()

    let dbQuery = supabase
        .from('bookings')
        .select(`
            *,
            agent:agents(name),
            booking_type:booking_types(name)
        `)

    if (query) {
        // Sanitize query to prevent breaking PostgREST 'or' syntax (commas are separators)
        const sanitizedQuery = query.replace(/,/g, ' ').trim();
        if (sanitizedQuery) {
            dbQuery = dbQuery.or(`pnr.ilike.%${sanitizedQuery}%,ticket_number.ilike.%${sanitizedQuery}%,pax_name.ilike.%${sanitizedQuery}%,airline.ilike.%${sanitizedQuery}%,ticket_status.ilike.%${sanitizedQuery}%`)
        }
    }

    if (status && status !== 'ALL') {
        dbQuery = dbQuery.eq('ticket_status', status)
    }

    if (platform && platform !== 'ALL') {
        dbQuery = dbQuery.eq('platform', platform)
    }

    if (airline) {
        dbQuery = dbQuery.ilike('airline', `%${airline}%`)
    }

    if (startDate) {
        dbQuery = dbQuery.gte('entry_date', startDate)
    }

    if (endDate) {
        dbQuery = dbQuery.lte('entry_date', endDate)
    }

    if (agentId && agentId !== 'ALL') {
        dbQuery = dbQuery.eq('agent_id', agentId)
    }

    if (bookingTypeId && bookingTypeId !== 'ALL') {
        dbQuery = dbQuery.eq('booking_type_id', bookingTypeId)
    }

    const { data, error } = await dbQuery.order('created_at', { ascending: false })

    if (error) {
        console.error('Fetch error in getBookings:', error)
        return []
    }

    console.log("Search results count:", data?.length);

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

// --- Platforms ---

export async function getPlatforms() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('platforms').select('*').order('name')
    if (error) return []
    return data
}

export async function createPlatform(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('platforms').insert([{ name }]).select().single()
    if (error) return { error: error.message }
    return { data }
}

export async function cloneBookingWithNewStatus(originalBookingId: string, newStatus: string) {
    const supabase = await createClient()

    // 1. Fetch original booking
    const { data: original, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', originalBookingId)
        .single()

    if (error || !original) {
        throw new Error("Original booking not found")
    }

    // 2. Prepare new data (omit generated fields)
    const newBookingData: BookingFormData = {
        pnr: original.pnr,
        pax_name: original.pax_name,
        ticket_number: original.ticket_number || undefined,

        airline: original.airline, // Assuming mandatory in DB but optional in type? Check type.
        entry_date: new Date().toISOString().split('T')[0], // Use TODAY as entry date for the new status record? Or keep original? Usually status change happens NOW.
        // User wants "two bookings with pnr with diffrent satus". 
        // Likely wants to track WHEN it became refunded. So entry_date = today seems appropriate for a "transaction log" style.
        // But let's stick to original entry date if it represents flight date? No, entry_date is usually booking date. 
        // I will use original entry_date to keep it grouped, unless user specified otherwise. 
        // Wait, "entry_date" usually means when the booking was entered. If I clone, it's a new entry.
        // I will use NOW for created_at (handled by DB) but `entry_date` field might be specific.
        // Let's copy original entry_date for consistency of the "Trip", or use current date for the "Action". 
        // Given it's a "Clone", I'll copy the original values to represent the same "Trip/Deal", just different state.
        // EXCEPT ticket_status.

        departure_date: original.departure_date,
        return_date: original.return_date,

        fare: original.fare,
        selling_price: original.selling_price,
        // profit is calculated, so omitted

        payment_status: original.payment_status,
        passenger_id: original.passenger_id,

        origin: original.origin,
        destination: original.destination,
        agent_id: original.agent_id,
        booking_type_id: original.booking_type_id,

        ticket_status: newStatus as 'PENDING' | 'ISSUED' | 'VOID' | 'REFUNDED' | 'CANCELED', // THE CHANGE
        ticket_issued_date: original.ticket_issued_date, // Keep original issue date?
        advance_payment: original.advance_payment,
        platform: original.platform,
        payment_method: original.payment_method,

        // Refund Logic
        refund_date: newStatus === 'REFUNDED' ? new Date().toISOString() : original.refund_date,
        actual_refund_amount: original.actual_refund_amount,
        customer_refund_amount: original.customer_refund_amount,
    }

    // 3. Call createBooking (reuses validation for Duplicate PNR+Status, etc)
    // Note: createBooking expects BookingFormData.
    // My constructed object matches.
    await createBooking(newBookingData);
}
