import { redis } from '../redis.js'

const QUEUE_KEY = 'payments:queue'
const FAILED_QUEUE_KEY = 'payments:failed'
const PROCESSING_KEY = 'payments:processing'
const MAX_CONCURRENT = 5
const BATCH_SIZE = 10
const MAX_ATTEMPTS = 100 // Muito mais tentativas
const BASE_DELAY = 100 // Delay base em ms

class LightweightQueue {
    constructor() {
        this.isProcessing = false
        this.processingJobs = new Set()
    }

    async add(payment) {
        const job = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            data: payment,
            timestamp: Date.now(),
            attempts: 0,
            maxAttempts: MAX_ATTEMPTS,
            lastAttempt: null,
            nextRetry: Date.now()
        }

        await redis.lpush(QUEUE_KEY, JSON.stringify(job))
        return job.id
    }

    async process() {
        if (this.isProcessing) return
        this.isProcessing = true

        while (true) {
            try {
                // Processar jobs normais
                const jobs = await this.getBatch()

                // Processar jobs com retry
                const retryJobs = await this.getRetryBatch()

                const allJobs = [...jobs, ...retryJobs]

                if (allJobs.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100))
                    continue
                }

                // Processar jobs em paralelo (limitado)
                const promises = allJobs.map(job => this.processJob(job))
                await Promise.allSettled(promises)

            } catch (error) {
                console.error('Queue processing error:', error)
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    }

    async getBatch() {
        const jobs = []

        for (let i = 0; i < BATCH_SIZE; i++) {
            const jobData = await redis.brpop(QUEUE_KEY, 1)
            if (jobData) {
                const job = JSON.parse(jobData[1])
                jobs.push(job)
            }
        }

        return jobs
    }

    async getRetryBatch() {
        const jobs = []
        const now = Date.now()

        // Pegar jobs que estão prontos para retry
        for (let i = 0; i < BATCH_SIZE; i++) {
            const jobData = await redis.lindex(FAILED_QUEUE_KEY, 0)
            if (!jobData) break

            const job = JSON.parse(jobData)

            // Verificar se é hora de tentar novamente
            if (job.nextRetry <= now) {
                const removed = await redis.lrem(FAILED_QUEUE_KEY, 1, jobData)
                if (removed > 0) {
                    jobs.push(job)
                }
            } else {
                break // Jobs restantes ainda não estão prontos
            }
        }

        return jobs
    }

    async processJob(job) {
        if (this.processingJobs.has(job.id)) return
        this.processingJobs.add(job.id)

        try {
            const payment = { ...job.data, requestedAt: new Date().toISOString() }

            const response = await fetch(job.data.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payment),
                // Timeout para evitar travamentos
                signal: AbortSignal.timeout(10000) // 10 segundos
            })

            if (response.ok) {
                await redis.set(`payments:${payment.correlationId}`, JSON.stringify(payment))
                console.log(`Payment processed successfully: ${job.id} (attempt ${job.attempts + 1})`)
            } else {
                throw new Error(`Gateway error: ${response.status} ${response.statusText}`)
            }

        } catch (error) {
            console.error(`Job ${job.id} failed (attempt ${job.attempts + 1}):`, error.message)

            // Retry logic melhorada
            if (job.attempts < job.maxAttempts) {
                job.attempts++
                job.lastAttempt = Date.now()

                // Backoff exponencial com jitter
                const delay = this.calculateBackoff(job.attempts)
                job.nextRetry = Date.now() + delay

                // Adicionar à fila de retry
                await redis.lpush(FAILED_QUEUE_KEY, JSON.stringify(job))

                console.log(`Job ${job.id} scheduled for retry in ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`)
            } else {
                // Job falhou definitivamente
                console.error(`Job ${job.id} failed permanently after ${job.maxAttempts} attempts`)
                await this.handlePermanentFailure(job, error)
            }
        } finally {
            this.processingJobs.delete(job.id)
        }
    }

    calculateBackoff(attempt) {
        // Backoff exponencial: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms...
        const exponentialDelay = BASE_DELAY * Math.pow(2, attempt - 1)

        // Cap em 30 segundos
        const cappedDelay = Math.min(exponentialDelay, 30000)

        // Adicionar jitter (±20%) para evitar thundering herd
        const jitter = cappedDelay * 0.2 * (Math.random() - 0.5)

        return Math.max(100, cappedDelay + jitter)
    }

    async handlePermanentFailure(job, error) {
        // Salvar job falhado para análise posterior
        const failedJob = {
            ...job,
            finalError: error.message,
            failedAt: new Date().toISOString()
        }

        await redis.set(`payments:failed:${job.id}`, JSON.stringify(failedJob))

        // Log detalhado para debugging
        console.error(`Permanent failure for job ${job.id}:`, {
            attempts: job.attempts,
            lastAttempt: job.lastAttempt,
            error: error.message,
            payment: job.data
        })
    }

    async clear() {
        await redis.del(QUEUE_KEY)
        await redis.del(FAILED_QUEUE_KEY)
        this.processingJobs.clear()
    }

    async getStats() {
        const queueLength = await redis.llen(QUEUE_KEY)
        const failedQueueLength = await redis.llen(FAILED_QUEUE_KEY)

        return {
            queueLength,
            failedQueueLength,
            processing: this.processingJobs.size,
            isProcessing: this.isProcessing
        }
    }

    // Método para forçar retry de jobs falhados
    async retryFailedJobs() {
        const failedJobs = await redis.lrange(FAILED_QUEUE_KEY, 0, -1)
        let retried = 0

        for (const jobData of failedJobs) {
            const job = JSON.parse(jobData)
            if (job.attempts < job.maxAttempts) {
                job.nextRetry = Date.now() // Tentar imediatamente
                await redis.lrem(FAILED_QUEUE_KEY, 1, jobData)
                await redis.lpush(FAILED_QUEUE_KEY, JSON.stringify(job))
                retried++
            }
        }

        console.log(`Forced retry of ${retried} failed jobs`)
        return retried
    }
}

export const lightweightQueue = new LightweightQueue() 