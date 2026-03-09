'use client';

import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Generate receipt HTML and open print dialog
 */
export function printReceipt({ storeName, kasirName, invoiceNumber, customerName, items, totalAmount, totalItems, paymentMethod, paidAmount, change, taxAmount, createdAt, receiptHeader, receiptFooter }) {
  const paymentLabel = { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' }[paymentMethod] || paymentMethod;
  const dateStr = formatDateTime(createdAt || new Date());

  // Memastikan kasirName terisi nama kasir aslinya atau default ke Admin
  const finalKasirName = kasirName || 'Admin';

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk - ${invoiceNumber}</title>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap" rel="stylesheet">
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
    
    .header { margin-bottom: 6px; }
    .store-name { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    .store-subtitle { font-size: 11px; margin-bottom: 2px; }
    
    /* Minimart style dashed lines */
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .divider-double { border-top: 1px dashed #000; border-bottom: 1px dashed #000; height: 3px; margin: 4px 0; }
    
    .info-row { display: flex; justify-content: space-between; font-size: 11px; margin: 1px 0; }
    
    /* Items section */
    .items-container { width: 100%; margin: 6px 0; font-size: 12px; }
    .item-row { margin-bottom: 4px; }
    .item-name { text-transform: uppercase; margin-bottom: 1px; }
    .item-calc { display: flex; justify-content: space-between; padding-left: 8px; font-size: 12px; }
    
    /* Summary section */
    .summary-table { width: 100%; font-size: 12px; margin-top: 4px; }
    .summary-table td { padding: 1px 0; }
    .summary-table .label { text-align: left; }
    .summary-table .value { text-align: right; }
    
    /* Highlight the total */
    .total-row td { font-size: 14px; font-weight: bold; padding-top: 3px; }
    
    .footer { margin-top: 12px; font-size: 11px; text-align: center; line-height: 1.3; }
    .footer-thanks { font-weight: bold; font-size: 12px; margin-bottom: 4px; }
    .footer-note { font-size: 10px; margin-top: 4px; }
    
    /* Barcode Stylings */
    .barcode-container { margin-top: 10px; text-align: center; }
    .real-barcode { font-family: 'Libre Barcode 39 Text', cursive; font-size: 34px; line-height: 1; margin-top: 5px; }
    .barcode-text { font-size: 10px; letter-spacing: 1px; display: none; }
    
    @media print {
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="center header">
    <div class="store-name">${storeName || 'WarungKu POS'}</div>
    ${receiptHeader ? `<div class="store-subtitle">${receiptHeader.replace(/\n/g, '<br>')}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div class="info-row">
    <span>${dateStr}</span>
    <span>${invoiceNumber}</span>
  </div>
  <div class="info-row">
    <span>Kasir: ${finalKasirName}</span>
    ${customerName ? `<span>Pelanggan: ${customerName}</span>` : `<span></span>`}
  </div>

  <div class="divider-double"></div>

  <div class="items-container">
    ${items.map(item => `
      <div class="item-row">
        <div class="item-name">${item.product_name || item.name}</div>
        <div class="item-calc">
          <span>${item.quantity}  x  ${formatRupiah(item.price)}</span>
          <span>${formatRupiah(item.quantity * item.price)}</span>
        </div>
      </div>
    `).join('')}
  </div>

  <div class="divider-double"></div>

  <table class="summary-table">
    <tr>
      <td class="label">Total Item</td>
      <td class="value">${totalItems}</td>
    </tr>
    ${taxAmount > 0 ? `
    <tr>
      <td class="label">Pajak (PPN)</td>
      <td class="value">${formatRupiah(taxAmount)}</td>
    </tr>` : ''}
    <tr class="total-row">
      <td class="label">TOTAL BELANJA</td>
      <td class="value">${formatRupiah(totalAmount)}</td>
    </tr>
    <tr>
      <td class="label">TUNAI/BAYAR</td>
      <td class="value">${formatRupiah(paidAmount || totalAmount)}</td>
    </tr>
    ${paymentMethod === 'cash' && change !== undefined ? `
    <tr>
      <td class="label">KEMBALIAN</td>
      <td class="value">${formatRupiah(change)}</td>
    </tr>
    ` : ''}
  </table>
  
  <div style="text-align: right; font-size: 11px; margin-top: 4px;">
    Tipe Bayar: ${paymentLabel}
  </div>

  <div class="divider"></div>

  <div class="footer">
    ${receiptFooter ? `<div>${receiptFooter.replace(/\n/g, '<br>')}</div>` : `
    <div class="footer-thanks">TERIMA KASIH</div>
    <div class="footer-thanks">SELAMAT BELANJA KEMBALI</div>
    <div class="footer-note">Layanan Konsumen: 1500-xxx</div>
    `}
    <div class="barcode-container">
      <div class="real-barcode">*${invoiceNumber}*</div>
    </div>
  </div>

</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (printWindow) {
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    // Beri waktu lebih lama (1000ms) agar font dari Google Fonts termuat dengan sempurna sebelum jendela print dibuka
    setTimeout(() => {
      printWindow.print();
    }, 1000);
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
