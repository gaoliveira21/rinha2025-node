// Script de teste para as rotas de health check
async function testHealthCheck() {
    console.log('🚀 Testando rotas de health check...\n')

    try {
        // Testar rota raiz
        console.log('📍 Testando GET /')
        const rootResponse = await fetch('http://localhost:3000/')
        const rootData = await rootResponse.json()
        console.log(`Status: ${rootResponse.status}`)
        console.log(`Response: ${JSON.stringify(rootData)}`)
        console.log('')

        // Testar rota health
        console.log('🏥 Testando GET /health')
        const healthResponse = await fetch('http://localhost:3000/health')
        const healthData = await healthResponse.json()
        console.log(`Status: ${healthResponse.status}`)
        console.log(`Response: ${JSON.stringify(healthData)}`)
        console.log('')

        console.log('✅ Todos os testes passaram!')
    } catch (error) {
        console.error('❌ Erro nos testes:', error.message)
        console.log('💡 Certifique-se de que o servidor está rodando em http://localhost:3000')
    }
}

// Executar teste
testHealthCheck() 