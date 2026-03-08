import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Lazy-initialize so this module doesn't crash at build time
// when env vars are not yet available
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
}

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // Verify the caller is authenticated
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify caller's session
        const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
        if (callerError || !callerData?.user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Verify caller is an owner (has a users record with role 'owner' or no role)
        const { data: callerProfile } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', callerData.user.id)
            .single();

        if (callerProfile?.role === 'cashier') {
            return NextResponse.json({ error: 'Forbidden: only owners can delete users' }, { status: 403 });
        }

        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Verify the user to be deleted belongs to this owner
        const { data: targetUser } = await supabaseAdmin
            .from('users')
            .select('owner_id, role')
            .eq('id', userId)
            .single();

        if (!targetUser || targetUser.owner_id !== callerData.user.id) {
            return NextResponse.json({ error: 'Forbidden: cannot delete this user' }, { status: 403 });
        }

        // Delete from Supabase Auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (deleteError) {
            return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[delete-user]', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
