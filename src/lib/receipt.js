'use client';

import { formatRupiah, formatDateTime } from '@/lib/utils';

/**
 * Generate receipt HTML and open print dialog
 */
export function printReceipt({ storeName, kasirName, invoiceNumber, customerName, items, totalAmount, totalItems, paymentMethod, paidAmount, change, taxAmount, discountAmount, createdAt, receiptHeader, receiptFooter, logoUrl }) {
  const paymentLabel = { cash: 'Tunai', debit: 'Debit', qris: 'QRIS' }[paymentMethod] || paymentMethod;
  const dateStr = formatDateTime(createdAt || new Date());

  const paperSize = typeof window !== 'undefined' ? (localStorage.getItem('pos_receipt_size') || '80mm') : '80mm';
  const is58mm = paperSize === '58mm';

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
    @page { margin: 0; size: auto; } /* Auto size for varying thermal lengths */
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58mm ? '10px' : '11px'};
      width: 100%;
      max-width: ${is58mm ? '58mm' : '80mm'};
      margin: 0 auto;
      padding: 5mm ${is58mm ? '1mm' : '3mm'};
      color: #000;
      background: #fff;
      overflow-x: hidden;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    
    .header { margin-bottom: 6px; }
    .store-logo { max-width: 80%; max-height: 25mm; margin: 0 auto 6px auto; display: block; filter: grayscale(100%) contrast(1.2); object-fit: contain; }
    .store-name { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; line-height: 1.2; }
    .store-subtitle { font-size: 10px; margin-bottom: 2px; opacity: 0.8; }
    
    /* Minimart style dashed lines */
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .divider-double { border-top: 1px dashed #000; border-bottom: 1px dashed #000; height: 3px; margin: 4px 0; }
    
    .info-row { display: flex; justify-content: space-between; font-size: 11px; margin: 1px 0; }
    
    /* Items section */
    .items-container { width: 100%; margin: 6px 0; font-size: ${is58mm ? '11px' : '12px'}; }
    .item-row { margin-bottom: 4px; }
    .item-name { text-transform: uppercase; margin-bottom: 1px; }
    .item-calc { display: flex; justify-content: space-between; padding-left: ${is58mm ? '4px' : '8px'}; font-size: ${is58mm ? '10px' : '12px'}; }
    
    /* Summary section */
    .summary-table { width: 100%; font-size: ${is58mm ? '11px' : '12px'}; margin-top: 4px; }
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
      body { width: ${is58mm ? '58mm' : '80mm'}; }
    }
  </style>
