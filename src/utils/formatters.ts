import { DebtItem, MonthlyDistribution, PeriodSelection, SavingsProgram } from '../types';

export const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const MONTH_NAMES_SHORT_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function formatCurrency(amount: number, currencyCode = 'COP', currencySymbol = '$'): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);

  let formatted = '';
  if (currencyCode === 'COP' || currencyCode === 'CLP' || currencyCode === 'ARS') {
    formatted = Math.round(absVal).toLocaleString('es-CO');
  } else {
    formatted = absVal.toLocaleString('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return `${isNegative ? '-' : ''}${currencySymbol} ${formatted}`;
}

export function formatCompactCurrency(amount: number, currencySymbol = '$'): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  if (absVal >= 1_000_000) {
    return `${isNegative ? '-' : ''}${currencySymbol}${(absVal / 1_000_000).toFixed(1)}M`;
  }
  if (absVal >= 1_000) {
    return `${isNegative ? '-' : ''}${currencySymbol}${(absVal / 1_000).toFixed(0)}k`;
  }
  return `${isNegative ? '-' : ''}${currencySymbol}${absVal.toLocaleString('es-CO')}`;
}

export function getPeriodKey(year: number, month: number, quincena?: 1 | 2): string {
  const mm = String(month + 1).padStart(2, '0');
  if (quincena) {
    return `${year}-${mm}-Q${quincena}`;
  }
  return `${year}-${mm}`;
}

export function parsePeriodKey(key: string): { year: number; month: number; quincena?: 1 | 2 } {
  const parts = key.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const quincena = parts[2] ? (parseInt(parts[2].replace('Q', ''), 10) as 1 | 2) : undefined;
  return { year, month, quincena };
}

export function getPeriodLabel(period: PeriodSelection): string {
  const monthName = MONTH_NAMES_ES[period.month];
  const totalDays = getDaysInMonth(period.year, period.month);

  if (period.periodType === 'mes') {
    return `Mes Completo: ${monthName} ${period.year}`;
  }

  if (period.quincena === 1) {
    return `1ra Quincena (1 - 15 de ${monthName}, ${period.year})`;
  }
  return `2da Quincena (16 - ${totalDays} de ${monthName}, ${period.year})`;
}

export function getPeriodShortLabel(period: PeriodSelection): string {
  const monthName = MONTH_NAMES_SHORT_ES[period.month];
  if (period.periodType === 'mes') {
    return `${monthName} ${period.year}`;
  }
  return `Q${period.quincena} ${monthName} ${period.year}`;
}

export function calculatePeriodIndex(year: number, month: number, quincena: 1 | 2): number {
  return (year * 12 + month) * 2 + (quincena - 1);
}

export function getPeriodFromIndex(index: number): { year: number; month: number; quincena: 1 | 2 } {
  const totalQuincenas = index;
  const quincena = (totalQuincenas % 2 === 0 ? 1 : 2) as 1 | 2;
  const totalMonths = Math.floor(totalQuincenas / 2);
  const month = totalMonths % 12;
  const year = Math.floor(totalMonths / 12);
  return { year, month, quincena };
}

// Calculate distribution for a given monthly amount
export function getSplitAmounts(
  monthlyAmount: number,
  distribution: MonthlyDistribution = 'both_equal',
  customQ1?: number,
  customQ2?: number
): { q1: number; q2: number } {
  switch (distribution) {
    case 'only_q1':
      return { q1: monthlyAmount, q2: 0 };
    case 'only_q2':
      return { q1: 0, q2: monthlyAmount };
    case 'both_custom': {
      const q1 = customQ1 !== undefined ? customQ1 : Math.round(monthlyAmount / 2);
      const q2 = customQ2 !== undefined ? customQ2 : Math.max(0, monthlyAmount - q1);
      return { q1, q2 };
    }
    case 'both_equal':
    default: {
      const half = Math.round(monthlyAmount / 2);
      return { q1: half, q2: monthlyAmount - half };
    }
  }
}

