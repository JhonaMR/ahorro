import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Generate 7-digit code
function generateGroupCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Create Family Group
router.post('/groups', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Por favor ingresa un nombre para el grupo.' });
    return;
  }

  try {
    const code = generateGroupCode();
    const group = await prisma.familyGroup.create({
      data: {
        name: name.trim(),
        code,
        createdByUserId: req.userId!,
        members: {
          create: {
            userId: req.userId!,
            isCreator: true
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                paymentQRs: true
              }
            }
          }
        }
      }
    });

    // Automatically set as active family group for the creator
    await prisma.user.update({
      where: { id: req.userId },
      data: { activeFamilyGroupId: group.id }
    });

    res.status(201).json(group);
  } catch (err) {
    console.error('Error creating family group:', err);
    res.status(500).json({ error: 'Error al crear el grupo familiar.' });
  }
});

// Join Family Group via Code
router.post('/groups/join', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Por favor ingresa el código del grupo.' });
    return;
  }

  try {
    const group = await prisma.familyGroup.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    if (!group) {
      res.status(404).json({ error: 'No se encontró ningún grupo con ese código.' });
      return;
    }

    // Check if already a member
    const existing = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: group.id,
          userId: req.userId!
        }
      }
    });

    if (existing) {
      res.status(400).json({ error: 'Ya eres miembro de este grupo familiar.' });
      return;
    }

    await prisma.familyGroupMember.create({
      data: {
        familyGroupId: group.id,
        userId: req.userId!,
        isCreator: false
      }
    });

    // Set as active family group for the user
    await prisma.user.update({
      where: { id: req.userId },
      data: { activeFamilyGroupId: group.id }
    });

    const fullGroup = await prisma.familyGroup.findUnique({
      where: { id: group.id },
      include: {
        members: {
          include: {
            user: {
              include: {
                paymentQRs: true
              }
            }
          }
        }
      }
    });

    res.json(fullGroup);
  } catch (err) {
    console.error('Error joining family group:', err);
    res.status(500).json({ error: 'Error al unirte al grupo familiar.' });
  }
});

// Get User's Family Groups
router.get('/groups', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const memberships = await prisma.familyGroupMember.findMany({
      where: { userId: req.userId },
      include: {
        familyGroup: {
          include: {
            members: {
              include: {
                user: {
                  include: {
                    paymentQRs: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const groups = memberships.map((m) => m.familyGroup);
    res.json(groups);
  } catch (err) {
    console.error('Error fetching family groups:', err);
    res.status(500).json({ error: 'Error al obtener la lista de grupos.' });
  }
});

// Switch Active Family Group
router.post('/groups/select', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.body;

  try {
    // BOLA Check: verify that the user actually belongs to the group being selected
    if (groupId) {
      const membership = await prisma.familyGroupMember.findUnique({
        where: {
          familyGroupId_userId: {
            familyGroupId: groupId,
            userId: req.userId!
          }
        }
      });
      if (!membership) {
        res.status(403).json({ error: 'Acceso no autorizado: no eres miembro de este grupo.' });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { activeFamilyGroupId: groupId || null },
      include: {
        familyGroup: {
          include: {
            members: {
              include: {
                user: {
                  include: {
                    paymentQRs: true
                  }
                }
              }
            }
          }
        }
      }
    });
    res.json(user);
  } catch (err) {
    console.error('Error switching active group:', err);
    res.status(500).json({ error: 'Error al cambiar de grupo activo.' });
  }
});

// Leave Family Group
router.post('/groups/leave', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.body;

  try {
    let targetGroupId = groupId;
    if (!targetGroupId) {
      const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
      targetGroupId = userObj?.activeFamilyGroupId;
    }

    if (!targetGroupId) {
      res.status(400).json({ error: 'No se especificó ningún grupo familiar.' });
      return;
    }

    // BOLA Check: verify membership before deleting it
    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: targetGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No eres miembro de este grupo familiar.' });
      return;
    }

    // Delete membership
    await prisma.familyGroupMember.delete({
      where: {
        id: membership.id
      }
    });

    // If active group was the left group, reset to null
    const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
    if (userObj?.activeFamilyGroupId === targetGroupId) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { activeFamilyGroupId: null }
      });
    }

    // Clean up empty groups
    const remainingMembers = await prisma.familyGroupMember.count({
      where: { familyGroupId: targetGroupId }
    });

    if (remainingMembers === 0) {
      await prisma.familyGroup.delete({ where: { id: targetGroupId } });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error leaving group:', err);
    res.status(500).json({ error: 'Error al salir del grupo familiar.' });
  }
});

// Shared Debts REST API
router.get('/debts', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!userObj?.activeFamilyGroupId) {
      res.json([]);
      return;
    }

    const sDebts = await prisma.sharedFamilyDebt.findMany({
      where: { familyGroupId: userObj.activeFamilyGroupId },
      include: {
        participants: true,
        abonos: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sDebts);
  } catch (err) {
    console.error('Error getting shared debts:', err);
    res.status(500).json({ error: 'Error al obtener las deudas compartidas.' });
  }
});

router.post('/debts', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { title, tag, totalOriginalAmount, installmentsCount, installmentAmount, frequency, startYear, startMonth, startQuincena, monthlyDistribution, scope, payerUserId, payerUserName, splitMethod, notes, participants } = req.body;

  try {
    const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!userObj?.activeFamilyGroupId) {
      res.status(400).json({ error: 'No tienes ningún grupo familiar activo para esta deuda.' });
      return;
    }

    // BOLA Check: verify user is a member of the active group
    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: userObj.activeFamilyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No eres miembro del grupo activo actual.' });
      return;
    }

    const saved = await prisma.sharedFamilyDebt.create({
      data: {
        familyGroupId: userObj.activeFamilyGroupId,
        title, tag, totalOriginalAmount, installmentsCount, installmentAmount, frequency,
        startYear, startMonth, startQuincena, monthlyDistribution, scope,
        payerUserId, payerUserName, splitMethod, notes,
        createdByUserId: req.userId!,
        createdByUserName: userObj.name,
        participants: {
          create: (participants || []).map((p: any) => ({
            userId: p.userId,
            userName: p.userName,
            userEmail: p.userEmail,
            isPayer: !!p.isPayer,
            assignedPercentage: p.assignedPercentage,
            assignedAmount: p.assignedAmount
          }))
        }
      },
      include: {
        participants: true,
        abonos: true
      }
    });

    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating shared debt:', err);
    res.status(500).json({ error: 'Error al guardar la deuda compartida.' });
  }
});

