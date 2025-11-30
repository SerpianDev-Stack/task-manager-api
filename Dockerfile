FROM node:20

WORKDIR /app

# Copia e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código (incluindo o schema.prisma)
COPY . .

# 1. COMPILA o TypeScript para JavaScript (gera a pasta dist/)
RUN npm run build

# 2. RODA AS MIGRAÇÕES do Prisma no Banco de Dados (Passo novo e crucial!)
# O Railway injeta a DATABASE_URL aqui, permitindo que a migração aconteça.
RUN npx prisma migrate deploy

# EXPOSE 3000 não é estritamente necessário no Railway, mas não faz mal
EXPOSE 3000

# 3. INICIA o servidor Node (agora com o DB migrado)
CMD ["npm", "start"]