# Fastify Health Check Server

Servidor simples com Fastify que responde com health check na porta 3000.

## 🚀 Funcionalidades

- **Rota raiz (`/`)**: Retorna `{"status":"ok"}`
- **Rota health (`/health`)**: Retorna `{"status":"ok"}`
- **Graceful shutdown**: Encerramento limpo do servidor
- **Performance otimizada**: Configurações do Fastify para alta performance

## 📦 Instalação

```bash
npm install
```

## 🏃‍♂️ Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Testes
```bash
npm test
```

## 🌐 Endpoints

### GET /
**Health check na raiz**
```bash
curl http://localhost:3000/
```
**Resposta:**
```json
{"status":"ok"}
```

### GET /health
**Health check alternativo**
```bash
curl http://localhost:3000/health
```
**Resposta:**
```json
{"status":"ok"}
```

## ⚙️ Configurações

O servidor está configurado com:
- **Porta**: 3000 (configurável via variável de ambiente PORT)
- **Host**: 0.0.0.0 (aceita conexões externas)
- **Logger**: Desabilitado para performance
- **Body limit**: 1MB
- **Keep-alive**: Habilitado
- **Graceful shutdown**: Implementado

## 🛠️ Tecnologias

- **Node.js**: Runtime JavaScript
- **Fastify**: Framework web de alta performance
- **ES Modules**: Import/export moderno

## 📝 Estrutura do Projeto

```
├── src/
│   └── index.js          # Servidor principal com Fastify
├── test.js               # Script de teste
├── package.json          # Dependências e scripts
└── README.md            # Documentação
```

## 🧪 Testando

Para testar o servidor:

1. **Inicie o servidor:**
```bash
npm start
```

2. **Em outro terminal, execute os testes:**
```bash
npm test
```

3. **Ou teste manualmente:**
```bash
curl http://localhost:3000/
curl http://localhost:3000/health
``` 