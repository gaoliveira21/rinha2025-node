import Queue from 'bull'
import redis from './redis.js'

// Configuração da fila de pagamentos
const paymentQueue = new Queue('payment-processing', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
    },
    // Configurações de performance
    defaultJobOptions: {
        removeOnComplete: 100, // Remove jobs completados após 100
        removeOnFail: 50,      // Remove jobs falhados após 50
        attempts: 3,           // Número de tentativas
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    },
    // Configurações de limiter
    limiter: {
        max: 1000,             // Máximo de jobs por intervalo
        duration: 60000        // Intervalo em ms (1 minuto)
    }
})

// Processador de jobs da fila
paymentQueue.process(async (job) => {
    const { correlationId, amount, processor } = job.data

    console.log(`🔄 Processando pagamento: ${correlationId}, Valor: ${amount}, Processor: ${processor}`)

    try {
        // Simular processamento de pagamento
        const result = await processPayment(correlationId, amount, processor)

        console.log(`✅ Pagamento processado com sucesso: ${correlationId}`)
        return result

    } catch (error) {
        console.error(`❌ Erro ao processar pagamento ${correlationId}:`, error.message)
        throw error
    }
})

// Função para processar pagamento (simulada)
async function processPayment(correlationId, amount, processor) {
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100))

    // Simular sucesso ou falha (90% de sucesso)
    if (Math.random() > 0.1) {
        return {
            success: true,
            correlationId,
            amount,
            processor,
            processedAt: new Date().toISOString()
        }
    } else {
        throw new Error('Falha simulada no processamento')
    }
}

// Event handlers da fila
paymentQueue.on('completed', (job, result) => {
    console.log(`✅ Job ${job.id} completado:`, result.correlationId)
})

paymentQueue.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} falhou:`, err.message)
})

paymentQueue.on('error', (error) => {
    console.error('❌ Erro na fila:', error.message)
})

paymentQueue.on('waiting', (jobId) => {
    console.log(`⏳ Job ${jobId} aguardando processamento`)
})

paymentQueue.on('active', (job) => {
    console.log(`🔄 Job ${job.id} iniciado:`, job.data.correlationId)
})

// Função para adicionar pagamento à fila
export async function addPaymentToQueue(correlationId, amount, processor = 'default') {
    try {
        const job = await paymentQueue.add({
            correlationId,
            amount,
            processor
        }, {
            priority: 1, // Prioridade alta
            delay: 0,    // Sem delay
            attempts: 3  // 3 tentativas
        })

        console.log(`📝 Pagamento adicionado à fila: ${correlationId} (Job ID: ${job.id})`)
        return job

    } catch (error) {
        console.error('❌ Erro ao adicionar à fila:', error.message)
        throw error
    }
}

// Função para obter estatísticas da fila
export async function getQueueStats() {
    try {
        const [waiting, active, completed, failed] = await Promise.all([
            paymentQueue.getWaiting(),
            paymentQueue.getActive(),
            paymentQueue.getCompleted(),
            paymentQueue.getFailed()
        ])

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            total: waiting.length + active.length + completed.length + failed.length
        }
    } catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error.message)
        return null
    }
}

// Função para limpar a fila
export async function clearQueue() {
    try {
        await paymentQueue.empty()
        console.log('🧹 Fila limpa com sucesso')
    } catch (error) {
        console.error('❌ Erro ao limpar fila:', error.message)
        throw error
    }
}

export default paymentQueue 