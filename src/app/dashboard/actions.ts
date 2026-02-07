'use server'

import { createClient } from '@/utils/supabase/server'

export async function getDashboardStats(dateStr?: string) {
    const supabase = await createClient()

    // Determine date range
    const targetDate = dateStr ? new Date(dateStr + '-01') : new Date()
    // Validation: if invalid date, fallback to now
    const validDate = isNaN(targetDate.getTime()) ? new Date() : targetDate

    // Start of month
    const startOfMonth = new Date(validDate.getFullYear(), validDate.getMonth(), 1)
    // End of month (start of next month)
    const endOfMonth = new Date(validDate.getFullYear(), validDate.getMonth() + 1, 1)

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('selling_price, profit, id')
        .gte('ticket_issued_date', startOfMonth.toISOString())
        .lt('ticket_issued_date', endOfMonth.toISOString())
        .neq('currency', 'LKR')
        .eq('is_deleted', false)

    if (error) {
        console.error('Error fetching stats:', error)
        return {
            totalRevenue: 0,
            totalProfit: 0,
            totalBookings: 0,
            averageMargin: 0
        }
    }

    const totalRevenue = bookings.reduce((sum, b) => sum + (b.selling_price || 0), 0)
    const totalProfit = bookings.reduce((sum, b) => sum + (b.profit || 0), 0)
    const totalBookings = bookings.length
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
        totalRevenue,
        totalProfit,
        totalBookings,
        averageMargin
    }
}

export async function getRecentSales(dateStr?: string) {
    const supabase = await createClient()

    // Determine date range (aligned with dashboard stats)
    const targetDate = dateStr ? new Date(dateStr + '-01') : new Date()
    const validDate = isNaN(targetDate.getTime()) ? new Date() : targetDate
    const startOfMonth = new Date(validDate.getFullYear(), validDate.getMonth(), 1)
    const endOfMonth = new Date(validDate.getFullYear(), validDate.getMonth() + 1, 1)

    // Fetch last 5 bookings
    const { data: recent, error } = await supabase
        .from('bookings')
        .select('*')
        .neq('currency', 'LKR')
        .eq('is_deleted', false)
        .gte('ticket_issued_date', startOfMonth.toISOString())
        .lt('ticket_issued_date', endOfMonth.toISOString())
        .order('ticket_issued_date', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching recent sales:', error)
        return []
    }

    return recent
}

export async function getAgentCreditStats(dateStr?: string) {
    const supabase = await createClient()

    // Get all types
    const { data: types, error } = await supabase
        .from('issued_partners')
        .select('id, name, balance')
        .eq('is_deleted', false)
        .order('name')

    if (error || !types) return []

    // Date Range
    const targetDate = dateStr ? new Date(dateStr + '-01') : new Date()
    const validDate = isNaN(targetDate.getTime()) ? new Date() : targetDate
    const startOfMonth = new Date(validDate.getFullYear(), validDate.getMonth(), 1)
    const endOfMonth = new Date(validDate.getFullYear(), validDate.getMonth() + 1, 1)

    const stats = await Promise.all(types.map(async (type) => {
        const { count, error: countError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true }) // count only
            .eq('issued_partner_id', type.id)
            .eq('ticket_status', 'ISSUED')
            .gte('ticket_issued_date', startOfMonth.toISOString())
            .lt('ticket_issued_date', endOfMonth.toISOString())
            .neq('currency', 'LKR')
            .eq('is_deleted', false)

        return {
            ...type,
            todayCount: count || 0
        }
    }))

    return stats
}

export async function getFinancialSummary() {
    const supabase = await createClient()

    // 1. Get Partner Balance (Sum of issued_partners.balance)
    const { data: partners, error: partnerError } = await supabase
        .from('issued_partners')
        .select('balance')
        .eq('is_deleted', false)

    // 2. Get Agent Debt (Sum of agents.balance)
    const { data: agents, error: agentError } = await supabase
        .from('agents')
        .select('balance')
        .eq('is_deleted', false)

    if (partnerError || agentError) {
        console.error("Error fetching financial summary", partnerError, agentError)
        return { totalPartnerBalance: 0, totalAgentDebt: 0 }
    }

    const totalPartnerBalance = partners.reduce((sum, p) => sum + (Number(p.balance) || 0), 0)
    const totalAgentDebt = agents.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

    return {
        totalPartnerBalance,
        totalAgentDebt
    }
}
