@echo off
echo ==========================================
echo Iniciando Ahorro Quincenal...
echo ==========================================

echo [1/2] Asegurando que la base de datos de Docker este activa...
docker-compose up -d

echo [2/2] Iniciando Frontend (3000) y Backend (3001) en esta misma ventana...
echo Presiona Ctrl+C en esta consola para apagar todo.
echo ==========================================
npm start
