export type PeriodType = 'quincena' | 'mes';

export interface PeriodSelection {
  year: number;
  month: number; // 0 - 11
  periodType: PeriodType;
  quincena: 1 | 2; // 1 = days 1-15, 2 = days 16-end of month
}

export type DebtFrequency = 'quincenal' | 'mensual';
export type MonthlyDistribution = 'both_equal' | 'both_custom' | 'only_q1' | 'only_q2';

export interface DebtPaymentRecord {
  id: string;
  periodKey: string; // e.g. "2026-08-Q1" or "2026-08"
  installmentNumber: number;
  amountPaid: number;
  paidAt: string; // ISO date
  notes?: string;
  isExtraPayment?: boolean;
}

export interface DebtItem {
  id: string;
  title: string;
  tag: string;
  totalOriginalAmount: number;
  installmentsCount: number; // total number of installments (cuotas)
  installmentAmount: number; // calculated or specified installment amount
  frequency: DebtFrequency;
  monthlyDistribution?: MonthlyDistribution;
  customQ1Amount?: number; // if monthlyDistribution === 'both_custom'
  customQ2Amount?: number;
  startYear: number;
  startMonth: number; // 0-11
  startQuincena: 1 | 2;
  createdAt: string;
  notes?: string;
  payments: DebtPaymentRecord[];
  isArchived?: boolean;
}

export interface SavingsDepositRecord {
  id: string;
  periodKey: string; // e.g. "2026-08-Q1"
  amount: number;
  depositedAt: string;
  notes?: string;
}

export interface SavingsProgram {
  id: string;
  name: string;
  tag: string;
  targetAmount?: number; // optional goal target
  periodicAmount: number;
  frequency: 'quincenal' | 'mensual';
  monthlyDistribution?: MonthlyDistribution;
  customQ1Amount?: number;
  customQ2Amount?: number;
  startYear: number;
  startMonth: number; // 0-11
  startQuincena: 1 | 2;
  createdAt: string;
  notes?: string;
  deposits: SavingsDepositRecord[];
  isArchived?: boolean;
}

export type TransactionType = 'income' | 'expense';

export interface SporadicTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  tag: string;
  periodKey: string; // e.g. "2026-08-Q1" or "2026-08-Q2"
  date: string; // YYYY-MM-DD
  isScheduled: boolean;
  notes?: string;
  isCompleted?: boolean;
  paymentSource?: string; // pocket | cushion
}

export interface AdditionalFixedExpense {
  id: string;
  name: string;
  monthlyAmount: number;
  tag: string;
  distribution: MonthlyDistribution;
  customQ1Amount?: number;
  customQ2Amount?: number;
  q1Day?: number;
  q2Day?: number;
}

export interface FreeBalanceAllocation {
  periodKey: string;
  spendableAmount: number; // "Para gastar / ocio / bolsillo"
  keepInAccountAmount: number; // "Dejar en la cuenta bancaria / colchón"
  customAllocations?: { id: string; name: string; amount: number }[];
  notes?: string;
}

export type PendingExpenseScope = 'personal' | 'shared';
export type PendingExpenseStatus = 'pending' | 'regularized';
export type SplitMethod = 'equal' | 'manual';
export type SettlementType = 'instant' | 'debt_installments';

export interface ParticipantPaymentRecord {
  id: string;
  amount: number;
  paidAt: string;
  notes?: string;
}

export interface ParticipantShare {
  id: string;
  name: string;
  isOwner: boolean; // true for the user / account holder
  assignedAmount: number;
  installmentsCount?: number;
  installmentAmount?: number;
  paidAmount: number;
  isSettled?: boolean;
  payments: ParticipantPaymentRecord[];
}

export interface PendingExpense {
  id: string;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  scope: PendingExpenseScope;
  status: PendingExpenseStatus;
  notes?: string;
  createdAt: string;
  tag?: string;

  // Regularization & split details
  destination?: 'sporadic_expense' | 'debt';
  splitMethod?: SplitMethod;
  settlementType?: SettlementType;
  installmentsCount?: number;
  frequency?: DebtFrequency;
  
