import Redis from 'ioredis'

// Configuração do Redis para Bull
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    lazyConnect: true,
    // Configurações de performance
    keepAlive: 30000,
    family: 4,
    connectTimeout: 10000,
    commandTimeout: 5000
}

// Cliente Redis
const redis = new Redis(redisConfig)

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

export default redis 