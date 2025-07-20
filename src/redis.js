import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

const PAYMENTS_KEY = 'payments';

export { redis, PAYMENTS_KEY };