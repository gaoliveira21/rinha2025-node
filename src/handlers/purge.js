import { redis, PAYMENTS_KEY } from '../redis.js'

export async function purgePayments() {
  await redis.del(`${PAYMENTS_KEY}:*`)
}