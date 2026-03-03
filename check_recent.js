const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBooking() {
    const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`id, pnr, ticket_status, is_deleted`)
        .order('id', { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching bookings:", error);
    } else {
        console.log("Recent Bookings:", JSON.stringify(bookings, null, 2));
    }
}
checkBooking();
