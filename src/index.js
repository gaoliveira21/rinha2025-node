import Fastify from 'fastify'

// Configurações do Fastify otimizadas para performance
const fastify = Fastify({
  logger: false, // Desabilita logs para performance
  trustProxy: true,
  bodyLimit: 1024 * 1024, // 1MB
  maxParamLength: 100,
  connectionTimeout: 5000,
  keepAliveTimeout: 5000,
  maxRequestsPerSocket: 1000,
  allowHTTP1: true
})

// Rota de health check na raiz
fastify.get('/', async (request, reply) => {
  return { status: 'ok' }
})

// Rota de health check em /health
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' }
})

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...')

  try {
    await fastify.close()
    console.log('Server shut down gracefully.')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

// Event handlers para graceful shutdown
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  shutdown()
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  shutdown()
})

// Inicialização do servidor
async function start() {
  try {
    const port = process.env.PORT || 3000

    await fastify.listen({
      port: port,
      host: '0.0.0.0'
    })

    console.log(`Server running at http://localhost:${port}/`)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
