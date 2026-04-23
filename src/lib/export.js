'use client';

import * as XLSX from 'xlsx';
import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Export transactions to Excel
 */
export function exportTransactionsToExcel(transactions, filename = 'laporan-penjualan') {
    const data = transactions.map((tx, index) => ({
        'No': index + 1,
        'Invoice': tx.invoice_number,
        'Tanggal': formatDateTime(tx.created_at),
        'Total Item': tx.total_items || 0,
        'Total (Rp)': tx.total_amount,
        'Metode Bayar': { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' }[tx.payment_method] || tx.payment_method,
        'Status': tx.status === 'completed' ? 'Lunas' : 'Pending',
    }));

    // Add total row
    const totalAmount = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    data.push({
        'No': '',
        'Invoice': '',
        'Tanggal': '',
        'Total Item': 'TOTAL',
        'Total (Rp)': totalAmount,
        'Metode Bayar': '',
        'Status': '',
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 30 },  // Invoice
        { wch: 20 },  // Tanggal
        { wch: 12 },  // Total Item
        { wch: 15 },  // Total
        { wch: 14 },  // Metode
        { wch: 10 },  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export daily summary to Excel
 */
export function exportDailySummaryToExcel(groupedData, labels, filename = 'ringkasan-penjualan') {
    const data = labels.map((label, index) => ({
        'No': index + 1,
        'Periode': label,
        'Jumlah Transaksi': groupedData[label].count,
        'Pendapatan (Rp)': groupedData[label].sales,
        'Pengeluaran (Rp)': groupedData[label].expense,
        'Laba Bersih (Rp)': groupedData[label].profit,
    }));

    const totalTx = labels.reduce((sum, l) => sum + groupedData[l].count, 0);
    const totalSales = labels.reduce((sum, l) => sum + groupedData[l].sales, 0);
    const totalExpense = labels.reduce((sum, l) => sum + groupedData[l].expense, 0);
    const totalProfit = labels.reduce((sum, l) => sum + groupedData[l].profit, 0);

    data.push({
        'No': '',
        'Periode': 'TOTAL',
        'Jumlah Transaksi': totalTx,
        'Pendapatan (Rp)': totalSales,
        'Pengeluaran (Rp)': totalExpense,
        'Laba Bersih (Rp)': totalProfit,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export products to Excel
 */
export function exportProductsToExcel(products, filename = 'daftar-produk') {
    const data = products.map((p, index) => ({
        'No': index + 1,
        'Nama Produk': p.name,
        'SKU': p.sku || '-',
        'Kategori': p.categories?.name || '-',
        'Harga Jual (Rp)': p.price,
        'Harga Modal (Rp)': p.cost_price || 0,
        'Stok': p.stock,
        'Status': p.is_active ? 'Aktif' : 'Nonaktif',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 25 },
        { wch: 12 },
        { wch: 15 },
        { wch: 16 },
        { wch: 16 },
        { wch: 8 },
        { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produk');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export expenses to Excel
 */
export function exportExpensesToExcel(expenses, filename = 'daftar-pengeluaran') {
    const data = expenses.map((e, index) => ({
        'No': index + 1,
        'Tanggal': e.expense_date,
        'Judul': e.title,
        'Kategori': e.category,
        'Jumlah (Rp)': e.amount,
        'Catatan': e.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengeluaran');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export shift history to Excel
 */
export function exportShiftsToExcel(shifts, filename = 'histori-shift') {
    const data = shifts.map((s, index) => ({
        'No': index + 1,
        'Nama Kasir': s.users?.full_name || '-',
        'Mulai': formatDateTime(s.start_time),
        'Selesai': s.end_time ? formatDateTime(s.end_time) : 'Aktif',
        'Modal Awal (Rp)': s.starting_cash,
        'Ekspektasi (Rp)': s.expected_cash || 0,
        'Aktual (Rp)': s.actual_cash || 0,
        'Selisih (Rp)': s.actual_cash !== null ? s.actual_cash - s.expected_cash : 0,
        'Status': s.status === 'open' ? 'Terbuka' : 'Ditutup',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shifts');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