// Calculate debt installment due in a specific period
export function getDebtDueForPeriod(debt: DebtItem, period: PeriodSelection): number {
  if (debt.isArchived) return 0;

  const totalPaid = debt.payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const remainingTotal = Math.max(0, debt.totalOriginalAmount - totalPaid);
  if (remainingTotal <= 0) return 0;

  if (period.periodType === 'mes') {
    // Check if debt is active in this month
    if (debt.frequency === 'mensual') {
      const startMonthIndex = debt.startYear * 12 + debt.startMonth;
      const currentMonthIndex = period.year * 12 + period.month;
      const monthOffset = currentMonthIndex - startMonthIndex;

      if (monthOffset >= 0 && monthOffset < debt.installmentsCount) {
        return Math.min(debt.installmentAmount, remainingTotal);
      }
      return 0;
    } else {
      // Quincenal debt: sum Q1 and Q2 due
      const q1Due = getDebtDueForPeriod(debt, { ...period, periodType: 'quincena', quincena: 1 });
      const q2Due = getDebtDueForPeriod(debt, { ...period, periodType: 'quincena', quincena: 2 });
      return Math.min(q1Due + q2Due, remainingTotal);
    }
  }

  // Quincenal view
  const currentPIndex = calculatePeriodIndex(period.year, period.month, period.quincena);
  const startPIndex = calculatePeriodIndex(debt.startYear, debt.startMonth, debt.startQuincena);
  const pOffset = currentPIndex - startPIndex;

  if (pOffset < 0) return 0; // hasn't started yet

  if (debt.frequency === 'quincenal') {
    if (pOffset < debt.installmentsCount) {
      return Math.min(debt.installmentAmount, remainingTotal);
    }
    return 0;
  }

  // Frequency is mensual, but viewing quincenal
  const monthOffset = (period.year * 12 + period.month) - (debt.startYear * 12 + debt.startMonth);
  if (monthOffset < 0 || monthOffset >= debt.installmentsCount) {
    return 0;
  }

  const { q1, q2 } = getSplitAmounts(
    debt.installmentAmount,
    debt.monthlyDistribution || 'both_equal',
    debt.customQ1Amount,
    debt.customQ2Amount
  );

  const due = period.quincena === 1 ? q1 : q2;
  return Math.min(due, remainingTotal);
}

// Calculate liquidation payoff period
export function calculateDebtLiquidationInfo(debt: DebtItem): {
  totalPaid: number;
  remainingBalance: number;
  paidInstallmentsCount: number;
  remainingInstallmentsCount: number;
  estimatedPayoffDate: string; // e.g. "Q2 Noviembre 2026" or "Noviembre 2026"
  isFullyPaid: boolean;
  progressPercent: number;
} {
  const totalPaid = debt.payments.reduce((acc, p) => acc + p.amountPaid, 0);
  const remainingBalance = Math.max(0, debt.totalOriginalAmount - totalPaid);
  const isFullyPaid = remainingBalance <= 0;
  const progressPercent = Math.min(
    100,
    Math.round((totalPaid / debt.totalOriginalAmount) * 100)
  );

  const paidInstallmentsCount = debt.payments.length;
  const remainingInstallmentsCount = isFullyPaid
    ? 0
    : Math.max(0, debt.installmentsCount - paidInstallmentsCount);

  if (isFullyPaid) {
    return {
      totalPaid,
      remainingBalance: 0,
      paidInstallmentsCount: debt.installmentsCount,
      remainingInstallmentsCount: 0,
      estimatedPayoffDate: '¡Liquidada!',
      isFullyPaid: true,
      progressPercent: 100,
    };
  }

  if (debt.frequency === 'quincenal') {
    const startPIndex = calculatePeriodIndex(debt.startYear, debt.startMonth, debt.startQuincena);
    // End period is start + total installments - 1
    const endPIndex = startPIndex + debt.installmentsCount - 1;
    const endPeriod = getPeriodFromIndex(endPIndex);
    const monthName = MONTH_NAMES_ES[endPeriod.month];
    const estimatedPayoffDate = `Q${endPeriod.quincena} de ${monthName}, ${endPeriod.year}`;

    return {
      totalPaid,
      remainingBalance,
      paidInstallmentsCount,
      remainingInstallmentsCount,
      estimatedPayoffDate,
      isFullyPaid: false,
      progressPercent,
    };
  } else {
    // Mensual frequency
    const totalMonths = debt.startYear * 12 + debt.startMonth + debt.installmentsCount - 1;
    const endMonth = totalMonths % 12;
    const endYear = Math.floor(totalMonths / 12);
    const monthName = MONTH_NAMES_ES[endMonth];
    
    let suffix = '';
    if (debt.monthlyDistribution === 'only_q1') suffix = ' (Q1)';
    if (debt.monthlyDistribution === 'only_q2') suffix = ' (Q2)';
    
    const estimatedPayoffDate = `${monthName} de ${endYear}${suffix}`;

    return {
      totalPaid,
      remainingBalance,
      paidInstallmentsCount,
      remainingInstallmentsCount,
      estimatedPayoffDate,
      isFullyPaid: false,
      progressPercent,
    };
  }
}

// Calculate savings contribution due for a specific period
export function getSavingsDueForPeriod(savings: SavingsProgram, period: PeriodSelection): number {
  if (savings.isArchived) return 0;

  if (period.periodType === 'mes') {
    if (savings.frequency === 'mensual') {
      return savings.periodicAmount;
    } else {
      // Quincenal: monthly is twice the periodic
      return savings.periodicAmount * 2;
    }
  }

  // Quincenal view
  if (savings.frequency === 'quincenal') {
    return savings.periodicAmount;
  }

  // Mensual frequency viewed in a quincena
  const { q1, q2 } = getSplitAmounts(
    savings.periodicAmount,
    savings.monthlyDistribution || 'both_equal',
    savings.customQ1Amount,
    savings.customQ2Amount
  );

  return period.quincena === 1 ? q1 : q2;
}
