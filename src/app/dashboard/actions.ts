'use server'

import { createClient } from '@/utils/supabase/server'

export async function getDashboardStats() {
    const supabase = await createClient()

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select('selling_price, profit, id')

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
