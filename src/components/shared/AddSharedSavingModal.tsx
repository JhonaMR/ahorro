import React, { useState, useEffect } from 'react';
import {
  X,
  PiggyBank,
  Calendar,
  DollarSign,
  User,
  Users,
  Sparkles,
  Percent,
  CheckCircle2,
  Target,
  Clock,
} from 'lucide-react';
import {
  FamilyGroup,
  MonthlyDistribution,
  SharedFamilySavings,
  SharedFinancesScope,
  SharedParticipantShare,
  SharedSplitMethod,
  UserAccount,
} from '../../types';
import { formatCurrency, MONTH_NAMES_ES } from '../../utils/formatters';

interface AddSharedSavingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    savingData: Omit<SharedFamilySavings, 'id' | 'createdAt' | 'deposits'>,
    existingId?: string
  ) => void;
  currentUser: UserAccount;
  familyGroup: FamilyGroup;
  currencyCode: string;
  currencySymbol: string;
  suggestedTags?: string[];
  savingToEdit?: SharedFamilySavings | null;
}

export const AddSharedSavingModal: React.FC<AddSharedSavingModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  familyGroup,
  currencyCode,
  currencySymbol,
  suggestedTags,
  savingToEdit,
}) => {
  const defaultTag = suggestedTags && suggestedTags.length > 0 ? suggestedTags[0] : 'Ocio';
  const members = familyGroup.members;
  // Basic Info
  const [name, setName] = useState('');
  const [tag, setTag] = useState(defaultTag);
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [periodicTargetAmount, setPeriodicTargetAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Scope & Members
  const [scope, setScope] = useState<SharedFinancesScope>('shared');
  const [singleMemberId, setSingleMemberId] = useState(currentUser.id);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    if (members.length > 0) {
      return members.map((m) => m.userId);
    }
    return [currentUser.id];
  });

  // Split Method
  const [splitMethod, setSplitMethod] = useState<SharedSplitMethod>('equal');

  // Custom percentages or custom amounts by member
  const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});

  // Schedule
  const [frequency, setFrequency] = useState<'quincenal' | 'mensual'>('quincenal');
  const [monthlyDistribution, setMonthlyDistribution] = useState<MonthlyDistribution>('both_equal');
  const [startYear, setStartYear] = useState(() => new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(() => new Date().getMonth());
  const [startQuincena, setStartQuincena] = useState<1 | 2>(() => (new Date().getDate() <= 15 ? 1 : 2));

  // Tipo de ahorro (Natillera)
  const [savingType, setSavingType] = useState<'classic' | 'natillera'>('classic');
  const [natilleraMode, setNatilleraMode] = useState<'free' | 'fixed'>('free');

  useEffect(() => {
    if (savingToEdit) {
      setName(savingToEdit.name);
      setTag(savingToEdit.tag || defaultTag);
      setTargetAmount(savingToEdit.targetAmount);
      setPeriodicTargetAmount(savingToEdit.periodicTargetAmount || '');
      setNotes(savingToEdit.notes || '');
      setScope(savingToEdit.scope || 'shared');
      setFrequency(savingToEdit.frequency || 'quincenal');
      setMonthlyDistribution(savingToEdit.monthlyDistribution || 'both_equal');
      setStartYear(savingToEdit.startYear || new Date().getFullYear());
      setStartMonth(savingToEdit.startMonth ?? new Date().getMonth());
      setStartQuincena(savingToEdit.startQuincena || 1);
      const isNatillera = savingToEdit.splitMethod === 'natillera_free' || savingToEdit.splitMethod === 'natillera_fixed';
      if (isNatillera) {
        setSavingType('natillera');
        setNatilleraMode(savingToEdit.splitMethod === 'natillera_free' ? 'free' : 'fixed');
        setSplitMethod(savingToEdit.splitMethod);
      } else {
        setSavingType('classic');
        setSplitMethod(savingToEdit.splitMethod || 'equal');
      }

      if (savingToEdit.participants && savingToEdit.participants.length > 0) {
        const pIds = savingToEdit.participants.map((p) => p.userId);
        setSelectedMemberIds(pIds);
        if (pIds.length === 1) {
          setSingleMemberId(pIds[0]);
        }
        const pMap: Record<string, number> = {};
        const aMap: Record<string, number> = {};
        savingToEdit.participants.forEach((p) => {
          pMap[p.userId] = p.assignedPercentage ?? (savingToEdit.targetAmount > 0 ? Math.round((p.assignedAmount / savingToEdit.targetAmount) * 100) : 0);
          aMap[p.userId] = p.assignedAmount;
        });
        setCustomPercentages(pMap);
        setCustomAmounts(aMap);
      } else {
        setSelectedMemberIds(members.map((m) => m.userId));
      }
    } else {
      setName('');
      setTag(defaultTag);
      setTargetAmount('');
      setPeriodicTargetAmount('');
      setNotes('');
      setScope('shared');
      setSingleMemberId(currentUser.id);
      setSelectedMemberIds(members.map((m) => m.userId));
      setSplitMethod('equal');
      setSavingType('classic');
      setNatilleraMode('free');
      setFrequency('quincenal');
      setMonthlyDistribution('both_equal');
      const now = new Date();
      setStartYear(now.getFullYear());
      setStartMonth(now.getMonth());
      setStartQuincena(now.getDate() <= 15 ? 1 : 2);
      setCustomPercentages({});
      setCustomAmounts({});
    }
  }, [savingToEdit, isOpen, defaultTag, members, currentUser.id]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const numTargetAmount = typeof targetAmount === 'number' ? targetAmount : parseFloat(String(targetAmount)) || 0;
  const numPeriodic = typeof periodicTargetAmount === 'number' ? periodicTargetAmount : parseFloat(String(periodicTargetAmount)) || 0;

  // Active participating members
  const activeParticipantsList = scope === 'personal'
    ? members.filter((m) => m.userId === singleMemberId)
    : members.filter((m) => selectedMemberIds.includes(m.userId));

  const participantCount = activeParticipantsList.length;

  // Equal split calculation helper
  const calculateEqualSplit = () => {
    if (participantCount <= 0 || numTargetAmount <= 0) return {};
    const baseShare = Math.floor(numTargetAmount / participantCount);
    const remainder = numTargetAmount - baseShare * participantCount;
    const res: Record<string, number> = {};
    activeParticipantsList.forEach((m, idx) => {
      res[m.userId] = idx === 0 ? baseShare + remainder : baseShare;
    });
    return res;
  };

  // Toggle member in shared list
  const toggleMemberSelection = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      if (selectedMemberIds.length <= 1) return; // Keep at least one
      setSelectedMemberIds((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedMemberIds((prev) => [...prev, userId]);
    }
  };

  // Compute final assigned amounts and percentages
  const computedShares: Record<string, { amount: number; percentage: number }> = {};

  if (scope === 'personal') {
    computedShares[singleMemberId] = {
      amount: numTargetAmount,
      percentage: 100,
    };
  } else if (splitMethod === 'equal') {
    const eq = calculateEqualSplit();
    activeParticipantsList.forEach((m) => {
      const amt = eq[m.userId] || 0;
      const pct = numTargetAmount > 0 ? (amt / numTargetAmount) * 100 : 0;
      computedShares[m.userId] = { amount: amt, percentage: pct };
    });
  } else if (splitMethod === 'percentage') {
    activeParticipantsList.forEach((m) => {
      const pct = customPercentages[m.userId] ?? (100 / participantCount);
      const amt = Math.round((numTargetAmount * pct) / 100);
      computedShares[m.userId] = { amount: amt, percentage: pct };
    });
  } else {
    // Custom amount
    activeParticipantsList.forEach((m) => {
      const amt = customAmounts[m.userId] ?? Math.round(numTargetAmount / participantCount);
      const pct = numTargetAmount > 0 ? (amt / numTargetAmount) * 100 : 0;
      computedShares[m.userId] = { amount: amt, percentage: pct };
    });
  }

  // Validation math
  const totalAssignedAmount = Object.values(computedShares).reduce((s, c) => s + c.amount, 0);
  const totalPercentage = Object.values(computedShares).reduce((s, c) => s + c.percentage, 0);
  const amountDiff = Math.round(numTargetAmount - totalAssignedAmount);
  const isSplitValid =
    numTargetAmount > 0 &&
    (scope === 'personal' ||
      (splitMethod === 'equal' && true) ||
      (splitMethod === 'percentage' && Math.abs(totalPercentage - 100) < 0.1) ||
      (splitMethod === 'custom_amount' && Math.abs(amountDiff) <= 1));

  const totalNatilleraFixedAmount = activeParticipantsList.reduce((acc, m) => acc + (customAmounts[m.userId] || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let finalSplitMethod: SharedSplitMethod = splitMethod;
    let finalTargetAmount = numTargetAmount;
    let finalParticipants: SharedParticipantShare[] = [];

    if (scope === 'shared') {
      if (savingType === 'natillera') {
        if (natilleraMode === 'free') {
          finalSplitMethod = 'natillera_free';
          finalTargetAmount = 0;
          finalParticipants = activeParticipantsList.map((m) => ({
            userId: m.userId,
            userName: m.name || (m as any).user?.name || 'Usuario',
            userEmail: m.email || (m as any).user?.email || '',
            assignedPercentage: 0,
            assignedAmount: 0,
          }));
        } else {
          finalSplitMethod = 'natillera_fixed';
          if (totalNatilleraFixedAmount <= 0) return;
          finalTargetAmount = totalNatilleraFixedAmount;
          finalParticipants = activeParticipantsList.map((m) => ({
            userId: m.userId,
            userName: m.name || (m as any).user?.name || 'Usuario',
            userEmail: m.email || (m as any).user?.email || '',
            assignedPercentage: 0,
            assignedAmount: customAmounts[m.userId] || 0,
          }));
        }
      } else {
        // Clásico
        if (numTargetAmount <= 0 || !isSplitValid) return;
        finalSplitMethod = splitMethod;
        finalTargetAmount = numTargetAmount;
        finalParticipants = activeParticipantsList.map((m) => {
          const share = computedShares[m.userId] || { amount: 0, percentage: 0 };
          return {
            userId: m.userId,
            userName: m.name || (m as any).user?.name || 'Usuario',
            userEmail: m.email || (m as any).user?.email || '',
            assignedPercentage: Math.round(share.percentage * 10) / 10,
            assignedAmount: share.amount,
          };
        });
      }
    } else {
      // Personal
      if (numTargetAmount <= 0) return;
      finalSplitMethod = 'equal';
      finalTargetAmount = numTargetAmount;
      finalParticipants = activeParticipantsList.map((m) => ({
        userId: m.userId,
        userName: m.name || (m as any).user?.name || 'Usuario',
        userEmail: m.email || (m as any).user?.email || '',
        assignedPercentage: 100,
        assignedAmount: numTargetAmount,
      }));
    }

    const savingPayload: Omit<SharedFamilySavings, 'id' | 'createdAt' | 'deposits'> = {
      familyGroupId: familyGroup.id,
      name: name.trim(),
      tag,
      targetAmount: finalTargetAmount,
      periodicTargetAmount: numPeriodic > 0 ? numPeriodic : undefined,
      frequency,
      monthlyDistribution,
      startYear,
      startMonth,
      startQuincena,
      scope,
      splitMethod: finalSplitMethod,
      participants: finalParticipants,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      notes: notes.trim() || undefined,
      isArchived: savingToEdit ? savingToEdit.isArchived : false,
    };

    onSave(savingPayload, savingToEdit?.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-955/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl lg:max-w-3xl overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs shrink-0">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                  {familyGroup.name}
                </span>
                <span className="text-xs text-teal-100">Metas de Ahorro Familiar</span>
              </div>
              <h3 className="font-black text-lg sm:text-xl">
                {savingToEdit ? 'Editar Meta de Ahorro' : 'Nueva Meta de Ahorro Familiar'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Nombre y Meta Total */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Nombre de la Meta de Ahorro *
              </label>
              <div className="relative">
                <Target className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Vacaciones Cancún, Fondo Emergencia Hogar, Cuota Inicial Casa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Meta Total ({currencyCode}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-505 font-bold text-sm">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  required={savingType !== 'natillera' || natilleraMode === 'fixed'}
                  disabled={savingType === 'natillera'}
                  min="1"
                  step="any"
                  placeholder={savingType === 'natillera' && natilleraMode === 'free' ? "Aporte Libre" : "0"}
                  value={
                    savingType === 'natillera'
                      ? (natilleraMode === 'free' ? '' : totalNatilleraFixedAmount)
                      : targetAmount
                  }
                  onChange={(e) => {
                    if (savingType !== 'natillera') {
                      setTargetAmount(e.target.value === '' ? '' : parseFloat(e.target.value));
                    }
                  }}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Categoría y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Categoría / Etiqueta
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
              >
                {(suggestedTags && suggestedTags.length > 0
                  ? suggestedTags
                  : ['Ocio', 'Vacaciones', 'Emergencia', 'Hogar', 'Inversión', 'Educación', 'Otro']
                ).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Notas / Propósito
              </label>
              <input
                type="text"
                placeholder="Ej. Tiquetes y hospedaje para diciembre"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>

          {/* SECCIÓN 1: ALCANCE & INTEGRANTES */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>1. ¿Cómo se organizará esta meta de ahorro?</span>
                </label>
                <span className="text-[11px] text-slate-505 font-medium">
                  {familyGroup.members.length} miembros en el grupo
                </span>
              </div>
              <p className="text-xs text-slate-505 mt-0.5">
                Define si el fondo es personal de un integrante o una meta conjunta familiar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  scope === 'personal'
                    ? 'border-teal-500 bg-teal-550/10 text-teal-950 ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'personal' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black">Ahorro Individual</div>
                  <div className="text-[11px] text-slate-500">Meta perteneciente a un solo miembro</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('shared')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  scope === 'shared'
                    ? 'border-teal-500 bg-teal-550/10 text-teal-950 ring-2 ring-teal-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'shared' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black">Meta Conjunta Familiar</div>
                  <div className="text-[11px] text-slate-500">Ahorro compartido entre miembros</div>
                </div>
              </button>
            </div>

            {/* If personal */}
            {scope === 'personal' ? (
              <div className="pt-2 text-xs">
                <label className="block font-bold text-slate-750 mb-1.5">
                  ¿A qué integrante pertenece este ahorro?
                </label>
                <select
                  value={singleMemberId}
                  onChange={(e) => setSingleMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500 font-sans"
                >
                  {members.map((m) => {
                    const mName = m.name || (m as any).user?.name || 'Usuario';
                    const mEmail = m.email || (m as any).user?.email || '';
                    return (
                      <option key={m.userId} value={m.userId}>
                        {mName} {m.userId === currentUser.id ? '(Tú)' : ''} {mEmail ? `— ${mEmail}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              /* If shared */
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-slate-705">
                  Selecciona los integrantes que aportarán a esta meta:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((m) => {
                    const isSelected = selectedMemberIds.includes(m.userId);
                    const mName = m.name || (m as any).user?.name || 'Usuario';
                    const mEmail = m.email || (m as any).user?.email || '';
                    return (
                      <div
                        key={m.userId}
                        onClick={() => toggleMemberSelection(m.userId)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                          isSelected
                            ? 'border-teal-400 bg-teal-50/40 text-slate-900 shadow-2xs font-semibold'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                              isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {mName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1">
                              <span>{mName}</span>
                              {m.userId === currentUser.id && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-teal-100 text-teal-800">
                                  Tú
                                </span>
                              )}
                            </div>
                            {mEmail && <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{mEmail}</div>}
                          </div>
                        </div>

                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {scope === 'shared' && participantCount >= 1 && (
              <div className="space-y-4 pt-3 border-t border-slate-200/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-sans">
                    Tipo de Ahorro
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setSavingType('classic');
                        setSplitMethod('equal');
                        if (targetAmount === '') setTargetAmount(1000000);
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                        savingType === 'classic'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/45'
                      }`}
                    >
                      Clásico (Meta Conjunta)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSavingType('natillera');
                        setSplitMethod(natilleraMode === 'free' ? 'natillera_free' : 'natillera_fixed');
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                        savingType === 'natillera'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/45'
                      }`}
                    >
                      Natillera (Fondo Común)
                    </button>
                  </div>
                </div>

                {savingType === 'natillera' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-sans">
                      Modalidad de Aportes
                    </label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-200/50 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setNatilleraMode('free');
                          setSplitMethod('natillera_free');
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                          natilleraMode === 'free'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/45'
                        }`}
                      >
                        Aporte Libre
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNatilleraMode('fixed');
                          setSplitMethod('natillera_fixed');
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                          natilleraMode === 'fixed'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/45'
                        }`}
                      >
                        Cuota Fija Individual
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: DISTRIBUCIÓN CLÁSICO */}
          {scope === 'shared' && savingType === 'classic' && participantCount >= 1 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <label className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Percent className="w-4 h-4 text-teal-600" />
                  <span>2. Distribución de la Meta entre los {participantCount} integrantes</span>
                </label>

                {splitMethod === 'percentage' && (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md ${
                      Math.abs(totalPercentage - 100) < 0.1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-850'
                    }`}
                  >
                    Suma: {totalPercentage.toFixed(1)}% / 100%
                  </span>
                )}

                {splitMethod === 'custom_amount' && (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md ${
                      Math.abs(amountDiff) <= 1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-850'
                    }`}
                  >
                    Asignado: {formatCurrency(totalAssignedAmount, currencyCode, currencySymbol)} /{' '}
                    {formatCurrency(numTargetAmount, currencyCode, currencySymbol)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMethod('equal')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                    splitMethod === 'equal'
                      ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Equitativo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSplitMethod('percentage');
                    if (Object.keys(customPercentages).length === 0) {
                      const basePct = Math.floor(100 / participantCount);
                      const pMap: Record<string, number> = {};
                      activeParticipantsList.forEach((m, idx) => {
                        pMap[m.userId] = idx === 0 ? 100 - basePct * (participantCount - 1) : basePct;
                      });
                      setCustomPercentages(pMap);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                    splitMethod === 'percentage'
                      ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Porcentajes
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSplitMethod('custom_amount');
                    if (Object.keys(customAmounts).length === 0) {
                      const eq = calculateEqualSplit();
                      setCustomAmounts(eq);
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                    splitMethod === 'custom_amount'
                      ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Montos
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {activeParticipantsList.map((m) => {
                  const share = computedShares[m.userId] || { amount: 0, percentage: 0 };
                  const mName = m.name || (m as any).user?.name || 'Usuario';

                  return (
                    <div
                      key={m.userId}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
                          {mName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                            <span>{mName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Meta individual: {share.percentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {splitMethod === 'percentage' ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="any"
                            value={customPercentages[m.userId] ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCustomPercentages((prev) => ({ ...prev, [m.userId]: val }));
                            }}
                            className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <span className="font-bold text-slate-500">%</span>
                          <span className="font-black text-slate-805 ml-2 min-w-[90px] text-right">
                            {formatCurrency(share.amount, currencyCode, currencySymbol)}
                          </span>
                        </div>
                      ) : splitMethod === 'custom_amount' ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-500">{currencySymbol}</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={customAmounts[m.userId] ?? ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCustomAmounts((prev) => ({ ...prev, [m.userId]: val }));
                            }}
                            className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      ) : (
                        <div className="font-black text-teal-700 text-sm">
                          {formatCurrency(share.amount, currencyCode, currencySymbol)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: OPCIONES NATILLERA */}
          {scope === 'shared' && savingType === 'natillera' && participantCount >= 1 && (
            <>
              {natilleraMode === 'free' ? (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>2. Modalidad: Aporte Libre</span>
                  </label>
                  <p className="text-xs text-slate-505 leading-relaxed">
                     En este modo, no hay cuotas fijas ni metas individuales obligatorias. Cada participante puede depositar la cantidad de dinero que desee cuando lo prefiera.
                  </p>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <label className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Target className="w-4 h-4 text-teal-600" />
                      <span>2. Meta / Cuota Individual por Integrante</span>
                    </label>
                    <span className="font-bold px-2.5 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                      Suma de cuotas: {formatCurrency(totalNatilleraFixedAmount, currencyCode, currencySymbol)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                      Define la cantidad total que cada participante se compromete a acumular en esta natillera.
                  </p>

                  <div className="space-y-2 pt-1">
                    {activeParticipantsList.map((m) => {
                      const mName = m.name || (m as any).user?.name || 'Usuario';
                      return (
                        <div
                          key={m.userId}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
                              {mName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-slate-900">{mName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-500 text-xs">{currencySymbol}</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="ej. 500000"
                              value={customAmounts[m.userId] ?? ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setCustomAmounts({ ...customAmounts, [m.userId]: val });
                              }}
                              className="w-32 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* SECCIÓN 3: FRECUENCIA & CALENDARIO */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>3. Frecuencia y Fechas de Aporte</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Frecuencia de Aporte *</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'quincenal' | 'mensual')}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Aporte Sugerido (Hogar)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Opcional"
                    value={periodicTargetAmount}
                    onChange={(e) => setPeriodicTargetAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-755 mb-1">Mes y Año de Inicio</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(parseInt(e.target.value))}
                    className="w-full px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {MONTH_NAMES_ES.map((m, i) => (
                      <option key={i} value={i}>
                        {m.slice(0, 3)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={startYear}
                    onChange={(e) => setStartYear(parseInt(e.target.value))}
                    className="w-full px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-755 mb-1">¿En qué quincena inicia?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStartQuincena(1)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                      startQuincena === 1
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    1ª Quincena
                  </button>
                  <button
                    type="button"
                    onClick={() => setStartQuincena(2)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                      startQuincena === 2
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    2ª Quincena
                  </button>
                </div>
              </div>

              {frequency === 'mensual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1">Distribución del Aporte Mensual</label>
                  <select
                    value={monthlyDistribution}
                    onChange={(e) => setMonthlyDistribution(e.target.value as MonthlyDistribution)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="both_equal">Ambas Quincenas (50/50)</option>
                    <option value="first_half">Solo 1ª Quincena (100% Q1)</option>
                    <option value="second_half">Solo 2ª Quincena (100% Q2)</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col justify-end">
                  <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-slate-600 shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-[11px] leading-tight">Ciclo Quincenal Activo</div>
                      <div className="text-[10px] text-slate-500 truncate capitalize">
                        Aportes quincenales desde {startQuincena}ª Qna de {MONTH_NAMES_ES[startMonth]} {startYear}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {numPeriodic > 0 && participantCount > 1 && (
              <div className="bg-white border border-teal-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Aporte sugerido por periodo (Total hogar):</span>
                  <span className="text-base font-black text-teal-700">
                    {formatCurrency(numPeriodic, currencyCode, currencySymbol)} /{frequency === 'quincenal' ? 'quincena' : 'mes'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                    Aporte sugerido por cada integrante:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {activeParticipantsList.map((m) => {
                      const share = computedShares[m.userId] || { amount: 0, percentage: 0 };
                      const memberPeriodic = Math.round((numPeriodic * share.percentage) / 100);
                      return (
                        <div
                          key={m.userId}
                          className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 flex items-center justify-between"
                        >
                          <span className="font-semibold text-slate-805">{m.name}:</span>
                          <span className="font-black text-teal-700">
                            {formatCurrency(memberPeriodic, currencyCode, currencySymbol)} /{frequency === 'quincenal' ? 'qna' : 'mes'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 shrink-0 text-xs font-semibold">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                scope === 'personal'
                  ? !name.trim() || numTargetAmount <= 0
                  : savingType === 'natillera'
                  ? !name.trim() || (natilleraMode === 'fixed' && totalNatilleraFixedAmount <= 0)
                  : !isSplitValid || !name.trim() || numTargetAmount <= 0
              }
              className={`px-6 py-2.5 font-black rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer ${
                (scope === 'personal'
                  ? name.trim() && numTargetAmount > 0
                  : savingType === 'natillera'
                  ? name.trim() && (natilleraMode === 'free' || totalNatilleraFixedAmount > 0)
                  : isSplitValid && name.trim() && numTargetAmount > 0)
                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                  : 'bg-slate-300 text-slate-505 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingToEdit ? 'Guardar Cambios' : 'Crear Meta de Ahorro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
