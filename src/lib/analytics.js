import dayjs from "dayjs";

/**
 * Calculates stock forecasting based on transaction history
 * @param {Array} products - List of active products
 * @param {Array} itemHistory - List of transaction items from last 30 days
 * @param {Object} txDateMap - Map of transaction ID to date
 * @returns {Array} List of products with prediction data
 */
export const calculateStockForecasting = (products, itemHistory, txDateMap) => {
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();
    const sevenDaysAgo = dayjs().subtract(7, 'day').toISOString();

    const qtyMapRecent = {}; // 0-7 days
    const qtyMapBaseline = {}; // 8-30 days
    const productDailyTrend = {};

    (itemHistory || []).forEach(item => {
        const txDate = txDateMap[item.transaction_id];
        if (!txDate) return;
        
        const itemDate = dayjs(txDate);
        const dateKey = itemDate.format('YYYY-MM-DD');

        if (itemDate.isAfter(sevenDaysAgo)) {
            qtyMapRecent[item.product_id] = (qtyMapRecent[item.product_id] || 0) + item.quantity;
        } else {
            qtyMapBaseline[item.product_id] = (qtyMapBaseline[item.product_id] || 0) + item.quantity;
        }

        if (!productDailyTrend[item.product_id]) productDailyTrend[item.product_id] = {};
        productDailyTrend[item.product_id][dateKey] = (productDailyTrend[item.product_id][dateKey] || 0) + item.quantity;
    });

    return (products || []).map(p => {
        const recentAvg = (qtyMapRecent[p.id] || 0) / 7;
        const baselineAvg = (qtyMapBaseline[p.id] || 0) / 23;
        
        // Weighted Avg: 70% Recent, 30% Baseline
        const weightedAvg = (recentAvg * 0.7) + (baselineAvg * 0.3);
        const daysLeft = weightedAvg > 0 ? Math.floor(p.stock / weightedAvg) : Infinity;
        
        // Suggest ordering to reach 14 days safety stock
        const targetStock = Math.ceil(weightedAvg * 14);
        const orderSuggestion = Math.max(0, targetStock - p.stock);

        // Risk Level
        let riskLevel = 'SAFE';
        if (daysLeft !== Infinity) {
            if (daysLeft <= 1) riskLevel = 'CRITICAL';
            else if (daysLeft <= 3) riskLevel = 'HIGH';
            else if (daysLeft <= 7) riskLevel = 'LOW';
        }

        // 7-day sparkline trend
        const trend = [];
        for (let i = 6; i >= 0; i--) {
            const d = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
            trend.push(productDailyTrend[p.id]?.[d] || 0);
        }

        return { 
            ...p, 
            daysLeft: daysLeft === Infinity ? 9999 : daysLeft, 
            weightedAvg, 
            orderSuggestion,
            riskLevel,
            trend
        };
    });
};

/**
 * Analyzes peak transaction hours
 * @param {Array} txHistory - List of transactions with created_at
 * @returns {Number|null} Peak hour (0-23)
 */
export const calculatePeakHour = (txHistory) => {
    const hoursMap = {};
    (txHistory || []).forEach(tx => {
        const hr = dayjs(tx.created_at).hour();
        hoursMap[hr] = (hoursMap[hr] || 0) + 1;
    });

    let peakHr = null;
    let maxCount = 0;
    Object.entries(hoursMap).forEach(([hr, count]) => {
        if (count > maxCount) {
            maxCount = count;
            peakHr = parseInt(hr);
        }
    });
    return peakHr;
};
