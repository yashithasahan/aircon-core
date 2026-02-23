import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStr() {
    const { data, error } = await supabase
        .from('bookings')
        .select('id, pnr, entry_date, status_date, ticket_issued_date, void_date')
        .eq('pnr', 'TSTV');
    if (error) console.error(error);
    else console.log(data);
}
checkStr();
