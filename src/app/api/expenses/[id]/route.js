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

        const id = await params.id;
        const body = await request.json();

        // Clean the body — only allow safe fields
        const updateData = {};
        if (body.title) updateData.title = body.title;
        if (body.amount) updateData.amount = parseInt(body.amount);
        if (body.category) updateData.category = body.category;
        if (body.notes !== undefined) updateData.notes = body.notes || null;
        if (body.expense_date) updateData.expense_date = body.expense_date;
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('expenses')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('PUT /api/expenses/[id] error:', error);
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

        const id = await params.id;
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('DELETE /api/expenses/[id] error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
