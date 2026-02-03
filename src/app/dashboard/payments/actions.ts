'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function topUpCredit(id: string, entityType: 'issued_partner' | 'agent', amount: number, description?: string) {
    const supabase = await createClient()

    const table = entityType === 'issued_partner' ? 'issued_partners' : 'agents';

    // 1. Fetch current balance
    const { data: entity, error: btError } = await supabase
        .from(table)
        .select('balance, name')
        .eq('id', id)
        .single()

    if (btError || !entity) {
        throw new Error(`${entityType === 'issued_partner' ? 'Issuing Partner' : 'Agent'} not found`);
    }

    const newBalance = entityType === 'agent'
        ? Number(entity.balance) - Number(amount) // Agent: Reduce debt
        : Number(entity.balance) + Number(amount); // Partner: Increase balance

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
        issued_partner_id: entityType === 'issued_partner' ? id : null,
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
        .eq('is_deleted', false)
        .order('name')

    if (error) return []
    return data
}

export async function getTransactions(id: string, entityType: 'issued_partner' | 'agent') {
    const supabase = await createClient()

    let query = supabase
        .from('credit_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

    if (entityType === 'issued_partner') {
        query = query.eq('issued_partner_id', id)
    } else {
        query = query.eq('agent_id', id)
    }

    const { data, error } = await query

    if (error) {
        console.error("Error fetching transactions:", error)
        return []
    }
    return data
}

export async function updateTransactionAmount(transactionId: string, newAmount: number) {
    const supabase = await createClient()

    // 1. Get original transaction
    const { data: transaction, error: fetchError } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

    if (fetchError || !transaction) {
        throw new Error("Transaction not found")
    }

    if (transaction.transaction_type !== 'TOPUP') {
        throw new Error("Only Top-up/Payment transactions can be edited")
    }

    const oldAmount = Number(transaction.amount)
    const diff = newAmount - oldAmount

    if (diff === 0) return; // No change

    // 2. Identify Entity
    let entityType: 'issued_partner' | 'agent'
    let entityId: string

    if (transaction.issued_partner_id) {
        entityType = 'issued_partner'
        entityId = transaction.issued_partner_id
    } else if (transaction.agent_id) {
        entityType = 'agent'
        entityId = transaction.agent_id
    } else {
        throw new Error("Transaction has no associated entity")
    }

    const table = entityType === 'issued_partner' ? 'issued_partners' : 'agents'

    // 3. Fetch Entity Balance
    const { data: entity, error: entityError } = await supabase
        .from(table)
        .select('balance')
        .eq('id', entityId)
        .single()

    if (entityError || !entity) {
        throw new Error("Entity not found")
    }

    // 4. Calculate New Entity Balance
    // Partner: TopUp increases Balance. If TopUp increased (diff > 0), Balance increases.
    // Agent: Payment reduces Debt (Balance). If Payment increased (diff > 0), Debt decreases (Balance decreases).
    const currentBalance = Number(entity.balance)
    let newEntityBalance = 0

    if (entityType === 'agent') {
        // Agent Balance = Debt.
        // Payment reduces debt.
        // If payment increases by 50 (diff=50), Debt reduces by 50.
        newEntityBalance = currentBalance - diff
    } else {
        // Partner Balance = Assets.
        // TopUp increases balance.
        // If TopUp increases by 50, Balance increases by 50.
        newEntityBalance = currentBalance + diff
    }

    // 5. Update Transaction
    const { error: updateTxError } = await supabase
        .from('credit_transactions')
        .update({ amount: newAmount })
        .eq('id', transactionId)

    if (updateTxError) throw new Error("Failed to update transaction")

    // 6. Update Entity Balance
    const { error: updateEntityError } = await supabase
        .from(table)
        .update({ balance: newEntityBalance })
        .eq('id', entityId)

    if (updateEntityError) {
        // Rollback transaction update? Ideally use SQL transaction/RPC.
        // For now, simpler error logic implies manual fix if it fails halfway.
        console.error("CRITICAL: Failed to update entity balance after transaction update.", updateEntityError)
        throw new Error("Failed to update balance")
    }

    revalidatePath('/dashboard/payments')
    revalidatePath('/dashboard')
}
