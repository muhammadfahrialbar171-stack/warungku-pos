import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient(token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
    });
}

export async function PUT(request, { params }) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const supabase = getSupabaseClient(token);

        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const body = await request.json();

        const updateData = {};
        if (body.name) updateData.name = body.name;
        if (body.phone !== undefined) updateData.phone = body.phone || null;
        if (body.address !== undefined) updateData.address = body.address || null;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('customers')
            .update(updateData)
            .eq('id', id);

        if (error) {
            if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
                return NextResponse.json({ error: 'Fitur Pelanggan belum aktif. Anda perlu menjalankan file migrasi SQL supabase-migration-v4-crm.sql di Supabase Anda.' }, { status: 500 });
            }
            throw error;
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT /api/customers/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const supabase = getSupabaseClient(token);

        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) {
            if (error.code === '42P01' || (error.message && error.message.includes('does not exist'))) {
                return NextResponse.json({ error: 'Fitur Pelanggan belum aktif. Anda perlu menjalankan file migrasi SQL supabase-migration-v4-crm.sql di Supabase Anda.' }, { status: 500 });
            }
            throw error;
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/customers/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
