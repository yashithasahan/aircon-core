import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`id, pnr, ticket_status, is_deleted, passengers:booking_passengers(id, first_name, ticket_status)`)
        .order('id', { ascending: false })
        .limit(5);

    if (error) {
        return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json(bookings)
}
