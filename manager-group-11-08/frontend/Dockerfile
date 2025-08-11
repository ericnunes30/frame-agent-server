# Estágio 1: Builder - Onde instalamos as dependências e construímos os ficheiros estáticos
FROM node:20-slim AS builder

# Define o diretório de trabalho
WORKDIR /app

# Copia os ficheiros de gestão de pacotes
COPY package.json package-lock.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Define um argumento que pode ser passado durante o build.
# AGORA COM VALOR PADRÃO PARA PRODUÇÃO
ARG VITE_BACKEND_API_URL=https://mgapi.surrealgroup.com.br
ENV VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL}

# Executa o build do Vite
RUN npm run build

# Estágio 2: Production - Servidor web Nginx para servir os ficheiros
FROM nginx:stable-alpine

# Remove a configuração padrão do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia a nossa configuração personalizada do Nginx para o contentor
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os ficheiros estáticos gerados no estágio de build para a pasta que o Nginx usa
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta 80, que é a porta padrão do Nginx
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]