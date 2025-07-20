import Queue from 'bull'
import { redis } from '../redis.js'


export const paymentsQueue = new Queue('payments', { redis: redis, prefix: process.env.REDIS_PREFIX });

const JOBS_PER_WORKER = 8
const PAYMENTS_WORKER_PATH = "./src/queue/payments_worker.js"

paymentsQueue.process(JOBS_PER_WORKER, PAYMENTS_WORKER_PATH)

