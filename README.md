# Ahorro Quincenal

Sistema web completo para el control y planificación del presupuesto financiero personal y compartido, organizado por quincenas o meses completos.

## Características Principales

* **Planificación Quincenal:** División automática del presupuesto en 1ra quincena (días 1-15) y 2da quincena (días 16-fin de mes).
* **Gestión de Ingresos y Gastos Fijos:** Configuración y distribución flexible (mitad/mitad, solo una quincena o distribución libre).
* **Control de Deudas:** Simulación de compras a cuotas, pagos y fechas proyectadas de liquidación.
* **Ahorro Programado:** Seguimiento de metas de ahorro personales y grupales.
* **Finanzas Compartidas (Grupos Familiares):** Registro y cobro de gastos entre miembros familiares conectados en tiempo real.
* **Gastos Pendientes:** Pipeline para registrar gastos imprevistos, dividirlos y regularizarlos como deudas o gastos fijos.

## Arquitectura

* **Frontend:** React 19 (TypeScript, Tailwind CSS v4, Motion).
* **Backend:** Node.js/Express.
* **Base de Datos:** PostgreSQL con Prisma ORM.

## Ejecución Local (Docker)

1. **Levantar Base de Datos (PostgreSQL en puerto 5438):**
   `docker compose up -d`
2. **Instalar dependencias:**
   `npm install`
3. **Crear tablas en la Base de Datos:**
   `npx prisma db push`
4. **Iniciar el Backend:**
   `npm run server`
5. **Iniciar el Frontend:**
   `npm run dev`
