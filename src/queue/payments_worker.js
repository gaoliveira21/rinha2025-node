import { redis, PAYMENTS_KEY } from '../redis.js'
import { paymentsQueue } from './payments_queue.js'

const paymentsWorker = async (job) => {
    const payment = { ...job.data, requestedAt: new Date().toISOString() }

    console.log(`Processing payment: ${payment.correlationId}`)

    const response = await fetch(`${process.env.PAYMENT_PROCESSOR_DEFAULT_URL}/payments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payment)
    })

    if (response.ok) {
        await redis.set(`${PAYMENTS_KEY}:${payment.correlationId}`, JSON.stringify(payment))
        return
    }

    await paymentsQueue.add(job.data)

    return
}

export default paymentsWorker