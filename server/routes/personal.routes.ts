import { Router, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// ----------------------------------------------------
// APP DATA (GET ALL AT ONCE FOR CURRENT USER)
// ----------------------------------------------------
router.get('/data', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    let config = await prisma.appConfig.findUnique({
      where: { userId: req.userId },
      include: { additionalFixedExpenses: true }
    });

    if (!config) {
      config = {
        id: 'default-config',
        userId: req.userId || '',
        monthlyFixedIncome: 0,
        incomeDistribution: 'both_equal',
        customIncomeQ1: 0,
        customIncomeQ2: 0,
        incomeQ1Day: 15,
        incomeQ2Day: 30,
        monthlyTransportExpense: 0,
        transportDistribution: 'both_equal',
        customTransportQ1: 0,
        customTransportQ2: 0,
        suggestedExpenseTags: ['Ocio', 'Restaurantes', 'Tecnología', 'Bebidas', 'Hogar', 'Otro'],
        currencyCode: 'COP',
        currencySymbol: '$',
        additionalFixedExpenses: []
      } as any;
    }

    const debts = await prisma.debtItem.findMany({
      where: { userId: req.userId },
      include: { payments: true },
      orderBy: { createdAt: 'desc' }
    });

    const savings = await prisma.savingsProgram.findMany({
      where: { userId: req.userId },
      include: { deposits: true },
      orderBy: { createdAt: 'desc' }
    });

    const sporadicTransactions = await prisma.sporadicTransaction.findMany({
      where: { userId: req.userId },
      orderBy: { date: 'desc' }
    });

    const pendingExpenses = await prisma.pendingExpense.findMany({
      where: { userId: req.userId },
      include: {
        participants: {
          include: {
            payments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const balanceAllocationsList = await prisma.balanceAllocation.findMany({
      where: { userId: req.userId }
    });
    const balanceAllocations: Record<string, any> = {};
    balanceAllocationsList.forEach((alloc) => {
      balanceAllocations[alloc.periodKey] = alloc;
    });

    const skippedObligationsList = await prisma.skippedObligation.findMany({
      where: { userId: req.userId }
    });
    const skippedObligations: Record<string, string[]> = {};
    skippedObligationsList.forEach((skip) => {
      if (!skippedObligations[skip.periodKey]) {
        skippedObligations[skip.periodKey] = [];
      }
      skippedObligations[skip.periodKey].push(skip.obligationId);
    });

    res.json({
      config,
      debts,
      savings,
      sporadicTransactions,
      pendingExpenses,
      balanceAllocations,
      skippedObligations
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: 'Error del servidor al obtener los datos financieros.' });
  }
});

// Batch Sync Personal AppData
router.post('/data/sync', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { config, debts, savings, sporadicTransactions, pendingExpenses, balanceAllocations, skippedObligations } = req.body;
  const userId = req.userId!;

  // Bypass database sync for support/admin virtual user
  if (userId === 'soporteahorro') {
    res.json({ success: true, message: 'Sync bypassed for support user.' });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Config & additional fixed expenses
      if (config) {
        const updatedConfig = await tx.appConfig.upsert({
          where: { userId },
          create: {
            userId,
            monthlyFixedIncome: config.monthlyFixedIncome,
            incomeDistribution: config.incomeDistribution,
            customIncomeQ1: config.customIncomeQ1,
            customIncomeQ2: config.customIncomeQ2,
            monthlyTransportExpense: config.monthlyTransportExpense,
            transportDistribution: config.transportDistribution,
            customTransportQ1: config.customTransportQ1,
            customTransportQ2: config.customTransportQ2,
            suggestedExpenseTags: config.suggestedExpenseTags || ['Ocio', 'Restaurantes', 'Tecnología', 'Bebidas', 'Hogar', 'Otro'],
            currencyCode: config.currencyCode || 'COP',
            currencySymbol: config.currencySymbol || '$',
          },
          update: {
            monthlyFixedIncome: config.monthlyFixedIncome,
            incomeDistribution: config.incomeDistribution,
            customIncomeQ1: config.customIncomeQ1,
            customIncomeQ2: config.customIncomeQ2,
            monthlyTransportExpense: config.monthlyTransportExpense,
            transportDistribution: config.transportDistribution,
            customTransportQ1: config.customTransportQ1,
            customTransportQ2: config.customTransportQ2,
            suggestedExpenseTags: config.suggestedExpenseTags,
            currencyCode: config.currencyCode,
            currencySymbol: config.currencySymbol,
          }
        });

        // Sync additionalFixedExpenses
        await tx.additionalFixedExpense.deleteMany({ where: { configId: updatedConfig.id } });
        if (config.additionalFixedExpenses && Array.isArray(config.additionalFixedExpenses)) {
          await tx.additionalFixedExpense.createMany({
            data: config.additionalFixedExpenses.map((exp: any) => ({
              configId: updatedConfig.id,
              name: exp.name,
              monthlyAmount: exp.monthlyAmount,
              tag: exp.tag,
              distribution: exp.distribution,
              customQ1Amount: exp.customQ1Amount,
              customQ2Amount: exp.customQ2Amount,
            }))
          });
        }
      }

      // 2. Debts (with BOLA check)
      if (debts && Array.isArray(debts)) {
        const incomingDebtIds = debts.map((d) => d.id).filter(Boolean);
        
        // Safety check: ensure all incoming debts that exist belong to the user
        for (const debt of debts) {
          if (debt.id) {
            const existing = await tx.debtItem.findUnique({
              where: { id: debt.id },
              select: { userId: true }
            });
            if (existing && existing.userId !== userId) {
              throw new Error(`Unauthorized access to debt ID: ${debt.id}`);
            }
          }
        }

        await tx.debtItem.deleteMany({
          where: {
            userId,
            id: { notIn: incomingDebtIds }
          }
        });

        for (const debt of debts) {
          const updatedDebt = await tx.debtItem.upsert({
            where: { id: debt.id },
            create: {
              id: debt.id,
              userId,
              title: debt.title,
              tag: debt.tag,
              totalOriginalAmount: debt.totalOriginalAmount,
              installmentsCount: debt.installmentsCount,
              installmentAmount: debt.installmentAmount,
              frequency: debt.frequency,
              monthlyDistribution: debt.monthlyDistribution,
              customQ1Amount: debt.customQ1Amount,
              customQ2Amount: debt.customQ2Amount,
              startYear: debt.startYear,
              startMonth: debt.startMonth,
              startQuincena: debt.startQuincena,
              notes: debt.notes,
              isArchived: !!debt.isArchived,
              createdAt: debt.createdAt ? new Date(debt.createdAt) : new Date(),
            },
            update: {
              title: debt.title,
              tag: debt.tag,
              totalOriginalAmount: debt.totalOriginalAmount,
              installmentsCount: debt.installmentsCount,
              installmentAmount: debt.installmentAmount,
              frequency: debt.frequency,
              monthlyDistribution: debt.monthlyDistribution,
              customQ1Amount: debt.customQ1Amount,
              customQ2Amount: debt.customQ2Amount,
              startYear: debt.startYear,
              startMonth: debt.startMonth,
              startQuincena: debt.startQuincena,
              notes: debt.notes,
              isArchived: !!debt.isArchived,
            }
          });

          await tx.debtPaymentRecord.deleteMany({ where: { debtId: updatedDebt.id } });
          if (debt.payments && Array.isArray(debt.payments)) {
            await tx.debtPaymentRecord.createMany({
              data: debt.payments.map((p: any) => ({
                id: p.id.startsWith('pay-') ? undefined : p.id,
                debtId: updatedDebt.id,
                periodKey: p.periodKey,
                installmentNumber: p.installmentNumber,
                amountPaid: p.amountPaid,
                paidAt: p.paidAt ? new Date(p.paidAt) : new Date(),
                notes: p.notes,
                isExtraPayment: !!p.isExtraPayment
              }))
            });
          }
        }
      }

      // 3. Savings (with BOLA check)
      if (savings && Array.isArray(savings)) {
        const incomingSavingIds = savings.map((s) => s.id).filter(Boolean);
        
        // Safety check: ensure all incoming savings that exist belong to the user
        for (const saving of savings) {
          if (saving.id) {
            const existing = await tx.savingsProgram.findUnique({
              where: { id: saving.id },
              select: { userId: true }
            });
            if (existing && existing.userId !== userId) {
              throw new Error(`Unauthorized access to savings ID: ${saving.id}`);
            }
          }
        }

        await tx.savingsProgram.deleteMany({
          where: {
            userId,
            id: { notIn: incomingSavingIds }
          }
        });

        for (const saving of savings) {
          const updatedSaving = await tx.savingsProgram.upsert({
            where: { id: saving.id },
            create: {
              id: saving.id,
              userId,
              name: saving.name,
              tag: saving.tag,
              targetAmount: saving.targetAmount,
              periodicAmount: saving.periodicAmount,
              frequency: saving.frequency,
              monthlyDistribution: saving.monthlyDistribution,
              customQ1Amount: saving.customQ1Amount,
              customQ2Amount: saving.customQ2Amount,
              startYear: saving.startYear,
              startMonth: saving.startMonth,
              startQuincena: saving.startQuincena,
              notes: saving.notes,
              isArchived: !!saving.isArchived,
              createdAt: saving.createdAt ? new Date(saving.createdAt) : new Date(),
            },
            update: {
              name: saving.name,
              tag: saving.tag,
              targetAmount: saving.targetAmount,
              periodicAmount: saving.periodicAmount,
              frequency: saving.frequency,
              monthlyDistribution: saving.monthlyDistribution,
              customQ1Amount: saving.customQ1Amount,
              customQ2Amount: saving.customQ2Amount,
              startYear: saving.startYear,
              startMonth: saving.startMonth,
              startQuincena: saving.startQuincena,
              notes: saving.notes,
              isArchived: !!saving.isArchived,
            }
          });

          await tx.savingsDepositRecord.deleteMany({ where: { savingsId: updatedSaving.id } });
          if (saving.deposits && Array.isArray(saving.deposits)) {
            await tx.savingsDepositRecord.createMany({
              data: saving.deposits.map((d: any) => ({
                id: d.id.startsWith('dep-') || d.id.startsWith('v-') ? undefined : d.id,
                savingsId: updatedSaving.id,
                periodKey: d.periodKey,
                amount: d.amount,
                depositedAt: d.depositedAt ? new Date(d.depositedAt) : new Date(),
                notes: d.notes
              }))
            });
          }
        }
      }

      // 4. Sporadic Transactions (with BOLA check)
      if (sporadicTransactions && Array.isArray(sporadicTransactions)) {
        const incomingTxIds = sporadicTransactions.map((tx) => tx.id).filter(Boolean);
        
        // Safety check
        for (const transaction of sporadicTransactions) {
          if (transaction.id) {
            const existing = await tx.sporadicTransaction.findUnique({
              where: { id: transaction.id },
              select: { userId: true }
            });
            if (existing && existing.userId !== userId) {
              throw new Error(`Unauthorized access to transaction ID: ${transaction.id}`);
            }
          }
        }

        await tx.sporadicTransaction.deleteMany({
          where: {
            userId,
            id: { notIn: incomingTxIds }
          }
        });

        for (const transaction of sporadicTransactions) {
          await tx.sporadicTransaction.upsert({
            where: { id: transaction.id },
            create: {
              id: transaction.id,
              userId,
              title: transaction.title,
              type: transaction.type,
              amount: transaction.amount,
              tag: transaction.tag,
              periodKey: transaction.periodKey,
              date: transaction.date,
              isScheduled: !!transaction.isScheduled,
              notes: transaction.notes,
              isCompleted: !!transaction.isCompleted
            },
            update: {
              title: transaction.title,
              type: transaction.type,
              amount: transaction.amount,
              tag: transaction.tag,
              periodKey: transaction.periodKey,
              date: transaction.date,
              isScheduled: !!transaction.isScheduled,
              notes: transaction.notes,
              isCompleted: !!transaction.isCompleted
            }
          });
        }
      }

      // 5. Pending Expenses (with BOLA check)
      if (pendingExpenses && Array.isArray(pendingExpenses)) {
        const incomingPendingIds = pendingExpenses.map((p) => p.id).filter(Boolean);
        
        // Safety check
        for (const pe of pendingExpenses) {
          if (pe.id) {
            const existing = await tx.pendingExpense.findUnique({
              where: { id: pe.id },
              select: { userId: true }
            });
            if (existing && existing.userId !== userId) {
              throw new Error(`Unauthorized access to pending expense ID: ${pe.id}`);
            }
          }
        }

        await tx.pendingExpense.deleteMany({
          where: {
            userId,
            id: { notIn: incomingPendingIds }
          }
        });

        for (const pe of pendingExpenses) {
          const updatedPE = await tx.pendingExpense.upsert({
            where: { id: pe.id },
            create: {
              id: pe.id,
              userId,
              title: pe.title,
              amount: pe.amount,
              date: pe.date,
              scope: pe.scope,
              status: pe.status,
              notes: pe.notes,
              tag: pe.tag,
              destination: pe.destination,
              splitMethod: pe.splitMethod,
              settlementType: pe.settlementType,
              installmentsCount: pe.installmentsCount,
              frequency: pe.frequency,
              linkedDebtId: pe.linkedDebtId,
              linkedTransactionId: pe.linkedTransactionId,
              createdAt: pe.createdAt ? new Date(pe.createdAt) : new Date(),
            },
            update: {
              title: pe.title,
              amount: pe.amount,
              date: pe.date,
              scope: pe.scope,
              status: pe.status,
              notes: pe.notes,
              tag: pe.tag,
              destination: pe.destination,
              splitMethod: pe.splitMethod,
              settlementType: pe.settlementType,
              installmentsCount: pe.installmentsCount,
              frequency: pe.frequency,
              linkedDebtId: pe.linkedDebtId,
              linkedTransactionId: pe.linkedTransactionId,
            }
          });

          await tx.participantShare.deleteMany({ where: { pendingExpenseId: updatedPE.id } });
          if (pe.participants && Array.isArray(pe.participants)) {
            for (const part of pe.participants) {
              const createdPart = await tx.participantShare.create({
                data: {
                  id: part.id.startsWith('part-') ? undefined : part.id,
                  pendingExpenseId: updatedPE.id,
                  name: part.name,
                  isOwner: !!part.isOwner,
                  assignedAmount: part.assignedAmount,
                  paidAmount: part.paidAmount || 0,
                  isSettled: !!part.isSettled,
                }
              });

              if (part.payments && Array.isArray(part.payments)) {
                await tx.participantPaymentRecord.createMany({
                  data: part.payments.map((pay: any) => ({
                    id: pay.id.startsWith('part-pay-') ? undefined : pay.id,
                    participantId: createdPart.id,
                    amount: pay.amount,
                    paidAt: pay.paidAt ? new Date(pay.paidAt) : new Date(),
                    notes: pay.notes
                  }))
                });
              }
            }
          }
        }
      }

      // 6. Balance Allocations
      if (balanceAllocations && typeof balanceAllocations === 'object') {
        const allocations = Object.values(balanceAllocations);
        const incomingAllocPeriodKeys = allocations.map((a: any) => a.periodKey).filter(Boolean);

        await tx.balanceAllocation.deleteMany({
          where: {
            userId,
            periodKey: { notIn: incomingAllocPeriodKeys }
          }
        });

        for (const alloc of allocations as any[]) {
          await tx.balanceAllocation.upsert({
            where: {
              userId_periodKey: {
                userId,
                periodKey: alloc.periodKey
              }
            },
            create: {
              userId,
              periodKey: alloc.periodKey,
              spendableAmount: alloc.spendableAmount,
              keepInAccountAmount: alloc.keepInAccountAmount,
              notes: alloc.notes
            },
            update: {
              spendableAmount: alloc.spendableAmount,
              keepInAccountAmount: alloc.keepInAccountAmount,
              notes: alloc.notes
            }
          });
        }
      }

      // 7. Skipped Obligations
      if (skippedObligations && typeof skippedObligations === 'object') {
        await tx.skippedObligation.deleteMany({ where: { userId } });

        const skippedRecords: { userId: string; periodKey: string; obligationId: string }[] = [];
        Object.entries(skippedObligations).forEach(([periodKey, ids]: [string, any]) => {
          if (Array.isArray(ids)) {
            ids.forEach((id: string) => {
              skippedRecords.push({
                userId,
                periodKey,
                obligationId: id
              });
            });
          }
        });

        if (skippedRecords.length > 0) {
          await tx.skippedObligation.createMany({
            data: skippedRecords
          });
        }
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error syncing batch app data:', err);
    res.status(500).json({ error: err.message || 'Error del servidor al sincronizar los datos financieros.' });
  }
});

// ----------------------------------------------------
// CONFIGURATION ENDPOINTS
// ----------------------------------------------------
router.put('/config', authenticateToken, async (req: AuthRequest, res: Response) => {
  const {
    monthlyFixedIncome,
    incomeDistribution,
    customIncomeQ1,
    customIncomeQ2,
    monthlyTransportExpense,
    transportDistribution,
    customTransportQ1,
    customTransportQ2,
    suggestedExpenseTags,
    currencyCode,
    currencySymbol,
    additionalFixedExpenses
  } = req.body;

  try {
    // 1. Update the base config
    const updatedConfig = await prisma.appConfig.update({
      where: { userId: req.userId },
      data: {
        monthlyFixedIncome,
        incomeDistribution,
        customIncomeQ1,
        customIncomeQ2,
        monthlyTransportExpense,
        transportDistribution,
        customTransportQ1,
        customTransportQ2,
        suggestedExpenseTags,
        currencyCode,
        currencySymbol
      }
    });

    // 2. Sync additionalFixedExpenses (delete old and re-create for simplicity)
    if (additionalFixedExpenses && Array.isArray(additionalFixedExpenses)) {
      await prisma.additionalFixedExpense.deleteMany({
        where: { configId: updatedConfig.id }
      });

      if (additionalFixedExpenses.length > 0) {
        await prisma.additionalFixedExpense.createMany({
          data: additionalFixedExpenses.map((exp: any) => ({
            configId: updatedConfig.id,
            name: exp.name,
            monthlyAmount: exp.monthlyAmount,
            tag: exp.tag,
            distribution: exp.distribution,
            customQ1Amount: exp.customQ1Amount,
            customQ2Amount: exp.customQ2Amount
          }))
        });
      }
    }

    const finalConfig = await prisma.appConfig.findUnique({
      where: { userId: req.userId },
      include: { additionalFixedExpenses: true }
    });

    res.json(finalConfig);
  } catch (err) {
    console.error('Error updating config:', err);
    res.status(500).json({ error: 'Error al guardar la configuración.' });
  }
});

// ----------------------------------------------------
// DEBT ENDPOINTS
// ----------------------------------------------------
router.post('/debts', authenticateToken, async (req: AuthRequest, res: Response) => {
  const {
    title, tag, totalOriginalAmount, installmentsCount, installmentAmount,
    frequency, monthlyDistribution, customQ1Amount, customQ2Amount,
    startYear, startMonth, startQuincena, notes
  } = req.body;

  try {
    const newDebt = await prisma.debtItem.create({
      data: {
        userId: req.userId!,
        title, tag, totalOriginalAmount, installmentsCount, installmentAmount,
        frequency, monthlyDistribution, customQ1Amount, customQ2Amount,
        startYear, startMonth, startQuincena, notes,
        isArchived: false
      },
      include: { payments: true }
    });
    res.status(201).json(newDebt);
  } catch (err) {
    console.error('Error creating debt:', err);
    res.status(500).json({ error: 'Error al guardar la deuda.' });
  }
});

router.put('/debts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title, tag, totalOriginalAmount, installmentsCount, installmentAmount,
    frequency, monthlyDistribution, customQ1Amount, customQ2Amount,
    startYear, startMonth, startQuincena, notes, isArchived
  } = req.body;

  try {
    // BOLA Check
    const existing = await prisma.debtItem.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    const updated = await prisma.debtItem.update({
      where: { id },
      data: {
        title, tag, totalOriginalAmount, installmentsCount, installmentAmount,
        frequency, monthlyDistribution, customQ1Amount, customQ2Amount,
        startYear, startMonth, startQuincena, notes, isArchived
      },
      include: { payments: true }
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating debt:', err);
    res.status(500).json({ error: 'Error al actualizar la deuda.' });
  }
});

router.delete('/debts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // BOLA Check
    const existing = await prisma.debtItem.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    await prisma.debtItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting debt:', err);
    res.status(500).json({ error: 'Error al eliminar la deuda.' });
  }
});

// Pay / Abono to personal debt
router.post('/debts/:id/payments', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // debtId
  const { periodKey, installmentNumber, amountPaid, notes, isExtraPayment } = req.body;

  try {
    // BOLA Check
    const debt = await prisma.debtItem.findUnique({ where: { id } });
    if (!debt || debt.userId !== req.userId) {
      res.status(403).json({ error: 'Acceso no autorizado a esta deuda.' });
      return;
    }

    const payment = await prisma.debtPaymentRecord.create({
      data: {
        debtId: id,
        periodKey,
        installmentNumber,
        amountPaid,
        notes,
        isExtraPayment: !!isExtraPayment
      }
    });
    res.status(201).json(payment);
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Error al registrar el pago de la cuota.' });
  }
});

// Delete payment
router.delete('/debts/:debtId/payments/:paymentId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { paymentId } = req.params;
  try {
    // BOLA Check
    const payment = await prisma.debtPaymentRecord.findUnique({
      where: { id: paymentId },
      include: { debt: true }
    });
    if (!payment || payment.debt.userId !== req.userId) {
      res.status(403).json({ error: 'Acceso no autorizado a este registro de pago.' });
      return;
    }

    await prisma.debtPaymentRecord.delete({ where: { id: paymentId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting payment:', err);
    res.status(500).json({ error: 'Error al eliminar el pago.' });
  }
});

// ----------------------------------------------------
// SAVINGS ENDPOINTS
// ----------------------------------------------------
router.post('/savings', authenticateToken, async (req: AuthRequest, res: Response) => {
  const {
    name, tag, targetAmount, periodicAmount, frequency, monthlyDistribution,
    customQ1Amount, customQ2Amount, startYear, startMonth, startQuincena, notes
  } = req.body;

  try {
    const program = await prisma.savingsProgram.create({
      data: {
        userId: req.userId!,
        name, tag, targetAmount, periodicAmount, frequency, monthlyDistribution,
        customQ1Amount, customQ2Amount, startYear, startMonth, startQuincena, notes,
        isArchived: false
      },
      include: { deposits: true }
    });
    res.status(201).json(program);
  } catch (err) {
    console.error('Error creating savings program:', err);
    res.status(500).json({ error: 'Error al crear el programa de ahorro.' });
  }
});

router.put('/savings/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name, tag, targetAmount, periodicAmount, frequency, monthlyDistribution,
    customQ1Amount, customQ2Amount, startYear, startMonth, startQuincena, notes, isArchived
  } = req.body;

  try {
    // BOLA Check
    const existing = await prisma.savingsProgram.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    const updated = await prisma.savingsProgram.update({
      where: { id },
      data: {
        name, tag, targetAmount, periodicAmount, frequency, monthlyDistribution,
        customQ1Amount, customQ2Amount, startYear, startMonth, startQuincena, notes, isArchived
      },
      include: { deposits: true }
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating savings program:', err);
    res.status(500).json({ error: 'Error al actualizar el programa de ahorro.' });
  }
});

router.delete('/savings/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // BOLA Check
    const existing = await prisma.savingsProgram.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    await prisma.savingsProgram.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting savings program:', err);
    res.status(500).json({ error: 'Error al eliminar el programa.' });
  }
});

// Deposit into savings program
router.post('/savings/:id/deposits', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { periodKey, amount, notes } = req.body;

  try {
    // BOLA Check
    const program = await prisma.savingsProgram.findUnique({ where: { id } });
    if (!program || program.userId !== req.userId) {
      res.status(403).json({ error: 'Acceso no autorizado a este programa de ahorro.' });
      return;
    }

    const deposit = await prisma.savingsDepositRecord.create({
      data: {
        savingsId: id,
        periodKey,
        amount,
        notes
      }
    });
    res.status(201).json(deposit);
  } catch (err) {
    console.error('Error creating deposit:', err);
    res.status(500).json({ error: 'Error al guardar el depósito.' });
  }
});

