import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { prisma } from '../db';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware to secure all routes here
router.use(authenticateAdmin);

// 1. GET /api/admin/users - List users with search
router.get('/users', async (req: AuthRequest, res: Response) => {
  const search = (req.query.search as string || '').trim().toLowerCase();

  try {
    const users = await prisma.user.findMany({
      where: search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      } : {},
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        requiresPinReset: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (err: any) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Error del servidor al obtener la lista de usuarios.', details: err.message });
  }
});

// 2. POST /api/admin/users/:id/reset-pin - Reset User PIN
router.post('/users/:id/reset-pin', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { tempPin } = req.body;

  const pinToSet = tempPin || '000000';

  if (pinToSet.length !== 6 || !/^\d+$/.test(pinToSet)) {
    res.status(400).json({ error: 'El PIN temporal debe tener exactamente 6 dígitos numéricos.' });
    return;
  }

  try {
    // Exclude admin user
    if (id === 'soporteahorro') {
      res.status(400).json({ error: 'No se puede modificar la cuenta de soporte.' });
      return;
    }

    const hashedPin = await bcrypt.hash(pinToSet, 10);
    await prisma.user.update({
      where: { id },
      data: {
        pin: hashedPin,
        requiresPinReset: true
      }
    });

    res.json({ success: true, tempPin: pinToSet });
  } catch (err: any) {
    console.error('Error resetting user PIN:', err);
    res.status(500).json({ error: 'Error al restablecer el PIN del usuario.', details: err.message });
  }
});

