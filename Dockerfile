FROM node:22-alpine AS builder

WORKDIR /usr/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

FROM node:22-alpine AS runner

WORKDIR /usr/app

COPY --from=builder /usr/app/node_modules ./node_modules
COPY --from=builder /usr/app/package*.json ./
COPY --from=builder /usr/app ./

EXPOSE ${PORT}

CMD ["node", "src/index.js"]