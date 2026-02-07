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
        if (formData.issued_partner_id) {
            const { data: issuedPartner, error: btError } = await supabase
                .from('issued_partners')
                .select('balance, name')
                .eq('id', formData.issued_partner_id)
                .single()

            if (btError || !issuedPartner) throw new Error('Invalid Issued Partner.')

            // Removed "Insufficient Funds" check as requested - balance can go negative (Red)

            const newBalance = Number(issuedPartner.balance) - cost
            const { error: balError } = await supabase
                .from('issued_partners')
                .update({ balance: newBalance })
                .eq('id', formData.issued_partner_id)

            if (balError) throw new Error('Failed to update credit balance.')

            await supabase.from('credit_transactions').insert([{
                issued_partner_id: formData.issued_partner_id,
                amount: -cost,
                transaction_type: 'BOOKING_DEDUCTION',
                description: `Booking issuance for PNR ${formData.pnr}`,
                reference_id: null
            }])
        }

        // B. Agent Logic (Credit/Debt - Add Selling Price to Balance)
        // ONLY if booking_source is 'AGENT'
        if (formData.booking_source === 'AGENT' && formData.agent_id) {
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

                // Agent Logic: Only set agent_id if source is AGENT
                agent_id: (formData.booking_source === 'AGENT' && formData.agent_id) ? formData.agent_id : null,
                booking_source: formData.booking_source || 'AGENT',

                issued_partner_id: formData.issued_partner_id || null, // FIX: handle empty string

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

    // 3. Financial Update Logic (Credit/Debt Reversal & Recharge)
    const { data: currentBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single()

    if (currentBooking) {
        // Detect Financial Changes
        const isStatusChanged = currentBooking.ticket_status !== formData.ticket_status;
        const isAmountChanged = Number(currentBooking.fare) !== Number(formData.fare) || Number(currentBooking.selling_price) !== Number(formData.selling_price);
        // logic for agent/source change: 
        // If old was AGENT and new is NOT AGENT -> Clean up old agent debt.
        // If old was NOT AGENT and new IS AGENT -> Charge new agent debt.
        // If agent_id changed -> Revert old, charge new.
        const isAgentChanged = currentBooking.agent_id !== (formData.agent_id || null) || currentBooking.booking_source !== formData.booking_source;
        const isPartnerChanged = currentBooking.issued_partner_id !== (formData.issued_partner_id || null);

        // Broad condition: If anything relevant changed, we re-evaluate financials.
        // We only care if status is involved OR if it remains ISSUED but details changed.
        const hasFinancialChange = isStatusChanged || (currentBooking.ticket_status === 'ISSUED' && (isAmountChanged || isAgentChanged || isPartnerChanged));

        if (hasFinancialChange) {

            // Step A: REVERSE Old Transaction (if it was ISSUED)
            if (currentBooking.ticket_status === 'ISSUED') {
                // 1. Reverse Issued Partner (Refund)
                if (currentBooking.issued_partner_id) {
                    const { data: oldPartner } = await supabase
                        .from('issued_partners')
                        .select('balance')
                        .eq('id', currentBooking.issued_partner_id)
                        .single()

                    if (oldPartner) {
                        const oldCost = Number(currentBooking.fare) || 0;
                        const { error: refundError } = await supabase
                            .from('issued_partners')
                            .update({ balance: Number(oldPartner.balance) + oldCost })
                            .eq('id', currentBooking.issued_partner_id)

                        if (refundError) throw new Error(`Failed to refund partner: ${refundError.message}`)

                        const { error: logError } = await supabase.from('credit_transactions').insert([{
                            issued_partner_id: currentBooking.issued_partner_id,
                            amount: oldCost,
                            transaction_type: 'REFUND', // or REVERSAL
                            description: `Update Reversal for PNR ${currentBooking.pnr}`,
                            reference_id: id
                        }])

                        if (logError) throw new Error(`Failed to log refund: ${logError.message}`)
                    }
                }

                // 2. Reverse Agent (Reduce Debt)
                if (currentBooking.agent_id) {
                    const { data: oldAgent } = await supabase
                        .from('agents')
                        .select('balance')
                        .eq('id', currentBooking.agent_id)
                        .single()

                    if (oldAgent) {
                        const oldPrice = Number(currentBooking.selling_price) || 0;
                        const { error: reduceError } = await supabase
                            .from('agents')
                            .update({ balance: Number(oldAgent.balance) - oldPrice })
                            .eq('id', currentBooking.agent_id)

                        if (reduceError) throw new Error(`Failed to reduce agent debt: ${reduceError.message}`)

                        const { error: logError } = await supabase.from('credit_transactions').insert([{
                            agent_id: currentBooking.agent_id,
                            amount: -oldPrice,
                            transaction_type: 'REFUND',
                            description: `Update Reversal for PNR ${currentBooking.pnr}`,
                            reference_id: id
                        }])

                        if (logError) throw new Error(`Failed to log agent refund: ${logError.message}`)
                    }
                }
            }

            // Step B: CHARGE New Transaction (if it becomes/stays ISSUED)
            // Note: currency check should apply.
            const effectiveCurrency = formData.currency || currentBooking.currency || 'EUR';

            if (formData.ticket_status === 'ISSUED' && effectiveCurrency !== 'LKR') {
                const newCost = Number(formData.fare) || 0;
                const newPrice = Number(formData.selling_price) || 0;

                // 1. Charge Issued Partner
                const newPartnerId = formData.issued_partner_id;
                if (newPartnerId) {
                    const { data: newPartner } = await supabase
                        .from('issued_partners')
                        .select('balance')
                        .eq('id', newPartnerId)
                        .single()

                    if (newPartner) {
                        const { error: chargeError } = await supabase
                            .from('issued_partners')
                            .update({ balance: Number(newPartner.balance) - newCost })
                            .eq('id', newPartnerId)

                        if (chargeError) throw new Error(`Failed to charge partner: ${chargeError.message}`)

                        const { error: logError } = await supabase.from('credit_transactions').insert([{
                            issued_partner_id: newPartnerId,
                            amount: -newCost,
                            transaction_type: 'BOOKING_DEDUCTION',
                            description: `Booking issuance (update) for PNR ${formData.pnr}`,
                            reference_id: id
                        }])

                        if (logError) throw new Error(`Failed to log deduction: ${logError.message}`)
                    }
                }

                // 2. Charge Agent (Add Debt)
                const newSource = formData.booking_source || 'AGENT';
                const newAgentId = formData.agent_id;

                if (newSource === 'AGENT' && newAgentId) {
                    const { data: newAgent } = await supabase
                        .from('agents')
                        .select('balance')
                        .eq('id', newAgentId)
                        .single()

                    if (newAgent) {
                        const { error: debtError } = await supabase
                            .from('agents')
                            .update({ balance: Number(newAgent.balance) + newPrice })
                            .eq('id', newAgentId)

                        if (debtError) throw new Error(`Failed to add agent debt: ${debtError.message}`)

                        const { error: logError } = await supabase.from('credit_transactions').insert([{
                            agent_id: newAgentId,
                            amount: newPrice,
                            transaction_type: 'BOOKING_DEDUCTION',
                            description: `Booking issuance (update) for PNR ${formData.pnr}`,
                            reference_id: id
                        }])

                        if (logError) throw new Error(`Failed to log agent debt: ${logError.message}`)
                    }
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
            // Agent Logic: Only set agent_id if source is AGENT
            agent_id: (formData.booking_source === 'AGENT' && formData.agent_id) ? formData.agent_id : null,
            booking_source: formData.booking_source || 'AGENT',

            issued_partner_id: formData.issued_partner_id || null,

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
    issuedPartnerId?: string;
    page?: number;
    limit?: number;
}

export async function getBookings(filters: BookingFilters | string = {}) {
    // Backward compatibility: if string, treat as query
    const { query, status, platform, airline, startDate, endDate, agentId, issuedPartnerId, page, limit } =
        typeof filters === 'string' ? { query: filters } as BookingFilters : filters;

    const supabase = await createClient()

    let dbQuery = supabase
        .from('bookings')
        .select(`
            *,
            agent:agents(name),
            issued_partner:issued_partners(name)
        `, { count: 'exact' })
        .eq('is_deleted', false)

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

    if (issuedPartnerId && issuedPartnerId !== 'ALL') {
        dbQuery = dbQuery.eq('issued_partner_id', issuedPartnerId)
    }

    // Pagination
    if (page && limit) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        dbQuery = dbQuery.range(from, to);
    }

    const { data, error, count } = await dbQuery.order('created_at', { ascending: false })

    if (error) {
        console.error('Fetch error in getBookings:', error)
        return { data: [], count: 0 }
    }

    console.log("Search results count:", count);

    return { data: data as any[], count: count || 0 }
}

export async function deleteBooking(id: string) {
    const supabase = await createClient()

    // 1. Fetch booking to check status and reverse credits if needed
    const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single()

    if (booking && booking.ticket_status === 'ISSUED') {
        const cost = Number(booking.fare) || 0
        const price = Number(booking.selling_price) || 0

        // A. Reverse Issued Partner (Refund the deduction)
        if (booking.issued_partner_id) {
            const { data: partner } = await supabase
                .from('issued_partners')
                .select('balance')
                .eq('id', booking.issued_partner_id)
                .single()

            if (partner) {
                await supabase
                    .from('issued_partners')
                    .update({ balance: Number(partner.balance) + cost }) // Add back the cost
                    .eq('id', booking.issued_partner_id)

                await supabase.from('credit_transactions').insert([{
                    issued_partner_id: booking.issued_partner_id,
                    amount: cost, // Positive amount = Refund
                    transaction_type: 'REFUND',
                    description: `Booking deletion reversal for PNR ${booking.pnr}`,
                    reference_id: id // keeping ID even if booking deleted? Or null? Maybe null is safer if constraint checks FK. Let's use null to be safe or assuming transaction log isn't identifying by FK to booking (it might).
                    // Actually, if reference_id is FK to booking(id) ON DELETE SET NULL/CASCADE, then it matters.
                    // Assuming reference_id is nullable.
                }])
            }
        }

        // B. Reverse Agent (Reduce the Debt)
        // ONLY if it was an AGENT booking (booking_source 'AGENT' check or just existence of agent_id?)
        // Safer to check simple existence of agent_id + booking_source check if we rely on it, but agent_id presence on ISSUED booking implies debt was added.
        if (booking.agent_id) {
            const { data: agent } = await supabase
                .from('agents')
                .select('balance')
                .eq('id', booking.agent_id)
                .single()

            if (agent) {
                await supabase
                    .from('agents')
                    .update({ balance: Number(agent.balance) - price }) // Reduce debt
                    .eq('id', booking.agent_id)

                await supabase.from('credit_transactions').insert([{
                    agent_id: booking.agent_id,
                    amount: -price, // Negative amount = Reduce Debt
                    transaction_type: 'REFUND', // 'REFUND' or 'ADJUSTMENT'
                    description: `Booking deletion reversal for PNR ${booking.pnr}`,
                    reference_id: null
                }])
            }
        }
    }

    const { error } = await supabase
        .from('bookings')
        .update({ is_deleted: true })
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
    const { data, error } = await supabase.from('agents').select('*').eq('is_deleted', false).order('name')
    if (error) return []
    return data
}

export async function createAgent(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('agents').insert([{ name }]).select().single()

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    return { data }
}

export async function updateAgent(id: string, name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('agents').update({ name }).eq('id', id).select().single()

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    return { data }
}

export async function deleteAgent(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('agents').update({ is_deleted: true }).eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/payments')
    return { success: true }
}

// --- Issued Partners ---

export async function getIssuedPartners() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('issued_partners').select('*').eq('is_deleted', false).order('name')
    if (error) return []
    return data
}

export async function createIssuedPartner(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('issued_partners').insert([{ name }]).select().single()

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    return { data }
}

export async function updateIssuedPartner(id: string, name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('issued_partners').update({ name }).eq('id', id).select().single()

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    return { data }
}

export async function deleteIssuedPartner(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('issued_partners').update({ is_deleted: true }).eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/payments')
    return { success: true }
}

// --- Platforms ---

export async function getPlatforms() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('platforms').select('*').eq('is_deleted', false).order('name')
    if (error) return []
    return data
}

export async function createPlatform(name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('platforms').insert([{ name }]).select().single()

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    return { data }
}

export async function updatePlatform(id: string, name: string) {
    const supabase = await createClient()
    const { data, error } = await supabase.from('platforms').update({ name }).eq('id', id).select().single()

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    return { data }
}

export async function deletePlatform(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('platforms').update({ is_deleted: true }).eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/dashboard/entities')
    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard/payments')
    return { success: true }
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
        booking_source: original.booking_source,
        issued_partner_id: original.issued_partner_id || original.booking_type_id, // Fallback for old records if DB just migrated but data object still had old key? (Actually type will enforcement requires issued_partner_id)

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
