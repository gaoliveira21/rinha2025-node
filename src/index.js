import http from 'node:http'

const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
  res.setHeaders(new Headers({ 'Content-Type': 'application/json' }))

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ health: true }))
    return
  }

  if (req.method === 'POST' && req.url === '/payments') {
    // TODO
  }

  if (req.method === 'GET' && req.url === '/payments-summary') {
    // TODO
  }

  if (req.method === 'POST' && req.url === '/purge-payments') {
    // TODO
  }

  res.writeHead(404)
})

const shutdown = () => {
  console.log('Shutting down server...')
  server.close(() => {
    console.log('Server shut down gracefully.')
    process.exit(0)
  })
}

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

server.listen(port, () => {
  console.log('Server running at http://localhost:' + port)
})
