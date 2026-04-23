'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Export transactions report to PDF
 */
export function exportTransactionsPDF(transactions, dateFrom, dateTo, storeName = 'WarungKu POS', storePhone = '') {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

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

    autoTable(doc, {
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
    } catch (error) {
        console.error('PDF Export Error:', error);
        alert('Gagal membuat PDF. Silakan coba lagi.');
    }
}

/**
 * Export daily summary to PDF
 */
export function exportDailySummaryPDF(groupedData, labels, dateFrom, dateTo, storeName = 'WarungKu POS', storePhone = '') {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

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

    autoTable(doc, {
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
    } catch (error) {
        console.error('PDF Export Error:', error);
        alert('Gagal membuat PDF ringkasan.');
    }
}

/**
 * Export AI Stock Forecast report to PDF
 */
export function exportForecastPDF(predictions, storeName = 'WarungKu POS') {
    try {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const now = new Date();

    // Branded Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 34, 'F');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(storeName, 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Laporan AI Stock Forecast', 14, 22);
    doc.text('Powered by Weighted Trend Analysis', 14, 29);

    doc.setFontSize(9);
    doc.text(`Dicetak: ${formatDateTime(now)}`, pageWidth - 14, 22, { align: 'right' });
    doc.text('Proyeksi 14 Hari ke Depan', pageWidth - 14, 29, { align: 'right' });

    doc.setTextColor(0, 0, 0);

    // Summary Boxes
    const critical = predictions.filter(p => p.riskLevel === 'CRITICAL').length;
    const high = predictions.filter(p => p.riskLevel === 'HIGH').length;
    const low = predictions.filter(p => p.riskLevel === 'LOW').length;
    const safe = predictions.filter(p => p.riskLevel === 'SAFE').length;
    const totalOrder = predictions.reduce((s, p) => s + (p.orderSuggestion || 0), 0);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const boxes = [
        { label: 'KRITIS', count: critical, color: [239, 68, 68] },
        { label: 'TINGGI', count: high, color: [245, 158, 11] },
        { label: 'RENDAH', count: low, color: [59, 130, 246] },
        { label: 'AMAN', count: safe, color: [16, 185, 129] },
    ];
    const boxW = (pageWidth - 28 - 9) / 4;
    boxes.forEach((box, i) => {
        const x = 14 + i * (boxW + 3);
        doc.setFillColor(...box.color);
        doc.roundedRect(x, 39, boxW, 18, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(box.count), x + boxW / 2, 50, { align: 'center' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(box.label, x + boxW / 2, 55, { align: 'center' });
    });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Saran Order: ${totalOrder} unit`, 14, 68);

    // Table
    const riskLabel = { CRITICAL: 'KRITIS', HIGH: 'TINGGI', LOW: 'RENDAH', SAFE: 'AMAN' };
    const tableData = predictions.map((p, i) => [
        i + 1,
        p.name,
        p.stock,
        p.weightedAvg > 0 ? p.weightedAvg.toFixed(2) : '—',
        p.daysLeft >= 9999 ? 'N/A' : `${p.daysLeft} hari`,
        riskLabel[p.riskLevel] || p.riskLevel,
        p.orderSuggestion > 0 ? `+${p.orderSuggestion}` : 'Cukup',
    ]);

    const riskColors = { KRITIS: [239, 68, 68], TINGGI: [245, 158, 11], RENDAH: [59, 130, 246], AMAN: [16, 185, 129] };

    autoTable(doc, {
        startY: 73,
        head: [['No', 'Produk', 'Stok', 'Ritme/Hari', 'Sisa Hari', 'Status Risiko', 'Saran Order']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 10 },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { halign: 'center' },
            5: { halign: 'center' },
            6: { halign: 'center' },
        },
        didDrawCell: (data) => {
            if (data.column.index === 5 && data.section === 'body') {
                const label = String(data.cell.text);
                const color = riskColors[label];
                if (color) {
                    doc.setTextColor(...color);
                    doc.setFont('helvetica', 'bold');
                }
            }
        },
        didDrawPage: (data) => {
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`${storeName} | WarungKu POS — AI Forecast Report`, 14, pageHeight - 8);
            doc.text(`Halaman ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 14, pageHeight - 8, { align: 'right' });
        }
    });

    doc.save(`ai-forecast-${formatDateTime(now).replace(/[/:, ]/g, '-')}.pdf`);
    } catch (error) {
        console.error('Forecast PDF Error:', error);
        alert('Gagal membuat PDF ramalan stok.');
    }
}
