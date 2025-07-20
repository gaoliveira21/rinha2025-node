import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    // Configurações de performance
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000
});

const PAYMENTS_KEY = 'payments';

// Event handlers para monitoramento
redis.on('connect', () => {
    console.log('✅ Redis conectado')
})

redis.on('error', (error) => {
    console.error('❌ Erro no Redis:', error.message)
})

redis.on('close', () => {
    console.log('🔌 Conexão Redis fechada')
})

export { redis, PAYMENTS_KEY };