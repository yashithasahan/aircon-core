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
