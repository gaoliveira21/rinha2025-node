const { redis, PAYMENTS_KEY } = require('../redis.js')

module.exports = async (job) => {
    const payment = { ...job.data, requestedAt: new Date().toISOString() }

    const response = await fetch(job.data.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payment)
    })

    if (response.ok) {
        await redis.set(`${PAYMENTS_KEY}:${payment.correlationId}`, JSON.stringify(payment))
        return Promise.resolve({ status: 'success', payment });
    }

    return Promise.reject(new Error(`Failed to process payment: ${response.status} ${response.statusText}`))
}