// Delete deposit
router.delete('/savings/:savingsId/deposits/:depositId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { depositId } = req.params;
  try {
    // BOLA Check
    const deposit = await prisma.savingsDepositRecord.findUnique({
      where: { id: depositId },
      include: { savings: true }
    });
    if (!deposit || deposit.savings.userId !== req.userId) {
      res.status(403).json({ error: 'Acceso no autorizado a este depósito.' });
      return;
    }

    await prisma.savingsDepositRecord.delete({ where: { id: depositId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting deposit:', err);
    res.status(500).json({ error: 'Error al eliminar el depósito.' });
  }
});

// ----------------------------------------------------
// SPORADIC TRANSACTIONS ENDPOINTS
// ----------------------------------------------------
router.post('/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { title, type, amount, tag, periodKey, date, isScheduled, notes, isCompleted } = req.body;

  try {
    const transaction = await prisma.sporadicTransaction.create({
      data: {
        userId: req.userId!,
        title, type, amount, tag, periodKey, date, isScheduled, notes, isCompleted
      }
    });
    res.status(201).json(transaction);
  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(500).json({ error: 'Error al registrar la transacción.' });
  }
});

router.put('/transactions/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, type, amount, tag, periodKey, date, isScheduled, notes, isCompleted } = req.body;

  try {
    // BOLA Check
    const existing = await prisma.sporadicTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    const updated = await prisma.sporadicTransaction.update({
      where: { id },
      data: { title, type, amount, tag, periodKey, date, isScheduled, notes, isCompleted }
    });
    res.json(updated);
  } catch (err) {
    console.error('Error updating transaction:', err);
    res.status(500).json({ error: 'Error al actualizar la transacción.' });
  }
});

