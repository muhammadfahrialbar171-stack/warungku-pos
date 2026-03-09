import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request, { params }) {
    try {
        const ip = getClientIP(request);
        const { allowed } = rateLimit(ip, { limit: 60 });
        if (!allowed) return NextResponse.json({ error: 'Terlalu banyak permintaan.' }, { status: 429 });

        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');

        // Verify caller
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id: customerId } = await params;

        // Fetch transactions for this customer, ordered newest first
        const { data: transactions, error } = await supabaseAdmin
            .from('transactions')
            .select('id, invoice_number, total_amount, payment_method, created_at, status')
            .eq('customer_id', customerId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json(transactions || []);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
