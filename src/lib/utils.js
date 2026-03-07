import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

/**
 * Format number to Indonesian Rupiah
 */
export function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format date with dayjs
 */
export function formatDate(date, format = 'DD MMM YYYY') {
    return dayjs(date).format(format);
}

/**
 * Format date and time
 */
export function formatDateTime(date) {
    return dayjs(date).format('DD MMM YYYY, HH:mm');
}

/**
 * Generate invoice number
 */
export function generateInvoice() {
    const now = dayjs();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${now.format('YYYYMMDD')}-${now.format('HHmmss')}-${random}`;
}

/**
 * Classnames utility (simple version)
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

/**
 * Debounce function
 */
export function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

/**
 * Get greeting based on time of day
 */
export function getGreeting() {
    const hour = dayjs().hour();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
}