router.delete('/transactions/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // BOLA Check
    const existing = await prisma.sporadicTransaction.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    await prisma.sporadicTransaction.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting transaction:', err);
    res.status(500).json({ error: 'Error al eliminar la transacción.' });
  }
});

// ----------------------------------------------------
// BALANCE ALLOCATIONS ENDPOINTS
// ----------------------------------------------------
router.post('/balance-allocations', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { periodKey, spendableAmount, keepInAccountAmount, notes } = req.body;

  try {
    const allocation = await prisma.balanceAllocation.upsert({
      where: {
        userId_periodKey: {
          userId: req.userId!,
          periodKey
        }
      },
      update: {
        spendableAmount,
        keepInAccountAmount,
        notes
      },
      create: {
        userId: req.userId!,
        periodKey,
        spendableAmount,
        keepInAccountAmount,
        notes
      }
    });
    res.json(allocation);
  } catch (err) {
    console.error('Error upserting balance allocation:', err);
    res.status(500).json({ error: 'Error al guardar la asignación del saldo.' });
  }
});

// ----------------------------------------------------
// SKIPPED OBLIGATIONS ENDPOINTS
// ----------------------------------------------------
router.post('/skipped-obligations', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { periodKey, obligationId, skipped } = req.body; // skipped is boolean (true = skip, false = restore)

  try {
    if (skipped) {
      await prisma.skippedObligation.upsert({
        where: {
          userId_periodKey_obligationId: {
            userId: req.userId!,
            periodKey,
            obligationId
          }
        },
        update: {},
        create: {
          userId: req.userId!,
          periodKey,
          obligationId
        }
      });
    } else {
      await prisma.skippedObligation.deleteMany({
        where: {
          userId: req.userId!,
          periodKey,
          obligationId
        }
      });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error modifying skipped obligations:', err);
    res.status(500).json({ error: 'Error al guardar el estado de omisión de la obligación.' });
  }
});

