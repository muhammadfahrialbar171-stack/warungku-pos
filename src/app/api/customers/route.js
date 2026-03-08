import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

// Simple sanitization: strip HTML tags and trim
function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/<[^>]*>/g, '').trim().slice(0, 500);
}

export async function GET(request) {
    try {
        // Rate limit: 60 requests/minute per IP
        const ip = getClientIP(request);
        const { allowed } = rateLimit(ip, { limit: 60 });
        if (!allowed) return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 });

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
        // Rate limit: 20 requests/minute per IP (stricter for writes)
        const ip = getClientIP(request);
        const { allowed } = rateLimit(ip, { limit: 20 });
        if (!allowed) return NextResponse.json({ error: 'Terlalu banyak permintaan. Coba lagi nanti.' }, { status: 429 });

        const body = await request.json();

        // Validate required fields
        if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 1) {
            return NextResponse.json({ error: 'Nama pelanggan wajib diisi.' }, { status: 400 });
        }
        if (body.phone && !/^[0-9+\-\s()]{5,20}$/.test(body.phone)) {
            return NextResponse.json({ error: 'Format nomor telepon tidak valid.' }, { status: 400 });
        }

        // Sanitize inputs
        const sanitizedBody = {
            ...body,
            name: sanitize(body.name),
            phone: body.phone ? sanitize(body.phone) : null,
            address: body.address ? sanitize(body.address) : null,
        };

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
            .insert({ ...sanitizedBody, user_id: ownerId })
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
