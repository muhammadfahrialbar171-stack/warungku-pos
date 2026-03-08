'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Export transactions report to PDF
 */
export function exportTransactionsPDF(transactions, dateFrom, dateTo, storeName = 'WarungKu POS', storePhone = '') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Branded Header Box
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(storeName, 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Laporan Penjualan', 14, 22);
    if (storePhone) doc.text(`Tel: ${storePhone}`, 14, 28);

    // Date info on right side
    doc.setFontSize(9);
    doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, pageWidth - 14, 22, { align: 'right' });
    doc.text(`Dicetak: ${formatDateTime(new Date())}`, pageWidth - 14, 28, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Summary
    const totalAmount = transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const totalItems = transactions.reduce((sum, t) => sum + (t.total_items || 0), 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jumlah Transaksi: ${transactions.length}`, 14, 44);
    doc.text(`Total Penjualan: ${formatRupiah(totalAmount)}`, 14, 51);
    doc.text(`Total Item Terjual: ${totalItems}`, 14, 58);

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

    tableData.push(['', '', '', 'TOTAL', formatRupiah(totalAmount), '', '']);

    doc.autoTable({
        startY: 64,
        head: [['No', 'Invoice', 'Tanggal', 'Item', 'Total', 'Bayar', 'Status']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            4: { halign: 'right' },
            6: { halign: 'center' },
        },
        didDrawPage: (data) => {
            // Footer on every page
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`${storeName} | WarungKu POS`, 14, pageHeight - 8);
            doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
        }
    });

    doc.save(`laporan-penjualan-${dateFrom}-${dateTo}.pdf`);
}

/**
 * Export daily summary to PDF
 */
export function exportDailySummaryPDF(groupedData, labels, dateFrom, dateTo, storeName = 'WarungKu POS', storePhone = '') {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Branded Header Box
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 32, 'F');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(storeName, 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Ringkasan Penjualan Harian', 14, 22);
    if (storePhone) doc.text(`Tel: ${storePhone}`, 14, 28);
    doc.text(`Periode: ${dateFrom} s/d ${dateTo}`, pageWidth - 14, 22, { align: 'right' });

    doc.setTextColor(0, 0, 0);

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
        startY: 38,
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
        didDrawPage: (data) => {
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`${storeName} | WarungKu POS`, 14, pageHeight - 8);
            doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
        }
    });

    doc.save(`ringkasan-${dateFrom}-${dateTo}.pdf`);
}
