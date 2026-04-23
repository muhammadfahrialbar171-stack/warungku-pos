/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Tracks request counts per IP with a sliding window.
 */

const requestMap = new Map();

/**
 * Check rate limit for a given identifier (e.g., IP address).
 * @param {string} identifier - IP address or user ID
 * @param {object} options
 * @param {number} options.limit - Max requests allowed in the window (default: 30)
 * @param {number} options.windowMs - Time window in ms (default: 60000 = 1 minute)
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function rateLimit(identifier, { limit = 30, windowMs = 60_000 } = {}) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requestMap.has(identifier)) {
        requestMap.set(identifier, []);
    }

    // Clean up old timestamps outside the window
    const timestamps = requestMap.get(identifier).filter(ts => ts > windowStart);
    timestamps.push(now);
    requestMap.set(identifier, timestamps);

    const count = timestamps.length;
    const allowed = count <= limit;
    const resetAt = timestamps[0] + windowMs;

    return {
        allowed,
        remaining: Math.max(0, limit - count),
        resetAt,
    };
}

/**
 * Get the client IP from a Next.js request.
 */
export function getClientIP(request) {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        '127.0.0.1'
    );
}

// Cleanup old entries every 5 minutes to prevent memory leak
if (typeof global !== 'undefined' && !global._rateLimitCleanup) {
    global._rateLimitCleanup = setInterval(() => {
        const cutoff = Date.now() - 60_000;
        for (const [key, timestamps] of requestMap.entries()) {
            const filtered = timestamps.filter(ts => ts > cutoff);
            if (filtered.length === 0) {
                requestMap.delete(key);
            } else {
                requestMap.set(key, filtered);
            }
        }
    }, 5 * 60_000);
}
