'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function topUpCredit(bookingTypeId: string, amount: number, description?: string) {
    const supabase = await createClient()

    // 1. Fetch current balance to ensure valid type
    const { data: bookingType, error: btError } = await supabase
        .from('booking_types')
        .select('balance')
        .eq('id', bookingTypeId)
        .single()

    if (btError || !bookingType) {
        throw new Error('Booking Type not found')
    }

    const newBalance = Number(bookingType.balance) + Number(amount);

    // 2. Update Balance
    const { error: updateError } = await supabase
        .from('booking_types')
        .update({ balance: newBalance })
        .eq('id', bookingTypeId)

    if (updateError) {
        throw new Error('Failed to update balance')
    }

    // 3. Log Transaction
    const { error: logError } = await supabase
        .from('credit_transactions')
        .insert([{
            booking_type_id: bookingTypeId,
            amount: amount,
            transaction_type: 'TOPUP',
            description: description || 'Manual Top Up'
        }])

    if (logError) {
        console.error("Transaction Log Error:", logError);
        // Balance updated but log failed. Critical consistency issue? 
        // For this MVP, we log error but don't rollback (manual intervention needed if log fails).
    }

    revalidatePath('/dashboard/credits')
    revalidatePath('/dashboard') // Update stats
}

export async function getCreditTransactions(bookingTypeId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('booking_type_id', bookingTypeId)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching transactions:', error)
        return []
    }

    return data
}