// ----------------------------------------------------
// PENDING EXPENSES ENDPOINTS
// ----------------------------------------------------
router.post('/pending-expenses', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { title, amount, date, scope, notes, tag, participants } = req.body;

  try {
    const expense = await prisma.pendingExpense.create({
      data: {
        userId: req.userId!,
        title, amount, date, scope, notes, tag,
        status: 'pending',
        participants: {
          create: (participants || []).map((p: any) => ({
            name: p.name,
            isOwner: !!p.isOwner,
            assignedAmount: p.assignedAmount,
            paidAmount: p.paidAmount || 0,
            isSettled: !!p.isSettled,
          }))
        }
      },
      include: {
        participants: {
          include: { payments: true }
        }
      }
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error('Error creating pending expense:', err);
    res.status(500).json({ error: 'Error al registrar el gasto pendiente.' });
  }
});

router.put('/pending-expenses/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, amount, date, scope, notes, tag, status, destination, splitMethod, settlementType, installmentsCount, frequency, linkedDebtId, linkedTransactionId, participants } = req.body;

  try {
    // BOLA Check
    const existing = await prisma.pendingExpense.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    // To update participants cleanly, delete old and create new
    if (participants && Array.isArray(participants)) {
      await prisma.participantShare.deleteMany({
        where: { pendingExpenseId: id }
      });
    }

    const updated = await prisma.pendingExpense.update({
      where: { id },
      data: {
        title, amount, date, scope, notes, tag, status,
        destination, splitMethod, settlementType, installmentsCount, frequency,
        linkedDebtId, linkedTransactionId,
        participants: participants ? {
          create: participants.map((p: any) => ({
            name: p.name,
            isOwner: !!p.isOwner,
            assignedAmount: p.assignedAmount,
            paidAmount: p.paidAmount || 0,
            isSettled: !!p.isSettled,
            payments: {
              create: (p.payments || []).map((pay: any) => ({
                amount: pay.amount,
                paidAt: pay.paidAt ? new Date(pay.paidAt) : new Date(),
                notes: pay.notes
              }))
            }
          }))
        } : undefined
      },
      include: {
        participants: {
          include: { payments: true }
        }
      }
    });

    res.json(updated);
  } catch (err) {
    console.error('Error updating pending expense:', err);
    res.status(500).json({ error: 'Error al actualizar el gasto pendiente.' });
  }
});

