import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import dayjs from 'dayjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient(token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const authHeader = request.headers.get('authorization');

        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const supabase = getSupabaseClient(token);
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase
            .from('users')
            .select('role, owner_id')
            .eq('id', user.id)
            .single();

        const ownerId = profile?.role === 'cashier' ? profile.owner_id : user.id;

        let query = supabase
            .from('expenses')
            .select('*')
            .eq('user_id', ownerId)
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (month) {
            const startOfMonth = dayjs(`${month}-01`).startOf('month').format('YYYY-MM-DD');
            const endOfMonth = dayjs(`${month}-01`).endOf('month').format('YYYY-MM-DD');
            query = query.gte('expense_date', startOfMonth).lte('expense_date', endOfMonth);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01' || (error.message && (error.message.includes('does not exist') || error.message.includes('schema cache')))) {
                return NextResponse.json([]); // Graceful fallback
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('GET /api/expenses error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const supabase = getSupabaseClient(token);
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase
            .from('users')
            .select('role, owner_id')
            .eq('id', user.id)
            .single();

        const ownerId = profile?.role === 'cashier' ? profile.owner_id : user.id;

        if (!body.title || !body.amount || !body.expense_date) {
            return NextResponse.json({ error: 'Field title, amount, dan tanggal wajib diisi' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('expenses')
            .insert({
                title: body.title,
                amount: parseInt(body.amount),
                category: body.category || 'lainnya',
                notes: body.notes || null,
                expense_date: body.expense_date,
                user_id: ownerId,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '42P01' || (error.message && (error.message.includes('does not exist') || error.message.includes('schema cache')))) {
                return NextResponse.json({ error: 'Fitur Pengeluaran belum aktif. Anda perlu menjalankan file migrasi SQL supabase-migration-v5-expenses.sql di Supabase Anda.' }, { status: 500 });
            }
            console.error('POST /api/expenses insert error:', error);
            throw error;
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error('POST /api/expenses error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
