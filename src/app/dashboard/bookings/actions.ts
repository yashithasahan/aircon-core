'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { BookingFormData, BookingHistory, PassengerDetail } from '@/types'


export async function createBooking(formData: BookingFormData) {
    const supabase = await createClient()

    // 1. Calculate Totals & Prepare Data
    const totalFare = formData.passengers?.reduce((sum, p) => sum + (Number(p.cost_price) || 0), 0) || 0;
    const totalSellingPrice = formData.passengers?.reduce((sum, p) => sum + (Number(p.sale_price) || 0), 0) || 0;

    // Fix: Enforce REISSUE status if booking_type is REISSUE
    // This ensures reports show "REISSUE" instead of "ISSUED" for reissued tickets.
    if (formData.booking_type === 'REISSUE' && formData.ticket_status === 'ISSUED') {
        formData.ticket_status = 'REISSUE' as any;
    }

    // Construct display strings
    // pax_name: "Title First Surname, Title First Surname"
    const paxNameDisplay = formData.passengers?.map(p => {
        return (p.first_name || p.surname) ? `${p.title || ''} ${p.first_name || ''} ${p.surname || ''}`.trim() : 'Unknown';
    }).join(', ') || 'Unknown';

    // Ticket Number: Join all ticket numbers for searchability
    const mainTicketNumber = formData.passengers?.map(p => p.ticket_number).filter(Boolean).join(', ') || '';
    const mainPassengerId = formData.passengers?.length > 0 ? formData.passengers[0].passenger_id : null;

    // 2. Validate Duplicate Ticket Numbers (if strict check is desired)
    // We check if any ticket number is already used in booking_passengers (except voids maybe?)
    // For now, let's skip strict global uniqueness check on ticket numbers to avoid blocking legacy data issues, 
    // unless user explicitly requested it. User said "unique ticket numbers", let's assume valid input for now.
    // We can add a check later if needed.

    // 3. Check for Duplicate PNR + Status combo (on Bookings table)
    if (formData.pnr) {
        const { data: existingPnrBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('pnr', formData.pnr.trim())
            .eq('ticket_status', formData.ticket_status)
            .eq('is_deleted', false) // Ignore soft-deleted bookings

        if (existingPnrBookings && existingPnrBookings.length > 0) {
            throw new Error(`A booking with PNR ${formData.pnr} and status ${formData.ticket_status} already exists.`);
        }
    }

    // 4. Credit Check & Deduction / Debt Accumulation (Using TOTALS)
    if (['ISSUED', 'REFUNDED', 'REISSUE'].includes(formData.ticket_status || '') && formData.currency !== 'LKR') {
        const cost = totalFare;
        const price = totalSellingPrice;

        const isReissue = formData.ticket_status === 'REISSUE' || formData.booking_type === 'REISSUE';
        const transactionDesc = isReissue ? `Booking Re-issuance for PNR ${formData.pnr}` : `Booking issuance for PNR ${formData.pnr}`;

        // A. Issuing Partner Logic
        if (formData.issued_partner_id) {
            const { data: issuedPartner, error: btError } = await supabase
                .from('issued_partners')
                .select('balance, name')
                .eq('id', formData.issued_partner_id)
                .single()

            if (btError || !issuedPartner) throw new Error('Invalid Issued Partner.')

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
                description: transactionDesc,
                reference_id: null,
                created_at: new Date(formData.ticket_issued_date || formData.entry_date).toISOString()
            }])
        }

        // B. Agent Logic
        if (formData.booking_source === 'AGENT' && formData.agent_id) {
            const { data: agent, error: agError } = await supabase
                .from('agents')
                .select('balance, name')
                .eq('id', formData.agent_id)
                .single()

            if (!agError && agent) {
                const newAgentBalance = Number(agent.balance) + price;

                await supabase
                    .from('agents')
                    .update({ balance: newAgentBalance })
                    .eq('id', formData.agent_id)

                await supabase.from('credit_transactions').insert([{
                    agent_id: formData.agent_id,
                    amount: price,
                    transaction_type: 'BOOKING_DEDUCTION',
                    description: transactionDesc,
                    reference_id: null,
                    created_at: new Date(formData.ticket_issued_date || formData.entry_date).toISOString()
                }])
            }
        }
    }

    // 5. Insert Booking Header
    const { data: booking, error } = await supabase
        .from('bookings')
        .insert([
            {
                pax_name: paxNameDisplay,
                passenger_id: mainPassengerId || null,
                pnr: formData.pnr,
                ticket_number: mainTicketNumber,
                airline: formData.airline,
                entry_date: formData.entry_date,
                departure_date: formData.departure_date,
                return_date: formData.return_date || null,
                fare: totalFare,
                selling_price: totalSellingPrice,
                payment_status: formData.payment_status || 'PENDING',

                origin: formData.origin,
                destination: formData.destination,

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

                payment_method: formData.payment_method || null,
                currency: formData.currency || 'EUR',
                parent_booking_id: formData.parent_booking_id || null,
                booking_type: formData.booking_type || 'ORIGINAL'
            }
        ])
        .select()
        .single()

    if (error || !booking) {
        console.error('Error creating booking:', error)
        throw new Error('Failed to create booking')
    }

    // 6. Insert Passengers
    // Map existing formData.passengers to DB rows
    if (formData.passengers?.length > 0) {
        const passengerRows = formData.passengers.map(p => ({
            booking_id: booking.id,
            passenger_id: p.passenger_id || null,
            pax_type: p.pax_type,
            title: p.title,
            first_name: p.first_name,
            surname: p.surname,
            ticket_number: p.ticket_number,
            passport_number: p.passport_number,
            passport_expiry: p.passport_expiry ? new Date(p.passport_expiry).toISOString() : null, // Ensure valid date format if needed, or leave string if text column? SQL says DATE.
            sale_price: Number(p.sale_price) || 0,
            cost_price: Number(p.cost_price) || 0,
            ticket_status: (formData.ticket_status === 'REISSUE' && (p.ticket_status === 'ISSUED' || !p.ticket_status))
                ? 'REISSUE'
                : (p.ticket_status || formData.ticket_status || 'PENDING'),
            phone_number: p.phone_number,
            contact_info: p.contact_info
        }));

        const { error: paxError } = await supabase.from('booking_passengers').insert(passengerRows);
        if (paxError) {
            console.error('Error creating passengers:', paxError);
            // Should we rollback booking? Technically yes, but Supabase doesn't support easy transactions in client lib without RPC.
            // We'll throw error and let user retry or delete. 
            throw new Error('Failed to save passenger details');
        }
    }

    // 7. Sync Passenger Profile
    if (formData.passengers?.length > 0) {
        for (const p of formData.passengers) {
            if (p.passenger_id) {
                const { error: updateError } = await supabase.from('passengers').update({
                    passport_number: p.passport_number,
                    passport_expiry: p.passport_expiry ? new Date(p.passport_expiry).toISOString() : null,
                    phone_number: p.phone_number,
                    contact_info: p.contact_info,
                    title: p.title,
                    first_name: p.first_name,
                    surname: p.surname
                }).eq('id', p.passenger_id);

                if (updateError) {
                    console.error(`Failed to update passenger profile for ${p.passenger_id}:`, updateError);
                }
            }
        }
    }

    revalidatePath('/dashboard/bookings')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/payments')
}


