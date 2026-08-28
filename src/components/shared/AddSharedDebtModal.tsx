import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  DollarSign,
  User,
  Users,
  FileText,
  Sparkles,
  Percent,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  DebtFrequency,
  FamilyGroup,
  MonthlyDistribution,
  SharedFamilyDebt,
  SharedFinancesScope,
  SharedParticipantShare,
  SharedSplitMethod,
  UserAccount,
} from '../../types';
import { formatCurrency, MONTH_NAMES_ES } from '../../utils/formatters';

interface AddSharedDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    debtData: Omit<SharedFamilyDebt, 'id' | 'createdAt' | 'abonos'>,
    existingId?: string
  ) => void;
  currentUser: UserAccount;
  familyGroup: FamilyGroup;
  currencyCode: string;
  currencySymbol: string;
  suggestedTags?: string[];
  debtToEdit?: SharedFamilyDebt | null;
}

export const AddSharedDebtModal: React.FC<AddSharedDebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  familyGroup,
  currencyCode,
  currencySymbol,
  suggestedTags,
  debtToEdit,
}) => {
  const defaultTag = suggestedTags && suggestedTags.length > 0 ? suggestedTags[0] : 'Hogar';
  const members = familyGroup.members;

  // Basic Info
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState(defaultTag);
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // Scope & Payer
  const [scope, setScope] = useState<SharedFinancesScope>('shared');
  const [singleMemberId, setSingleMemberId] = useState(currentUser.id);
  const [payerUserId, setPayerUserId] = useState(currentUser.id);

  // Selected Member IDs for shared
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

  // Schedule & Installments
  const [installmentsCount, setInstallmentsCount] = useState<number>(12);
  const [frequency, setFrequency] = useState<DebtFrequency>('quincenal');
  const [monthlyDistribution, setMonthlyDistribution] = useState<MonthlyDistribution>('both_equal');
  const [startYear, setStartYear] = useState(() => new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(() => new Date().getMonth());
  const [startQuincena, setStartQuincena] = useState<1 | 2>(() => (new Date().getDate() <= 15 ? 1 : 2));

  // Initialize or reset form on open / edit
  useEffect(() => {
    if (debtToEdit) {
      setTitle(debtToEdit.title);
      setTag(debtToEdit.tag || defaultTag);
      setTotalAmount(debtToEdit.totalOriginalAmount);
      setNotes(debtToEdit.notes || '');
      setScope(debtToEdit.scope || 'shared');
      setPayerUserId(debtToEdit.payerUserId || debtToEdit.createdByUserId || currentUser.id);
      setInstallmentsCount(debtToEdit.installmentsCount || 1);
      setFrequency(debtToEdit.frequency || 'quincenal');
      setMonthlyDistribution(debtToEdit.monthlyDistribution || 'both_equal');
      setStartYear(debtToEdit.startYear || new Date().getFullYear());
      setStartMonth(debtToEdit.startMonth ?? new Date().getMonth());
      setStartQuincena(debtToEdit.startQuincena || 1);
      setSplitMethod(debtToEdit.splitMethod || 'equal');

      if (debtToEdit.participants && debtToEdit.participants.length > 0) {
        const pIds = debtToEdit.participants.map((p) => p.userId);
        setSelectedMemberIds(pIds);
        if (pIds.length === 1) {
          setSingleMemberId(pIds[0]);
        }
        const pMap: Record<string, number> = {};
        const aMap: Record<string, number> = {};
        debtToEdit.participants.forEach((p) => {
          if (p.assignedPercentage !== undefined) pMap[p.userId] = p.assignedPercentage;
          pMap[p.userId] = p.assignedPercentage ?? Math.round((p.assignedAmount / debtToEdit.totalOriginalAmount) * 100);
          aMap[p.userId] = p.assignedAmount;
        });
        setCustomPercentages(pMap);
        setCustomAmounts(aMap);
      } else {
        setSelectedMemberIds(members.map((m) => m.userId));
      }
    } else {
      setTitle('');
      setTag(defaultTag);
      setTotalAmount('');
      setNotes('');
      setScope('shared');
      setSingleMemberId(currentUser.id);
      setPayerUserId(currentUser.id);
      setSelectedMemberIds(members.map((m) => m.userId));
      setSplitMethod('equal');
      setInstallmentsCount(12);
      setFrequency('quincenal');
      setMonthlyDistribution('both_equal');
      const now = new Date();
      setStartYear(now.getFullYear());
      setStartMonth(now.getMonth());
      setStartQuincena(now.getDate() <= 15 ? 1 : 2);
      setCustomPercentages({});
      setCustomAmounts({});
    }
  }, [debtToEdit, isOpen, defaultTag, members, currentUser.id]);

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

  const numTotalAmount = typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount)) || 0;

  // Active participating members
  const activeParticipantsList = scope === 'personal'
    ? members.filter((m) => m.userId === singleMemberId)
    : members.filter((m) => selectedMemberIds.includes(m.userId));

  const participantCount = activeParticipantsList.length;

  // Equal split calculation helper
  const calculateEqualSplit = () => {
    if (participantCount <= 0 || numTotalAmount <= 0) return {};
    const baseShare = Math.floor(numTotalAmount / participantCount);
    const remainder = numTotalAmount - baseShare * participantCount;
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
      amount: numTotalAmount,
      percentage: 100,
    };
  } else if (splitMethod === 'equal') {
    const eq = calculateEqualSplit();
    activeParticipantsList.forEach((m) => {
      const amt = eq[m.userId] || 0;
      const pct = numTotalAmount > 0 ? (amt / numTotalAmount) * 100 : 0;
      computedShares[m.userId] = { amount: amt, percentage: pct };
    });
  } else if (splitMethod === 'percentage') {
    activeParticipantsList.forEach((m) => {
      const pct = customPercentages[m.userId] ?? (100 / participantCount);
      const amt = Math.round((numTotalAmount * pct) / 100);
      computedShares[m.userId] = { amount: amt, percentage: pct };
    });
  } else {
    // Custom amount
    activeParticipantsList.forEach((m) => {
      const amt = customAmounts[m.userId] ?? Math.round(numTotalAmount / participantCount);
      const pct = numTotalAmount > 0 ? (amt / numTotalAmount) * 100 : 0;
      computedShares[m.userId] = { amount: amt, percentage: pct };
    });
  }

  // Validation math
  const totalAssignedAmount = Object.values(computedShares).reduce((s, c) => s + c.amount, 0);
  const totalPercentage = Object.values(computedShares).reduce((s, c) => s + c.percentage, 0);
  const amountDiff = Math.round(numTotalAmount - totalAssignedAmount);
  const isSplitValid =
    numTotalAmount > 0 &&
    (scope === 'personal' ||
      (splitMethod === 'equal' && true) ||
      (splitMethod === 'percentage' && Math.abs(totalPercentage - 100) < 0.1) ||
      (splitMethod === 'custom_amount' && Math.abs(amountDiff) <= 1));

  // Calculated overall installment
  const count = Math.max(1, installmentsCount);
  const totalInstallmentAmount = Math.round(numTotalAmount / count);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || numTotalAmount <= 0 || !isSplitValid) return;

    const rawPayerMember = members.find((m) => m.userId === payerUserId);
    const payerName = rawPayerMember?.name || (rawPayerMember as any)?.user?.name || currentUser.name;
    const payerEmail = rawPayerMember?.email || (rawPayerMember as any)?.user?.email || currentUser.email;

    // Build final participants list
    const finalParticipants: SharedParticipantShare[] = activeParticipantsList.map((m) => {
      const share = computedShares[m.userId] || { amount: 0, percentage: 0 };
      return {
        userId: m.userId,
        userName: m.name || (m as any).user?.name || 'Usuario',
        userEmail: m.email || (m as any).user?.email || '',
        isPayer: m.userId === payerUserId,
        assignedPercentage: Math.round(share.percentage * 10) / 10,
        assignedAmount: share.amount,
      };
    });

    const debtPayload: Omit<SharedFamilyDebt, 'id' | 'createdAt' | 'abonos'> = {
      familyGroupId: familyGroup.id,
      title: title.trim(),
      tag,
      totalOriginalAmount: numTotalAmount,
      installmentsCount: count,
      installmentAmount: totalInstallmentAmount,
      frequency,
      monthlyDistribution,
      startYear,
      startMonth,
      startQuincena,
      scope,
      payerUserId,
      payerUserName: payerName,
      splitMethod,
      participants: finalParticipants,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      notes: notes.trim() || undefined,
      isArchived: debtToEdit ? debtToEdit.isArchived : false,
    };

    onSave(debtPayload, debtToEdit?.id);
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
        <div className="p-4 sm:p-6 bg-gradient-to-r from-rose-650 via-rose-500 to-amber-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs shrink-0">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
                  {familyGroup.name}
                </span>
                <span className="text-xs text-rose-100">Finanzas Compartidas</span>
              </div>
              <h3 className="font-black text-lg sm:text-xl">
                {debtToEdit ? 'Editar Deuda Familiar / Compartida' : 'Registrar Deuda Familiar'}
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
          {/* Concepto y Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Nombre / Concepto de la Deuda *
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ej. Nevera No Frost, Sofá Sala, Crédito Libre Inversión, Mercado"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Monto Total *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-505 font-bold text-sm">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Etiqueta y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Categoría / Etiqueta
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
              >
                {(suggestedTags && suggestedTags.length > 0
                  ? suggestedTags
                  : ['Hogar', 'Tecnología', 'Salud', 'Vehículo', 'Mercado', 'Educación', 'Otro']
                ).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 font-sans">
                Notas / Descripción Opcional
              </label>
              <input
                type="text"
                placeholder="Ej. Comprada a 12 cuotas con tarjeta de crédito"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          {/* SECCIÓN 1: ALCANCE & INTEGRANTES */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Users className="w-4 h-4 text-rose-600" />
                  <span>1. ¿Cómo se asumirá esta deuda?</span>
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  {familyGroup.members.length} miembros en la familia
                </span>
              </div>
              <p className="text-xs text-slate-505 mt-0.5">
                Elige si el compromiso es de un solo integrante o se divide entre los miembros seleccionados.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  scope === 'personal'
                    ? 'border-rose-500 bg-rose-550/10 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'personal' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black">Solo Mío / Un Integrante</div>
                  <div className="text-[11px] text-slate-500">Asumido 100% por una persona</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('shared')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  scope === 'shared'
                    ? 'border-rose-500 bg-rose-550/10 text-rose-950 ring-2 ring-rose-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'shared' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black">Dividir con Integrantes</div>
                  <div className="text-[11px] text-slate-500">Repartir entre miembros seleccionados</div>
                </div>
              </button>
            </div>

            {/* If personal */}
            {scope === 'personal' ? (
              <div className="pt-2 text-xs">
                <label className="block font-bold text-slate-750 mb-1.5">
                  ¿A qué integrante pertenece esta deuda?
                </label>
                <select
                  value={singleMemberId}
                  onChange={(e) => setSingleMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500 font-sans"
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
                <div className="text-xs font-bold text-slate-700">
                  Selecciona los integrantes que participarán en esta deuda:
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
                            ? 'border-rose-400 bg-rose-50/40 text-slate-900 shadow-2xs font-semibold'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                              isSelected ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {mName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold flex items-center gap-1">
                              <span>{mName}</span>
                              {m.userId === currentUser.id && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700">
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
                          className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: TITULAR DEUDOR */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>2. ¿Quién realizó el pago o asumió la deuda inicialmente?</span>
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Indica quién es el titular o pagador principal (por ejemplo, con su tarjeta de crédito o cuenta).
            </p>

            <select
              value={payerUserId}
              onChange={(e) => setPayerUserId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
            >
              {members.map((m) => {
                const mName = m.name || (m as any).user?.name || 'Usuario';
                return (
                  <option key={m.userId} value={m.userId}>
                    {mName} {m.userId === currentUser.id ? '(Tú - Pagaste inicialmente)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* SECCIÓN 3: MÉTODO DE DIVISION */}
          {scope === 'shared' && participantCount > 1 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <label className="font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  <Percent className="w-4 h-4 text-rose-600" />
                  <span>3. Método de División entre los {participantCount} integrantes</span>
                </label>

                {splitMethod === 'percentage' && (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md ${
                      Math.abs(totalPercentage - 100) < 0.1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
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
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Asignado: {formatCurrency(totalAssignedAmount, currencyCode, currencySymbol)} /{' '}
                    {formatCurrency(numTotalAmount, currencyCode, currencySymbol)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMethod('equal')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition text-center cursor-pointer ${
                    splitMethod === 'equal'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
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
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
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
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  Montos
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {activeParticipantsList.map((m) => {
                  const share = computedShares[m.userId] || { amount: 0, percentage: 0 };
                  const isPayer = m.userId === payerUserId;

                  return (
                    <div
                      key={m.userId}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 font-sans">
                            <span>{m.name}</span>
                            {isPayer && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                                Pagó Inicialmente
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {share.percentage.toFixed(1)}% del total
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
                            className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
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
                            className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-right font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                      ) : (
                        <div className="font-black text-rose-700 text-sm">
                          {formatCurrency(share.amount, currencyCode, currencySymbol)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECCIÓN 4: PLAZO & FRECUENCIA */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Calendar className="w-4 h-4 text-rose-600" />
              <span>4. Plazo, Frecuencia y Fechas de Inicio</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Frecuencia *</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as DebtFrequency)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1 font-sans">Número de Cuotas *</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={installmentsCount}
                  onChange={(e) => setInstallmentsCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-750 mb-1">Mes y Año de Inicio</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={startMonth}
                    onChange={(e) => setStartMonth(parseInt(e.target.value))}
                    className="w-full px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
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
                    className="w-full px-2 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
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
                <label className="block text-xs font-bold text-slate-750 mb-1">¿En qué quincena inicia?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    key="q1"
                    type="button"
                    onClick={() => setStartQuincena(1)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                      startQuincena === 1
                        ? 'bg-rose-650 text-white border-rose-600 shadow-xs animate-in'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    1ª Quincena
                  </button>
                  <button
                    key="q2"
                    type="button"
                    onClick={() => setStartQuincena(2)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${
                      startQuincena === 2
                        ? 'bg-rose-650 text-white border-rose-600 shadow-xs animate-in'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    2ª Quincena
                  </button>
                </div>
              </div>

              {frequency === 'mensual' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-755 mb-1">Distribución Mensual</label>
                  <select
                    value={monthlyDistribution}
                    onChange={(e) => setMonthlyDistribution(e.target.value as MonthlyDistribution)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="both_equal">Ambas Quincenas (50/50)</option>
                    <option value="first_half">Solo 1ª Quincena (100% Q1)</option>
                    <option value="second_half">Solo 2ª Quincena (100% Q2)</option>
                  </select>
                </div>
              ) : (
                <div className="flex flex-col justify-end">
                  <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 flex items-center gap-2.5 text-xs text-slate-600 shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-[11px] leading-tight">Ciclo Quincenal Activo</div>
                      <div className="text-[10px] text-slate-500 truncate capitalize">
                        {count} cuotas desde {startQuincena}ª Qna de {MONTH_NAMES_ES[startMonth]} {startYear}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-rose-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Cuota periódica total estimada:</span>
                <span className="text-base font-black text-rose-600">
                  ~{formatCurrency(totalInstallmentAmount, currencyCode, currencySymbol)} /{frequency === 'quincenal' ? 'quincena' : 'mes'}
                </span>
              </div>

              {participantCount > 1 && (
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Cuota periódica a pagar por cada integrante:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {activeParticipantsList.map((m) => {
                      const share = computedShares[m.userId] || { amount: 0, percentage: 0 };
                      const memberInstallment = Math.round(share.amount / count);
                      return (
                        <div
                          key={m.userId}
                          className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80 flex items-center justify-between"
                        >
                          <span className="font-semibold text-slate-800">{m.name}:</span>
                          <span className="font-black text-rose-700">
                            {formatCurrency(memberInstallment, currencyCode, currencySymbol)} /{frequency === 'quincenal' ? 'qna' : 'mes'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!isSplitValid || !title.trim() || numTotalAmount <= 0}
              className={`px-6 py-2.5 text-xs font-black rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer ${
                isSplitValid && title.trim() && numTotalAmount > 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{debtToEdit ? 'Guardar Cambios' : 'Crear Deuda Familiar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
