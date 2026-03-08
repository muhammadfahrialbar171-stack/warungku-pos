import { NextResponse } from 'next/server';
import midtransClient from 'midtrans-client';
import { supabase } from '@/lib/supabase';

// Create Snap API instance
const snap = new midtransClient.Snap({
    isProduction: false, // Set to true if deploying to production
    serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-MOCK-KEY',
});

export async function POST(request) {
    try {
        const body = await request.json();
        const { order_id, gross_amount, customer_name, customer_email, payment_method } = body;

        if (!order_id || !gross_amount) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Generate Midtrans transaction
        const parameter = {
            transaction_details: {
                order_id: order_id,
                gross_amount: Math.round(gross_amount)
            },
            customer_details: {
                first_name: customer_name || 'Customer',
                email: customer_email || 'customer@warungku.pos'
            },
            item_details: [{
                id: 'POS-ITEM',
                price: Math.round(gross_amount),
                quantity: 1,
                name: 'Pembayaran Kasir POS'
            }],
            // If user explicitly chose a method, you can optionally restrict it
            // enabled_payments: payment_method ? [payment_method] : undefined
        };

        const transaction = await snap.createTransaction(parameter);

        return NextResponse.json({
            token: transaction.token,
            redirect_url: transaction.redirect_url
        });
    } catch (error) {
        console.error('Midtrans API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
