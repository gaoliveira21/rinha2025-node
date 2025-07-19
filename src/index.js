import http from 'node:http'

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Hello World\n')
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

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/')
})
