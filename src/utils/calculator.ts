import { AppData, PeriodSelection, SporadicTransaction } from '../types';
import {
  calculateDebtLiquidationInfo,
  getDebtDueForPeriod,
  getPeriodKey,
  getSavingsDueForPeriod,
  getSplitAmounts,
  calculatePeriodIndex,
  getPeriodFromIndex,
  parsePeriodKey,
} from './formatters';
import { DEFAULT_CONFIG } from './storage';

export interface PeriodFinancialSummary {
  period: PeriodSelection;
  periodKey: string;
  
  // Incomes
  fixedIncome: number;
  sporadicIncomes: SporadicTransaction[];
  totalSporadicIncome: number;
  totalIncome: number;

  // Expenses
  fixedTransport: number;
  isTransportSkipped: boolean;
  otherFixedExpenses: { id: string; name: string; tag: string; amount: number; isSkipped: boolean }[];
  totalOtherFixedExpenses: number;
  totalFixedExpenses: number; // Transport + other fixed (only active/non-skipped)

  // Debts in this period
  debtDues: {
    debtId: string;
    title: string;
    tag: string;
    amountDue: number;
    isPaidInPeriod: boolean;
    isSkipped: boolean;
    remainingBalance: number;
    estimatedPayoffDate: string;
    frequency: string;
  }[];
  totalDebtDue: number;

  // Savings in this period
  savingsDues: {
    savingsId: string;
    name: string;
    tag: string;
    amountDue: number;
    isSavedInPeriod: boolean;
    isSkipped: boolean;
    accumulatedTotal: number;
    targetAmount?: number;
  }[];
  totalSavingsDue: number;

  // Sporadic Expenses in this period
  sporadicExpenses: (SporadicTransaction & { isSkipped?: boolean })[];
  totalSporadicExpense: number;

  // Skipped counts and total saved by skipping
  skippedCount: number;
  totalSkippedAmount: number;

  // Grand Totals & Balance
  totalExpenses: number;
  freeBalance: number; // Ingresos Totales - Gastos Totales

  // Pocket Carry-over & Cushion (Alternativa A)
  pocketCarryOver: number;       // Arrastre acumulado del disponible para gastar de periodos anteriores
  totalPocketBudget: number;     // Disponible actual + arrastre anterior
  remainingPocket: number;       // totalPocketBudget - sporadicExpenses
  cumulativeCushion: number;     // Colchón de seguridad acumulado en cuenta (histórico de keepInAccountAmount)
}

export interface GlobalFinancialMetrics {
  totalRemainingDebt: number;
  totalSavedAccumulated: number;
  activeDebtsCount: number;
  activeSavingsCount: number;
  pendingTransactionsCount: number;
  pendingExpensesCount: number;
  totalPendingExpensesAmount: number;
  sharedPendingToCollect: number;
  monthlyFixedIncome: number;
  monthlyTotalFixedExpenses: number;
  monthlyTotalDebtCommitment: number;
  monthlyTotalSavingsCommitment: number;
  monthlyProjectedFreeBalance: number;
}

