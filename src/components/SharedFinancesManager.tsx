import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  CreditCard,
  History,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  DollarSign,
  AlertCircle,
  Tag,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  Copy,
  Check,
  PiggyBank,
  ArrowUpRight,
  ShieldCheck,
  Settings,
  Layers,
  ArrowRight,
  Search,
  Filter,
  Percent,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  FamilyGroup,
  SharedFamilyDebt,
  SharedFamilyDebtAbono,
  SharedFamilySavings,
  SharedFamilySavingsDeposit,
  UserAccount,
} from '../types';
import { formatCurrency, MONTH_NAMES_ES } from '../utils/formatters';
import { AddSharedDebtModal } from './AddSharedDebtModal';
import { AddSharedSavingModal } from './AddSharedSavingModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface SharedFinancesManagerProps {
  currentUser: UserAccount;
  familyGroup: FamilyGroup | null;
  userFamilyGroups: FamilyGroup[];
  onSelectActiveGroup: (groupId: string) => void;
  sharedDebts: SharedFamilyDebt[];
  sharedSavings: SharedFamilySavings[];
  currencyCode: string;
  currencySymbol: string;
  suggestedTags: string[];
  onAddSharedDebt: (
    debt: Omit<SharedFamilyDebt, 'id' | 'createdAt' | 'abonos'>,
    existingId?: string
  ) => void;
  onDeleteSharedDebt: (debtId: string) => void;
  onAddAbono: (debtId: string, abono: Omit<SharedFamilyDebtAbono, 'id' | 'paidAt'>) => void;
  onDeleteAbono: (debtId: string, abonoId: string) => void;
  onAddSharedSaving: (
    saving: Omit<SharedFamilySavings, 'id' | 'createdAt' | 'deposits'>,
    existingId?: string
  ) => void;
  onDeleteSharedSaving: (savingId: string) => void;
  onAddSharedSavingDeposit: (
    savingId: string,
    deposit: Omit<SharedFamilySavingsDeposit, 'id' | 'depositedAt'>
  ) => void;
  onDeleteSharedSavingDeposit: (savingsId: string, depositId: string) => void;
  onGoToFamilyConfig: () => void;
}

type FilterScope = 'all' | 'mine' | 'only_personal' | 'shared_only' | 'pending' | 'completed';

