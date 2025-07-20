import Queue from 'bull'

const paymentsQueue = new Queue('payments', { redis: process.env.REDIS_URL, prefix: process.env.REDIS_PREFIX });

const JOBS_PER_WORKER = 1
const PAYMENTS_WORKER_PATH = process.cwd() +  "/src/queue/payments_worker.js"

paymentsQueue.process(JOBS_PER_WORKER, PAYMENTS_WORKER_PATH)

export { paymentsQueue }
