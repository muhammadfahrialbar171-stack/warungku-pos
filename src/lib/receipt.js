'use client';

import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Generate receipt HTML and open print dialog
 */
export function printReceipt({ storeName, invoiceNumber, customerName, items, totalAmount, totalItems, paymentMethod, paidAmount, change, createdAt, receiptHeader, receiptFooter }) {
  const paymentLabel = { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' }[paymentMethod] || paymentMethod;

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
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      padding: 8mm 5mm;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .store-name { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .double-divider { border-top: 2px solid #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; padding: 1px 0; }
    .item-name { font-weight: bold; }
    .item-detail { display: flex; justify-content: space-between; padding-left: 8px; color: #333; }
    .total-row { font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; padding: 3px 0; }
    .footer { margin-top: 10px; font-size: 10px; color: #666; }
    @media print {
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="store-name">${storeName || 'WarungKu POS'}</div>
    ${receiptHeader ? `<div style="font-size: 11px; margin-bottom: 4px;">${receiptHeader}</div>` : ''}
    <div style="font-size: 10px; color: #666;">Struk Penjualan</div>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span>No:</span>
    <span>${invoiceNumber}</span>
  </div>
  <div class="row">
    <span>Tanggal:</span>
    <span>${formatDateTime(createdAt || new Date())}</span>
  </div>
  ${customerName ? `
  <div class="row">
    <span>Pelanggan:</span>
    <span>${customerName}</span>
  </div>` : ''}
  <div class="row">
    <span>Kasir:</span>
    <span>Admin</span>
  </div>

  <div class="double-divider"></div>

  ${items.map(item => `
    <div>
      <div class="item-name">${item.product_name || item.name}</div>
      <div class="item-detail">
        <span>${item.quantity} x ${formatRupiah(item.price)}</span>
        <span>${formatRupiah(item.quantity * item.price)}</span>
      </div>
    </div>
  `).join('')}

  <div class="double-divider"></div>

  <div class="row">
    <span>Total Item:</span>
    <span>${totalItems} item</span>
  </div>
  <div class="total-row">
    <span>TOTAL:</span>
    <span>${formatRupiah(totalAmount)}</span>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span>Bayar (${paymentLabel}):</span>
    <span>${formatRupiah(paidAmount || totalAmount)}</span>
  </div>
  ${paymentMethod === 'cash' && change !== undefined ? `
  <div class="row bold">
    <span>Kembalian:</span>
    <span>${formatRupiah(change)}</span>
  </div>
  ` : ''}

  <div class="divider"></div>

  <div class="center footer">
    ${receiptFooter ? `<p>${receiptFooter}</p>` : `
    <p>Terima kasih atas kunjungan Anda!</p>
    <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
    `}
    <p style="margin-top: 6px;">— WarungKu POS —</p>
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
export function shareReceiptWhatsApp({ storeName, invoiceNumber, customerName, items, totalAmount, paymentMethod, createdAt, receiptHeader, receiptFooter }) {
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
