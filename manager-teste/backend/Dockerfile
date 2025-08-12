# Estágio 1: Builder - Onde o código é compilado
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# Instala todas as dependências (incluindo as de dev) para o build
RUN npm install

COPY . .

# Compila a aplicação
RUN node ace build --ignore-ts-errors


# Estágio 2: Production - A imagem final, limpa e otimizada
FROM node:20-slim

ARG FRONTEND_URL
ENV FRONTEND_URL=$FRONTEND_URL

WORKDIR /app

# Copia apenas os ficheiros essenciais do estágio 'builder'
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

# Instala apenas as dependências de produção
RUN npm install --omit=dev

# Expõe a porta e define o comando para iniciar
EXPOSE 3333
CMD ["node", "build/bin/server.js"]