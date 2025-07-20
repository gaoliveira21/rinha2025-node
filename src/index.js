import Fastify from 'fastify'
import { addPaymentToQueue, getQueueStats, clearQueue } from './queue.js'
import redis from './redis.js'

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

// Rota para processar pagamentos
fastify.post('/payments', async (request, reply) => {
  try {
    const { correlationId, amount } = request.body

    // Validação básica
    if (!correlationId || !amount) {
      return reply.status(400).send({
        error: 'correlationId and amount are required'
      })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return reply.status(400).send({
        error: 'amount must be a positive number'
      })
    }

    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(correlationId)) {
      return reply.status(400).send({
        error: 'correlationId must be a valid UUID'
      })
    }

    // Adicionar à fila de processamento
    const job = await addPaymentToQueue(correlationId, amount, 'default')

    return reply.status(202).send({
      message: 'Payment queued for processing',
      correlationId,
      jobId: job.id
    })

  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error.message)
    return reply.status(500).send({
      error: 'Internal server error'
    })
  }
})

// Rota para obter estatísticas da fila
fastify.get('/queue/stats', async (request, reply) => {
  try {
    const stats = await getQueueStats()

    if (!stats) {
      return reply.status(500).send({
        error: 'Failed to get queue statistics'
      })
    }

    return reply.status(200).send(stats)

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error.message)
    return reply.status(500).send({
      error: 'Internal server error'
    })
  }
})

// Rota para limpar a fila (apenas para desenvolvimento)
fastify.post('/queue/clear', async (request, reply) => {
  try {
    await clearQueue()
    return reply.status(200).send({
      message: 'Queue cleared successfully'
    })

  } catch (error) {
    console.error('❌ Erro ao limpar fila:', error.message)
    return reply.status(500).send({
      error: 'Internal server error'
    })
  }
})

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down server...')

  try {
    await fastify.close()
    await redis.quit()
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

    console.log(`🚀 Server running at http://localhost:${port}/`)
    console.log(`📊 Queue stats: http://localhost:${port}/queue/stats`)

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
