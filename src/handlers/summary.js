import { redis, PAYMENTS_KEY } from '../redis.js'

export async function getPaymentsSummary(from, to) {
  let cursor = '0';
  let totalRequests = 0;
  let totalAmount = 0;
  const fromDate = from ? new Date(from) : new Date('1970-01-01T00:00:00Z');
  const toDate = to ? new Date(to) : new Date();

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${PAYMENTS_KEY}:*`, 'COUNT', 100);
    if (keys.length > 0) {
      const values = await redis.mget(...keys);
      for (const val of values) {
        if (val) {
          try {
            const payment = JSON.parse(val);
            const requestedAt = new Date(payment.requestedAt);
            if (requestedAt >= fromDate && requestedAt <= toDate) {
              totalRequests += 1;
              totalAmount += Number(payment.amount) || 0;
            }
          } catch (e) {
            console.error('Error parsing payment:', e, 'Value:', val);
          }
        }
      }
    }
    cursor = nextCursor;
  } while (cursor !== '0');

  return { default: { totalRequests, totalAmount }, fallback: { totalRequests: 0, totalAmount: 0 } };
}