// Register participant payment (abono) inside a pending expense
router.post('/pending-expenses/:expenseId/participants/:participantId/payments', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { expenseId, participantId } = req.params;
  const { amount, notes } = req.body;

  try {
    // BOLA Check: verify that the participant belongs to a pending expense owned by req.userId
    const participant = await prisma.participantShare.findUnique({
      where: { id: participantId },
      include: { pendingExpense: true }
    });
    if (!participant || participant.pendingExpense.userId !== req.userId || participant.pendingExpenseId !== expenseId) {
      res.status(403).json({ error: 'Acceso no autorizado a este gasto pendiente.' });
      return;
    }

    const payment = await prisma.participantPaymentRecord.create({
      data: {
        participantId,
        amount,
        notes
      }
    });

    // Update paidAmount and isSettled inside participant share
    const share = await prisma.participantShare.findUnique({
      where: { id: participantId },
      include: { payments: true }
    });

    if (share) {
      const newPaid = share.payments.reduce((sum, p) => sum + p.amount, 0);
      const isSettled = newPaid >= share.assignedAmount;
      await prisma.participantShare.update({
        where: { id: participantId },
        data: {
          paidAmount: newPaid,
          isSettled
        }
      });
    }

    res.json(payment);
  } catch (err) {
    console.error('Error creating participant payment:', err);
    res.status(500).json({ error: 'Error al registrar el pago del participante.' });
  }
});

