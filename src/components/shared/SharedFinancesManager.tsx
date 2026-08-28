import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  CreditCard,
  HeartHandshake,
  PiggyBank,
  Settings,
  Layers,
  Search,
  Filter,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import {
  FamilyGroup,
  SharedFamilyDebt,
  SharedFamilySavings,
  UserAccount,
  AppConfig,
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { AddSharedDebtModal } from './AddSharedDebtModal';
import { AddSharedSavingModal } from './AddSharedSavingModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { SharedDebtsTab } from './SharedDebtsTab';
import { SharedSavingsTab } from './SharedSavingsTab';
import { SettleDebtsTab } from './SettleDebtsTab';
import { SharedExpensesSimulatorTab } from './SharedExpensesSimulatorTab';

interface SharedFinancesManagerProps {
  familyGroup: FamilyGroup | null;
  currentUser: UserAccount;
  personalConfig?: AppConfig;
  sharedDebts: SharedFamilyDebt[];
  sharedSavings: SharedFamilySavings[];
  currencyCode: string;
  currencySymbol: string;
  suggestedTags: string[];
  onGoToFamilyConfig: () => void;
  onAddSharedDebt: (debtData: Omit<SharedFamilyDebt, 'id' | 'createdAt' | 'abonos'>, existingId?: string) => void;
  onDeleteSharedDebt: (debtId: string) => void;
  onAddAbono: (debtId: string, abono: any) => void;
  onDeleteAbono: (debtId: string, abonoId: string) => void;
  onAddSharedSaving: (savingData: Omit<SharedFamilySavings, 'id' | 'createdAt' | 'deposits'>, existingId?: string) => void;
  onDeleteSharedSaving: (savingId: string) => void;
  onAddSharedSavingDeposit: (savingsId: string, deposit: any) => void;
  onDeleteSharedSavingDeposit: (savingsId: string, depositId: string) => void;
}

export type FilterScope = 'all' | 'mine' | 'shared_only' | 'only_personal' | 'pending' | 'completed';

export const SharedFinancesManager: React.FC<SharedFinancesManagerProps> = ({
  familyGroup,
  currentUser,
  personalConfig,
  sharedDebts,
  sharedSavings,
  currencyCode,
  currencySymbol,
  suggestedTags,
  onGoToFamilyConfig,
  onAddSharedDebt,
  onDeleteSharedDebt,
  onAddAbono,
  onDeleteAbono,
  onAddSharedSaving,
  onDeleteSharedSaving,
  onAddSharedSavingDeposit,
  onDeleteSharedSavingDeposit,
}) => {
  const [activeTab, setActiveTab] = useState<'debts' | 'savings' | 'settlements' | 'simulator'>('debts');
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScope, setFilterScope] = useState<FilterScope>('all');

  // Modal open states
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<SharedFamilyDebt | null>(null);
  const [isAddSavingModalOpen, setIsAddSavingModalOpen] = useState(false);
  const [savingToEdit, setSavingToEdit] = useState<SharedFamilySavings | null>(null);

  // Quick Abono / Deposit modal states
  const [selectedDebtForAbono, setSelectedDebtForAbono] = useState<{ debt: SharedFamilyDebt; userId: string } | null>(null);
  const [abonoAmount, setAbonoAmount] = useState<number | ''>('');
  const [abonoDate, setAbonoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [abonoUserId, setAbonoUserId] = useState(currentUser.id);
  const [abonoNotes, setAbonoNotes] = useState('');

  const [selectedSavingForDeposit, setSelectedSavingForDeposit] = useState<{ saving: SharedFamilySavings; userId: string } | null>(null);
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
    if (!selectedDebtForAbono || abonoAmount === '' || Number(abonoAmount) <= 0) return;

    onAddAbono(selectedDebtForAbono.debt.id, {
      userId: abonoUserId,
      userName: familyGroup?.members.find((m) => m.userId === abonoUserId)?.user.name || currentUser.name,
      userEmail: familyGroup?.members.find((m) => m.userId === abonoUserId)?.user.email || currentUser.email,
      amount: Number(abonoAmount),
      date: abonoDate,
      notes: abonoNotes.trim() || undefined,
    });

    setSelectedDebtForAbono(null);
  };

  const handleRegisterDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSavingForDeposit || depositAmount === '' || Number(depositAmount) <= 0) return;

    onAddSharedSavingDeposit(selectedSavingForDeposit.saving.id, {
      userId: depositUserId,
      userName: familyGroup?.members.find((m) => m.userId === depositUserId)?.user.name || currentUser.name,
      userEmail: familyGroup?.members.find((m) => m.userId === depositUserId)?.user.email || currentUser.email,
      amount: Number(depositAmount),
      date: depositDate,
      notes: depositNotes.trim() || undefined,
    });

    setSelectedSavingForDeposit(null);
  };

  // KPIs Calculations
  const totalDebtsOriginal = useMemo(() => {
    return sharedDebts.reduce((sum, d) => sum + d.totalOriginalAmount, 0);
  }, [sharedDebts]);

  const totalDebtsPaid = useMemo(() => {
    return sharedDebts.reduce((sum, d) => {
      return sum + (d.abonos || []).reduce((acc, a) => acc + a.amount, 0);
    }, 0);
  }, [sharedDebts]);

  const totalDebtsPending = Math.max(0, totalDebtsOriginal - totalDebtsPaid);
  const globalDebtProgress = totalDebtsOriginal > 0 ? (totalDebtsPaid / totalDebtsOriginal) * 100 : 0;

  const myPendingDebtsTotal = useMemo(() => {
    return sharedDebts.reduce((sum, d) => {
      const myShare = d.participants.find((p) => p.userId === currentUser.id);
      if (!myShare) return sum;
      const myPaid = (d.abonos || []).filter((a) => a.userId === currentUser.id).reduce((acc, a) => acc + a.amount, 0);
      return sum + Math.max(0, myShare.assignedAmount - myPaid);
    }, 0);
  }, [sharedDebts, currentUser.id]);

  const totalSavingsTarget = useMemo(() => {
    return sharedSavings.reduce((sum, s) => sum + s.targetAmount, 0);
  }, [sharedSavings]);

  const totalSavingsAccumulated = useMemo(() => {
    return sharedSavings.reduce((sum, s) => {
      return sum + (s.deposits || []).reduce((acc, d) => acc + d.amount, 0);
    }, 0);
  }, [sharedSavings]);

  const globalSavingsProgress = totalSavingsTarget > 0 ? (totalSavingsAccumulated / totalSavingsTarget) * 100 : 0;

  const filteredSharedDebts = useMemo(() => {
    return sharedDebts.filter((d) => {
      const isCompleted = d.abonos.reduce((sum, a) => sum + a.amount, 0) >= d.totalOriginalAmount;
      const isParticipating = d.participants.some((p) => p.userId === currentUser.id) || d.payerUserId === currentUser.id;
      const isPersonal = d.participants.length === 1 && d.participants[0].userId === d.payerUserId;

      if (filterScope === 'mine' && !isParticipating) return false;
      if (filterScope === 'only_personal' && !isPersonal) return false;
      if (filterScope === 'shared_only' && isPersonal) return false;
      if (filterScope === 'pending' && isCompleted) return false;
      if (filterScope === 'completed' && !isCompleted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          d.tag.toLowerCase().includes(q) ||
          d.payerName.toLowerCase().includes(q) ||
          d.participants.some((p) => p.userName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [sharedDebts, searchQuery, filterScope, currentUser.id]);

  const filteredSharedSavings = useMemo(() => {
    return sharedSavings.filter((s) => {
      const isCompleted = s.deposits.reduce((sum, d) => sum + d.amount, 0) >= s.targetAmount;
      const isParticipating = s.participants.some((p) => p.userId === currentUser.id);
      const isPersonal = s.participants.length === 1 && s.participants[0].userId === s.createdByUserId;

      if (filterScope === 'mine' && !isParticipating) return false;
      if (filterScope === 'only_personal' && !isPersonal) return false;
      if (filterScope === 'shared_only' && isPersonal) return false;
      if (filterScope === 'pending' && isCompleted) return false;
      if (filterScope === 'completed' && !isCompleted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.tag.toLowerCase().includes(q) ||
          s.participants.some((p) => p.userName.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [sharedSavings, searchQuery, filterScope, currentUser.id]);

  if (!familyGroup) {
    return (
      <div className="space-y-6 pb-12">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-4 max-w-lg mx-auto mt-8">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Módulo de Finanzas Familiares / Compartidas</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              No perteneces a ningún grupo familiar actualmente. Ve a los ajustes para crear un grupo familiar o unirte a uno mediante el código de acceso.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToFamilyConfig}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Configurar Familia / Grupo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER PANEL */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight">
                Finanzas Compartidas ({familyGroup.name})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestiona y distribuye deudas comunes, metas de ahorro compartido y simulaciones grupales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyGroupCode}
              className="px-3 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar código del grupo"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copiado!' : 'Código del Grupo'}</span>
            </button>

            <button
              type="button"
              onClick={onGoToFamilyConfig}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Administrar Grupos</span>
            </button>

            {(activeTab === 'debts' || activeTab === 'savings') && (
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'debts') {
                    setDebtToEdit(null);
                    setIsAddDebtModalOpen(true);
                  } else {
                    setSavingToEdit(null);
                    setIsAddSavingModalOpen(true);
                  }
                }}
                className={`px-4 py-2 text-xs font-black text-white rounded-xl shadow-xs transition cursor-pointer ${activeTab === 'debts' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-650 hover:bg-teal-700'
                  }`}
              >
                <Plus className="w-4 h-4 inline mr-1" />
                {activeTab === 'debts' ? 'Registrar Deuda' : 'Nueva Meta'}
              </button>
            )}
          </div>
        </div>

        {/* SUB-TABS SELECTOR */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 p-1 bg-slate-100 rounded-2xl w-full sm:w-auto gap-0.5">
            {(
              [
                { id: 'debts', label: `Deudas (${sharedDebts.length})`, icon: CreditCard, activeColor: 'text-rose-700' },
                { id: 'savings', label: `Ahorros (${sharedSavings.length})`, icon: PiggyBank, activeColor: 'text-teal-700' },
                { id: 'settlements', label: 'Saldar Cuentas', icon: HeartHandshake, activeColor: 'text-emerald-700' },
                { id: 'simulator', label: 'Simulador', icon: Layers, activeColor: 'text-indigo-750' },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${isActive ? `bg-white ${t.activeColor} shadow-xs` : 'text-slate-550 hover:text-slate-900'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. SUMMARY METRICS KPIS BAR */}
      {(activeTab === 'debts' || activeTab === 'savings') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeTab === 'debts' ? (
            <>
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Deudas Hogar</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {formatCurrency(totalDebtsOriginal, currencyCode, currencySymbol)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{sharedDebts.length} compromisos</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Abonado Global</div>
                <div className="text-xl font-black text-emerald-600 mt-1">
                  {formatCurrency(totalDebtsPaid, currencyCode, currencySymbol)}
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, globalDebtProgress)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Saldo Pendiente Hogar</div>
                <div className="text-xl font-black text-rose-650 mt-1">
                  {formatCurrency(totalDebtsPending, currencyCode, currencySymbol)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{globalDebtProgress.toFixed(1)}% liquidado</div>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl border border-rose-200 p-4 sm:p-5 shadow-xs">
                <div className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center justify-between">
                  <span>Mi Saldo Pendiente (Tú)</span>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-xl font-black text-rose-750 mt-1">
                  {formatCurrency(myPendingDebtsTotal, currencyCode, currencySymbol)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Monto que debes saldar</div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Metas Ahorro</div>
                <div className="text-xl font-black text-slate-900 mt-1">
                  {formatCurrency(totalSavingsTarget, currencyCode, currencySymbol)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">{sharedSavings.length} metas de ahorro</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Ahorrado Acumulado</div>
                <div className="text-xl font-black text-teal-700 mt-1">
                  {formatCurrency(totalSavingsAccumulated, currencyCode, currencySymbol)}
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, globalSavingsProgress)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-650">Falta por Ahorrar</div>
                <div className="text-xl font-black text-indigo-750 mt-1">
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
                <div className="text-[11px] text-teal-750 font-medium mt-1">
                  {familyGroup.members.length} integrantes colaborando
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. TOOLBAR: SEARCH & FILTERS */}
      {(activeTab === 'debts' || activeTab === 'savings') && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                className={`px-3 py-1 rounded-lg transition cursor-pointer shrink-0 ${filterScope === f.id
                  ? 'bg-slate-900 text-white shadow-xs font-black'
                  : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. ACTIVE TAB CONTENT RENDERING */}
      {activeTab === 'debts' && (
        <SharedDebtsTab
          filteredDebts={filteredSharedDebts}
          currentUser={currentUser}
          familyGroup={familyGroup}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          searchQuery={searchQuery}
          filterScope={filterScope}
          onOpenAddDebt={() => {
            setDebtToEdit(null);
            setIsAddDebtModalOpen(true);
          }}
          onEditDebt={(d) => {
            setDebtToEdit(d);
            setIsAddDebtModalOpen(true);
          }}
          onConfirmDeleteDebt={setDeletingDebt}
          onOpenAbonoModal={(debt, userId) => {
            setSelectedDebtForAbono({ debt, userId });
            setAbonoAmount(Math.max(0, (debt.participants.find(p => p.userId === userId)?.assignedAmount || 0) - (debt.abonos || []).filter(a => a.userId === userId).reduce((sum, a) => sum + a.amount, 0)));
            setAbonoUserId(userId);
            setAbonoNotes('');
          }}
          onConfirmDeleteAbono={setDeletingAbono}
        />
      )}

      {activeTab === 'savings' && (
        <SharedSavingsTab
          filteredSavings={filteredSharedSavings}
          currentUser={currentUser}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          searchQuery={searchQuery}
          filterScope={filterScope}
          onOpenAddSaving={() => {
            setSavingToEdit(null);
            setIsAddSavingModalOpen(true);
          }}
          onEditSaving={(s) => {
            setSavingToEdit(s);
            setIsAddSavingModalOpen(true);
          }}
          onConfirmDeleteSaving={setDeletingSaving}
          onOpenDepositModal={(saving, userId) => {
            const participants = saving.participants && saving.participants.length > 0 ? saving.participants : [{ userId: saving.createdByUserId, assignedAmount: saving.targetAmount }];
            const myShare = participants.find(p => p.userId === userId)?.assignedAmount || 0;
            const pPaid = (saving.deposits || []).filter(d => d.userId === userId).reduce((sum, d) => sum + d.amount, 0);
            setSelectedSavingForDeposit({ saving, userId });
            setDepositAmount(Math.max(0, myShare - pPaid));
            setDepositUserId(userId);
            setDepositNotes('');
          }}
          onConfirmDeleteDeposit={setDeletingDeposit}
        />
      )}

      {activeTab === 'settlements' && (
        <SettleDebtsTab
          familyGroup={familyGroup}
          currentUser={currentUser}
          sharedDebts={sharedDebts}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          onAddAbono={onAddAbono}
        />
      )}

      {activeTab === 'simulator' && (
        <SharedExpensesSimulatorTab
          familyGroup={familyGroup}
          currentUser={currentUser}
          personalConfig={personalConfig}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
        />
      )}

      {/* MODALS */}
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

      {selectedDebtForAbono && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Abono a Deuda</h3>
                <p className="text-xs text-rose-600 font-bold">{selectedDebtForAbono.debt.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDebtForAbono(null)}
                className="text-slate-400 hover:text-slate-650 text-lg font-bold cursor-pointer font-sans"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none font-semibold"
                >
                  {selectedDebtForAbono.debt.participants.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.userName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto del Abono *</label>
                  <div className="relative text-xs">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Monto"
                      value={abonoAmount}
                      onChange={(e) => setAbonoAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-slate-900 font-black focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha de pago *</label>
                  <input
                    type="date"
                    required
                    value={abonoDate}
                    onChange={(e) => setAbonoDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notas u Observaciones (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. Transferido por Nequi..."
                  value={abonoNotes}
                  onChange={(e) => setAbonoNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDebtForAbono(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-550 hover:text-slate-800 hover:bg-slate-550 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSavingForDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-md w-full space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Registrar Aporte a Meta</h3>
                <p className="text-xs text-teal-700 font-bold">{selectedSavingForDeposit.saving.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSavingForDeposit(null)}
                className="text-slate-400 hover:text-slate-650 text-lg font-bold cursor-pointer font-sans"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-sans">¿Quién realiza el depósito?</label>
                <select
                  value={depositUserId}
                  onChange={(e) => setDepositUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none font-semibold"
                >
                  {(() => {
                    const parts = selectedSavingForDeposit.saving.participants && selectedSavingForDeposit.saving.participants.length > 0
                      ? selectedSavingForDeposit.saving.participants
                      : [{ userId: selectedSavingForDeposit.saving.createdByUserId, userName: selectedSavingForDeposit.saving.createdByUserName }];
                    return parts.map((p) => (
                      <option key={p.userId} value={p.userId}>
                        {p.userName}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Monto del Aporte *</label>
                  <div className="relative text-xs">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Monto"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-slate-900 font-black focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1 font-sans">Fecha de Aporte *</label>
                  <input
                    type="date"
                    required
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[11px] text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notas u Observaciones (Opcional)</label>
                <input
                  type="text"
                  placeholder="ej. Transferido por Nequi..."
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSavingForDeposit(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-550 hover:text-slate-800 hover:bg-slate-50 rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Registrar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODALS */}
      {deletingDebt && (
        <ConfirmDeleteModal
          isOpen={!!deletingDebt}
          title="¿Seguro que desea eliminar esta deuda compartida?"
          message="Esta acción no se puede revertir. La deuda y todo su historial de abonos se perderán permanentemente."
          itemName={`${deletingDebt.title} (${formatCurrency(deletingDebt.totalOriginalAmount, currencyCode, currencySymbol)})`}
          onClose={() => setDeletingDebt(null)}
          onConfirm={() => {
            onDeleteSharedDebt(deletingDebt.id);
            setDeletingDebt(null);
          }}
        />
      )}

      {deletingAbono && (
        <ConfirmDeleteModal
          isOpen={!!deletingAbono}
          title="¿Seguro que desea eliminar este abono?"
          message={`Esta acción revertirá el abono de ${formatCurrency(deletingAbono.amount, currencyCode, currencySymbol)} registrado por ${deletingAbono.userName}.`}
          itemName={`Abono de ${deletingAbono.userName}`}
          onClose={() => setDeletingAbono(null)}
          onConfirm={() => {
            onDeleteAbono(deletingAbono.debtId, deletingAbono.abonoId);
            setDeletingAbono(null);
          }}
        />
      )}

      {deletingSaving && (
        <ConfirmDeleteModal
          isOpen={!!deletingSaving}
          title="¿Seguro que desea eliminar esta meta de ahorro?"
          message="Esta acción no se puede revertir. La meta y todo su historial de depósitos se perderán permanentemente."
          itemName={`${deletingSaving.name} (${formatCurrency(deletingSaving.targetAmount, currencyCode, currencySymbol)})`}
          onClose={() => setDeletingSaving(null)}
          onConfirm={() => {
            onDeleteSharedSaving(deletingSaving.id);
            setDeletingSaving(null);
          }}
        />
      )}

      {deletingDeposit && (
        <ConfirmDeleteModal
          isOpen={!!deletingDeposit}
          title="¿Seguro que desea eliminar este aporte de ahorro?"
          message={`Esta acción revertirá el aporte de ${formatCurrency(deletingDeposit.amount, currencyCode, currencySymbol)} de ${deletingDeposit.userName}.`}
          itemName={`Depósito de ${deletingDeposit.userName}`}
          onClose={() => setDeletingDeposit(null)}
          onConfirm={() => {
            onDeleteSharedSavingDeposit(deletingDeposit.savingId, deletingDeposit.depositId);
            setDeletingDeposit(null);
          }}
        />
      )}
    </div>
  );
};