</head>
<body>
  <div class="center header">
    ${logoUrl ? `<img src="${logoUrl}" class="store-logo" alt="Store Logo" />` : ''}
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
      <td class="label">Total Qty Barang</td>
      <td class="value">${totalItems ? totalItems : items.reduce((sum, i) => sum + (i.quantity || 1), 0)}</td>
    </tr>
    ${taxAmount > 0 ? `
    <tr>
      <td class="label">Pajak (PPN)</td>
      <td class="value">${formatRupiah(taxAmount)}</td>
    </tr>` : ''}
    ${discountAmount > 0 ? `
    <tr>
      <td class="label">Diskon</td>
      <td class="value">-${formatRupiah(discountAmount)}</td>
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
  
  <div style="text-align: right; font-size: 10px; margin-top: 4px; font-style: italic;">
    Pembayaran: ${paymentLabel}
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

  const printWindow = window.open('', '_blank', 'width=400,height=600');
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
 * Generate Shift Recap HTML and open print dialog
 */
export function printShiftReport({ storeName, kasirName, logoUrl, shiftId, startTime, endTime, startingCash, expectedCash, actualCash, difference }) {
  const dateStr = formatDateTime(new Date());
  
  const paperSize = typeof window !== 'undefined' ? (localStorage.getItem('pos_receipt_size') || '80mm') : '80mm';
  const is58mm = paperSize === '58mm';

  const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Rekap Shift - ${shiftId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { margin: 0; size: auto; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${is58mm ? '10px' : '11px'};
      width: 100%;
      max-width: ${is58mm ? '58mm' : '80mm'};
      margin: 0 auto;
      padding: 5mm ${is58mm ? '1mm' : '3mm'};
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .header { margin-bottom: 6px; }
    .store-logo { max-width: 80%; max-height: 25mm; margin: 0 auto 6px auto; display: block; filter: grayscale(100%) contrast(1.2); object-fit: contain; }
    .store-name { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; line-height: 1.2; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    .divider-double { border-top: 1px dashed #000; border-bottom: 1px dashed #000; height: 3px; margin: 4px 0; }
    .data-table { width: 100%; font-size: ${is58mm ? '10px' : '12px'}; margin: 6px 0; }
    .data-table td { padding: 1px 0; }
    .data-table .label { text-align: left; }
    .data-table .value { text-align: right; font-weight: bold; }
    .footer { margin-top: 15px; font-size: 11px; text-align: center; line-height: 1.3; }
    @media print {
      body { width: ${is58mm ? '58mm' : '80mm'}; }
    }
  </style>
</head>
<body>
  <div class="center header">
    ${logoUrl ? `<img src="${logoUrl}" class="store-logo" alt="Store Logo" />` : ''}
    <div class="store-name">${storeName || 'WarungKu POS'}</div>
    <div class="bold" style="font-size: 13px; margin-top: 5px;">REKAP TUTUP SHIFT</div>
  </div>

  <div class="divider"></div>
  <table class="data-table">
    <tr><td class="label">Tanggal Cetak</td><td class="value">${dateStr}</td></tr>
    <tr><td class="label">Kasir</td><td class="value">${kasirName || 'Admin'}</td></tr>
    <tr><td class="label">Buka Shift</td><td class="value">${startTime}</td></tr>
    <tr><td class="label">Tutup Shift</td><td class="value">${endTime || '-'}</td></tr>
  </table>
  <div class="divider-double"></div>

  <div class="center bold" style="margin: 4px 0;">RINCIAN KAS (TUNAI)</div>
  <div class="divider"></div>
  <table class="data-table">
    <tr><td class="label">Modal Awal Laci</td><td class="value">${formatRupiah(startingCash)}</td></tr>
    <tr><td class="label">Pemasukan Tunai</td><td class="value">${formatRupiah(expectedCash - startingCash)}</td></tr>
    <tr><td class="label" style="padding-top:4px;">TOTAL DI SISTEM</td><td class="value" style="padding-top:4px;">${formatRupiah(expectedCash)}</td></tr>
  </table>
  
  <div class="divider"></div>
  <table class="data-table">
    <tr><td class="label">UANG DI LACI (AKTUAL)</td><td class="value">${formatRupiah(actualCash)}</td></tr>
    <tr><td class="label">SELISIH KAS</td><td class="value">${difference > 0 ? '+' : ''}${formatRupiah(difference)}</td></tr>
  </table>
  <div class="divider-double"></div>

  <div class="footer">
    <div style="font-style:italic;">Status: ${difference === 0 ? 'SEIMBANG' : (difference < 0 ? 'MINUS/KURANG' : 'LEBIH')}</div>
    <div style="margin-top:20px; display: flex; justify-content: space-around;">
        <div style="width: 40%; text-align: center;">
            <div style="margin-bottom: 25px;">Kasir</div>
            <div>( ${kasirName || 'Admin'} )</div>
        </div>
        <div style="width: 40%; text-align: center;">
            <div style="margin-bottom: 25px;">Supervisor</div>
            <div>( ................. )</div>
        </div>
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}



/**
 * Share receipt via WhatsApp (text version)
 */
export function shareReceiptWhatsApp({ storeName, kasirName, invoiceNumber, customerName, items, totalAmount, taxAmount, discountAmount, paymentMethod, createdAt, receiptHeader, receiptFooter }) {
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
  if (discountAmount > 0) {
    text += `Diskon: -${formatRupiah(discountAmount)}\n`;
  }
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