router.delete('/pending-expenses/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // BOLA Check
    const existing = await prisma.pendingExpense.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    await prisma.pendingExpense.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting pending expense:', err);
    res.status(500).json({ error: 'Error al eliminar el gasto pendiente.' });
  }
});

// ----------------------------------------------------
// USER PAYMENT QR CODES
// ----------------------------------------------------
router.get('/user/qrs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const qrs = await prisma.userPaymentQR.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' }
    });
    res.json(qrs);
  } catch (err) {
    console.error('Error fetching QRs:', err);
    res.status(500).json({ error: 'Error al obtener los códigos QR.' });
  }
});

router.post('/user/qrs/upload', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { accountName, bankName, accountType, qrImageBase64 } = req.body;
  if (!accountName || !bankName || !accountType || !qrImageBase64) {
    res.status(400).json({ error: 'Faltan datos obligatorios para registrar el QR.' });
    return;
  }

  try {
    const existingQrs = await prisma.userPaymentQR.findMany({ where: { userId: req.userId } });
    if (existingQrs.length >= 2) {
      res.status(400).json({ error: 'Solo puedes tener hasta 2 códigos QR de pago.' });
      return;
    }

    // Determine slot (1 or 2)
    const hasSlot1 = existingQrs.some(q => q.qrImageUrl.includes(`_1.png`) || q.qrImageUrl.includes(`_1.jpg`));
    const slot = hasSlot1 ? 2 : 1;

    // Decode and save base64 image
    const matches = qrImageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({ error: 'Imagen QR inválida. Debe estar en formato base64.' });
      return;
    }

    const fileType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    let extension = 'png';
    if (fileType === 'image/jpeg' || fileType === 'image/jpg') {
      extension = 'jpg';
    }

    const fileName = `qr_${req.userId}_${slot}.${extension}`;
    const filePath = path.join(__dirname, '../../uploads/qrs', fileName);

    fs.writeFileSync(filePath, buffer);
    const qrImageUrl = `/uploads/qrs/${fileName}`;

    const newQr = await prisma.userPaymentQR.create({
      data: {
        userId: req.userId!,
        accountName: accountName.trim(),
        bankName: bankName.trim(),
        accountType: accountType.trim(),
        qrImageUrl
      }
    });

    res.json(newQr);
  } catch (err) {
    console.error('Error uploading QR:', err);
    res.status(500).json({ error: 'Error del servidor al cargar el código QR.' });
  }
});

router.delete('/user/qrs/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const qr = await prisma.userPaymentQR.findUnique({ where: { id } });
    if (!qr || qr.userId !== req.userId) {
      res.status(403).json({ error: 'No autorizado o no encontrado.' });
      return;
    }

    // Delete physical file
    const fileName = qr.qrImageUrl.replace('/uploads/qrs/', '');
    const filePath = path.join(__dirname, '../../uploads/qrs', fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.userPaymentQR.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting QR:', err);
    res.status(500).json({ error: 'Error del servidor al eliminar el código QR.' });
  }
});

export default router;
