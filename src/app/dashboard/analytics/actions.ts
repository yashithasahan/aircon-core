'use server'

import { createClient } from '@/utils/supabase/server'
import { BookingFilters } from '../bookings/actions'

// Type Definition Update
export type AnalyticsSummary = {
    totalRevenue: number
    totalCost: number
    totalTickets: number
    totalBookings: number
    totalProfit: number
    averageMargin: number
    revenueTrend: { date: string; revenue: number; profit: number; ticketsCount: number }[]
    bookingsByAirline: { name: string; value: number }[]
    bookingsByPlatform: { name: string; value: number }[]
    bookingsByIssuedPartner: { name: string; value: number }[]
    bookingStatusDistribution: { name: string; value: number }[]
}

export type AgentPerformance = {
    agentId: string
    agentName: string
    totalBookings: number
    totalRevenue: number
    totalDue: number
    totalPaid: number
    totalProfit: number
}

export type IssuedPartnerPerformance = {
    partnerId: string
    partnerName: string
    totalBookings: number
    totalCost: number
    currentBalance: number
}

export type EntityAnalytics = {
    airlineDistribution: { name: string; value: number }[]
    statusDistribution: { name: string; value: number }[]
    monthlyTrend: { date: string; value: number }[]
}

export async function getAnalyticsSummary(filters: BookingFilters): Promise<AnalyticsSummary> {
    const supabase = await createClient()

    // Base query for Bookings (Financials)
    let bookingQuery = supabase
        .from('bookings')
        .select('selling_price, profit, fare, status_date, platform, airline, ticket_status, issued_partner:issued_partners(name)')
        .eq('is_deleted', false)

    // Base query for Tickets (Counts)
    let ticketQuery = supabase
        .from('booking_passengers')
        .select(`
            id,
            booking:bookings!inner(
                status_date,
                platform,
                airline,
                issued_partner:issued_partners(name),
                ticket_status,
                agent_id,
                issued_partner_id,
                is_deleted
            )
        `, { count: 'exact' })

    // --- APPLY FILTERS ---
    const { startDate, endDate, status, platform, airline, agentId, issuedPartnerId } = filters;

    // Apply to Booking Query
    if (startDate) bookingQuery = bookingQuery.gte('status_date', startDate);
    if (endDate) bookingQuery = bookingQuery.lte('status_date', endDate);
    if (status && status !== 'ALL') bookingQuery = bookingQuery.eq('ticket_status', status);
    if (platform && platform !== 'ALL') bookingQuery = bookingQuery.eq('platform', platform);
    if (airline) bookingQuery = bookingQuery.ilike('airline', `%${airline}%`);
    if (agentId && agentId !== 'ALL') bookingQuery = bookingQuery.eq('agent_id', agentId);
    if (issuedPartnerId && issuedPartnerId !== 'ALL') bookingQuery = bookingQuery.eq('issued_partner_id', issuedPartnerId);

    // Apply to Ticket Query (Inner Join Filters)
    if (startDate) ticketQuery = ticketQuery.gte('booking.status_date', startDate);
    if (endDate) ticketQuery = ticketQuery.lte('booking.status_date', endDate);
    if (status && status !== 'ALL') ticketQuery = ticketQuery.eq('booking.ticket_status', status);
    if (platform && platform !== 'ALL') ticketQuery = ticketQuery.eq('booking.platform', platform);
    if (airline) ticketQuery = ticketQuery.ilike('booking.airline', `%${airline}%`);
    if (agentId && agentId !== 'ALL') ticketQuery = ticketQuery.eq('booking.agent_id', agentId);
    if (issuedPartnerId && issuedPartnerId !== 'ALL') ticketQuery = ticketQuery.eq('booking.issued_partner_id', issuedPartnerId);

    // Safety: exclude deleted bookings in ticket query too
    ticketQuery = ticketQuery.filter('booking.is_deleted', 'eq', false);

    // Execute Queries
    const { data: bookings, error: bookingError } = await bookingQuery;
    const { data: tickets, count: ticketCount, error: ticketError } = await ticketQuery;

    if (bookingError || ticketError) {
        console.error('Error fetching analytics:', bookingError, ticketError);
        return {
            totalRevenue: 0,
            totalCost: 0,
            totalTickets: 0,
            totalBookings: 0,
            totalProfit: 0,
            averageMargin: 0,
            revenueTrend: [],
            bookingsByAirline: [],
            bookingsByPlatform: [],
            bookingsByIssuedPartner: [],
            bookingStatusDistribution: []
        };
    }

    // --- AGGREGATION ---

    // 1. Financials (from Bookings)
    // Only verify financial data from bookings
    const totalRevenue = bookings?.reduce((sum, b) => sum + (Number(b.selling_price) || 0), 0) || 0;
    const totalProfit = bookings?.reduce((sum, b) => sum + (Number(b.profit) || 0), 0) || 0;
    const totalCost = bookings?.reduce((sum, b) => sum + (Number(b.fare) || 0), 0) || 0;
    const averageMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // 2. Counts (from Tickets)
    const totalTickets = ticketCount || 0;
    const totalBookings = bookings?.length || 0;

    // 3. Trends & Distributions
    const trendMap = new Map<string, { ticketsCount: number; revenue: number; profit: number }>();

    // Process Tickets for Count Trend
    tickets?.forEach((t: any) => {
        const date = t.booking?.status_date ? t.booking.status_date.split('T')[0] : 'Unknown';
        if (!trendMap.has(date)) trendMap.set(date, { ticketsCount: 0, revenue: 0, profit: 0 });
        trendMap.get(date)!.ticketsCount += 1;
    });

    // Process Bookings for Revenue Trend
    bookings?.forEach(b => {
        const date = b.status_date ? b.status_date.split('T')[0] : 'Unknown';
        if (!trendMap.has(date)) trendMap.set(date, { ticketsCount: 0, revenue: 0, profit: 0 });
        const revenue = Number(b.selling_price) || 0;
        const profit = Number(b.profit) || 0;
        trendMap.get(date)!.revenue += revenue;
        trendMap.get(date)!.profit += profit;
    });

    const revenueTrend = Array.from(trendMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Distributions
    // By Platform (Count Tickets)
    const platformMap = new Map<string, number>();
    tickets?.forEach((t: any) => {
        const p = t.booking?.platform || 'Unknown';
        platformMap.set(p, (platformMap.get(p) || 0) + 1);
    });
    const bookingsByPlatform = Array.from(platformMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // By Airline (Count Tickets)
    const airlineMap = new Map<string, number>();
    tickets?.forEach((t: any) => {
        const a = t.booking?.airline || 'Unknown';
        airlineMap.set(a, (airlineMap.get(a) || 0) + 1);
    });
    const bookingsByAirline = Array.from(airlineMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // By Issued Partner (Count Tickets)
    const partnerMap = new Map<string, number>();
    tickets?.forEach((t: any) => {
        // Need to be careful with null safety
        const p = t.booking?.issued_partner?.name || 'Unknown';
        partnerMap.set(p, (partnerMap.get(p) || 0) + 1);
    });
    const bookingsByIssuedPartner = Array.from(partnerMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // By Status (Count Bookings)
    const statusMap = new Map<string, number>();
    bookings?.forEach(b => {
        const s = b.ticket_status || 'Unknown';
        statusMap.set(s, (statusMap.get(s) || 0) + 1);
    });
    const bookingStatusDistribution = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
        totalRevenue,
        totalCost,
        totalTickets,
        totalBookings,
        totalProfit,
        averageMargin,
        revenueTrend,
        bookingsByAirline,
        bookingsByPlatform,
        bookingsByIssuedPartner,
        bookingStatusDistribution
    };
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
        // .eq('booking_source', 'AGENT') // booking_source is usually AGENT but can be others? 
        .not('agent_id', 'is', null)

    if (filters.startDate) query = query.gte('status_date', filters.startDate)
    if (filters.endDate) query = query.lte('status_date', filters.endDate)

    const { data: bookings } = await query

    if (!bookings) return []

    // 3. Aggregate
    const agentMap = new Map<string, AgentPerformance>()

    // Initialize all agents
    agents.forEach(agent => {
        // Filter by agentId if provided
        if (filters.agentId && filters.agentId !== 'ALL' && agent.id !== filters.agentId) return

        agentMap.set(agent.id, {
            agentId: agent.id,
            agentName: agent.name,
            totalBookings: 0,
            totalRevenue: 0,
            totalDue: Number(agent.balance) || 0,
            totalPaid: 0,
            totalProfit: 0
        })
    })

    bookings.forEach(b => {
        const agent = agentMap.get(b.agent_id)
        if (agent) {
            agent.totalBookings += 1 // This is still bookings count, maybe okay for agent performance? Or should be tickets?
            // Usually performance is financial, so revenue matters most.
            if (b.ticket_status === 'ISSUED') {
                const revenue = Number(b.selling_price) || 0
                const cost = Number(b.fare) || 0
                agent.totalRevenue += revenue
                agent.totalProfit += (revenue - cost)
            }
        }
    })

    return Array.from(agentMap.values())
        .filter(a => a.totalBookings > 0 || a.totalDue !== 0 || (filters.agentId && filters.agentId !== 'ALL'))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export async function getIssuedPartnerPerformance(filters: BookingFilters): Promise<IssuedPartnerPerformance[]> {
    const supabase = await createClient()

    // 1. Fetch Partners
    const { data: partners } = await supabase
        .from('issued_partners')
        .select('*')
        .eq('is_deleted', false)

    if (!partners) return []

    // 2. Fetch Bookings for these partners
    let query = supabase
        .from('bookings')
        .select('*')
        .eq('is_deleted', false)
        .not('issued_partner_id', 'is', null)

    if (filters.startDate) query = query.gte('status_date', filters.startDate)
    if (filters.endDate) query = query.lte('status_date', filters.endDate)
    // Cost usually applies to ISSUED tickets
    query = query.eq('ticket_status', 'ISSUED')

    const { data: bookings } = await query

    if (!bookings) return []

    // 3. Aggregate
    const partnerMap = new Map<string, IssuedPartnerPerformance>()

    partners.forEach(p => {
        if (filters.issuedPartnerId && filters.issuedPartnerId !== 'ALL' && p.id !== filters.issuedPartnerId) return

        partnerMap.set(p.id, {
            partnerId: p.id,
            partnerName: p.name,
            totalBookings: 0,
            totalCost: 0,
            currentBalance: Number(p.balance) || 0
        })
    })

    bookings.forEach(b => {
        const partner = partnerMap.get(b.issued_partner_id)
        if (partner) {
            partner.totalBookings += 1
            partner.totalCost += (Number(b.fare) || 0)
        }
    })

    return Array.from(partnerMap.values())
        .filter(p => p.totalBookings > 0 || p.currentBalance !== 0 || (filters.issuedPartnerId && filters.issuedPartnerId !== 'ALL'))
        .sort((a, b) => b.totalCost - a.totalCost)
}

export async function getEntityAnalytics(
    id: string,
    type: 'AGENT' | 'ISSUED_PARTNER',
    filters: BookingFilters
): Promise<EntityAnalytics> {
    const supabase = await createClient()

    let query = supabase
        .from('bookings')
        .select('airline, ticket_status, status_date')
        .eq('is_deleted', false)

    if (type === 'AGENT') {
        query = query.eq('agent_id', id)
    } else {
        query = query.eq('issued_partner_id', id)
    }

    if (filters.startDate) query = query.gte('status_date', filters.startDate)
    if (filters.endDate) query = query.lte('status_date', filters.endDate)

    const { data: bookings } = await query

    if (!bookings) return { airlineDistribution: [], statusDistribution: [], monthlyTrend: [] }

    // 1. Airline Distribution
    const airlineCounts = bookings.reduce((acc, b) => {
        const airline = b.airline || 'UNKNOWN'
        acc[airline] = (acc[airline] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const airlineDistribution = Object.entries(airlineCounts)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)

    // 2. Status Distribution
    const statusCounts = bookings.reduce((acc, b) => {
        const status = b.ticket_status || 'UNKNOWN'
        acc[status] = (acc[status] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const statusDistribution = Object.entries(statusCounts)
        .map(([name, value]) => ({ name, value: value as number }))

    // 3. Monthly Trend
    const trendMap = new Map<string, number>()
    bookings.forEach(b => {
        const date = b.status_date
        if (date) {
            trendMap.set(date, (trendMap.get(date) || 0) + 1)
        }
    })
    const monthlyTrend = Array.from(trendMap.entries())
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date))

    return {
        airlineDistribution,
        statusDistribution,
        monthlyTrend
    }
}

export interface PaymentReport {
    moneyIn: number
    moneyOut: number
    netFlow: number
    transactions: any[]
}

export async function getPaymentReport(filters: BookingFilters, entityType: 'AGENT' | 'ISSUED_PARTNER'): Promise<PaymentReport> {
    const supabase = await createClient()

    let query = supabase
        .from('credit_transactions')
        .select(`
            *,
            agent:agents(name),
            issued_partner:issued_partners(name)
        `)
        .order('created_at', { ascending: false })

    // Apply Date Filters
    if (filters.startDate) query = query.gte('created_at', filters.startDate)
    if (filters.endDate) query = query.lte('created_at', filters.endDate)

    // Apply Entity Filters
    if (entityType === 'AGENT') {
        // Filter by Agent ID if provided, otherwise all agents
        if (filters.agentId && filters.agentId !== 'ALL') {
            query = query.eq('agent_id', filters.agentId)
        } else {
            query = query.not('agent_id', 'is', null)
        }
    } else {
        // Filter by Issued Partner ID if provided, otherwise all partners
        if (filters.issuedPartnerId && filters.issuedPartnerId !== 'ALL') {
            query = query.eq('issued_partner_id', filters.issuedPartnerId)
        } else {
            query = query.not('issued_partner_id', 'is', null)
        }
    }

    // Apply Transaction Type Filter
    if (filters.transactionType && filters.transactionType !== 'ALL') {
        query = query.eq('transaction_type', filters.transactionType)
    }

    const { data: transactions, error } = await query

    if (error) {
        console.error('Error fetching payment report:', error)
        return { moneyIn: 0, moneyOut: 0, netFlow: 0, transactions: [] }
    }

    // Aggregate
    let moneyIn = 0
    let moneyOut = 0

    transactions.forEach((tx: any) => {
        const amount = Number(tx.amount) || 0

        // For Agents:
        // TOPUP = Payment FROM Agent (Money In)
        // BOOKING_DEDUCTION = Usage (Money Out / Debt Increase)

        // For Issued Partners:
        // TOPUP = Payment TO Partner (Money Out from us? No, usually TopUp ADDS balance. So Money IN to *their* account)
        // Wait, context of "Money In/Out" on dashboard.
        // Usually "Money In" = Revenue/Cashflow IN. "Money Out" = Expenses.

        // Let's stick to the requested "Top Ups" vs "Usage".
        // TopUp = Money In (Balance Increase / Debt Decrease)
        // Deduction = Money Out (Balance Decrease / Debt Increase)

        if (tx.transaction_type === 'TOPUP' || tx.transaction_type === 'REFUND') {
            moneyIn += amount
        } else if (tx.transaction_type === 'BOOKING_DEDUCTION') {
            moneyOut += amount
        }
    })

    return {
        moneyIn,
        moneyOut,
        netFlow: moneyIn - moneyOut,
        transactions
    }
}
