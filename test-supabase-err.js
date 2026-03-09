const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
    console.log('No supabase url');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    let amountVal; // undefined
    try {
        const { data, error } = await supabase
            .from('expenses')
            .insert({
                title: "Test",
                amount: parseInt(amountVal),
                expense_date: "2026-03-09",
                user_id: "00000000-0000-0000-0000-000000000000"
            })
            .select()
            .single();
        console.log("Error inserting parseInt(undefined):", error);
    } catch (e) {
        console.log("Exception:", e);
    }
}
testInsert();
