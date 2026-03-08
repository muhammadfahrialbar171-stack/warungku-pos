'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Export transactions report to PDF
 */
export function exportTransactionsPDF(transactions, dateFrom, dateTo, storeName = 'WarungKu POS') {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(storeName, 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Laporan Penjualan', 14, 28);

    doc.setFontSize(10);
    doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 35);
    doc.text(`Dicetak: ${formatDateTime(new Date())}`, 14, 41);

    // Line
    doc.setDrawColor(200);
    doc.line(14, 44, 196, 44);

    // Summary
    const totalAmount = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalItems = transactions.reduce((sum, t) => sum + (t.total_items || 0), 0);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Transaksi: ${transactions.length}`, 14, 52);
    doc.text(`Total Penjualan: ${formatRupiah(totalAmount)}`, 14, 58);
    doc.text(`Total Produk Terjual: ${totalItems}`, 14, 64);

    // Table
    const tableData = transactions.map((tx, i) => [
        i + 1,
        tx.invoice_number,
        formatDateTime(tx.created_at),
        tx.total_items || 0,
        formatRupiah(tx.total_amount),
        { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' }[tx.payment_method] || tx.payment_method,
        tx.status === 'completed' ? 'Lunas' : 'Pending',
    ]);

    // Add total row
    tableData.push([
        '', '', '', 'TOTAL', formatRupiah(totalAmount), '', '',
    ]);

    doc.autoTable({
        startY: 70,
        head: [['No', 'Invoice', 'Tanggal', 'Item', 'Total', 'Bayar', 'Status']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        footStyles: { fontStyle: 'bold' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            4: { halign: 'right' },
            6: { halign: 'center' },
        },
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${storeName} — Digenerate oleh WarungKu POS`, 14, pageHeight - 10);

    doc.save(`laporan-penjualan-${dateFrom}-${dateTo}.pdf`);
}

/**
 * Export daily summary to PDF
 */
export function exportDailySummaryPDF(groupedData, labels, dateFrom, dateTo, storeName = 'WarungKu POS') {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(storeName, 14, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Ringkasan Penjualan', 14, 28);

    doc.setFontSize(10);
    doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, 14, 35);

    doc.setDrawColor(200);
    doc.line(14, 38, 196, 38);

    const tableData = labels.map((label, i) => [
        i + 1,
        label,
        groupedData[label].count,
        formatRupiah(groupedData[label].sales),
        formatRupiah(groupedData[label].expense),
        formatRupiah(groupedData[label].profit),
    ]);

    const totalTx = labels.reduce((s, l) => s + groupedData[l].count, 0);
    const totalSales = labels.reduce((s, l) => s + groupedData[l].sales, 0);
    const totalExpense = labels.reduce((s, l) => s + groupedData[l].expense, 0);
    const totalProfit = labels.reduce((s, l) => s + groupedData[l].profit, 0);

    tableData.push(['', 'TOTAL', totalTx, formatRupiah(totalSales), formatRupiah(totalExpense), formatRupiah(totalProfit)]);

    doc.autoTable({
        startY: 44,
        head: [['No', 'Periode', 'Transaksi', 'Pendapatan', 'Pengeluaran', 'Laba Bersih']],
        body: tableData,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
        },
    });

    doc.save(`ringkasan-${dateFrom}-${dateTo}.pdf`);
}
