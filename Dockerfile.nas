FROM node:20-alpine

# Instalar OpenSSL para Prisma en el entorno de ejecución
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar dependencias de producción y cliente de base de datos
COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción y generar Prisma Client localmente para Linux
RUN npm install --omit=dev && npx prisma generate

# Exponer el puerto del servidor
EXPOSE 3040

# Iniciar la app (espera la BD, ejecuta migraciones y levanta node)
CMD ["sh", "-c", "node server/wait-for-db.js && npx prisma db push && node dist-server/index.js"]
