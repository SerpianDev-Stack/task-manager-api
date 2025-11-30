FROM node:20

WORKDIR /app

# Copia e instala as dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código (incluindo o schema.prisma)
COPY . .

# 1. COMPILA o TypeScript para JavaScript (gera a pasta dist/)
RUN npm run build

# EXPOSE 3000 não é estritamente necessário no Railway, mas não faz mal
EXPOSE 3000

# 2. RODA AS MIGRAÇÕES do Prisma E INICIA O SERVIDOR (Novo CMD crucial!)
# Isso garante que a DATABASE_URL esteja disponível no ambiente de execução.
# USANDO SINTAXE DE SHELL PARA GARANTIR ENCADEMANTO CORRETO:
CMD sh -c "npx prisma migrate deploy && npm start"