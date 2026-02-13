'use server'

import { createClient } from '@/utils/supabase/server'
import { BookingFilters } from '../bookings/actions'
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns'

export type AnalyticsSummary = {
    totalRevenue: number
    totalCost: number
    totalBookings: number
    totalProfit: number
    revenueTrend: { date: string; revenue: number; profit: number; bookingsCount: number }[]
    bookingStatusDistribution: { name: string; value: number }[]
    bookingsByAirline: { name: string; value: number }[]
    bookingsByPlatform: { name: string; value: number }[]
    bookingsByIssuedPartner: { name: string; value: number }[]
}

export type AgentPerformance = {
    agentId: string
    agentName: string
    totalBookings: number
    totalRevenue: number
    totalDue: number
    totalPaid: number
}

// Helper to apply common filters
const applyFilters = (query: any, filters: BookingFilters) => {
    if (filters.startDate) query = query.gte('entry_date', filters.startDate)
    if (filters.endDate) query = query.lte('entry_date', filters.endDate)
    if (filters.agentId && filters.agentId !== 'ALL') query = query.eq('agent_id', filters.agentId)
    // Add other filters as needed
    return query
}

export async function getAnalyticsSummary(filters: BookingFilters): Promise<AnalyticsSummary> {
    const supabase = await createClient()

    let query = supabase
        .from('bookings')
        .select('*')
        .eq('is_deleted', false)
        .order('entry_date', { ascending: false })

    // Apply filters
    // Note: If no date range is provided, we might want to default to something (e.g., this month)
    // or fetch everything. Let's assume filters are passed correctly or we fetch all relevant data.
    // For specific charts, we might need stricter date handling.

    if (filters.startDate) query = query.gte('entry_date', filters.startDate)
    else {
        // Default to last 30 days if no date? Or let the frontend handle defaults?
        // Let's rely on frontend passing defaults, but if not, maybe 30 days back.
        // const defaultStart = format(subMonths(new Date(), 1), 'yyyy-MM-dd')
        // query = query.gte('entry_date', defaultStart)
    }

    if (filters.endDate) query = query.lte('entry_date', filters.endDate)
    if (filters.agentId && filters.agentId !== 'ALL') query = query.eq('agent_id', filters.agentId)
    if (filters.platform && filters.platform !== 'ALL') query = query.eq('platform', filters.platform)
    if (filters.status && filters.status !== 'ALL') query = query.eq('ticket_status', filters.status)
    if (filters.issuedPartnerId && filters.issuedPartnerId !== 'ALL') query = query.eq('issued_partner_id', filters.issuedPartnerId)
    if (filters.airline) query = query.ilike('airline', `%${filters.airline}%`)
    if (filters.query) {
        const sanitizedQuery = filters.query.replace(/,/g, ' ').trim();
        if (sanitizedQuery) {
            query = query.or(`pnr.ilike.%${sanitizedQuery}%,ticket_number.ilike.%${sanitizedQuery}%,pax_name.ilike.%${sanitizedQuery}%,airline.ilike.%${sanitizedQuery}%,ticket_status.ilike.%${sanitizedQuery}%`)
        }
    }


    const { data: bookings, error } = await query

    if (error || !bookings) {
        console.error('Error fetching analytics:', error)
        return {
            totalRevenue: 0,
            totalCost: 0,
            totalBookings: 0,
            totalProfit: 0,
            revenueTrend: [],
            bookingStatusDistribution: [],
            bookingsByAirline: [],
            bookingsByPlatform: [],
            bookingsByIssuedPartner: []
        }
    }

    // A. Key Metrics
    const totalBookings = bookings.length
    // Assuming 'selling_price' is revenue and 'fare' is cost. Profit = Selling - Fare.
    // Ensure we only sum up VALID bookings (e.g., ISSUED).
    // Or do we include PENDING? usually Analytics shows "Potential" vs "Realized".
    // For now, let's sum ISSUED for Revenue.
    const issuedBookings = bookings.filter(b => b.ticket_status === 'ISSUED')

    const totalRevenue = issuedBookings.reduce((sum, b) => sum + (Number(b.selling_price) || 0), 0)
    const totalCost = issuedBookings.reduce((sum, b) => sum + (Number(b.fare) || 0), 0)
    const totalProfit = totalRevenue - totalCost

    // B. Revenue Trend (Daily)
    // Group by entry_date
    const trendMap = new Map<string, { revenue: number, profit: number, bookingsCount: number }>()

    issuedBookings.forEach(b => {
        const date = b.entry_date // YYYY-MM-DD
        if (!date) return
        const existing = trendMap.get(date) || { revenue: 0, profit: 0, bookingsCount: 0 }
        const revenue = Number(b.selling_price) || 0
        const cost = Number(b.fare) || 0
        trendMap.set(date, {
            revenue: existing.revenue + revenue,
            profit: existing.profit + (revenue - cost),
            bookingsCount: existing.bookingsCount + 1
        })
    })

    // Sort by date
    const revenueTrend = Array.from(trendMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))

    // C. Status Distribution
    const statusCounts = bookings.reduce((acc, b) => {
        const status = b.ticket_status || 'UNKNOWN'
        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const bookingStatusDistribution = Object.entries(statusCounts).map(([name, value]) => ({ name, value: value as number }))

    // D. Airline Distribution
    const airlineCounts = bookings.reduce((acc, b) => {
        const airline = b.airline || 'UNKNOWN'
        acc[airline] = (acc[airline] || 0) + 1
        return acc
    }, {} as Record<string, number>)
    const bookingsByAirline = Object.entries(airlineCounts)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5) // Top 5

    // E. Platform Distribution
    const platformCounts = bookings.reduce((acc, b) => {
        const platform = b.platform || 'UNKNOWN'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
    }, {} as Record<string, number>)
    const bookingsByPlatform = Object.entries(platformCounts).map(([name, value]) => ({ name, value: value as number }))

    // F. Issued Partner Distribution
    // We need partner names. Let's fetch them or assumes we have them.
    // Ideally we should have fetched them with the bookings or separately.
    // For performance, let's fetch them here since we are on the server.
    const { data: partners } = await supabase.from('issued_partners').select('id, name')
    const partnerNameMap = new Map(partners?.map(p => [p.id, p.name]) || [])

    const partnerCounts = bookings.reduce((acc, b) => {
        const partnerId = b.issued_partner_id
        const partnerName = partnerNameMap.get(partnerId) || 'UNKNOWN'
        acc[partnerName] = (acc[partnerName] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const bookingsByIssuedPartner = Object.entries(partnerCounts)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)

    return {
        totalRevenue,
        totalCost,
        totalBookings,
        totalProfit,
        revenueTrend,
        bookingStatusDistribution,
        bookingsByAirline,
        bookingsByPlatform,
        bookingsByIssuedPartner
    }
}

export async function getAgentPerformanceReport(filters: BookingFilters): Promise<AgentPerformance[]> {
    const supabase = await createClient()

    // 1. Fetch Agents
    const { data: agents } = await supabase
        .from('agents')
        .select('*')
        .eq('is_deleted', false)

    if (!agents) return []

    // 2. Fetch Bookings for these agents (filtered by date)
    let query = supabase
        .from('bookings')
        .select('*')
        .eq('is_deleted', false)
        .eq('booking_source', 'AGENT')
        .not('agent_id', 'is', null)

    if (filters.startDate) query = query.gte('entry_date', filters.startDate)
    if (filters.endDate) query = query.lte('entry_date', filters.endDate)

    const { data: bookings } = await query

    if (!bookings) return []

    // 3. Aggregate
    const agentMap = new Map<string, AgentPerformance>()

    // Initialize all agents (even if no bookings in period)
    agents.forEach(agent => {
        // Only include specific agent if filter is active
        if (filters.agentId && filters.agentId !== 'ALL' && agent.id !== filters.agentId) return

        agentMap.set(agent.id, {
            agentId: agent.id,
            agentName: agent.name,
            totalBookings: 0,
            totalRevenue: 0,
            totalDue: Number(agent.balance) || 0, // Balance is persistent debt, not just for period
            totalPaid: 0 // We need transaction history for this?
        })
    })

    // If "Paid" needs to be for the PERIOD, we need to fetch credit_transactions.
    // For now, let's stick to "Total Due" which is their CURRENT balance (debt).
    // And "Revenue" which is the generated sales in this period.

    bookings.forEach(b => {
        const agent = agentMap.get(b.agent_id)
        if (agent) {
            agent.totalBookings += 1
            if (b.ticket_status === 'ISSUED') {
                agent.totalRevenue += (Number(b.selling_price) || 0)
            }
        }
    })

    return Array.from(agentMap.values())
        .filter(a => a.totalBookings > 0 || (filters.agentId && filters.agentId !== 'ALL')) // Show active agents or selected
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
}
