import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get effective user ID
        const { data: profile } = await supabase
            .from('users')
            .select('role, owner_id')
            .eq('id', user.id)
            .single();

        const ownerId = profile?.role === 'cashier' ? profile.owner_id : user.id;

        let query = supabase
            .from('customers')
            .select('*')
            .eq('user_id', ownerId)
            .order('name');

        if (search) {
            query = query.ilike('name', `%${search}%`);
        }

        const { data, error } = await query;
        if (error) {
            if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
                return NextResponse.json([]); // Graceful fallback if table doesn't exist
            }
            throw error;
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Get effective user ID
        const { data: profile } = await supabase
            .from('users')
            .select('role, owner_id')
            .eq('id', user.id)
            .single();

        const ownerId = profile?.role === 'cashier' ? profile.owner_id : user.id;

        const { data, error } = await supabase
            .from('customers')
            .insert({ ...body, user_id: ownerId })
            .select()
            .single();

        if (error) {
            if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
                return NextResponse.json({ error: 'Fitur Pelanggan belum aktif. Anda perlu menjalankan file migrasi SQL supabase-migration-v4-crm.sql di Supabase Anda.' }, { status: 500 });
            }
            throw error;
        }
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