router.delete('/debts/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // BOLA Check: verify that the shared debt belongs to a group of which user is a member
    const sharedDebt = await prisma.sharedFamilyDebt.findUnique({ where: { id } });
    if (!sharedDebt) {
      res.status(404).json({ error: 'Deuda compartida no encontrada.' });
      return;
    }

    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: sharedDebt.familyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No autorizado para eliminar deudas de este grupo.' });
      return;
    }

    await prisma.sharedFamilyDebt.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting shared debt:', err);
    res.status(500).json({ error: 'Error al eliminar la deuda compartida.' });
  }
});

// Record Abono to Shared Debt
router.post('/debts/:id/abonos', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, date, notes } = req.body;

  try {
    const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!userObj) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    // BOLA Check: verify shared debt exists and user belongs to its group
    const sharedDebt = await prisma.sharedFamilyDebt.findUnique({ where: { id } });
    if (!sharedDebt) {
      res.status(404).json({ error: 'Deuda compartida no encontrada.' });
      return;
    }

    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: sharedDebt.familyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No tienes acceso al grupo familiar de esta deuda.' });
      return;
    }

    const abono = await prisma.sharedFamilyDebtAbono.create({
      data: {
        sharedDebtId: id,
        userId: req.userId!,
        userName: userObj.name,
        userEmail: userObj.email,
        amount,
        date,
        notes
      }
    });

    res.status(201).json(abono);
  } catch (err) {
    console.error('Error saving shared abono:', err);
    res.status(500).json({ error: 'Error al registrar el abono compartido.' });
  }
});