export const SharedFinancesManager: React.FC<SharedFinancesManagerProps> = ({
  currentUser,
  familyGroup,
  userFamilyGroups,
  onSelectActiveGroup,
  sharedDebts,
  sharedSavings,
  currencyCode,
  currencySymbol,
  suggestedTags,
  onAddSharedDebt,
  onDeleteSharedDebt,
  onAddAbono,
  onDeleteAbono,
  onAddSharedSaving,
  onDeleteSharedSaving,
  onAddSharedSavingDeposit,
  onDeleteSharedSavingDeposit,
  onGoToFamilyConfig,
}) => {
  // Main sub-tabs: Deudas Compartidas vs Ahorro Compartido
  const [activeTab, setActiveTab] = useState<'debts' | 'savings'>('debts');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<FilterScope>('all');

  // Modals for creating / editing
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<SharedFamilyDebt | null>(null);

  const [isAddSavingModalOpen, setIsAddSavingModalOpen] = useState(false);
  const [savingToEdit, setSavingToEdit] = useState<SharedFamilySavings | null>(null);

  // Quick Abono / Deposit Modals
  const [selectedDebtForAbono, setSelectedDebtForAbono] = useState<SharedFamilyDebt | null>(null);
  const [selectedSavingForDeposit, setSelectedSavingForDeposit] = useState<SharedFamilySavings | null>(null);

  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [expandedSavingId, setExpandedSavingId] = useState<string | null>(null);
  const [activeParticipantHistory, setActiveParticipantHistory] = useState<Record<string, string | null>>({});
  const [copiedCode, setCopiedCode] = useState(false);

  // Abono Form states
  const [abonoAmount, setAbonoAmount] = useState<number | ''>('');
  const [abonoDate, setAbonoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [abonoUserId, setAbonoUserId] = useState(currentUser.id);
  const [abonoNotes, setAbonoNotes] = useState('');

  // Savings Deposit Form states
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  const [depositDate, setDepositDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [depositUserId, setDepositUserId] = useState(currentUser.id);
  const [depositNotes, setDepositNotes] = useState('');

  // Delete modal states
  const [deletingDebt, setDeletingDebt] = useState<SharedFamilyDebt | null>(null);
  const [deletingAbono, setDeletingAbono] = useState<{ debtId: string; abonoId: string; amount: number; userName: string } | null>(null);
  const [deletingSaving, setDeletingSaving] = useState<SharedFamilySavings | null>(null);
  const [deletingDeposit, setDeletingDeposit] = useState<{ savingId: string; depositId: string; amount: number; userName: string } | null>(null);

  const handleCopyGroupCode = () => {
    if (familyGroup?.code) {
      navigator.clipboard.writeText(familyGroup.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleRegisterAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForAbono) return;
    if (typeof abonoAmount !== 'number' || abonoAmount <= 0) return;

    const member = familyGroup?.members.find((m) => m.userId === abonoUserId) || {
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
    };

    onAddAbono(selectedDebtForAbono.id, {
      debtId: selectedDebtForAbono.id,
      userId: member.userId,
      userName: member.name,
      userEmail: member.email,
      amount: abonoAmount,
      date: abonoDate,
      notes: abonoNotes.trim() || undefined,
    });

    setSelectedDebtForAbono(null);
    setAbonoAmount('');
    setAbonoNotes('');
  };

  const handleRegisterDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSavingForDeposit) return;
    if (typeof depositAmount !== 'number' || depositAmount <= 0) return;

    const member = familyGroup?.members.find((m) => m.userId === depositUserId) || {
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
    };

    onAddSharedSavingDeposit(selectedSavingForDeposit.id, {
      savingsId: selectedSavingForDeposit.id,
      userId: member.userId,
      userName: member.name,
      userEmail: member.email,
      amount: depositAmount,
      date: depositDate,
      notes: depositNotes.trim() || undefined,
    });

    setSelectedSavingForDeposit(null);
    setDepositAmount('');
    setDepositNotes('');
  };

  // Open Quick Abono modal pre-selected with a participant
  const handleOpenQuickAbono = (debt: SharedFamilyDebt, targetUserId?: string) => {
    setSelectedDebtForAbono(debt);
    const chosenUserId = targetUserId || currentUser.id;
    setAbonoUserId(chosenUserId);

    // Calculate suggested installment for this participant
    const part = debt.participants?.find((p) => p.userId === chosenUserId);
    if (part) {
      const perPartInstallment = Math.round(part.assignedAmount / (debt.installmentsCount || 1));
      setAbonoAmount(perPartInstallment);
    } else {
      setAbonoAmount(debt.installmentAmount || Math.round(debt.totalOriginalAmount / (debt.installmentsCount || 1)));
    }
    setAbonoDate(new Date().toISOString().slice(0, 10));
    setAbonoNotes('');
  };

  // Open Quick Deposit modal pre-selected with a participant
  const handleOpenQuickDeposit = (saving: SharedFamilySavings, targetUserId?: string) => {
    setSelectedSavingForDeposit(saving);
    const chosenUserId = targetUserId || currentUser.id;
    setDepositUserId(chosenUserId);

    const part = saving.participants?.find((p) => p.userId === chosenUserId);
    if (part && saving.periodicTargetAmount) {
      const partPeriodic = Math.round((saving.periodicTargetAmount * (part.assignedPercentage || 50)) / 100);
      setDepositAmount(partPeriodic);
    } else if (saving.periodicTargetAmount) {
      setDepositAmount(saving.periodicTargetAmount);
    } else {
      setDepositAmount('');
    }
    setDepositDate(new Date().toISOString().slice(0, 10));
    setDepositNotes('');
  };

  // ----------------------------------------------------
  // METRICS & CALCULATIONS
  // ----------------------------------------------------

  // Debts Overall Metrics
  const totalDebtsOriginal = sharedDebts.reduce((sum, d) => sum + d.totalOriginalAmount, 0);
  const totalDebtsPaid = sharedDebts.reduce((sum, d) => {
    return sum + (d.abonos || []).reduce((aSum, a) => aSum + a.amount, 0);
  }, 0);
  const totalDebtsPending = Math.max(0, totalDebtsOriginal - totalDebtsPaid);
  const globalDebtProgress = totalDebtsOriginal > 0 ? (totalDebtsPaid / totalDebtsOriginal) * 100 : 0;

  // Debts Metrics for CURRENT USER
  const myAssignedDebts = sharedDebts.filter((d) => {
    if (!d.participants || d.participants.length === 0) return true;
    return d.participants.some((p) => p.userId === currentUser.id);
  });

  const myTotalDebtAssigned = myAssignedDebts.reduce((sum, d) => {
    const part = d.participants?.find((p) => p.userId === currentUser.id);
    return sum + (part ? part.assignedAmount : d.totalOriginalAmount);
  }, 0);

  const myTotalDebtPaid = myAssignedDebts.reduce((sum, d) => {
    const myAbonos = (d.abonos || []).filter((a) => a.userId === currentUser.id);
    return sum + myAbonos.reduce((aSum, a) => aSum + a.amount, 0);
  }, 0);

  const myTotalDebtPending = Math.max(0, myTotalDebtAssigned - myTotalDebtPaid);

  // Savings Metrics
  const totalSavingsTarget = sharedSavings.reduce((sum, s) => sum + s.targetAmount, 0);
  const totalSavingsAccumulated = sharedSavings.reduce((sum, s) => {
    return sum + (s.deposits || []).reduce((dSum, d) => dSum + d.amount, 0);
  }, 0);
  const globalSavingsProgress = totalSavingsTarget > 0 ? (totalSavingsAccumulated / totalSavingsTarget) * 100 : 0;

  // Filtered Debts List
  const filteredDebts = useMemo(() => {
    return sharedDebts.filter((d) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchTag = (d.tag || '').toLowerCase().includes(q);
        const matchPayer = (d.payerUserName || '').toLowerCase().includes(q);
        const matchNotes = (d.notes || '').toLowerCase().includes(q);
        const matchParticipant = (d.participants || []).some((p) => p.userName.toLowerCase().includes(q));
        if (!matchTitle && !matchTag && !matchPayer && !matchNotes && !matchParticipant) return false;
      }

      const totalPaid = (d.abonos || []).reduce((s, a) => s + a.amount, 0);
      const isCompleted = totalPaid >= d.totalOriginalAmount;
      const isParticipating = (d.participants || []).some((p) => p.userId === currentUser.id);
      const isPersonal = d.scope === 'personal' || (d.participants && d.participants.length === 1);

      if (filterScope === 'mine' && !isParticipating) return false;
      if (filterScope === 'only_personal' && !isPersonal) return false;
      if (filterScope === 'shared_only' && isPersonal) return false;
      if (filterScope === 'pending' && isCompleted) return false;
      if (filterScope === 'completed' && !isCompleted) return false;

      return true;
    });
  }, [sharedDebts, searchQuery, filterScope, currentUser.id]);

  // Filtered Savings List
  const filteredSavings = useMemo(() => {
    return sharedSavings.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchTag = (s.tag || '').toLowerCase().includes(q);
        const matchNotes = (s.notes || '').toLowerCase().includes(q);
        const matchParticipant = (s.participants || []).some((p) => p.userName.toLowerCase().includes(q));
        if (!matchName && !matchTag && !matchNotes && !matchParticipant) return false;
      }

      const totalSaved = (s.deposits || []).reduce((sum, d) => sum + d.amount, 0);
      const isCompleted = totalSaved >= s.targetAmount;
      const isParticipating = (s.participants || []).some((p) => p.userId === currentUser.id);
      const isPersonal = s.scope === 'personal' || (s.participants && s.participants.length === 1);

      if (filterScope === 'mine' && !isParticipating) return false;
      if (filterScope === 'only_personal' && !isPersonal) return false;
      if (filterScope === 'shared_only' && isPersonal) return false;
      if (filterScope === 'pending' && isCompleted) return false;
      if (filterScope === 'completed' && !isCompleted) return false;

      return true;
    });
  }, [sharedSavings, searchQuery, filterScope, currentUser.id]);

  // If no family group
  if (!familyGroup) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              Módulo de Finanzas Compartidas (Familia / Pareja)
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Aún no estás vinculado a ningún Grupo Familiar. Crea o únete a uno para gestionar deudas divididas con total control de integrantes, porcentajes y metas de ahorro colaborativas.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              id="btn-goto-family-config"
              onClick={onGoToFamilyConfig}
              className="px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-2xl shadow-md transition flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>Ir a Configuración &gt; Cajón de Grupo Familiar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ACTIVE GROUP SWITCHER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Finanzas Familiares Compartidas
              </span>

              {/* Group Selector if user has multiple groups */}
              {userFamilyGroups.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-xl text-xs">
                  <span className="text-slate-500 font-medium">Grupo Activo:</span>
                  <select
                    value={familyGroup.id}
                    onChange={(e) => onSelectActiveGroup(e.target.value)}
                    className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    {userFamilyGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.members.length} miembros)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span>{familyGroup.name}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Sistema avanzado de división y regularización familiar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Invite Code Badge */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Código de Grupo</div>
                <div className="text-sm font-black font-mono tracking-wider text-rose-700">{familyGroup.code}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyGroupCode}
                className="p-1.5 hover:bg-slate-200/80 rounded-lg text-slate-500 transition cursor-pointer"
                title="Copiar código"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              type="button"
              onClick={onGoToFamilyConfig}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Administrar Grupos</span>
            </button>
          </div>
        </div>

        {/* SUB-TABS SELECTOR: DEUDAS COMPARTIDAS VS AHORRO COMPARTIDO */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              id="btn-subtab-shared-debts"
              onClick={() => setActiveTab('debts')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'debts'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Deudas Compartidas ({sharedDebts.length})</span>
            </button>

            <button
              type="button"
              id="btn-subtab-shared-savings"
              onClick={() => setActiveTab('savings')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'savings'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PiggyBank className="w-4 h-4" />
              <span>Ahorro Compartido ({sharedSavings.length})</span>
            </button>
          </div>

          {activeTab === 'debts' ? (
            <button
              type="button"
              id="btn-open-add-shared-debt"
              onClick={() => {
                setDebtToEdit(null);
                setIsAddDebtModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar Deuda Compartida / Dividida</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-open-add-shared-saving"
              onClick={() => {
                setSavingToEdit(null);
                setIsAddSavingModalOpen(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Meta de Ahorro Conjunto</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SUMMARY METRICS KPIS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeTab === 'debts' ? (
          <>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deudas Hogar</div>
              <div className="text-xl font-black text-slate-900 mt-1">
                {formatCurrency(totalDebtsOriginal, currencyCode, currencySymbol)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{sharedDebts.length} compromisos registrados</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Abonado Global</div>
              <div className="text-xl font-black text-emerald-600 mt-1">
                {formatCurrency(totalDebtsPaid, currencyCode, currencySymbol)}
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, globalDebtProgress)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Saldo Pendiente Hogar</div>
              <div className="text-xl font-black text-rose-600 mt-1">
                {formatCurrency(totalDebtsPending, currencyCode, currencySymbol)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{globalDebtProgress.toFixed(1)}% liquidado</div>
            </div>

            <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl border border-rose-200 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center justify-between">
                <span>Mi Saldo Pendiente (Tú)</span>
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-rose-700 mt-1">
                {formatCurrency(myTotalDebtPending, currencyCode, currencySymbol)}
              </div>
              <div className="text-[11px] text-rose-600 font-medium mt-1">
                Has aportado {formatCurrency(myTotalDebtPaid, currencyCode, currencySymbol)} de tu cuota asignada
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meta Total del Hogar</div>
              <div className="text-xl font-black text-slate-900 mt-1">
                {formatCurrency(totalSavingsTarget, currencyCode, currencySymbol)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{sharedSavings.length} metas activas</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Ahorro Acumulado</div>
              <div className="text-xl font-black text-teal-600 mt-1">
                {formatCurrency(totalSavingsAccumulated, currencyCode, currencySymbol)}
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, globalSavingsProgress)}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Falta por Ahorrar</div>
              <div className="text-xl font-black text-indigo-600 mt-1">
                {formatCurrency(Math.max(0, totalSavingsTarget - totalSavingsAccumulated), currencyCode, currencySymbol)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{globalSavingsProgress.toFixed(1)}% de la meta global</div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl border border-teal-200 p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-black uppercase tracking-wider text-teal-800 flex items-center justify-between">
                <span>Progreso Conjunto</span>
                <PiggyBank className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl font-black text-teal-700 mt-1">
                {globalSavingsProgress.toFixed(1)}%
              </div>
              <div className="text-[11px] text-teal-700 font-medium mt-1">
                {familyGroup.members.length} integrantes colaborando
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. TOOLBAR: SEARCH & FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'debts'
                ? 'Buscar por concepto, integrante, pagador, etiqueta...'
                : 'Buscar metas por nombre, integrante, etiqueta...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold text-slate-600">
          <span className="text-[11px] text-slate-400 uppercase font-bold shrink-0 flex items-center gap-1 pl-1">
            <Filter className="w-3 h-3" />
          </span>

          {[
            { id: 'all', label: 'Todas' },
            { id: 'mine', label: 'Donde Participo' },
            { id: 'shared_only', label: 'Divididas' },
            { id: 'only_personal', label: 'Individuales' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'completed', label: 'Liquidadas' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterScope(f.id as FilterScope)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                filterScope === f.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT: DEUDAS COMPARTIDAS */}
      {/* ========================================================================= */}
      {activeTab === 'debts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {filteredDebts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No se encontraron deudas</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || filterScope !== 'all'
                    ? 'No hay registros que coincidan con los filtros aplicados.'
                    : 'Registra compras del hogar, créditos conjuntos o gastos compartidos para dividir entre los miembros.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDebtToEdit(null);
                  setIsAddDebtModalOpen(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                + Registrar Nueva Deuda Dividida
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDebts.map((debt) => {
                const isExpanded = expandedDebtId === debt.id;
                const totalPaid = (debt.abonos || []).reduce((sum, a) => sum + a.amount, 0);
                const remaining = Math.max(0, debt.totalOriginalAmount - totalPaid);
                const progressPct = debt.totalOriginalAmount > 0 ? (totalPaid / debt.totalOriginalAmount) * 100 : 0;
                const isLiquidated = remaining <= 0;

                // Breakdown by member
                const contributionsByMember: Record<string, { name: string; email: string; amount: number }> = {};
                (debt.abonos || []).forEach((a) => {
                  if (!contributionsByMember[a.userId]) {
                    contributionsByMember[a.userId] = { name: a.userName, email: a.userEmail, amount: 0 };
                  }
                  contributionsByMember[a.userId].amount += a.amount;
                });

                // Participants list fallback
                const participants = debt.participants && debt.participants.length > 0
                  ? debt.participants
                  : [
                      {
                        userId: debt.createdByUserId,
                        userName: debt.createdByUserName,
                        assignedAmount: debt.totalOriginalAmount,
                        assignedPercentage: 100,
                      },
                    ];

                const isPayerMe = debt.payerUserId === currentUser.id;

                return (
                  <div
                    key={debt.id}
                    className={`bg-white rounded-3xl border transition shadow-xs overflow-hidden ${
                      isLiquidated
                        ? 'border-emerald-200/80 bg-emerald-50/20'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-5 sm:p-6 space-y-4">
                      {/* Top Bar: Badges, Title and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {debt.tag || 'Hogar'}
                            </span>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {debt.frequency === 'quincenal' ? 'Cuota Quincenal' : 'Cuota Mensual'}
                            </span>

                            {debt.scope === 'personal' || participants.length === 1 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {participants[0]?.userName || 'Individual'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Dividida ({participants.length} personas)
                              </span>
                            )}

                            {debt.payerUserName && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                                  isPayerMe
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                💳 Pagó: {debt.payerUserName} {isPayerMe ? '(Tú)' : ''}
                              </span>
                            )}

                            {isLiquidated && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                ¡100% Liquidada!
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg sm:text-xl font-black text-slate-900">{debt.title}</h3>

                          <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>
                              {debt.installmentsCount} cuotas de ~{formatCurrency(debt.installmentAmount, currencyCode, currencySymbol)}
                            </span>
                            <span>•</span>
                            <span>
                              Inicia: {MONTH_NAMES_ES[debt.startMonth ?? 0]?.slice(0, 3)} {debt.startYear} (Q{debt.startQuincena || 1})
                            </span>
                            {debt.notes && (
                              <>
                                <span>•</span>
                                <span className="italic text-slate-400 truncate max-w-xs">{debt.notes}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          {!isLiquidated && (
                            <button
                              type="button"
                              onClick={() => handleOpenQuickAbono(debt)}
                              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Registrar Abono</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setDebtToEdit(debt);
                              setIsAddDebtModalOpen(true);
                            }}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                            title="Editar deuda y participantes"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                            title={isExpanded ? 'Contraer detalles' : 'Ver historial de abonos'}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Overall Balances */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Abonado: </span>
                            <span className="font-black text-emerald-600">
                              {formatCurrency(totalPaid, currencyCode, currencySymbol)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Saldo Pendiente: </span>
                            <span className="font-black text-rose-600">
                              {formatCurrency(remaining, currencyCode, currencySymbol)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[10px]">Total Deuda: </span>
                            <span className="font-black text-slate-800">
                              {formatCurrency(debt.totalOriginalAmount, currencyCode, currencySymbol)}
                            </span>
                          </div>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLiquidated ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                      </div>

                      {/* DETAILED PARTICIPANTS BREAKDOWN CARDS */}
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                          <span>Distribución por Integrante & Cumplimiento</span>
                          <span>
                            {debt.splitMethod === 'percentage'
                              ? 'División por Porcentajes (%)'
                              : debt.splitMethod === 'custom_amount'
                              ? 'División por Montos Fijos ($)'
                              : 'División Equitativa (Partes Iguales)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {participants.map((p) => {
                            const memberPaid = contributionsByMember[p.userId]?.amount || 0;
                            const memberPending = Math.max(0, p.assignedAmount - memberPaid);
                            const memberProgress = p.assignedAmount > 0 ? (memberPaid / p.assignedAmount) * 100 : 0;
                            const isMemberDone = memberPending <= 0;
                            const isMe = p.userId === currentUser.id;
                            const perPeriodInstallment = Math.round(p.assignedAmount / (debt.installmentsCount || 1));

                            return (
                              <div
                                key={p.userId}
                                className={`p-3 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                                  isMemberDone
                                    ? 'bg-emerald-50/40 border-emerald-200'
                                    : isMe
                                    ? 'bg-rose-50/30 border-rose-200 ring-1 ring-rose-200/60'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                          isMemberDone
                                            ? 'bg-emerald-600 text-white'
                                            : isMe
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {p.userName.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                        <span>{p.userName}</span>
                                        {isMe && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700">
                                            Tú
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <span className="text-[11px] font-bold text-slate-500">
                                      {p.assignedPercentage !== undefined ? `${p.assignedPercentage}%` : ''}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-600 flex items-center justify-between pt-0.5">
                                    <span>Cuota total asignada:</span>
                                    <span className="font-black text-slate-800">
                                      {formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}
                                    </span>
                                  </div>

                                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                    <span>Abonado:</span>
                                    <span className="font-bold text-emerald-600">
                                      {formatCurrency(memberPaid, currencyCode, currencySymbol)}
                                    </span>
                                  </div>

                                  {!isMemberDone && (
                                    <div className="text-[11px] text-rose-600 flex items-center justify-between font-bold">
                                      <span>Pendiente:</span>
                                      <span>{formatCurrency(memberPending, currencyCode, currencySymbol)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Progress Bar & Quick Abono */}
                                <div className="space-y-2 pt-1 border-t border-slate-100">
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${isMemberDone ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                      style={{ width: `${Math.min(100, memberProgress)}%` }}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400 font-medium">
                                      ~{formatCurrency(perPeriodInstallment, currencyCode, currencySymbol)} /{debt.frequency === 'quincenal' ? 'qna' : 'mes'}
                                    </span>

                                    {!isMemberDone && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenQuickAbono(debt, p.userId)}
                                        className="text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                                      >
                                        + Abonar a {p.userName.split(' ')[0]}
                                      </button>
                                    )}
                                    {isMemberDone && (
                                      <span className="font-black text-emerald-600 flex items-center gap-0.5">
                                        <Check className="w-3 h-3" /> ¡Al día!
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* EXPANDED SECTION: ABONOS HISTORY */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <History className="w-4 h-4 text-slate-400" />
                              <span>Historial de Abonos ({debt.abonos?.length || 0})</span>
                            </h4>

                            <button
                              type="button"
                              onClick={() => setDeletingDebt(debt)}
                              className="text-xs text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar Deuda</span>
                            </button>
                          </div>

                          {(!debt.abonos || debt.abonos.length === 0) ? (
                            <p className="text-xs text-slate-400 italic py-2">No se han registrado abonos todavía.</p>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                              {debt.abonos.map((abono) => (
                                <div key={abono.id} className="p-3 flex items-center justify-between text-xs gap-3">
                                  <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                      <span>{abono.userName}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">({abono.date})</span>
                                    </div>
                                    {abono.notes && <div className="text-[11px] text-slate-500">{abono.notes}</div>}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-emerald-600">
                                      +{formatCurrency(abono.amount, currencyCode, currencySymbol)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeletingAbono({
                                          debtId: debt.id,
                                          abonoId: abono.id,
                                          amount: abono.amount,
                                          userName: abono.userName,
                                        })
                                      }
                                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                      title="Eliminar este abono"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB CONTENT: AHORRO COMPARTIDO */}
      {/* ========================================================================= */}
      {activeTab === 'savings' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {filteredSavings.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-500 flex items-center justify-center mx-auto">
                <PiggyBank className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">No se encontraron metas de ahorro</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || filterScope !== 'all'
                    ? 'No hay metas que coincidan con los filtros aplicados.'
                    : 'Crea metas colaborativas (vacaciones, fondo de emergencia, compras grandes) y define cómo aporta cada integrante.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSavingToEdit(null);
                  setIsAddSavingModalOpen(true);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                + Crear Primera Meta de Ahorro Familiar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSavings.map((saving) => {
                const isExpanded = expandedSavingId === saving.id;
                const totalAccumulated = (saving.deposits || []).reduce((sum, d) => sum + d.amount, 0);
                const remaining = Math.max(0, saving.targetAmount - totalAccumulated);
                const progressPct = saving.targetAmount > 0 ? (totalAccumulated / saving.targetAmount) * 100 : 0;
                const isGoalReached = remaining <= 0;

                // Breakdown by member
                const depositsByMember: Record<string, { name: string; email: string; amount: number }> = {};
                (saving.deposits || []).forEach((d) => {
                  if (!depositsByMember[d.userId]) {
                    depositsByMember[d.userId] = { name: d.userName, email: d.userEmail, amount: 0 };
                  }
                  depositsByMember[d.userId].amount += d.amount;
                });

                const participants = saving.participants && saving.participants.length > 0
                  ? saving.participants
                  : [
                      {
                        userId: saving.createdByUserId,
                        userName: saving.createdByUserName,
                        assignedAmount: saving.targetAmount,
                        assignedPercentage: 100,
                      },
                    ];

                const isNatillera = saving.splitMethod === 'natillera_free' || saving.splitMethod === 'natillera_fixed';

                return (
                  <div
                    key={saving.id}
                    className={`bg-white rounded-3xl border transition shadow-xs overflow-hidden ${
                      isGoalReached && !isNatillera
                        ? 'border-teal-300 bg-teal-50/20'
                        : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-5 sm:p-6 space-y-4">
                      {/* Top bar */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {saving.tag || 'Ocio'}
                            </span>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              {saving.frequency === 'quincenal' ? 'Aporte Quincenal' : 'Aporte Mensual'}
                            </span>

                            {isNatillera ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Natillera (Ahorro Común)
                              </span>
                            ) : saving.scope === 'personal' || participants.length === 1 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {participants[0]?.userName || 'Individual'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Meta Conjunta ({participants.length} personas)
                              </span>
                            )}

                            {isGoalReached && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-500 text-white flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                ¡Meta Cumplida!
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg sm:text-xl font-black text-slate-900">{saving.name}</h3>

                          <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            {saving.periodicTargetAmount && (
                              <span>
                                Sugerido: ~{formatCurrency(saving.periodicTargetAmount, currencyCode, currencySymbol)} /{saving.frequency === 'quincenal' ? 'qna' : 'mes'}
                              </span>
                            )}
                            {saving.notes && (
                              <>
                                <span>•</span>
                                <span className="italic text-slate-400 truncate max-w-xs">{saving.notes}</span>
                              </>
                            )}
                          </p>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickDeposit(saving)}
                            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <PiggyBank className="w-3.5 h-3.5" />
                            <span>Aportar al Fondo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSavingToEdit(saving);
                              setIsAddSavingModalOpen(true);
                            }}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                            title="Editar meta y participantes"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedSavingId(isExpanded ? null : saving.id)}
                            className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                            title={isExpanded ? 'Contraer' : 'Ver depósitos'}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar & Balances */}
                      {isNatillera ? (
                        saving.splitMethod === 'natillera_free' ? (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[10px] block">Ahorro Común Acumulado</span>
                              <span className="text-2xl font-black text-teal-600">
                                {formatCurrency(totalAccumulated, currencyCode, currencySymbol)}
                              </span>
                            </div>
                            <div className="sm:text-right">
                              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-100/80 inline-block">
                                Modalidad: Aporte Libre
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              <div>
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Ahorrado en Común: </span>
                                <span className="font-black text-teal-600">
                                  {formatCurrency(totalAccumulated, currencyCode, currencySymbol)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Falta: </span>
                                <span className="font-black text-indigo-600">
                                  {formatCurrency(remaining, currencyCode, currencySymbol)}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Meta Colectiva: </span>
                                <span className="font-black text-slate-800">
                                  {formatCurrency(saving.targetAmount, currencyCode, currencySymbol)}
                                </span>
                              </div>
                            </div>

                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, progressPct)}%` }}
                              />
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[10px]">Ahorrado: </span>
                              <span className="font-black text-teal-600">
                                {formatCurrency(totalAccumulated, currencyCode, currencySymbol)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[10px]">Falta: </span>
                              <span className="font-black text-indigo-600">
                                {formatCurrency(remaining, currencyCode, currencySymbol)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase text-[10px]">Meta Total: </span>
                              <span className="font-black text-slate-800">
                                {formatCurrency(saving.targetAmount, currencyCode, currencySymbol)}
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, progressPct)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* DETAILED PARTICIPANTS GOAL BREAKDOWN */}
                      {isNatillera ? (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Ahorro por Participante</span>
                            <span className="text-[10px] text-slate-400 font-medium italic hidden sm:inline">Haz clic en un integrante para ver su historial</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            {participants.map((p) => {
                              const memberDeposited = depositsByMember[p.userId]?.amount || 0;
                              const isMe = p.userId === currentUser.id;
                              const isHistoryOpen = activeParticipantHistory[saving.id] === p.userId;
                              
                              let memberProgressPct = 0;
                              if (saving.splitMethod === 'natillera_fixed') {
                                memberProgressPct = p.assignedAmount > 0 ? (memberDeposited / p.assignedAmount) * 100 : 0;
                              }

                              const memberDepositsList = (saving.deposits || []).filter((d) => d.userId === p.userId);

                              return (
                                <div
                                  key={p.userId}
                                  className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                                    isHistoryOpen
                                      ? 'border-teal-400 bg-slate-50/20 shadow-xs'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  {/* Clicable row */}
                                  <div
                                    onClick={() => {
                                      setActiveParticipantHistory((prev) => ({
                                        ...prev,
                                        [saving.id]: prev[saving.id] === p.userId ? null : p.userId,
                                      }));
                                    }}
                                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer select-none"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                          isMe ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}
                                      >
                                        {p.userName.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                                          <span>{p.userName}</span>
                                          {isMe && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-teal-100 text-teal-800">
                                              Tú
                                            </span>
                                          )}
                                        </div>
                                        {saving.splitMethod === 'natillera_fixed' && (
                                          <div className="text-[10px] text-slate-400 font-medium">
                                            Meta: {formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-4">
                                      <div className="text-left sm:text-right">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-0.5">Ahorrado:</span>
                                        <span className="font-black text-teal-600 text-sm">
                                          {formatCurrency(memberDeposited, currencyCode, currencySymbol)}
                                        </span>
                                      </div>

                                      {saving.splitMethod === 'natillera_fixed' && (
                                        <div className="w-20 shrink-0 hidden md:block">
                                          <div className="flex justify-between text-[9px] text-slate-500 font-bold mb-0.5">
                                            <span>{memberProgressPct.toFixed(0)}%</span>
                                          </div>
                                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className="bg-teal-500 h-full rounded-full"
                                              style={{ width: `${Math.min(100, memberProgressPct)}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}

                                      <div className="flex items-center gap-2 self-center shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenQuickDeposit(saving, p.userId);
                                          }}
                                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-[10px] font-bold rounded-lg border border-teal-200 transition cursor-pointer"
                                        >
                                          + Aportar
                                        </button>
                                        <div className="text-slate-400">
                                          {isHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Inner deposits history list */}
                                  {isHistoryOpen && (
                                    <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2 animate-in slide-in-from-top-2 duration-150">
                                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        <span>Historial de Aportes ({memberDepositsList.length})</span>
                                      </div>

                                      {memberDepositsList.length === 0 ? (
                                        <p className="text-[11px] text-slate-400 italic py-1">No se han registrado aportes.</p>
                                      ) : (
                                        <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-xl overflow-hidden bg-white">
                                          {memberDepositsList.map((dep) => (
                                            <div key={dep.id} className="p-2.5 flex items-center justify-between text-[11px] gap-3">
                                              <div>
                                                <div className="font-bold text-slate-700 flex items-center gap-1">
                                                  <span>{dep.userName}</span>
                                                  <span className="text-[9px] text-slate-400 font-normal">({dep.date})</span>
                                                </div>
                                                {dep.notes && <div className="text-[10px] text-slate-500">{dep.notes}</div>}
                                              </div>

                                              <div className="flex items-center gap-2">
                                                <span className="font-black text-teal-600">
                                                  +{formatCurrency(dep.amount, currencyCode, currencySymbol)}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setDeletingDeposit({
                                                      savingId: saving.id,
                                                      depositId: dep.id,
                                                      amount: dep.amount,
                                                      userName: dep.userName,
                                                    })
                                                  }
                                                  className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                                  title="Eliminar este depósito"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Aportes por Integrante</span>
                            <span>Meta individual & Progreso</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                            {participants.map((p) => {
                              const memberDeposited = depositsByMember[p.userId]?.amount || 0;
                              const memberProgress = p.assignedAmount > 0 ? (memberDeposited / p.assignedAmount) * 100 : 0;
                              const isMe = p.userId === currentUser.id;

                              return (
                                <div
                                  key={p.userId}
                                  className={`p-3 rounded-2xl border transition flex flex-col justify-between gap-2.5 ${
                                    isMe
                                      ? 'bg-teal-50/30 border-teal-200 ring-1 ring-teal-200/60'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                            isMe ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {p.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="font-bold text-xs text-slate-900 flex items-center gap-1">
                                          <span>{p.userName}</span>
                                          {isMe && (
                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-teal-100 text-teal-800">
                                              Tú
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <span className="text-[11px] font-bold text-slate-500">
                                        {p.assignedPercentage !== undefined ? `${p.assignedPercentage}%` : ''}
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-0.5">
                                      <span>Meta sugerida:</span>
                                      <span className="font-black text-slate-800">
                                        {formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}
                                      </span>
                                    </div>

                                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                                      <span>Depositado:</span>
                                      <span className="font-black text-teal-600">
                                        {formatCurrency(memberDeposited, currencyCode, currencySymbol)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Progress Bar & Quick Deposit */}
                                  <div className="space-y-2 pt-1 border-t border-slate-100">
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className="bg-teal-500 h-full rounded-full transition-all"
                                        style={{ width: `${Math.min(100, memberProgress)}%` }}
                                      />
                                    </div>

                                    <div className="flex items-center justify-between text-[10px]">
                                      <span className="text-slate-400 font-medium">
                                        {memberProgress.toFixed(0)}% completado
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => handleOpenQuickDeposit(saving, p.userId)}
                                        className="text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer"
                                      >
                                        + Aportar por {p.userName.split(' ')[0]}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* EXPANDED SECTION: DEPOSITS HISTORY */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                              <History className="w-4 h-4 text-slate-400" />
                              <span>Historial Consolidado ({saving.deposits?.length || 0})</span>
                            </h4>

                            <button
                              type="button"
                              onClick={() => setDeletingSaving(saving)}
                              className="text-xs text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar Ahorro</span>
                            </button>
                          </div>

                          {(!saving.deposits || saving.deposits.length === 0) ? (
                            <p className="text-xs text-slate-400 italic py-2">No se han registrado aportes todavía.</p>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
                              {saving.deposits.map((dep) => (
                                <div key={dep.id} className="p-3 flex items-center justify-between text-xs gap-3">
                                  <div>
                                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                      <span>{dep.userName}</span>
                                      <span className="text-[10px] text-slate-400 font-normal">({dep.date})</span>
                                    </div>
                                    {dep.notes && <div className="text-[11px] text-slate-500">{dep.notes}</div>}
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-teal-600">
                                      +{formatCurrency(dep.amount, currencyCode, currencySymbol)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDeletingDeposit({
                                          savingId: saving.id,
                                          depositId: dep.id,
                                          amount: dep.amount,
                                          userName: dep.userName,
                                        })
                                      }
                                      className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                                      title="Eliminar este depósito"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SHARED DEBT */}
      {/* ========================================================================= */}
      {isAddDebtModalOpen && (
        <AddSharedDebtModal
          isOpen={isAddDebtModalOpen}
          onClose={() => {
            setIsAddDebtModalOpen(false);
            setDebtToEdit(null);
          }}
          onSave={(debtData, existingId) => {
            onAddSharedDebt(debtData, existingId);
          }}
          currentUser={currentUser}
          familyGroup={familyGroup}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          suggestedTags={suggestedTags}
          debtToEdit={debtToEdit}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SHARED SAVINGS */}
      {/* ========================================================================= */}
      {isAddSavingModalOpen && (
        <AddSharedSavingModal
          isOpen={isAddSavingModalOpen}
          onClose={() => {
            setIsAddSavingModalOpen(false);
            setSavingToEdit(null);
          }}
          onSave={(savingData, existingId) => {
            onAddSharedSaving(savingData, existingId);
          }}
          currentUser={currentUser}
          familyGroup={familyGroup}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          suggestedTags={suggestedTags}
          savingToEdit={savingToEdit}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER ABONO TO DEBT */}
      {/* ========================================================================= */}
      {selectedDebtForAbono && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Abono a Deuda</h3>
                <p className="text-xs text-rose-600 font-bold">{selectedDebtForAbono.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDebtForAbono(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterAbono} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">¿Quién realiza el aporte?</label>
                <select
                  value={abonoUserId}
                  onChange={(e) => setAbonoUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {familyGroup.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} {m.userId === currentUser.id ? '(Tú)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Monto del Abono ({currencyCode})
                </label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  placeholder="200000"
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nota / Detalle (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Cuota quincenal regular, abono extra..."
                  value={abonoNotes}
                  onChange={(e) => setAbonoNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDebtForAbono(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Confirmar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER DEPOSIT TO SAVING */}
      {/* ========================================================================= */}
      {selectedSavingForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Aportar a Meta de Ahorro</h3>
                <p className="text-xs text-teal-600 font-bold">{selectedSavingForDeposit.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSavingForDeposit(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">¿Quién aporta?</label>
                <select
                  value={depositUserId}
                  onChange={(e) => setDepositUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {familyGroup.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} {m.userId === currentUser.id ? '(Tú)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Monto a Depositar ({currencyCode})
                </label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  placeholder="250000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha</label>
                <input
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nota / Detalle (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. Aporte quincenal..."
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSavingForDeposit(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Confirmar Depósito
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SHARED DEBT */}
      <ConfirmDeleteModal
        isOpen={!!deletingDebt}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. La deuda compartida y todos sus abonos registrados en el grupo familiar serán eliminados permanentemente."
        itemName={deletingDebt ? `${deletingDebt.title} (${formatCurrency(deletingDebt.totalAmount, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingDebt(null)}
        onConfirm={() => {
          if (deletingDebt) {
            onDeleteSharedDebt(deletingDebt.id);
            setDeletingDebt(null);
          }
        }}
      />

      {/* CONFIRM DELETE ABONO */}
      <ConfirmDeleteModal
        isOpen={!!deletingAbono}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. El abono registrado será descontado del historial de la deuda."
        itemName={deletingAbono ? `Abono de ${formatCurrency(deletingAbono.amount, currencyCode, currencySymbol)} por ${deletingAbono.userName}` : undefined}
        onClose={() => setDeletingAbono(null)}
        onConfirm={() => {
          if (deletingAbono) {
            onDeleteAbono(deletingAbono.debtId, deletingAbono.abonoId);
            setDeletingAbono(null);
          }
        }}
      />

      {/* CONFIRM DELETE SHARED SAVING */}
      <ConfirmDeleteModal
        isOpen={!!deletingSaving}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. La meta compartida y todos sus depósitos acumulados serán eliminados permanentemente."
        itemName={deletingSaving ? `${deletingSaving.name} (${formatCurrency(deletingSaving.targetAmount, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingSaving(null)}
        onConfirm={() => {
          if (deletingSaving) {
            onDeleteSharedSaving(deletingSaving.id);
            setDeletingSaving(null);
          }
        }}
      />

      {/* CONFIRM DELETE SAVING DEPOSIT */}
      <ConfirmDeleteModal
        isOpen={!!deletingDeposit}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. El depósito registrado será descontado del ahorro acumulado."
        itemName={deletingDeposit ? `Aporte de ${formatCurrency(deletingDeposit.amount, currencyCode, currencySymbol)} por ${deletingDeposit.userName}` : undefined}
        onClose={() => setDeletingDeposit(null)}
        onConfirm={() => {
          if (deletingDeposit) {
            onDeleteSharedSavingDeposit(deletingDeposit.savingId, deletingDeposit.depositId);
            setDeletingDeposit(null);
          }
        }}
      />
    </div>
  );
};
