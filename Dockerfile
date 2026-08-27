# Etapa 1: Construcción del Frontend, dependencias y backend
FROM node:20-alpine AS builder

# Instalar OpenSSL para Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar archivos de dependencias y de base de datos
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias (desarrollo y producción)
RUN npm install

# Copiar el código fuente restante
COPY . .

# Generar el cliente de Prisma
RUN npx prisma generate

# Compilar la UI de React con Vite
RUN VITE_API_URL=/api npm run build

# Compilar el servidor backend a JavaScript puro usando esbuild (incluido en devDependencies)
# --packages=external asegura que los paquetes de node_modules se carguen de forma dinámica en ejecución
RUN npx esbuild server/index.ts --bundle --platform=node --target=node20 --packages=external --format=esm --outfile=dist-server/index.js

# Eliminar dependencias de desarrollo para optimizar la imagen final
RUN npm prune --production

# Etapa 2: Imagen final de ejecución (súper ligera)
FROM node:20-alpine AS runner

# Instalar OpenSSL para Prisma en el entorno de ejecución
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar dependencias de producción, cliente de base de datos y compilados
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/server/wait-for-db.js ./server/wait-for-db.js

# Configurar variables de entorno de producción
ENV NODE_ENV=production
ENV PORT=3040
EXPOSE 3040

# 1. Esperar a que la base de datos esté lista
# 2. Sincronizar el esquema de la DB con Prisma
# 3. Arrancar Express usando Node nativo (sin tsx para ahorrar CPU y RAM en la NAS)
CMD ["sh", "-c", "node server/wait-for-db.js && npx prisma db push && node dist-server/index.js"]