// Delete Abono from Shared Debt
router.delete('/debts/:debtId/abonos/:abonoId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { debtId, abonoId } = req.params;
  try {
    // BOLA Check: verify abono exists and belongs to a sharedDebt of a group the user belongs to
    const abono = await prisma.sharedFamilyDebtAbono.findUnique({
      where: { id: abonoId },
      include: { sharedDebt: true }
    });

    if (!abono || abono.sharedDebtId !== debtId) {
      res.status(404).json({ error: 'Abono no encontrado.' });
      return;
    }

    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: abono.sharedDebt.familyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No tienes acceso al grupo familiar de esta deuda.' });
      return;
    }

    await prisma.sharedFamilyDebtAbono.delete({ where: { id: abonoId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting shared abono:', err);
    res.status(500).json({ error: 'Error al eliminar el abono.' });
  }
});

// Shared Savings REST API
router.get('/savings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!userObj?.activeFamilyGroupId) {
      res.json([]);
      return;
    }

    const sSavings = await prisma.sharedFamilySavings.findMany({
      where: { familyGroupId: userObj.activeFamilyGroupId },
      include: {
        participants: true,
        deposits: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(sSavings);
  } catch (err) {
    console.error('Error getting shared savings:', err);
    res.status(500).json({ error: 'Error al obtener las metas de ahorro compartidas.' });
  }
});

router.post('/savings', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, tag, targetAmount, periodicTargetAmount, frequency, startYear, startMonth, startQuincena, monthlyDistribution, scope, splitMethod, notes, participants } = req.body;

  try {
    const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!userObj?.activeFamilyGroupId) {
      res.status(400).json({ error: 'No tienes ningún grupo familiar activo.' });
      return;
    }

    // BOLA Check
    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: userObj.activeFamilyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No eres miembro del grupo activo actual.' });
      return;
    }

    const saved = await prisma.sharedFamilySavings.create({
      data: {
        familyGroupId: userObj.activeFamilyGroupId,
        name, tag, targetAmount, periodicTargetAmount, frequency,
        startYear, startMonth, startQuincena, monthlyDistribution, scope, splitMethod, notes,
        createdByUserId: req.userId!,
        createdByUserName: userObj.name,
        participants: {
          create: (participants || []).map((p: any) => ({
            userId: p.userId,
            userName: p.userName,
            userEmail: p.userEmail,
            assignedPercentage: p.assignedPercentage,
            assignedAmount: p.assignedAmount
          }))
        }
      },
      include: {
        participants: true,
        deposits: true
      }
    });

    res.json(saved);
  } catch (err) {
    console.error('Error creating shared savings:', err);
    res.status(500).json({ error: 'Error al guardar la meta de ahorro compartida.' });
  }
});

router.delete('/savings/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    // BOLA Check
    const sharedSaving = await prisma.sharedFamilySavings.findUnique({ where: { id } });
    if (!sharedSaving) {
      res.status(404).json({ error: 'Meta de ahorro compartida no encontrada.' });
      return;
    }

    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: sharedSaving.familyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No autorizado para eliminar metas de este grupo.' });
      return;
    }

    await prisma.sharedFamilySavings.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting shared savings:', err);
    res.status(500).json({ error: 'Error al eliminar el programa de ahorro compartido.' });
  }
});

// Record Deposit into Shared Savings
router.post('/savings/:id/deposits', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { amount, date, notes } = req.body;

  try {
    const userObj = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!userObj) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    // BOLA Check
    const sharedSaving = await prisma.sharedFamilySavings.findUnique({ where: { id } });
    if (!sharedSaving) {
      res.status(404).json({ error: 'Meta de ahorro compartida no encontrada.' });
      return;
    }

    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: sharedSaving.familyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No eres miembro del grupo de esta meta de ahorro.' });
      return;
    }

    const deposit = await prisma.sharedFamilySavingsDeposit.create({
      data: {
        sharedSavingsId: id,
        userId: req.userId!,
        userName: userObj.name,
        userEmail: userObj.email,
        amount,
        date,
        notes
      }
    });

    res.status(201).json(deposit);
  } catch (err) {
    console.error('Error saving shared deposit:', err);
    res.status(500).json({ error: 'Error al registrar el depósito compartido.' });
  }
});

