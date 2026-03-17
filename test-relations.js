const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRelations() {
    console.log('Testing users!shifts_user_id_fkey() query...');
    const q1 = await supabase.from('shifts').select('*, users!shifts_user_id_fkey(full_name)').limit(1);
    console.log('Query 1 Error:', q1.error?.message || 'Success', q1.data);

    console.log('Testing users!user_id() query...');
    const q2 = await supabase.from('shifts').select('*, users!user_id(full_name)').limit(1);
    console.log('Query 2 Error:', q2.error?.message || 'Success', q2.data);

    // Testing relation with auth users? No, shifts references public.users.
}

checkRelations();
