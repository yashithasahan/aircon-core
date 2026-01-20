'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function topUpCredit(id: string, entityType: 'booking_type' | 'agent', amount: number, description?: string) {
    const supabase = await createClient()

    const table = entityType === 'booking_type' ? 'booking_types' : 'agents';

    // 1. Fetch current balance
    const { data: entity, error: btError } = await supabase
        .from(table)
        .select('balance, name')
        .eq('id', id)
        .single()

    if (btError || !entity) {
        throw new Error(`${entityType === 'booking_type' ? 'Issuing Partner' : 'Agent'} not found`);
    }

    const newBalance = Number(entity.balance) + Number(amount);

    // 2. Update Balance
    const { error: updateError } = await supabase
        .from(table)
        .update({ balance: newBalance })
        .eq('id', id)

    if (updateError) {
        throw new Error('Failed to update balance')
    }

    // 3. Log Transaction
    const transactionData = {
        amount: amount,
        transaction_type: 'TOPUP',
        description: description || `Manual ${entityType === 'agent' ? 'Payment' : 'Top Up'}`,
        // Set the correct FK, leave the other null
        booking_type_id: entityType === 'booking_type' ? id : null,
        agent_id: entityType === 'agent' ? id : null
    };

    const { error: logError } = await supabase
        .from('credit_transactions')
        .insert([transactionData])

    if (logError) {
        console.error("Transaction Log Error:", logError);
    }

    revalidatePath('/dashboard/payments')
    revalidatePath('/dashboard')
}

export async function getAgentsWithBalance() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name')

    if (error) return []
    return data
}
