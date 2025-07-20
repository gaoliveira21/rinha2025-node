import { redis, PAYMENTS_KEY } from '../redis.js'

export async function purgePayments() {
  const keys = await redis.keys(`${PAYMENTS_KEY}:*`);
  if (keys.length === 0) return
  await redis.del(keys)
}