export async function updateBooking(id: string, formData: BookingFormData) {
    const supabase = await createClient()

    // 3. Financial Update Logic (Credit/Debt Reversal & Recharge)
    const { data: currentBooking } = await supabase
        .from('bookings')
        .select(`
            *,
            passengers:booking_passengers(*)
        `)
        .eq('id', id)
        .single()

    // 0. Auto-derive Booking Status from Passengers
    // If we have passengers, the booking status should reflect their collective status.
    if (formData.passengers?.length > 0) {
        const paxs = formData.passengers;
        const allRefunded = paxs.every(p => p.ticket_status === 'REFUNDED');
        const allVoid = paxs.every(p => p.ticket_status === 'VOID');
        const allReissue = paxs.every(p => p.ticket_status === 'REISSUE');

        // Priority Logic
        if (allRefunded) {
            formData.ticket_status = 'REFUNDED';
        } else if (allVoid) {
            formData.ticket_status = 'VOID';
        } else if (allReissue) {
            formData.ticket_status = 'REISSUE' as any;
        } else if (paxs.some(p => p.ticket_status === 'ISSUED' || (p.ticket_status as string) === 'REISSUE')) {
            // If at least one is ISSUED or REISSUE, the booking is active

            // Fix: If original booking was REISSUE (or formData says so), prefer REISSUE status over ISSUED
            // even if passengers are marked as ISSUED.
            const isReissueType = formData.booking_type === 'REISSUE' || currentBooking?.booking_type === 'REISSUE';

            if (paxs.some(p => (p.ticket_status as string) === 'REISSUE') || isReissueType) {
                formData.ticket_status = 'REISSUE' as any;
            } else {
                formData.ticket_status = 'ISSUED';
            }
        }
        // Else keep existing (e.g. PENDING)
    }

    // 1. Calculate Totals & Prepare Data
    // VOID tickets do not contribute to the total (effective price 0, triggers reversal)
    // REFUNDED tickets KEEP their original price contribution (so we don't reverse the sale, but add a separate refund transaction)
    const totalFare = formData.passengers?.reduce((sum, p) => p.ticket_status === 'VOID' ? sum : sum + (Number(p.cost_price) || 0), 0) || 0;
    const totalSellingPrice = formData.passengers?.reduce((sum, p) => p.ticket_status === 'VOID' ? sum : sum + (Number(p.sale_price) || 0), 0) || 0;

    const paxNameDisplay = formData.passengers?.map(p => {
        return (p.first_name || p.surname) ? `${p.title || ''} ${p.first_name || ''} ${p.surname || ''}`.trim() : 'Unknown';
    }).join(', ') || 'Unknown';

    const mainTicketNumber = formData.passengers?.map(p => p.ticket_number).filter(Boolean).join(', ') || '';
    const mainPassengerId = formData.passengers?.length > 0 ? formData.passengers[0].passenger_id : null;


    // 2. Check for Duplicate PNR + Status
    if (formData.pnr) {
        const { data: existingPnrBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('pnr', formData.pnr.trim())
            .eq('ticket_status', formData.ticket_status)
            .neq('id', id)
            .eq('is_deleted', false) // Ignore deleted bookings

        if (existingPnrBookings && existingPnrBookings.length > 0) {
            throw new Error(`A booking with PNR ${formData.pnr} and status ${formData.ticket_status} already exists.`);
        }
    }


    // Note: currentBooking is already fetched at top of function
    if (currentBooking) {

        // Detect Financial Changes using aggregated totals
        const isStatusChanged = currentBooking.ticket_status !== formData.ticket_status;

        // Helper to compare amounts with epsilon
        const isAmountDifferent = (a: number, b: number) => Math.abs(a - b) > 0.001;
        const isAmountChanged = isAmountDifferent(Number(currentBooking.fare) || 0, totalFare) ||
            isAmountDifferent(Number(currentBooking.selling_price) || 0, totalSellingPrice);

        const isAgentChanged = currentBooking.agent_id !== (formData.agent_id || null) || currentBooking.booking_source !== formData.booking_source;
        const isPartnerChanged = currentBooking.issued_partner_id !== (formData.issued_partner_id || null);

        // Helper to compare dates (string vs Date object normalization)
        const normalizeDate = (d: string | null) => d ? new Date(d).toISOString().split('T')[0] : null; // Compare YYYY-MM-DD for safety, or full ISO if time matters?
        // Actually ticket_issued_date might be full timestamp. Let's compare limits.
        const isDateDifferent = (d1: string | null, d2: string | null) => {
            if (!d1 && !d2) return false;
            if (!d1 || !d2) return true;
            return new Date(d1).getTime() !== new Date(d2).getTime();
        }
        const isDateChanged = isDateDifferent(currentBooking.ticket_issued_date, formData.ticket_issued_date || null);

        // A booking is "Billable" if it is ISSUED, REISSUE, or REFUNDED
        const isBillableStatus = (status: string) => ['ISSUED', 'REFUNDED', 'REISSUE'].includes(status);

        const wasBillable = isBillableStatus(currentBooking.ticket_status || '');
        const isBillable = isBillableStatus(formData.ticket_status || '');

        // We trigger an update if:
        // 1. Billable status FLIPPED (e.g. Billable -> Non-Billable OR Non-Billable -> Billable)
        // 2. Status is Billable AND amounts/partners/dates changed
        // NOTE: We do NOT trigger solely on isStatusChanged anymore if both old/new are Billable (e.g. REISSUE -> REFUNDED)
        // because usually cost/sell price remains same for the base ticket, and Refund is handled separately in Step C.
        const hasFinancialChange = (wasBillable !== isBillable) ||
            (wasBillable && isBillable && (isAmountChanged || isAgentChanged || isPartnerChanged || isDateChanged));

        if (hasFinancialChange) {

            // Step A: REVERSE Old Transaction (if it was Billable ie ISSUED or REFUNDED)
            if (wasBillable) {
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

                        await supabase.from('credit_transactions').insert([{
                            issued_partner_id: currentBooking.issued_partner_id,
                            amount: oldCost,
                            transaction_type: 'REFUND', // or REVERSAL
                            description: `Update Reversal for PNR ${currentBooking.pnr}`,
                            reference_id: id,
                            created_at: new Date(currentBooking.ticket_issued_date || currentBooking.entry_date).toISOString()
                        }])
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

                        await supabase.from('credit_transactions').insert([{
                            agent_id: currentBooking.agent_id,
                            amount: -oldPrice,
                            transaction_type: 'REFUND',
                            description: `Update Reversal for PNR ${currentBooking.pnr}`,
                            reference_id: id,
                            created_at: new Date(currentBooking.ticket_issued_date || currentBooking.entry_date).toISOString()
                        }])
                    }
                }
            }

            // Step B: CHARGE New Transaction (if it becomes/stays Billable ie ISSUED or REFUNDED)
            const effectiveCurrency = formData.currency || currentBooking.currency || 'EUR';

            if (isBillable && effectiveCurrency !== 'LKR') {
                const newCost = totalFare; // Use calculated total
                const newPrice = totalSellingPrice; // Use calculated total

                const isReissue = currentBooking.booking_type === 'REISSUE' || formData.ticket_status === 'REISSUE';
                const transactionDesc = isReissue ? `Booking Re-issuance (update) for PNR ${formData.pnr}` : `Booking issuance (update) for PNR ${formData.pnr}`;

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

                        await supabase.from('credit_transactions').insert([{
                            issued_partner_id: newPartnerId,
                            amount: -newCost,
                            transaction_type: 'BOOKING_DEDUCTION',
                            description: transactionDesc,
                            reference_id: id,
                            created_at: new Date(formData.ticket_issued_date || formData.entry_date).toISOString()
                        }])
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

                        await supabase.from('credit_transactions').insert([{
                            agent_id: newAgentId,
                            amount: newPrice,
                            transaction_type: 'BOOKING_DEDUCTION',
                            description: transactionDesc,
                            reference_id: id,
                            created_at: new Date(formData.ticket_issued_date || formData.entry_date).toISOString()
                        }])
                    }
                }
            }
        }

        // Step C: Handle Passenger Refunds (newly marked as REFUNDED)
        if (formData.passengers) {
            for (const pax of formData.passengers) {
                if (pax.ticket_status === 'REFUNDED') {
                    // Check if this is a NEW refund (compare with old pax)
                    const oldPax = (currentBooking as any).passengers?.find((op: any) =>
                        (pax.ticket_number && op.ticket_number === pax.ticket_number) ||
                        (op.first_name === pax.first_name && op.surname === pax.surname)
                    );

                    // Trigger refund if status changed to REFUNDED
                    const isNewRefund = !oldPax || oldPax.ticket_status !== 'REFUNDED';

                    if (isNewRefund) {
                        const refundPartner = Number(pax.refund_amount_partner) || 0;
                        const refundCustomer = Number(pax.refund_amount_customer) || 0;
                        const refundDate = pax.refund_date ? new Date(pax.refund_date).toISOString() : new Date().toISOString();

                        // 1. Refund from Partner (Increase Balance)
                        if (refundPartner > 0 && formData.issued_partner_id) {
                            const { data: partner } = await supabase.from('issued_partners').select('balance').eq('id', formData.issued_partner_id).single();
                            if (partner) {
                                await supabase.from('issued_partners').update({ balance: Number(partner.balance) + refundPartner }).eq('id', formData.issued_partner_id);
                                await supabase.from('credit_transactions').insert([{
                                    issued_partner_id: formData.issued_partner_id,
                                    amount: refundPartner,
                                    transaction_type: 'REFUND',
                                    description: `Refund from Partner for Ticket ${pax.ticket_number}`,
                                    reference_id: id,
                                    created_at: refundDate
                                }]);
                            }
                        }

                        // 2. Refund to Customer (Decrease Agent Debt/Balance)
                        if (refundCustomer > 0 && (formData.booking_source === 'AGENT' && formData.agent_id)) {
                            const { data: agent } = await supabase.from('agents').select('balance').eq('id', formData.agent_id).single();
                            if (agent) {
                                await supabase.from('agents').update({ balance: Number(agent.balance) - refundCustomer }).eq('id', formData.agent_id);
                                await supabase.from('credit_transactions').insert([{
                                    agent_id: formData.agent_id,
                                    amount: -refundCustomer,
                                    transaction_type: 'REFUND',
                                    description: `Refund to Agent/Customer for Ticket ${pax.ticket_number}`,
                                    reference_id: id,
                                    created_at: refundDate
                                }]);
                            }
                        }
                    }
                }
            }
        }

        // --- HISTORY LOGGING START ---
        const historyEntries = [];
        const timestamp = new Date().toISOString();

        // 1. Status Change
        if (currentBooking.ticket_status !== formData.ticket_status) {
            historyEntries.push({
                booking_id: id,
                action: 'STATUS_CHANGE',
                previous_status: currentBooking.ticket_status,
                new_status: formData.ticket_status,
                details: `Status changed from ${currentBooking.ticket_status} to ${formData.ticket_status}`,
                created_at: timestamp
            });
        }

        // 2. Financial Changes
        if (Number(currentBooking.fare) !== totalFare) {
            historyEntries.push({
                booking_id: id,
                action: 'COST_CHANGE',
                previous_status: currentBooking.fare?.toString(),
                new_status: totalFare.toString(),
                details: `Total Cost updated from ${currentBooking.fare} to ${totalFare}`,
                created_at: timestamp
            });
        }

        if (Number(currentBooking.selling_price) !== totalSellingPrice) {
            historyEntries.push({
                booking_id: id,
                action: 'PRICE_CHANGE',
                previous_status: currentBooking.selling_price?.toString(),
                new_status: totalSellingPrice.toString(),
                details: `Selling Price updated from ${currentBooking.selling_price} to ${totalSellingPrice}`,
                created_at: timestamp
            });
        }

        // 3. PNR / Airline / Date Changes
        if (currentBooking.pnr !== formData.pnr) {
            historyEntries.push({
                booking_id: id,
                action: 'PNR_CHANGE',
                previous_status: currentBooking.pnr,
                new_status: formData.pnr,
                details: `PNR changed from ${currentBooking.pnr} to ${formData.pnr}`,
                created_at: timestamp
            });
        }

        // 4. Refund Logging (Passenger Level)
        if (formData.passengers) {
            for (const pax of formData.passengers) {
                if (pax.ticket_status === 'REFUNDED') {
                    const oldPax = (currentBooking as any).passengers?.find((op: any) =>
                        (pax.ticket_number && op.ticket_number === pax.ticket_number) ||
                        (op.first_name === pax.first_name && op.surname === pax.surname)
                    );

                    if (!oldPax || oldPax.ticket_status !== 'REFUNDED') {
                        historyEntries.push({
                            booking_id: id,
                            action: 'TICKET_REFUND',
                            previous_status: 'ISSUED', // Assumed
                            new_status: 'REFUNDED',
                            details: `Ticket ${pax.ticket_number} (${pax.first_name} ${pax.surname}) marked as REFUNDED`,
                            created_at: timestamp
                        });
                    }
                }
            }
        }

        if (historyEntries.length > 0) {
            const { error: logError } = await supabase.from('booking_history').insert(historyEntries);
            if (logError) console.error('Failed to log history:', logError);
        }
    }
    // --- HISTORY LOGGING END ---





    const totalRefundPartner = formData.passengers?.reduce((sum, p) => sum + (Number(p.refund_amount_partner) || 0), 0) || 0;
    const totalRefundCustomer = formData.passengers?.reduce((sum, p) => sum + (Number(p.refund_amount_customer) || 0), 0) || 0;
    // Use the refund date from the first refunded passenger, or fallback to current date if refund amounts exist
    const refundDate = formData.passengers?.find(p => p.ticket_status === 'REFUNDED' && p.refund_date)?.refund_date
        || (totalRefundPartner > 0 || totalRefundCustomer > 0 ? new Date().toISOString() : null);

    const { error } = await supabase
        .from('bookings')
        .update({
            pax_name: paxNameDisplay,
            passenger_id: mainPassengerId || null,
            pnr: formData.pnr,
            ticket_number: mainTicketNumber,
            airline: formData.airline,
            entry_date: formData.entry_date,
            departure_date: formData.departure_date,
            return_date: formData.return_date || null,
            fare: totalFare,
            selling_price: totalSellingPrice,
            // payment_status: formData.payment_status, // Usually updated via payments logic

            origin: formData.origin,
            destination: formData.destination,
            agent_id: (formData.booking_source === 'AGENT' && formData.agent_id) ? formData.agent_id : null,
            booking_source: formData.booking_source || 'AGENT',

            issued_partner_id: formData.issued_partner_id || null,

            ticket_status: formData.ticket_status,
            ticket_issued_date: formData.ticket_issued_date || null,
            advance_payment: formData.advance_payment,
            platform: formData.platform,

            refund_date: refundDate,
            actual_refund_amount: totalRefundPartner,
            customer_refund_amount: totalRefundCustomer,

            payment_method: formData.payment_method || null,
            booking_type: formData.booking_type || 'ORIGINAL'
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating booking:', error)
        throw new Error('Failed to update booking')
    }

    // 4. Sync Passengers
    // Simplest strategy: Delete all old passengers for this booking and insert new ones.
    // This ensures no orphaned records and handles additions/removals/updates cleanly.
    // LIMITATION: If we had other tables linking to booking_passengers.id, this would break them.
    // Assuming for now booking_passengers is a leaf node or we are okay with new IDs.

    // Check if we have passengers provided. If empty array, we might be deleting all? 
    if (formData.passengers) {
        const { error: deleteError } = await supabase.from('booking_passengers').delete().eq('booking_id', id);
        if (deleteError) {
            console.error('Error clearing old passengers:', deleteError);
            throw new Error('Failed to update passengers');
        }

        if (formData.passengers.length > 0) {
            const passengerRows = formData.passengers.map(p => ({
                booking_id: id,
                passenger_id: p.passenger_id || null,
                pax_type: p.pax_type,
                title: p.title,
                first_name: p.first_name,
                surname: p.surname,
                ticket_number: p.ticket_number,
                passport_number: p.passport_number,
                passport_expiry: p.passport_expiry ? new Date(p.passport_expiry).toISOString() : null,
                sale_price: Number(p.sale_price) || 0,
                cost_price: Number(p.cost_price) || 0,
                ticket_status: p.ticket_status || formData.ticket_status || 'PENDING',
                refund_amount_partner: Number(p.refund_amount_partner) || 0,
                refund_amount_customer: Number(p.refund_amount_customer) || 0,
                refund_date: p.refund_date ? new Date(p.refund_date).toISOString() : null,
                phone_number: p.phone_number,
                contact_info: p.contact_info
            }));

            const { error: paxError } = await supabase.from('booking_passengers').insert(passengerRows);
            if (paxError) {
                console.error('Error inserting new passengers:', paxError);
                throw new Error('Failed to save updated passengers');
            }
        }
    }

    // 5. Sync Passenger Profile
    if (formData.passengers?.length > 0) {
        for (const p of formData.passengers) {
            if (p.passenger_id) {
                const { error: updateError } = await supabase.from('passengers').update({
                    passport_number: p.passport_number,
                    passport_expiry: p.passport_expiry ? new Date(p.passport_expiry).toISOString() : null,
                    phone_number: p.phone_number,
                    contact_info: p.contact_info,
                    title: p.title,
                    first_name: p.first_name,
                    surname: p.surname
                }).eq('id', p.passenger_id);

                if (updateError) {
                    console.error(`Failed to update passenger profile for ${p.passenger_id}:`, updateError);
                }
            }
        }
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
    transactionType?: string;
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
            issued_partner:issued_partners(name),
            passengers:booking_passengers(*)
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

    const { data, error, count } = await dbQuery.order('entry_date', { ascending: false })

    if (error) {
        console.error('Fetch error in getBookings:', error)
        return { data: [], count: 0 }
    }

    console.log("Search results count:", count);

    return { data: data as any[], count: count || 0 }
}

export async function getTicketReport(filters: BookingFilters | string = {}) {
    // Backward compatibility: if string, treat as query
    const { query, status, platform, airline, startDate, endDate, agentId, issuedPartnerId, page, limit } =
        typeof filters === 'string' ? { query: filters } as BookingFilters : filters;

    const supabase = await createClient()

    // Query booking_passengers joined with bookings
    let dbQuery = supabase
        .from('booking_passengers')
        .select(`
            *,
            booking:bookings!inner(
                pnr,
                entry_date,
                airline,
                ticket_status,
                booking_source,
                platform,
                booking_type,
                parent_booking_id,
                agent:agents(name),
                issued_partner:issued_partners(name),
                fare,
                selling_price,
                profit
            )
        `, { count: 'exact' })
    // .eq('booking.is_deleted', false) // Inner join handles this if we filter properly, but Supabase syntax for inner filter is tricky.
    // Better to filter on the joined table using !inner if we want to filter by booking fields.
    dbQuery = dbQuery.filter('booking.is_deleted', 'eq', false);

    // Apply Filters - mostly on the joined 'booking' table

    // Note: PostgREST syntax for filtering on joined tables: 'booking.field'
    if (status && status !== 'ALL') {
        dbQuery = dbQuery.eq('booking.ticket_status', status)
    }

    if (platform && platform !== 'ALL') {
        dbQuery = dbQuery.eq('booking.platform', platform)
    }

    if (airline) {
        dbQuery = dbQuery.ilike('booking.airline', `%${airline}%`)
    }

    if (startDate) {
        dbQuery = dbQuery.gte('booking.entry_date', startDate)
    }

    if (endDate) {
        dbQuery = dbQuery.lte('booking.entry_date', endDate)
    }

    if (agentId && agentId !== 'ALL') {
        dbQuery = dbQuery.eq('booking.agent_id', agentId)
    }

    if (issuedPartnerId && issuedPartnerId !== 'ALL') {
        dbQuery = dbQuery.eq('booking.issued_partner_id', issuedPartnerId)
    }

    // Text Search (Complex cross-table OR)
    if (query) {
        const sanitizedQuery = query.replace(/,/g, ' ').trim();
        if (sanitizedQuery) {
            // We need to search on both passenger fields and booking fields
            // Simplify: Search PNR (booking), Ticket No (pax), Name (pax)
            // PostgREST doesn't easily support OR across joined tables in one go without raw RPC or complex embedding.
            // But we can try the embedded syntax or just filter. 
            // Let's filter on specific columns we have access to via embedding if possible, or just strict matches.
            // Actually, for reports, strict filtering might be okay.
            // Let's rely on filter for now.
            dbQuery = dbQuery.or(`ticket_number.ilike.%${sanitizedQuery}%,first_name.ilike.%${sanitizedQuery}%,surname.ilike.%${sanitizedQuery}%`)
            // If we really need PNR search, we'd need to filter the parent. 
            // dbQuery = dbQuery.filter('booking.pnr', 'ilike', `%${sanitizedQuery}%`) // This is AND.
        }
    }

    // Filter out deleted bookings (safeguard)
    dbQuery = dbQuery.filter('booking.is_deleted', 'eq', false);

    // Pagination
    if (page && limit) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        dbQuery = dbQuery.range(from, to);
    }

    const { data, error, count } = await dbQuery.order('created_at', { ascending: false, foreignTable: 'booking' }) // Sort by booking date

    if (error) {
        console.error('Fetch error in getTicketReport:', error)
        return { data: [], count: 0 }
    }

    // Post-process to split REFUNDED tickets into [ISSUED, REFUNDED]
    const processedData: any[] = [];

    (data as any[]).forEach(ticket => {
        if (ticket.ticket_status === 'REFUNDED') {
            // 1. The Original ISSUED Entry
            processedData.push({
                ...ticket,
                id: `${ticket.id}_original`, // Unique Key
                ticket_status: 'ISSUED', // Show as originally issued
                // Keep original cost/sale price
            });

            // 2. The REFUND Entry (Negative Values)
            // Use refund amounts if available, otherwise fallback to reversing original (assuming full refund if not specified)
            const refundCost = Number(ticket.refund_amount_partner) > 0 ? Number(ticket.refund_amount_partner) : Number(ticket.cost_price);
            const refundSell = Number(ticket.refund_amount_customer) > 0 ? Number(ticket.refund_amount_customer) : Number(ticket.sale_price);

            processedData.push({
                ...ticket,
                id: `${ticket.id}_refund`, // Unique Key
                ticket_status: 'REFUNDED',
                cost_price: -refundCost,
                sale_price: -refundSell,
                // Ensure profit is calculated correctly by frontend based on these negatives
            });
        } else {
            // Normal Ticket
            processedData.push(ticket);
        }
    });

    return { data: processedData, count: processedData.length } // Count is now virtual rows
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
                    reference_id: id,
                    created_at: new Date(booking.entry_date).toISOString() // Backdate reversal to original entry date
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
                    reference_id: null,
                    created_at: new Date(booking.entry_date).toISOString() // Backdate reversal to original entry date
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

    // 1b. Fetch original passengers
    const { data: passengers } = await supabase
        .from('booking_passengers')
        .select('*')
        .eq('booking_id', originalBookingId)

    // Map to PassengerDetail (excluding IDs to trigger new creation)
    const passengerDetails: PassengerDetail[] = passengers ? passengers.map(p => ({
        passenger_id: p.passenger_id,
        pax_type: p.pax_type as any,
        title: p.title,
        first_name: p.first_name,
        surname: p.surname,
        ticket_number: p.ticket_number,
        passport_number: p.passport_number,
        passport_expiry: p.passport_expiry,
        sale_price: Number(p.sale_price),
        cost_price: Number(p.cost_price)
    })) : [];

    // Fallback if no passengers found (legacy data): create one from booking header?
    if (passengerDetails.length === 0) {
        passengerDetails.push({
            pax_type: 'ADULT',
            title: '',
            first_name: '',
            surname: original.pax_name || 'Unknown',
            ticket_number: original.ticket_number,
            sale_price: Number(original.selling_price) || 0,
            cost_price: Number(original.fare) || 0,
        });
    }

    // 2. Prepare new data (omit generated fields)
    const newBookingData: BookingFormData = {
        pnr: original.pnr,

        airline: original.airline,
        entry_date: new Date().toISOString().split('T')[0], // Use TODAY as entry date

        departure_date: original.departure_date,
        return_date: original.return_date,

        payment_status: original.payment_status,

        origin: original.origin,
        destination: original.destination,
        agent_id: original.agent_id,
        booking_source: original.booking_source,
        issued_partner_id: original.issued_partner_id || original.booking_type_id,
        booking_type: original.booking_type,

        ticket_status: newStatus as any, // Cast to any to avoid DB type mismatch until migration
        ticket_issued_date: original.ticket_issued_date,
        advance_payment: original.advance_payment,
        platform: original.platform,
        payment_method: original.payment_method,

        // Refund Logic
        refund_date: newStatus === 'REFUNDED' ? new Date().toISOString() : original.refund_date,
        actual_refund_amount: original.actual_refund_amount,
        customer_refund_amount: original.customer_refund_amount,

        // Financials (Summed from passengers)
        fare: passengerDetails.reduce((sum, p) => sum + (p.cost_price || 0), 0),
        selling_price: passengerDetails.reduce((sum, p) => sum + (p.sale_price || 0), 0),

        passengers: passengerDetails
    }


    await createBooking(newBookingData);
}

export async function getBookingById(id: string) {
    const supabase = await createClient()

    const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
            *,
            agent:agents(name),
            issued_partner:issued_partners(name),
            passengers:booking_passengers(*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching booking with ID ' + id, error)
        return null
    }

    return booking
}

export async function getLinkedBookings(id: string) {
    const supabase = await createClient()

    // 1. Get current booking to check if it has a parent
    const { data: current, error: currentError } = await supabase
        .from('bookings')
        .select('parent_booking_id')
        .eq('id', id)
        .single()

    if (currentError || !current) return { parent: null, children: [] }

    let parent = null
    let children = []

    // 2. If it has a parent, fetch the parent
    if (current.parent_booking_id) {
        const { data: parentData } = await supabase
            .from('bookings')
            .select('id, pnr, ticket_status, airline, booking_source, created_at, fare, selling_price') // Minimal fields for display
            .eq('id', current.parent_booking_id)
            .single()
        parent = parentData
    }

    // 3. Fetch children (bookings that list THIS booking as parent)
    const { data: directChildren } = await supabase
        .from('bookings')
        .select('id, pnr, ticket_status, airline, booking_source, created_at, fare, selling_price')
        .eq('parent_booking_id', id)

    children = directChildren || []

    return { parent, children }
}
