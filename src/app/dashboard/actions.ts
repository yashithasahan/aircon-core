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
        .gte('created_at', startOfMonth.toISOString())
        .lt('created_at', endOfMonth.toISOString())

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

export async function getRecentSales() {
    const supabase = await createClient()

    // Fetch last 5 bookings
    const { data: recent, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error fetching recent sales:', error)
        return []
    }

    return recent
}

export async function getAgentCreditStats() {
    const supabase = await createClient()

    // Get all types
    const { data: types, error } = await supabase
        .from('booking_types')
        .select('id, name, balance')
        .order('name')

    if (error || !types) return []

    // For each, get count of VALID tickets issued TODAY
    // We define "Today" based on server time or entry_date? 
    // Usually entry_date is the business date. Let's use entry_date = current YYYY-MM-DD.
    const today = new Date().toISOString().split('T')[0]

    const stats = await Promise.all(types.map(async (type) => {
        const { count, error: countError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true }) // count only
            .eq('booking_type_id', type.id)
            .eq('ticket_status', 'ISSUED')
            .eq('entry_date', today)

        return {
            ...type,
            todayCount: count || 0
        }
    }))

    return stats
}
