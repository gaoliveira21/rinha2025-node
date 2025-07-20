import { redis } from '../redis.js'

const QUEUE_KEY = 'payments:queue'
const PROCESSING_KEY = 'payments:processing'
const MAX_CONCURRENT = 5
const BATCH_SIZE = 10

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
            maxAttempts: 3
        }

        await redis.lpush(QUEUE_KEY, JSON.stringify(job))
        return job.id
    }

    async process() {
        if (this.isProcessing) return
        this.isProcessing = true

        while (true) {
            try {
                // Processar em lotes para otimizar
                const jobs = await this.getBatch()

                if (jobs.length === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100))
                    continue
                }

                // Processar jobs em paralelo (limitado)
                const promises = jobs.map(job => this.processJob(job))
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

    async processJob(job) {
        if (this.processingJobs.has(job.id)) return
        this.processingJobs.add(job.id)

        try {
            const payment = { ...job.data, requestedAt: new Date().toISOString() }

            const response = await fetch(job.data.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payment)
            })

            if (response.ok) {
                await redis.set(`payments:${payment.correlationId}`, JSON.stringify(payment))
                console.log(`Payment processed successfully: ${job.id}`)
            } else {
                throw new Error(`Gateway error: ${response.status}`)
            }

        } catch (error) {
            console.error(`Job ${job.id} failed:`, error.message)

            // Retry logic (simplificada)
            if (job.attempts < job.maxAttempts) {
                job.attempts++
                await redis.lpush(QUEUE_KEY, JSON.stringify(job))
            }
        } finally {
            this.processingJobs.delete(job.id)
        }
    }

    async clear() {
        await redis.del(QUEUE_KEY)
        this.processingJobs.clear()
    }

    async getStats() {
        const queueLength = await redis.llen(QUEUE_KEY)
        return {
            queueLength,
            processing: this.processingJobs.size,
            isProcessing: this.isProcessing
        }
    }
}

export const lightweightQueue = new LightweightQueue() 