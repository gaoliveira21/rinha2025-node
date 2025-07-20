import { redis, PAYMENTS_KEY } from '../redis.js'

// Cache simples em memória
const summaryCache = new Map()
const CACHE_TTL = 3000 // 3 segundos

export async function getPaymentsSummary(from, to) {
  const fromDate = from ? new Date(from) : new Date('1970-01-01T00:00:00.000Z')
  const toDate = to ? new Date(to) : new Date()

  // Chave do cache
  const cacheKey = `${fromDate.getTime()}-${toDate.getTime()}`

  // Verificar cache
  if (summaryCache.has(cacheKey)) {
    const cached = summaryCache.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
  }

  try {
    const result = await calculateSummary(fromDate, toDate)
    cacheResult(cacheKey, result)
    return result
  } catch (error) {
    console.error('Summary error:', error)
    return { default: { totalRequests: 0, totalAmount: 0 }, fallback: { totalRequests: 0, totalAmount: 0 } }
  }
}

async function calculateSummary(fromDate, toDate) {
  let totalRequests = 0
  let totalAmount = 0
  let cursor = '0'

  do {
    // Usar COUNT maior para reduzir iterações
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${PAYMENTS_KEY}:*`, 'COUNT', 1000)

    if (keys.length > 0) {
      // Pipeline para MGET
      const pipeline = redis.pipeline()
      keys.forEach(key => pipeline.get(key))
      const results = await pipeline.exec()

      // Processar resultados
      for (const [err, val] of results) {
        if (!err && val) {
          try {
            const payment = JSON.parse(val)
            const requestedAt = new Date(payment.requestedAt)
            if (requestedAt >= fromDate && requestedAt <= toDate) {
              totalRequests++
              totalAmount += Number(payment.amount) || 0
            }
          } catch (e) {
            // Ignorar erros de parsing
          }
        }
      }
    }

    cursor = nextCursor
  } while (cursor !== '0')

  return { default: { totalRequests, totalAmount }, fallback: { totalRequests: 0, totalAmount: 0 } }
}

function cacheResult(cacheKey, result) {
  summaryCache.set(cacheKey, {
    data: result,
    timestamp: Date.now()
  })

  // Limpar cache se ficar muito grande
  if (summaryCache.size > 50) {
    const entries = Array.from(summaryCache.entries())
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
    summaryCache.clear()
    entries.slice(0, 20).forEach(([key, value]) => summaryCache.set(key, value))
  }
}