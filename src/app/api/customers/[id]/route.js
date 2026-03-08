import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request, { params }) {
    try {
        const id = await params.id;
        const body = await request.json();
        const { error } = await supabase
            .from('customers')
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const id = await params.id;
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
