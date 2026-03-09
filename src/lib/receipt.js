'use client';

import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Generate receipt HTML and open print dialog
 */
export function printReceipt({ storeName, kasirName, invoiceNumber, customerName, items, totalAmount, totalItems, paymentMethod, paidAmount, change, taxAmount, createdAt, receiptHeader, receiptFooter }) {
  const paymentLabel = { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' }[paymentMethod] || paymentMethod;
  const dateStr = formatDateTime(createdAt || new Date());

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk - ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { margin: 0; size: 80mm auto; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      width: 80mm;
      padding: 10mm 5mm;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    
    .header { margin-bottom: 4px; }
    .store-name { font-size: 18px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
    .store-subtitle { font-size: 11px; margin-bottom: 2px; }
    .receipt-title { font-size: 12px; font-weight: bold; margin-top: 5px; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 2px; display: inline-block; }
    
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .double-divider { border-top: 1px dashed #000; border-bottom: 1px dashed #000; height: 3px; margin: 8px 0; }
    
    .info-table { width: 100%; font-size: 12px; margin-bottom: 5px; }
    .info-table td { padding: 1px 0; vertical-align: top; }
    .info-table td:nth-child(1) { width: 30%; }
    
    /* Items section */
    .items-container { width: 100%; margin: 8px 0; }
    .item-row { margin-bottom: 5px; }
    .item-name { font-weight: bold; text-transform: uppercase; font-size: 12px; }
    .item-calc { display: flex; justify-content: space-between; padding-left: 5px; margin-top: 1px; }
    
    /* Summary section */
    .summary-table { width: 100%; font-size: 13px; }
    .summary-table td { padding: 2px 0; }
    .summary-table .label { text-align: left; }
    .summary-table .value { text-align: right; }
    .total-row td { font-size: 15px; font-weight: bold; padding-top: 5px; padding-bottom: 5px; border-top: 1px solid #000; }
    
    .footer { margin-top: 15px; font-size: 11px; text-align: center; line-height: 1.4; }
    .footer-note { font-style: italic; font-size: 10px; margin-top: 8px; }
    
    @media print {
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="center header">
    <div class="store-name">${storeName || 'WarungKu POS'}</div>
    ${receiptHeader ? `<div class="store-subtitle">${receiptHeader.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="receipt-title">STRUK PENJUALAN</div>
  </div>

  <table class="info-table">
    <tr><td>No</td><td>: ${invoiceNumber}</td></tr>
    <tr><td>Tanggal</td><td>: ${dateStr}</td></tr>
    <tr><td>Kasir</td><td>: ${kasirName || storeName || 'Admin'}</td></tr>
    ${customerName ? `<tr><td>Pelanggan</td><td>: ${customerName}</td></tr>` : ''}
  </table>

  <div class="double-divider"></div>

  <div class="items-container">
    ${items.map(item => `
      <div class="item-row">
        <div class="item-name">${item.product_name || item.name}</div>
        <div class="item-calc">
          <span>${item.quantity} x ${formatRupiah(item.price)}</span>
          <span>${formatRupiah(item.quantity * item.price)}</span>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="double-divider"></div>

  <table class="summary-table">
    <tr>
      <td class="label">Total Item</td>
      <td class="value">${totalItems} item</td>
    </tr>
    ${taxAmount > 0 ? `
    <tr>
      <td class="label">Pajak (PPN)</td>
      <td class="value">+${formatRupiah(taxAmount)}</td>
    </tr>` : ''}
    <tr class="total-row">
      <td class="label">TOTAL</td>
      <td class="value">${formatRupiah(totalAmount)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table class="summary-table">
    <tr>
      <td class="label">Bayar (${paymentLabel})</td>
      <td class="value">${formatRupiah(paidAmount || totalAmount)}</td>
    </tr>
    ${paymentMethod === 'cash' && change !== undefined ? `
    <tr>
      <td class="label bold">Kembalian</td>
      <td class="value bold">${formatRupiah(change)}</td>
    </tr>
    ` : ''}
  </table>

  <div class="divider"></div>

  <div class="footer">
    ${receiptFooter ? `<div>${receiptFooter.replace(/\n/g, '<br>')}</div>` : `
    <div>Terima kasih atas kunjungan Anda.</div>
    <div class="footer-note">Barang yang sudah dibeli<br>tidak dapat ditukar/dikembalikan</div>
    `}
    <div style="margin-top: 10px; font-weight: bold;">— WarungKu POS —</div>
  </div>

</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
}

/**
 * Share receipt via WhatsApp (text version)
 */
export function shareReceiptWhatsApp({ storeName, kasirName, invoiceNumber, customerName, items, totalAmount, taxAmount, paymentMethod, createdAt, receiptHeader, receiptFooter }) {
  const paymentLabel = { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' }[paymentMethod] || paymentMethod;

  let text = `🧾 *STRUK PEMBELIAN*\n`;
  text += `${storeName || 'WarungKu POS'}\n`;
  if (receiptHeader) text += `${receiptHeader}\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;
  text += `No: ${invoiceNumber}\n`;
  text += `Tgl: ${formatDateTime(createdAt || new Date())}\n`;
  if (customerName) {
    text += `Pelanggan: ${customerName}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━\n\n`;

  items.forEach(item => {
    text += `${item.product_name || item.name}\n`;
    text += `  ${item.quantity} x ${formatRupiah(item.price)} = ${formatRupiah(item.quantity * item.price)}\n`;
  });

  text += `\n━━━━━━━━━━━━━━━━━━\n`;
  if (taxAmount > 0) {
    text += `Pajak PPN: +${formatRupiah(taxAmount)}\n`;
  }
  text += `*TOTAL: ${formatRupiah(totalAmount)}*\n`;
  text += `Bayar: ${paymentLabel}\n`;
  text += `━━━━━━━━━━━━━━━━━━\n`;
  if (receiptFooter) {
    text += `${receiptFooter}`;
  } else {
    text += `Terima kasih! 🙏`;
  }

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
