import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    // Configurações de performance
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000
});

const PAYMENTS_KEY = 'payments';

export { redis, PAYMENTS_KEY };