// 3. DELETE /api/admin/users/:id - Delete User
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { adminPin } = req.body;

  if (adminPin !== '142126') {
    res.status(403).json({ error: 'PIN de soporte incorrecto. Eliminación denegada.' });
    return;
  }

  try {
    if (id === 'soporteahorro') {
      res.status(400).json({ error: 'No se puede eliminar la cuenta de soporte.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    // Cascade delete is handled by Prisma referential actions (onDelete: Cascade)
    await prisma.user.delete({ where: { id } });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Error del servidor al eliminar el usuario.', details: err.message });
  }
});

// 4. GET /api/admin/users/:id/backup - Download single user backup in JSON format
router.get('/users/:id/backup', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    if (id === 'soporteahorro') {
      res.status(400).json({ error: 'No se puede generar backup de la cuenta de soporte.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        config: {
          include: {
            additionalFixedExpenses: true
          }
        },
        debts: {
          include: {
            payments: true
          }
        },
        savings: {
          include: {
            deposits: true
          }
        },
        transactions: true,
        balanceAllocations: true,
        skippedObligations: true,
        pendingExpenses: {
          include: {
            participants: {
              include: {
                payments: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    // Prepare clean JSON payload
    const { pin: _, ...cleanUserData } = user;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_${cleanUserData.email}_${Date.now()}.json"`);
    res.json(cleanUserData);
  } catch (err: any) {
    console.error('Error exporting user backup:', err);
    res.status(500).json({ error: 'Error al exportar los datos del usuario.', details: err.message });
  }
});

// Helper for escaping SQL strings
function escapeSqlString(val: string): string {
  return val.replace(/'/g, "''");
}

// Format values for raw SQL INSERT
function formatSqlValue(val: any): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  if (typeof val === 'number') {
    return val.toString();
  }
  if (val instanceof Date) {
    return `'${val.toISOString()}'`;
  }
  if (Array.isArray(val)) {
    // PostgreSQL array syntax: ARRAY['val1', 'val2']::text[]
    const items = val.map(item => `'${escapeSqlString(String(item))}'`).join(', ');
    return `ARRAY[${items}]::text[]`;
  }
  return `'${escapeSqlString(String(val))}'`;
}

// 5. GET /api/admin/backup/dump - Full Database SQL Dump (pg_dump + programmatic fallback)
router.get('/backup/dump', async (req: AuthRequest, res: Response) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not set.');
    }

    // Try pg_dump first
    const parsedUrl = new URL(dbUrl);
    const host = parsedUrl.hostname || 'localhost';
    const port = parsedUrl.port || '5432';
    const username = parsedUrl.username || 'postgres';
    const password = parsedUrl.password || '';
    const database = parsedUrl.pathname.substring(1);

    const dumpCmd = `pg_dump -h ${host} -p ${port} -U ${username} -d ${database} --clean --create --inserts`;

    exec(dumpCmd, { env: { ...process.env, PGPASSWORD: password } }, async (error, stdout, stderr) => {
      if (!error && stdout) {
        // pg_dump succeeded!
        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="ahorro_quincenal_dump_${Date.now()}.sql"`);
        res.send(stdout);
        return;
      }

      // If pg_dump failed or is not available, run programmatic backup
      console.warn('pg_dump was not found or failed, falling back to programmatic SQL generation:', stderr || error);

      try {
        let sqlDump = `-- -----------------------------------------------------\n`;
        sqlDump += `-- VOLCADO DE SEGURIDAD PROGRAMATICO (FALLBACK JS)\n`;
        sqlDump += `-- Generado: ${new Date().toISOString()}\n`;
        sqlDump += `-- -----------------------------------------------------\n\n`;

        // Define order of tables to avoid foreign key conflicts
        const tables = [
          'User',
          'FamilyGroup',
          'FamilyGroupMember',
          'AppConfig',
          'AdditionalFixedExpense',
          'DebtItem',
          'DebtPaymentRecord',
          'SavingsProgram',
          'SavingsDepositRecord',
          'SporadicTransaction',
          'BalanceAllocation',
          'SkippedObligation',
          'PendingExpense',
          'ParticipantShare',
          'ParticipantPaymentRecord',
          'SharedFamilyDebt',
          'SharedParticipantShare',
          'SharedFamilyDebtAbono',
          'SharedFamilySavings',
          'SharedFamilySavingsDeposit'
        ];

        // DDL schemas for standard tables
        sqlDump += `-- Estructuras DDL (Nota: se usa CREATE TABLE IF NOT EXISTS para facilitar importaciones)\n`;
        sqlDump += `
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpiar tablas existentes en orden inverso de claves foraneas
`;
        for (let i = tables.length - 1; i >= 0; i--) {
          sqlDump += `DROP TABLE IF EXISTS "${tables[i]}" CASCADE;\n`;
        }
        sqlDump += `\n`;

        // We can add simple schemas for the tables:
        sqlDump += `
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "activeFamilyGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requiresPinReset" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "FamilyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyGroup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FamilyGroup_code_key" ON "FamilyGroup"("code");

CREATE TABLE IF NOT EXISTS "FamilyGroupMember" (
    "id" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCreator" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "FamilyGroupMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FamilyGroupMember_familyGroupId_userId_key" ON "FamilyGroupMember"("familyGroupId", "userId");

CREATE TABLE IF NOT EXISTS "AppConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyFixedIncome" DOUBLE PRECISION NOT NULL DEFAULT 3500000,
    "incomeDistribution" TEXT NOT NULL DEFAULT 'both_equal',
    "customIncomeQ1" DOUBLE PRECISION NOT NULL DEFAULT 1750000,
    "customIncomeQ2" DOUBLE PRECISION NOT NULL DEFAULT 1750000,
    "incomeQ1Day" INTEGER DEFAULT 15,
    "incomeQ2Day" INTEGER DEFAULT 30,
    "monthlyTransportExpense" DOUBLE PRECISION NOT NULL DEFAULT 220000,
    "transportDistribution" TEXT NOT NULL DEFAULT 'both_equal',
    "customTransportQ1" DOUBLE PRECISION NOT NULL DEFAULT 110000,
    "customTransportQ2" DOUBLE PRECISION NOT NULL DEFAULT 110000,
    "suggestedExpenseTags" TEXT[] DEFAULT ARRAY['Ocio', 'Restaurantes', 'Tecnología', 'Bebidas', 'Hogar', 'Otro']::TEXT[],
    "currencyCode" TEXT NOT NULL DEFAULT 'COP',
    "currencySymbol" TEXT NOT NULL DEFAULT '$',
    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AppConfig_userId_key" ON "AppConfig"("userId");

CREATE TABLE IF NOT EXISTS "AdditionalFixedExpense" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "tag" TEXT NOT NULL,
    "distribution" TEXT NOT NULL DEFAULT 'both_equal',
    "customQ1Amount" DOUBLE PRECISION,
    "customQ2Amount" DOUBLE PRECISION,
    "q1Day" INTEGER DEFAULT 15,
    "q2Day" INTEGER DEFAULT 30,
    CONSTRAINT "AdditionalFixedExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DebtItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "totalOriginalAmount" DOUBLE PRECISION NOT NULL,
    "installmentsCount" INTEGER NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'mensual',
    "monthlyDistribution" TEXT NOT NULL DEFAULT 'both_equal',
    "customQ1Amount" DOUBLE PRECISION,
    "customQ2Amount" DOUBLE PRECISION,
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "startQuincena" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DebtItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DebtPaymentRecord" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isExtraPayment" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DebtPaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SavingsProgram" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION,
    "periodicAmount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'mensual',
    "monthlyDistribution" TEXT NOT NULL DEFAULT 'both_equal',
    "customQ1Amount" DOUBLE PRECISION,
    "customQ2Amount" DOUBLE PRECISION,
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "startQuincena" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavingsProgram_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SavingsDepositRecord" (
    "id" TEXT NOT NULL,
    "savingsId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "SavingsDepositRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SporadicTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "tag" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SporadicTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BalanceAllocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "spendableAmount" DOUBLE PRECISION NOT NULL,
    "keepInAccountAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    CONSTRAINT "BalanceAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BalanceAllocation_userId_periodKey_key" ON "BalanceAllocation"("userId", "periodKey");

CREATE TABLE IF NOT EXISTS "SkippedObligation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    CONSTRAINT "SkippedObligation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SkippedObligation_userId_periodKey_obligationId_key" ON "SkippedObligation"("userId", "periodKey", "obligationId");

CREATE TABLE IF NOT EXISTS "PendingExpense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'personal',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "tag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "destination" TEXT,
    "splitMethod" TEXT,
    "settlementType" TEXT,
    "installmentsCount" INTEGER,
    "frequency" TEXT,
    "linkedDebtId" TEXT,
    "linkedTransactionId" TEXT,
    CONSTRAINT "PendingExpense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParticipantShare" (
    "id" TEXT NOT NULL,
    "pendingExpenseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "assignedAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isSettled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ParticipantShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ParticipantPaymentRecord" (
    "id" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "ParticipantPaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SharedFamilyDebt" (
    "id" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "totalOriginalAmount" DOUBLE PRECISION NOT NULL,
    "installmentsCount" INTEGER NOT NULL,
    "installmentAmount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'mensual',
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "startQuincena" INTEGER NOT NULL DEFAULT 1,
    "monthlyDistribution" TEXT NOT NULL DEFAULT 'both_equal',
    "scope" TEXT NOT NULL DEFAULT 'shared',
    "payerUserId" TEXT,
    "payerUserName" TEXT,
    "splitMethod" TEXT NOT NULL DEFAULT 'equal',
    "createdByUserId" TEXT NOT NULL,
    "createdByUserName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SharedFamilyDebt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SharedParticipantShare" (
    "id" TEXT NOT NULL,
    "sharedDebtId" TEXT,
    "sharedSavingsId" TEXT,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT,
    "isPayer" BOOLEAN NOT NULL DEFAULT false,
    "assignedPercentage" DOUBLE PRECISION,
    "assignedAmount" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "SharedParticipantShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SharedFamilyDebtAbono" (
    "id" TEXT NOT NULL,
    "sharedDebtId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "SharedFamilyDebtAbono_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SharedFamilySavings" (
    "id" TEXT NOT NULL,
    "familyGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "periodicTargetAmount" DOUBLE PRECISION,
    "frequency" TEXT NOT NULL DEFAULT 'mensual',
    "startYear" INTEGER NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "startQuincena" INTEGER NOT NULL DEFAULT 1,
    "monthlyDistribution" TEXT NOT NULL DEFAULT 'both_equal',
    "scope" TEXT NOT NULL DEFAULT 'shared',
    "splitMethod" TEXT NOT NULL DEFAULT 'equal',
    "createdByUserId" TEXT NOT NULL,
    "createdByUserName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SharedFamilySavings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SharedFamilySavingsDeposit" (
    "id" TEXT NOT NULL,
    "sharedSavingsId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TEXT NOT NULL,
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "SharedFamilySavingsDeposit_pkey" PRIMARY KEY ("id")
);

-- Relaciones de Claves Foraneas
ALTER TABLE "User" ADD CONSTRAINT "User_activeFamilyGroupId_fkey" FOREIGN KEY ("activeFamilyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FamilyGroup" ADD CONSTRAINT "FamilyGroup_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyGroupMember" ADD CONSTRAINT "FamilyGroupMember_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FamilyGroupMember" ADD CONSTRAINT "FamilyGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdditionalFixedExpense" ADD CONSTRAINT "AdditionalFixedExpense_configId_fkey" FOREIGN KEY ("configId") REFERENCES "AppConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DebtItem" ADD CONSTRAINT "DebtItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DebtPaymentRecord" ADD CONSTRAINT "DebtPaymentRecord_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "DebtItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavingsProgram" ADD CONSTRAINT "SavingsProgram_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SavingsDepositRecord" ADD CONSTRAINT "SavingsDepositRecord_savingsId_fkey" FOREIGN KEY ("savingsId") REFERENCES "SavingsProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SporadicTransaction" ADD CONSTRAINT "SporadicTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BalanceAllocation" ADD CONSTRAINT "BalanceAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SkippedObligation" ADD CONSTRAINT "SkippedObligation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PendingExpense" ADD CONSTRAINT "PendingExpense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantShare" ADD CONSTRAINT "ParticipantShare_pendingExpenseId_fkey" FOREIGN KEY ("pendingExpenseId") REFERENCES "PendingExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParticipantPaymentRecord" ADD CONSTRAINT "ParticipantPaymentRecord_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ParticipantShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilyDebt" ADD CONSTRAINT "SharedFamilyDebt_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilyDebt" ADD CONSTRAINT "SharedFamilyDebt_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SharedFamilyDebt" ADD CONSTRAINT "SharedFamilyDebt_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedParticipantShare" ADD CONSTRAINT "SharedParticipantShare_sharedDebtId_fkey" FOREIGN KEY ("sharedDebtId") REFERENCES "SharedFamilyDebt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedParticipantShare" ADD CONSTRAINT "SharedParticipantShare_sharedSavingsId_fkey" FOREIGN KEY ("sharedSavingsId") REFERENCES "SharedFamilySavings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedParticipantShare" ADD CONSTRAINT "SharedParticipantShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilyDebtAbono" ADD CONSTRAINT "SharedFamilyDebtAbono_sharedDebtId_fkey" FOREIGN KEY ("sharedDebtId") REFERENCES "SharedFamilyDebt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilyDebtAbono" ADD CONSTRAINT "SharedFamilyDebtAbono_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilySavings" ADD CONSTRAINT "SharedFamilySavings_familyGroupId_fkey" FOREIGN KEY ("familyGroupId") REFERENCES "FamilyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilySavings" ADD CONSTRAINT "SharedFamilySavings_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilySavingsDeposit" ADD CONSTRAINT "SharedFamilySavingsDeposit_sharedSavingsId_fkey" FOREIGN KEY ("sharedSavingsId") REFERENCES "SharedFamilySavings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SharedFamilySavingsDeposit" ADD CONSTRAINT "SharedFamilySavingsDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

`;

        // DML data insertion
        sqlDump += `-- Datos Registrados\n\n`;

        for (const tableName of tables) {
          const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
          if (rows.length > 0) {
            sqlDump += `-- Volcado de la tabla "${tableName}" (${rows.length} filas)\n`;
            
            // Get columns of the first row to write insert statement
            const columns = Object.keys(rows[0]);
            const colsStr = columns.map(c => `"${c}"`).join(', ');

            for (const row of rows) {
              const valsStr = columns.map(c => formatSqlValue(row[c])).join(', ');
              sqlDump += `INSERT INTO "${tableName}" (${colsStr}) VALUES (${valsStr});\n`;
            }
            sqlDump += `\n`;
          }
        }

        res.setHeader('Content-Type', 'application/sql');
        res.setHeader('Content-Disposition', `attachment; filename="ahorro_quincenal_dump_${Date.now()}.sql"`);
        res.send(sqlDump);
      } catch (fallbackErr) {
        console.error('Fallback SQL dump generation failed:', fallbackErr);
        res.status(500).json({ error: 'No se pudo generar el dump de base de datos.' });
      }
    });
  } catch (err) {
    console.error('General error exporting DB dump:', err);
    res.status(500).json({ error: 'Error del servidor al exportar el dump.' });
  }
});

// 6. GET /api/admin/groups - List all family groups with member counts and creator info
router.get('/groups', async (req: AuthRequest, res: Response) => {
  try {
    const groups = await prisma.familyGroup.findMany({
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedGroups = groups.map(g => ({
      id: g.id,
      name: g.name,
      code: g.code,
      createdAt: g.createdAt,
      createdByUserId: g.createdByUserId,
      creatorName: g.creator?.name || 'Desconocido',
      creatorEmail: g.creator?.email || 'N/A',
      memberCount: g._count.members
    }));

    res.json(formattedGroups);
  } catch (err: any) {
    console.error('Error fetching admin groups:', err);
    res.status(500).json({ error: 'Error del servidor al obtener los grupos familiares.', details: err.message });
  }
});

// 7. GET /api/admin/groups/:id/members - Get list of users inside a family group
router.get('/groups/:id/members', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const members = await prisma.familyGroupMember.findMany({
      where: { familyGroupId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { joinedAt: 'asc' }
    });

    const formattedMembers = members.map(m => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      joinedAt: m.joinedAt,
      isCreator: m.isCreator
    }));

    res.json(formattedMembers);
  } catch (err: any) {
    console.error('Error fetching group members:', err);
    res.status(500).json({ error: 'Error al obtener los miembros del grupo.', details: err.message });
  }
});

// 8. POST /api/admin/groups/:id/members - Add user to a family group by email
router.post('/groups/:id/members', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { email } = req.body;

  if (!email || !email.trim()) {
    res.status(400).json({ error: 'Se requiere el correo del usuario.' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      res.status(404).json({ error: 'No se encontró ningún usuario con ese correo electrónico.' });
      return;
    }

    const existingMember = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: id,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      res.status(400).json({ error: 'El usuario ya pertenece a este grupo familiar.' });
      return;
    }

    await prisma.familyGroupMember.create({
      data: {
        familyGroupId: id,
        userId: user.id,
        isCreator: false
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { activeFamilyGroupId: id }
    });

    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err: any) {
    console.error('Error adding member to group:', err);
    res.status(500).json({ error: 'Error del servidor al agregar el miembro al grupo.', details: err.message });
  }
});

// 9. DELETE /api/admin/groups/:id/members/:userId - Remove a user from a family group
router.delete('/groups/:id/members/:userId', async (req: AuthRequest, res: Response) => {
  const { id, userId } = req.params;
  const { adminPin } = req.body;

  if (adminPin !== '142126') {
    res.status(403).json({ error: 'PIN de soporte incorrecto. Operación cancelada.' });
    return;
  }

  try {
    await prisma.familyGroupMember.delete({
      where: {
        familyGroupId_userId: {
          familyGroupId: id,
          userId: userId
        }
      }
    });

    await prisma.user.updateMany({
      where: {
        id: userId,
        activeFamilyGroupId: id
      },
      data: {
        activeFamilyGroupId: null
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error removing group member:', err);
    res.status(500).json({ error: 'Error del servidor al remover el miembro del grupo.', details: err.message });
  }
});

export default router;
