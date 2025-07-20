import http from 'node:http'
import url from 'node:url'
import { paymentsQueue } from './queue/payments_queue.js'

import { redis } from './redis.js'
import { getPaymentsSummary } from './handlers/summary.js'
import { purgePayments } from './handlers/purge.js'

const port = process.env.PORT || 3000

const server = http.createServer(async (req, res) => {
  res.setHeaders(new Headers({ 'Content-Type': 'application/json' }))

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ health: true }))
    return
  }

  if (req.method === 'POST' && req.url === '/payments') {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      const payment = JSON.parse(body)
      await paymentsQueue.add({ ...payment, url: `${process.env.PAYMENT_PROCESSOR_DEFAULT_URL}/payments` }, { removeOnComplete: true, removeOnFail: true, attempts: 1000, backoff: { type: 'fixed', delay: 1000 }})
      res.writeHead(202)
      res.end()
    })
    return
  }

  if (req.method === 'GET' && req.url.includes('/payments-summary')) {
    const parsedUrl = url.parse(req.url, true);
    const queryParams = parsedUrl.query;

    const response = await getPaymentsSummary(queryParams.from, queryParams.to);
    res.writeHead(200)
    res.end(JSON.stringify(response))
    return
  }

  if (req.method === 'POST' && req.url === '/purge-payments') {
    await paymentsQueue.obliterate({ force: true })
    await purgePayments()
    res.writeHead(204)
    res.end()
    return
  }

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not Found' }))
})

const shutdown = async () => {
  console.log('Shutting down server...')
  await redis.quit()
  server.close(() => {
    console.log('Server shut down gracefully.')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

server.listen(port, () => {
  console.log('Server running at http://localhost:' + port)
})