  participants?: ParticipantShare[];
  linkedDebtId?: string;
  linkedTransactionId?: string;
}

export interface AppConfig {
  monthlyFixedIncome: number;
  incomeDistribution: MonthlyDistribution;
  customIncomeQ1?: number;
  customIncomeQ2?: number;
  incomeQ1Day?: number;
  incomeQ2Day?: number;

  monthlyTransportExpense: number;
  transportDistribution: MonthlyDistribution;
  customTransportQ1?: number;
  customTransportQ2?: number;

  additionalFixedExpenses: AdditionalFixedExpense[];

  suggestedExpenseTags?: string[];

  currencyCode: string; // COP, USD, MXN, EUR, etc.
  currencySymbol: string; // $, €, etc.

  // Colchón de Seguridad
  initialCushionBalance?: number;
  cushionStartYear?: number;
  cushionStartMonth?: number;
  cushionStartQuincena?: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  pin: string; // 6-digit numeric string
  activeFamilyGroupId?: string | null;
  familyGroupId?: string | null; // legacy compatibility
  createdAt: string;
  role?: string;
  requiresPinReset?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  requiresPinReset: boolean;
}

export interface AdminFamilyGroup {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  createdByUserId: string;
  creatorName: string;
  creatorEmail: string;
  memberCount: number;
}

export interface FamilyGroupMember {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  isCreator: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  code: string; // 7-digit alphanumeric code e.g. "A7X9K2M"
  createdByUserId: string;
  createdAt: string;
  members: FamilyGroupMember[];
}

export type SharedFinancesScope = 'personal' | 'shared';
export type SharedSplitMethod = 'equal' | 'percentage' | 'custom_amount' | 'natillera_free' | 'natillera_fixed';

export interface SharedParticipantShare {
  userId: string;
  userName: string;
  userEmail?: string;
  isPayer?: boolean; // Who paid/assumed upfront
  assignedPercentage?: number; // e.g. 50
  assignedAmount: number;
}

export interface SharedFamilyDebtAbono {
  id: string;
  debtId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paidAt: string; // ISO string
  notes?: string;
}

export interface SharedFamilyDebt {
  id: string;
  familyGroupId: string;
  title: string;
  tag: string;
  totalOriginalAmount: number;
  installmentsCount: number;
  installmentAmount: number;
  frequency: DebtFrequency;
  startYear: number;
  startMonth: number;
  startQuincena: 1 | 2;
  monthlyDistribution?: MonthlyDistribution;
  scope?: SharedFinancesScope; // 'personal' or 'shared'
  payerUserId?: string;
  payerUserName?: string;
  splitMethod?: SharedSplitMethod; // 'equal' | 'percentage' | 'custom_amount'
  participants?: SharedParticipantShare[];
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  notes?: string;
  isArchived?: boolean;
  abonos: SharedFamilyDebtAbono[];
}

export interface SharedFamilySavingsDeposit {
  id: string;
  savingsId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  date: string; // YYYY-MM-DD
  depositedAt: string; // ISO string
  notes?: string;
}

export interface SharedFamilySavings {
  id: string;
  familyGroupId: string;
  name: string;
  tag: string;
  targetAmount: number; // Meta de ahorro
  periodicTargetAmount?: number; // Cuota periódica sugerida
  frequency: 'quincenal' | 'mensual';
  startYear: number;
  startMonth: number;
  startQuincena: 1 | 2;
  monthlyDistribution?: MonthlyDistribution;
  scope?: SharedFinancesScope; // 'personal' or 'shared'
  splitMethod?: SharedSplitMethod; // 'equal' | 'percentage' | 'custom_amount'
  participants?: SharedParticipantShare[];
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  notes?: string;
  isArchived?: boolean;
  deposits: SharedFamilySavingsDeposit[];
}

export interface AppData {
  config: AppConfig;
  debts: DebtItem[];
  savings: SavingsProgram[];
  sporadicTransactions: SporadicTransaction[];
  pendingExpenses?: PendingExpense[];
  balanceAllocations: Record<string, FreeBalanceAllocation>;
  skippedObligations?: Record<string, string[]>; // periodKey -> array of obligation IDs skipped in that period
}