export function calculateCarryOver(
  data: AppData | undefined | null,
  targetPeriod: PeriodSelection
): { pocketCarryOver: number; cumulativeCushion: number } {
  if (!data) return { pocketCarryOver: 0, cumulativeCushion: 0 };

  const targetPeriodType = targetPeriod.periodType;
  
  if (targetPeriodType === 'quincena') {
    // 1. Find the earliest period index from the database
    let minIndex = calculatePeriodIndex(targetPeriod.year, targetPeriod.month, targetPeriod.quincena);
    
    if (data.balanceAllocations) {
      Object.keys(data.balanceAllocations).forEach((key) => {
        try {
          const { year, month, quincena } = parsePeriodKey(key);
          if (quincena !== undefined) {
            const idx = calculatePeriodIndex(year, month, quincena);
            if (idx < minIndex) {
              minIndex = idx;
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      });
    }
    
    // We will step chronologically from minIndex to targetIndex
    const targetIndex = calculatePeriodIndex(targetPeriod.year, targetPeriod.month, targetPeriod.quincena);
    
    let currentCarryOver = 0;
    let currentCushion = 0;
    
    for (let idx = minIndex; idx < targetIndex; idx++) {
      const p = getPeriodFromIndex(idx);
      const periodKey = getPeriodKey(p.year, p.month, p.quincena);
      const allocation = data.balanceAllocations?.[periodKey];
      
      // Calculate how much was spent in this period
      const isPeriodMatch = (txPeriodKey: string) => txPeriodKey === periodKey;
      const periodExpenses = (data.sporadicTransactions || []).filter(
        (tx) => tx.type === 'expense' && isPeriodMatch(tx.periodKey)
      );
      
      const skippedInPeriod = data.skippedObligations?.[periodKey] || [];
      const activeExpenses = periodExpenses.filter((tx) => !skippedInPeriod.includes(tx.id));
      const totalSpent = activeExpenses.reduce((sum, tx) => sum + tx.amount, 0);
      
      if (allocation) {
        const totalPocketBudget = allocation.spendableAmount + currentCarryOver;
        currentCarryOver = Math.max(0, totalPocketBudget - totalSpent);
        currentCushion += allocation.keepInAccountAmount;
      } else {
        currentCarryOver = Math.max(0, currentCarryOver - totalSpent);
      }
    }
    
    return { pocketCarryOver: currentCarryOver, cumulativeCushion: currentCushion };
  } else {
    // Monthly view
    let minMonthIndex = targetPeriod.year * 12 + targetPeriod.month;
    if (data.balanceAllocations) {
      Object.keys(data.balanceAllocations).forEach((key) => {
        try {
          const { year, month, quincena } = parsePeriodKey(key);
          if (quincena === undefined) {
            const idx = year * 12 + month;
            if (idx < minMonthIndex) {
              minMonthIndex = idx;
            }
          }
        } catch (e) {
          // ignore
        }
      });
    }
    
    const targetMonthIndex = targetPeriod.year * 12 + targetPeriod.month;
    let currentCarryOver = 0;
    let currentCushion = 0;
    
    for (let idx = minMonthIndex; idx < targetMonthIndex; idx++) {
      const year = Math.floor(idx / 12);
      const month = idx % 12;
      const periodKey = getPeriodKey(year, month);
      const allocation = data.balanceAllocations?.[periodKey];
      
      const isPeriodMatch = (txPeriodKey: string) => txPeriodKey.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
      const periodExpenses = (data.sporadicTransactions || []).filter(
        (tx) => tx.type === 'expense' && isPeriodMatch(tx.periodKey)
      );
      
      const skippedInPeriod = data.skippedObligations?.[periodKey] || [];
      const activeExpenses = periodExpenses.filter((tx) => !skippedInPeriod.includes(tx.id));
      const totalSpent = activeExpenses.reduce((sum, tx) => sum + tx.amount, 0);
      
      if (allocation) {
        const totalPocketBudget = allocation.spendableAmount + currentCarryOver;
        currentCarryOver = Math.max(0, totalPocketBudget - totalSpent);
        currentCushion += allocation.keepInAccountAmount;
      } else {
        currentCarryOver = Math.max(0, currentCarryOver - totalSpent);
      }
    }
    
    return { pocketCarryOver: currentCarryOver, cumulativeCushion: currentCushion };
  }
}

export function calculatePeriodSummary(data: AppData | undefined | null, period: PeriodSelection): PeriodFinancialSummary {
  const config = data?.config || DEFAULT_CONFIG;
  const debts = data?.debts || [];
  const savings = data?.savings || [];
  const sporadicTransactions = data?.sporadicTransactions || [];
  const skippedObligations = data?.skippedObligations || {};
  const currentPeriodKey = getPeriodKey(
    period.year,
    period.month,
    period.periodType === 'quincena' ? period.quincena : undefined
  );

  const periodSkippedIds = skippedObligations[currentPeriodKey] || [];
  const isIdSkipped = (id: string) => periodSkippedIds.includes(id);

  // 1. Calculate Fixed Income
  let fixedIncome = 0;
  if (period.periodType === 'mes') {
    fixedIncome = config.monthlyFixedIncome;
  } else {
    const { q1, q2 } = getSplitAmounts(
      config.monthlyFixedIncome,
      config.incomeDistribution,
      config.customIncomeQ1,
      config.customIncomeQ2
    );
    fixedIncome = period.quincena === 1 ? q1 : q2;
  }

  // 2. Sporadic Incomes for this period
  const isPeriodMatch = (txPeriodKey: string) => {
    if (period.periodType === 'quincena') {
      return txPeriodKey === currentPeriodKey;
    } else {
      const monthPrefix = `${period.year}-${String(period.month + 1).padStart(2, '0')}`;
      return txPeriodKey.startsWith(monthPrefix);
    }
  };

  const sporadicIncomes = sporadicTransactions.filter(
    (tx) => tx.type === 'income' && isPeriodMatch(tx.periodKey)
  );
  const totalSporadicIncome = sporadicIncomes.reduce((sum, tx) => sum + tx.amount, 0);
  const totalIncome = fixedIncome + totalSporadicIncome;

  // 3. Fixed Transport
  let fixedTransportRaw = 0;
  if (period.periodType === 'mes') {
    fixedTransportRaw = config.monthlyTransportExpense;
  } else {
    const { q1, q2 } = getSplitAmounts(
      config.monthlyTransportExpense,
      config.transportDistribution,
      config.customTransportQ1,
      config.customTransportQ2
    );
    fixedTransportRaw = period.quincena === 1 ? q1 : q2;
  }
  const isTransportSkipped = isIdSkipped('transport');
  const fixedTransport = fixedTransportRaw;

  // 4. Other Fixed Expenses
  const otherFixedExpenses = (config.additionalFixedExpenses || []).map((exp) => {
    let amount = 0;
    if (period.periodType === 'mes') {
      amount = exp.monthlyAmount;
    } else {
      const { q1, q2 } = getSplitAmounts(
        exp.monthlyAmount,
        exp.distribution,
        exp.customQ1Amount,
        exp.customQ2Amount
      );
      amount = period.quincena === 1 ? q1 : q2;
    }
    const isSkipped = isIdSkipped(exp.id);
    return {
      id: exp.id,
      name: exp.name,
      tag: exp.tag,
      amount,
      isSkipped,
    };
  });
  const totalOtherFixedExpenses = otherFixedExpenses
    .filter((e) => !e.isSkipped)
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalFixedExpenses = (isTransportSkipped ? 0 : fixedTransport) + totalOtherFixedExpenses;

  // 5. Debts due in this period
  const debtDues = debts
    .filter((d) => !d.isArchived)
    .map((debt) => {
      const amountDue = getDebtDueForPeriod(debt, period);
      const liqInfo = calculateDebtLiquidationInfo(debt);
      const isSkipped = isIdSkipped(debt.id);

      // Check if payment was registered for this period
      const isPaidInPeriod = debt.payments.some((p) => {
        if (period.periodType === 'quincena') {
          return p.periodKey === currentPeriodKey || p.periodKey === `${period.year}-${String(period.month + 1).padStart(2, '0')}`;
        }
        return p.periodKey.startsWith(`${period.year}-${String(period.month + 1).padStart(2, '0')}`);
      });

      return {
        debtId: debt.id,
        title: debt.title,
        tag: debt.tag,
        amountDue,
        isPaidInPeriod,
        isSkipped,
        remainingBalance: liqInfo.remainingBalance,
        estimatedPayoffDate: liqInfo.estimatedPayoffDate,
        frequency: debt.frequency,
      };
    })
    .filter((d) => d.amountDue > 0 || d.remainingBalance > 0);

  const totalDebtDue = debtDues
    .filter((d) => !d.isSkipped)
    .reduce((sum, d) => sum + d.amountDue, 0);

  // 6. Savings due in this period
  const savingsDues = savings
    .filter((s) => !s.isArchived)
    .map((s) => {
      const amountDue = getSavingsDueForPeriod(s, period);
      const accumulatedTotal = s.deposits.reduce((acc, dep) => acc + dep.amount, 0);
      const isSkipped = isIdSkipped(s.id);

      const isSavedInPeriod = s.deposits.some((d) => {
        if (period.periodType === 'quincena') {
          return d.periodKey === currentPeriodKey;
        }
        return d.periodKey.startsWith(`${period.year}-${String(period.month + 1).padStart(2, '0')}`);
      });

      return {
        savingsId: s.id,
        name: s.name,
        tag: s.tag,
        amountDue,
        isSavedInPeriod,
        isSkipped,
        accumulatedTotal,
        targetAmount: s.targetAmount,
      };
    });

  const totalSavingsDue = savingsDues
    .filter((s) => !s.isSkipped)
    .reduce((sum, s) => sum + s.amountDue, 0);

  // 7. Sporadic Expenses for this period
  const sporadicExpenses = sporadicTransactions
    .filter((tx) => tx.type === 'expense' && isPeriodMatch(tx.periodKey))
    .map((tx) => ({
      ...tx,
      isSkipped: isIdSkipped(tx.id),
    }));

  const totalSporadicExpense = sporadicExpenses
    .filter((tx) => !tx.isSkipped)
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Calculate skipped summary
  let skippedCount = 0;
  let totalSkippedAmount = 0;

  if (isTransportSkipped && fixedTransportRaw > 0) {
    skippedCount += 1;
    totalSkippedAmount += fixedTransportRaw;
  }
  otherFixedExpenses.forEach((e) => {
    if (e.isSkipped && e.amount > 0) {
      skippedCount += 1;
      totalSkippedAmount += e.amount;
    }
  });
  debtDues.forEach((d) => {
    if (d.isSkipped && d.amountDue > 0) {
      skippedCount += 1;
      totalSkippedAmount += d.amountDue;
    }
  });
  savingsDues.forEach((s) => {
    if (s.isSkipped && s.amountDue > 0) {
      skippedCount += 1;
      totalSkippedAmount += s.amountDue;
    }
  });
  sporadicExpenses.forEach((tx) => {
    if (tx.isSkipped && tx.amount > 0) {
      skippedCount += 1;
      totalSkippedAmount += tx.amount;
    }
  });

  // 8. Total Expenses and Free Balance
  const totalExpenses = totalFixedExpenses + totalDebtDue + totalSavingsDue + totalSporadicExpense;
  const freeBalance = totalIncome - totalExpenses;

  // 9. Carry-over and Cushion (Alternativa A)
  const { pocketCarryOver, cumulativeCushion: previousCushion } = calculateCarryOver(data, period);
  const currentAllocation = data?.balanceAllocations?.[currentPeriodKey];
  let currentSpendable = 0;
  let currentKeepInAccount = 0;

  if (currentAllocation) {
    currentSpendable = currentAllocation.spendableAmount;
    currentKeepInAccount = currentAllocation.keepInAccountAmount;
  } else if (freeBalance > 0) {
    currentSpendable = Math.round(freeBalance / 2);
    currentKeepInAccount = freeBalance - currentSpendable;
  }

  const totalPocketBudget = currentSpendable + pocketCarryOver;
  const remainingPocket = totalPocketBudget - totalSporadicExpense;
  const cumulativeCushion = previousCushion + currentKeepInAccount;

  return {
    period,
    periodKey: currentPeriodKey,
    fixedIncome,
    sporadicIncomes,
    totalSporadicIncome,
    totalIncome,
    fixedTransport,
    isTransportSkipped,
    otherFixedExpenses,
    totalOtherFixedExpenses,
    totalFixedExpenses,
    debtDues,
    totalDebtDue,
    savingsDues,
    totalSavingsDue,
    sporadicExpenses,
    totalSporadicExpense,
    skippedCount,
    totalSkippedAmount,
    totalExpenses,
    freeBalance,
    pocketCarryOver,
    totalPocketBudget,
    remainingPocket,
    cumulativeCushion,
  };
}

export function calculateGlobalMetrics(data: AppData | undefined | null): GlobalFinancialMetrics {
  const config = data?.config || DEFAULT_CONFIG;
  const debts = data?.debts || [];
  const savings = data?.savings || [];
  const sporadicTransactions = data?.sporadicTransactions || [];

  const totalRemainingDebt = debts
    .filter((d) => !d.isArchived)
    .reduce((sum, debt) => {
      const info = calculateDebtLiquidationInfo(debt);
      return sum + info.remainingBalance;
    }, 0);

  const totalSavedAccumulated = savings
    .filter((s) => !s.isArchived)
    .reduce((sum, s) => {
      const saved = s.deposits.reduce((acc, dep) => acc + dep.amount, 0);
      return sum + saved;
    }, 0);

  const activeDebtsCount = debts.filter((d) => {
    if (d.isArchived) return false;
    const info = calculateDebtLiquidationInfo(d);
    return !info.isFullyPaid;
  }).length;

  const activeSavingsCount = savings.filter((s) => !s.isArchived).length;
  const pendingTransactionsCount = sporadicTransactions.filter((tx) => !tx.isCompleted && tx.isScheduled).length;

  const pendingExpensesList = data.pendingExpenses || [];
  const pendingExpensesCount = pendingExpensesList.filter((p) => p.status === 'pending').length;
  const totalPendingExpensesAmount = pendingExpensesList
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  // Compute total pending amount to collect from other participants in shared expenses
  const sharedPendingToCollect = pendingExpensesList
    .filter((p) => p.scope === 'shared' && p.participants && p.participants.length > 0)
    .reduce((sum, exp) => {
      const othersPending = (exp.participants || [])
        .filter((part) => !part.isOwner)
        .reduce((pSum, part) => pSum + Math.max(0, part.assignedAmount - part.paidAmount), 0);
      return sum + othersPending;
    }, 0);

  const monthlyFixedIncome = config.monthlyFixedIncome;
  const otherFixedMonthly = (config.additionalFixedExpenses || []).reduce((sum, e) => sum + e.monthlyAmount, 0);
  const monthlyTotalFixedExpenses = config.monthlyTransportExpense + otherFixedMonthly;

  const monthlyTotalDebtCommitment = debts
    .filter((d) => !d.isArchived)
    .reduce((sum, d) => {
      const info = calculateDebtLiquidationInfo(d);
      if (info.isFullyPaid) return sum;
      if (d.frequency === 'quincenal') {
        return sum + d.installmentAmount * 2;
      }
      return sum + d.installmentAmount;
    }, 0);

  const monthlyTotalSavingsCommitment = savings
    .filter((s) => !s.isArchived)
    .reduce((sum, s) => {
      if (s.frequency === 'quincenal') {
        return sum + s.periodicAmount * 2;
      }
      return sum + s.periodicAmount;
    }, 0);

  const monthlyProjectedFreeBalance =
    monthlyFixedIncome - (monthlyTotalFixedExpenses + monthlyTotalDebtCommitment + monthlyTotalSavingsCommitment);

  return {
    totalRemainingDebt,
    totalSavedAccumulated,
    activeDebtsCount,
    activeSavingsCount,
    pendingTransactionsCount,
    pendingExpensesCount,
    totalPendingExpensesAmount,
    sharedPendingToCollect,
    monthlyFixedIncome,
    monthlyTotalFixedExpenses,
    monthlyTotalDebtCommitment,
    monthlyTotalSavingsCommitment,
    monthlyProjectedFreeBalance,
  };
}
