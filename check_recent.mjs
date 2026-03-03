import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBooking() {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
            id, pnr, ticket_status,
            passengers:booking_passengers(id, first_name, surname, ticket_status)
        `)
        .order('id', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching bookings:", error);
    } else {
        console.log("Recent Bookings:");
        console.dir(bookings, { depth: null });
    }
}
checkBooking();