// Delete Deposit from Shared Savings
router.delete('/savings/:savingsId/deposits/:depositId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { savingsId, depositId } = req.params;
  try {
    // BOLA Check
    const deposit = await prisma.sharedFamilySavingsDeposit.findUnique({
      where: { id: depositId },
      include: { sharedSavings: true }
    });

    if (!deposit || deposit.sharedSavingsId !== savingsId) {
      res.status(404).json({ error: 'Depósito no encontrado.' });
      return;
    }

    const membership = await prisma.familyGroupMember.findUnique({
      where: {
        familyGroupId_userId: {
          familyGroupId: deposit.sharedSavings.familyGroupId,
          userId: req.userId!
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'No tienes acceso al grupo familiar de esta meta.' });
      return;
    }

    await prisma.sharedFamilySavingsDeposit.delete({ where: { id: depositId } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting shared deposit:', err);
    res.status(500).json({ error: 'Error al eliminar el depósito.' });
  }
});

// ----------------------------------------------------
// SHARED EXPENSE SIMULATOR ENDPOINTS
// ----------------------------------------------------
router.get('/simulator/:groupId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  try {
    const isMember = await prisma.familyGroupMember.findUnique({
      where: { familyGroupId_userId: { familyGroupId: groupId, userId: req.userId! } }
    });
    if (!isMember) {
      res.status(403).json({ error: 'No eres miembro de este grupo familiar.' });
      return;
    }

    const sharedExpenses = await prisma.familyGroupSharedExpense.findMany({
      where: { familyGroupId: groupId },
      orderBy: { createdAt: 'asc' }
    });

    const contributions = await prisma.familyGroupMemberContribution.findMany({
      where: { familyGroupId: groupId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ sharedExpenses, contributions });
  } catch (err) {
    console.error('Error fetching simulator data:', err);
    res.status(500).json({ error: 'Error del servidor al obtener datos del simulador.' });
  }
});

router.post('/simulator/:groupId/expense', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const { id, name, monthlyAmount } = req.body;
  if (!name || monthlyAmount === undefined) {
    res.status(400).json({ error: 'Faltan datos obligatorios (nombre o monto mensual).' });
    return;
  }

  try {
    const isMember = await prisma.familyGroupMember.findUnique({
      where: { familyGroupId_userId: { familyGroupId: groupId, userId: req.userId! } }
    });
    if (!isMember) {
      res.status(403).json({ error: 'No eres miembro de este grupo familiar.' });
      return;
    }

    if (id) {
      const updated = await prisma.familyGroupSharedExpense.update({
        where: { id },
        data: {
          name: name.trim(),
          monthlyAmount: parseFloat(monthlyAmount)
        }
      });
      res.json(updated);
    } else {
      const created = await prisma.familyGroupSharedExpense.create({
        data: {
          familyGroupId: groupId,
          name: name.trim(),
          monthlyAmount: parseFloat(monthlyAmount)
        }
      });
      res.json(created);
    }
  } catch (err) {
    console.error('Error saving simulator expense:', err);
    res.status(500).json({ error: 'Error del servidor al guardar el gasto compartido.' });
  }
});

router.delete('/simulator/:groupId/expense/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId, id } = req.params;
  try {
    const isMember = await prisma.familyGroupMember.findUnique({
      where: { familyGroupId_userId: { familyGroupId: groupId, userId: req.userId! } }
    });
    if (!isMember) {
      res.status(403).json({ error: 'No eres miembro de este grupo familiar.' });
      return;
    }

    const expense = await prisma.familyGroupSharedExpense.findUnique({ where: { id } });
    if (!expense || expense.familyGroupId !== groupId) {
      res.status(404).json({ error: 'Gasto compartido no encontrado o no pertenece a este grupo.' });
      return;
    }

    await prisma.familyGroupSharedExpense.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting simulator expense:', err);
    res.status(500).json({ error: 'Error del servidor al eliminar el gasto compartido.' });
  }
});

router.post('/simulator/:groupId/contribution', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const { declaredIncome, hideIncome, usePersonalConfig } = req.body;
  if (declaredIncome === undefined || hideIncome === undefined || usePersonalConfig === undefined) {
    res.status(400).json({ error: 'Faltan parámetros de contribución requeridos.' });
    return;
  }

  try {
    const isMember = await prisma.familyGroupMember.findUnique({
      where: { familyGroupId_userId: { familyGroupId: groupId, userId: req.userId! } }
    });
    if (!isMember) {
      res.status(403).json({ error: 'No eres miembro de este grupo familiar.' });
      return;
    }

    const contribution = await prisma.familyGroupMemberContribution.upsert({
      where: {
        familyGroupId_userId: {
          familyGroupId: groupId,
          userId: req.userId!
        }
      },
      update: {
        declaredIncome: parseFloat(declaredIncome),
        hideIncome: !!hideIncome,
        usePersonalConfig: !!usePersonalConfig
      },
      create: {
        familyGroupId: groupId,
        userId: req.userId!,
        declaredIncome: parseFloat(declaredIncome),
        hideIncome: !!hideIncome,
        usePersonalConfig: !!usePersonalConfig
      }
    });

    res.json(contribution);
  } catch (err) {
    console.error('Error saving simulator contribution:', err);
    res.status(500).json({ error: 'Error del servidor al guardar tus datos de aporte.' });
  }
});

export default router;
