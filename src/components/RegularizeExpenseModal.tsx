import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Users,
  User,
  CreditCard,
  Receipt,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  DebtFrequency,
  PendingExpense,
  PeriodSelection,
  ParticipantShare,
  SplitMethod,
  SettlementType,
  DebtItem,
  SporadicTransaction,
} from '../types';
import { formatCurrency, getPeriodKey, MONTH_NAMES_ES } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface RegularizeExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: PendingExpense | null;
  currentPeriod: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  onCompleteRegularization: (
    updatedExpense: PendingExpense,
    generatedDebt?: Omit<DebtItem, 'id' | 'payments' | 'createdAt'>,
    generatedTransaction?: Omit<SporadicTransaction, 'id'>
  ) => void;
}

interface TempParticipant {
  id: string;
  name: string;
  isOwner: boolean;
  assignedAmount: number;
}

export const RegularizeExpenseModal: React.FC<RegularizeExpenseModalProps> = ({
  isOpen,
  onClose,
  expense,
  currentPeriod,
  currencyCode,
  currencySymbol,
  onCompleteRegularization,
}) => {
  if (!isOpen || !expense) return null;

  // Mode: personal vs shared
  const [scope, setScope] = useState<'personal' | 'shared'>(expense.scope);
  
  // Destination for personal
  const [personalDestination, setPersonalDestination] = useState<'sporadic' | 'debt'>('sporadic');

  // Shared split configuration
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [settlementType, setSettlementType] = useState<SettlementType>('instant');
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [frequency, setFrequency] = useState<DebtFrequency>('quincenal');

  // Common target period
  const [targetYear, setTargetYear] = useState(currentPeriod.year);
  const [targetMonth, setTargetMonth] = useState(currentPeriod.month);
  const [targetQuincena, setTargetQuincena] = useState<1 | 2>(
    currentPeriod.periodType === 'quincena' ? currentPeriod.quincena : 1
  );
  const [tag, setTag] = useState(expense.tag || 'Ocio');
  const [deletingParticipant, setDeletingParticipant] = useState<TempParticipant | null>(null);

  // Participants list for shared
  const [participants, setParticipants] = useState<TempParticipant[]>(() => {
    if (expense.participants && expense.participants.length > 0) {
      return expense.participants.map((p) => ({
        id: p.id,
        name: p.name,
        isOwner: p.isOwner,
        assignedAmount: p.assignedAmount,
      }));
    }
    // Default 2 participants: Owner (Me) + Partner/Friend
    const half = Math.round(expense.amount / 2);
    return [
      { id: 'part-owner', name: 'Yo (Titular)', isOwner: true, assignedAmount: half },
      { id: 'part-2', name: 'Pareja / Acompañante', isOwner: false, assignedAmount: expense.amount - half },
    ];
  });

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Recompute equal split when splitMethod changes or participants count changes
  useEffect(() => {
    if (splitMethod === 'equal' && participants.length > 0) {
      const count = participants.length;
      const baseShare = Math.floor(expense.amount / count);
      const remainder = expense.amount - baseShare * count;

      setParticipants((prev) =>
        prev.map((p, idx) => ({
          ...p,
          assignedAmount: idx === 0 ? baseShare + remainder : baseShare,
        }))
      );
    }
  }, [splitMethod, participants.length, expense.amount]);

  // Add participant
  const handleAddParticipant = () => {
    const newId = `part-${Date.now()}`;
    const nextNumber = participants.length + 1;
    const newPart: TempParticipant = {
      id: newId,
      name: `Persona ${nextNumber}`,
      isOwner: false,
      assignedAmount: 0,
    };
    const updated = [...participants, newPart];
    if (splitMethod === 'equal') {
      const count = updated.length;
      const baseShare = Math.floor(expense.amount / count);
      const remainder = expense.amount - baseShare * count;
      setParticipants(
        updated.map((p, idx) => ({
          ...p,
          assignedAmount: idx === 0 ? baseShare + remainder : baseShare,
        }))
      );
    } else {
      setParticipants(updated);
    }
  };

  // Remove participant
  const handleRemoveParticipant = (id: string) => {
    if (participants.length <= 2) return; // Keep at least 2 for shared
    const updated = participants.filter((p) => p.id !== id);
    if (splitMethod === 'equal') {
      const count = updated.length;
      const baseShare = Math.floor(expense.amount / count);
      const remainder = expense.amount - baseShare * count;
      setParticipants(
        updated.map((p, idx) => ({
          ...p,
          assignedAmount: idx === 0 ? baseShare + remainder : baseShare,
        }))
      );
    } else {
      setParticipants(updated);
    }
  };

  // Update participant name
  const handleUpdateParticipantName = (id: string, name: string) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  // Update participant amount (manual mode)
  const handleUpdateParticipantAmount = (id: string, amount: number) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, assignedAmount: Math.max(0, amount) } : p))
    );
  };

  // Validation math for manual split
  const totalAssigned = participants.reduce((sum, p) => sum + (p.assignedAmount || 0), 0);
  const diff = Math.round(expense.amount - totalAssigned);
  const isSplitValid = scope === 'personal' || Math.abs(diff) < 0.01;

  // Handle final submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSplitValid) return;

    const periodKey = getPeriodKey(targetYear, targetMonth, targetQuincena);
    const targetPeriodKey = periodKey;

    if (scope === 'personal') {
      // 1. Personal expense
      if (personalDestination === 'sporadic') {
        const genTx: Omit<SporadicTransaction, 'id'> = {
          title: expense.title,
          type: 'expense',
          amount: expense.amount,
          tag,
          periodKey: targetPeriodKey,
          date: expense.date,
          isScheduled: false,
          notes: `Regularizado desde lista de espera. ${expense.notes || ''}`.trim(),
          isCompleted: true,
        };

        const updatedExp: PendingExpense = {
          ...expense,
          scope: 'personal',
          status: 'regularized',
          tag,
          destination: 'sporadic_expense',
        };

        onCompleteRegularization(updatedExp, undefined, genTx);
      } else {
        // Personal debt
        const installmentAmount = Math.round(expense.amount / installmentsCount);
        const genDebt: Omit<DebtItem, 'id' | 'payments' | 'createdAt'> = {
          title: expense.title,
          tag,
          totalOriginalAmount: expense.amount,
          installmentsCount,
          installmentAmount,
          frequency,
          monthlyDistribution: 'both_equal',
          startYear: targetYear,
          startMonth: targetMonth,
          startQuincena: targetQuincena,
          notes: `Deuda creada desde gasto por etiquetar. ${expense.notes || ''}`.trim(),
        };

        const updatedExp: PendingExpense = {
          ...expense,
          scope: 'personal',
          status: 'regularized',
          tag,
          destination: 'debt',
          settlementType: 'debt_installments',
          installmentsCount,
          frequency,
        };

        onCompleteRegularization(updatedExp, genDebt, undefined);
      }
    } else {
      // 2. Shared expense
      const ownerPart = participants.find((p) => p.isOwner) || participants[0];
      const ownerAmount = ownerPart.assignedAmount;

      const finalParticipants: ParticipantShare[] = participants.map((p) => {
        const isOwner = p.isOwner;
        const partInstallmentAmount =
          settlementType === 'debt_installments' && installmentsCount > 0
            ? Math.round(p.assignedAmount / installmentsCount)
            : undefined;

        // Existing payments if editing, or fresh record
        const existingShare = expense.participants?.find((ep) => ep.id === p.id);
        const paidAmount = existingShare?.paidAmount ?? (isOwner ? p.assignedAmount : 0);

        return {
          id: p.id,
          name: p.name.trim() || (isOwner ? 'Yo (Titular)' : 'Participante'),
          isOwner,
          assignedAmount: p.assignedAmount,
          installmentsCount: settlementType === 'debt_installments' ? installmentsCount : undefined,
          installmentAmount: partInstallmentAmount,
          paidAmount,
          isSettled: paidAmount >= p.assignedAmount,
          payments: existingShare?.payments || (isOwner ? [
            {
              id: `part-pay-${Date.now()}`,
              amount: p.assignedAmount,
              paidAt: new Date().toISOString(),
              notes: 'Parte asumida e integrada a mis finanzas',
            },
          ] : []),
        };
      });

      let genDebt: Omit<DebtItem, 'id' | 'payments' | 'createdAt'> | undefined = undefined;
      let genTx: Omit<SporadicTransaction, 'id'> | undefined = undefined;

      if (settlementType === 'instant') {
        // Owner's share goes into sporadic expenses for this period
        genTx = {
          title: `Mi parte: ${expense.title}`,
          type: 'expense',
          amount: ownerAmount,
          tag,
          periodKey: targetPeriodKey,
          date: expense.date,
          isScheduled: false,
          notes: `Gasto compartido (${participants.map((p) => `${p.name}: ${formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}`).join(', ')}).`,
          isCompleted: true,
        };
      } else {
        // Owner's share goes into debts at installments
        const ownerInstallmentAmount = Math.round(ownerAmount / installmentsCount);
        genDebt = {
          title: `Mi parte: ${expense.title}`,
          tag,
          totalOriginalAmount: ownerAmount,
          installmentsCount,
          installmentAmount: ownerInstallmentAmount,
          frequency,
          monthlyDistribution: 'both_equal',
          startYear: targetYear,
          startMonth: targetMonth,
          startQuincena: targetQuincena,
          notes: `Deuda compartida total ${formatCurrency(expense.amount, currencyCode, currencySymbol)} (${participants.map((p) => `${p.name}: ${formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}`).join(', ')}).`,
        };
      }

      const updatedExp: PendingExpense = {
        ...expense,
        scope: 'shared',
        status: 'regularized',
        tag,
        splitMethod,
        settlementType,
        installmentsCount: settlementType === 'debt_installments' ? installmentsCount : undefined,
        frequency: settlementType === 'debt_installments' ? frequency : undefined,
        participants: finalParticipants,
      };

      onCompleteRegularization(updatedExp, genDebt, genTx);
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Regularizar & Ajustar Cuentas
              </h3>
              <p className="text-xs text-emerald-100">
                {expense.title} • {formatCurrency(expense.amount, currencyCode, currencySymbol)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* 1. Selector de Alcance: Solo Mío vs Compartido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. ¿Cómo se distribuirá este gasto?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                  scope === 'personal'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'personal' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">Solo Mío (Personal)</div>
                  <div className="text-[11px] text-slate-500">100% asumido por mí</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('shared')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left cursor-pointer ${
                  scope === 'shared'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'shared' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold">Dividir con otros</div>
                  <div className="text-[11px] text-slate-500">Pareja, amigos o familia</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. CASO PERSONAL: Elegir destino (Gasto esporádico vs Deuda a cuotas) */}
          {scope === 'personal' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Destino del Gasto Personal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPersonalDestination('sporadic')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                    personalDestination === 'sporadic'
                      ? 'border-emerald-500 bg-white text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white/60 hover:bg-white text-slate-600'
                  }`}
                >
                  <Receipt className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Gasto Esporádico</div>
                    <div className="text-[11px] text-slate-500">
                      Descontar de una sola vez en el saldo de este periodo
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPersonalDestination('debt')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                    personalDestination === 'debt'
                      ? 'border-emerald-500 bg-white text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white/60 hover:bg-white text-slate-600'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-600 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Deuda a Cuotas</div>
                    <div className="text-[11px] text-slate-500">
                      Enviar al módulo de Deudas y pagar quincenal/mensual
                    </div>
                  </div>
                </button>
              </div>

              {personalDestination === 'debt' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Número de Cuotas
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="60"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(Math.max(2, parseInt(e.target.value) || 2))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Frecuencia de Pago
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as DebtFrequency)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="quincenal">Quincenal (Cada 15 días)</option>
                      <option value="mensual">Mensual (1 vez al mes)</option>
                    </select>
                  </div>
                  <div className="col-span-full p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200 text-xs text-emerald-900 font-medium">
                    Valor estimado por cuota:{' '}
                    <span className="font-bold">
                      {formatCurrency(
                        Math.round(expense.amount / installmentsCount),
                        currencyCode,
                        currencySymbol
                      )}
                    </span>{' '}
                    ({installmentsCount} cuotas {frequency}es)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. CASO COMPARTIDO: Configurar participantes y método */}
          {scope === 'shared' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Método de división */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Método de División
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSplitMethod('equal')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      splitMethod === 'equal'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Equitativa (Partes Iguales)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitMethod('manual')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      splitMethod === 'manual'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Manual (Valores Personalizados)
                  </button>
                </div>
              </div>

              {/* Lista de Participantes */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Participantes ({participants.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddParticipant}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Persona
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {participants.map((p, idx) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>

                      {/* Nombre */}
                      <input
                        type="text"
                        disabled={p.isOwner}
                        value={p.name}
                        onChange={(e) => handleUpdateParticipantName(p.id, e.target.value)}
                        placeholder="Nombre de la persona"
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 disabled:opacity-80"
                      />

                      {/* Monto Asignado */}
                      <div className="relative w-32 shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          disabled={splitMethod === 'equal'}
                          value={p.assignedAmount}
                          onChange={(e) =>
                            handleUpdateParticipantAmount(p.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right disabled:bg-slate-100"
                        />
                      </div>

                      {/* Botón eliminar si no es el dueño */}
                      {!p.isOwner && participants.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setDeletingParticipant(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Eliminar participante"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Comprobación matemática y restricción estricta de suma */}
                <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Total del gasto a cubrir:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(expense.amount, currencyCode, currencySymbol)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600">Suma total asignada:</span>
                    <span
                      className={`font-bold ${
                        isSplitValid ? 'text-emerald-600' : 'text-rose-600 font-extrabold'
                      }`}
                    >
                      {formatCurrency(totalAssigned, currencyCode, currencySymbol)}
                    </span>
                  </div>

                  {!isSplitValid && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>
                        {diff > 0
                          ? `Faltan por asignar ${formatCurrency(diff, currencyCode, currencySymbol)}. Los valores deben sumar exactamente el total.`
                          : `Se excede por ${formatCurrency(Math.abs(diff), currencyCode, currencySymbol)}. Ajusta los valores para coincidir.`}
                      </span>
                    </div>
                  )}

                  {isSplitValid && (
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Distribución 100% balanceada y correcta.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Modalidad de Pago de lo Compartido */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  3. ¿Cómo se pagará este gasto compartido?
                </label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setSettlementType('instant')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                      settlementType === 'instant'
                        ? 'border-emerald-500 bg-white text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-600'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">Gasto de Contado</div>
                      <div className="text-[11px] text-slate-500">
                        Tu parte se descuenta de tu saldo actual
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlementType('debt_installments')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                      settlementType === 'debt_installments'
                        ? 'border-emerald-500 bg-white text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">Deuda a Cuotas</div>
                      <div className="text-[11px] text-slate-500">
                        Dividir en cuotas periódicas para cada persona
                      </div>
                    </div>
                  </button>
                </div>

                {settlementType === 'debt_installments' && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Número de Cuotas
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="60"
                          value={installmentsCount}
                          onChange={(e) =>
                            setInstallmentsCount(Math.max(2, parseInt(e.target.value) || 2))
                          }
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Frecuencia de Cuota
                        </label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value as DebtFrequency)}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          <option value="quincenal">Quincenal (Cada 15 días)</option>
                          <option value="mensual">Mensual (1 vez al mes)</option>
                        </select>
                      </div>
                    </div>

                    {/* Tabla de cuotas por persona */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div className="font-bold text-slate-800 mb-1.5">
                        Cálculo de Cuota por Participante:
                      </div>
                      <div className="space-y-1">
                        {participants.map((p) => {
                          const quota = Math.round(p.assignedAmount / installmentsCount);
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-[11px] text-slate-700 py-0.5 border-b border-slate-100 last:border-0"
                            >
                              <span className={p.isOwner ? 'font-bold text-emerald-700' : ''}>
                                {p.name} {p.isOwner ? '(Tú)' : ''}:
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(quota, currencyCode, currencySymbol)} / {frequency === 'quincenal' ? 'quincena' : 'mes'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Periodo y Categoría */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Periodo de Aplicación
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={targetQuincena}
                  onChange={(e) => setTargetQuincena(parseInt(e.target.value) as 1 | 2)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value={1}>Quincena 1 (Días 1-15)</option>
                  <option value={2}>Quincena 2 (Días 16-fin)</option>
                </select>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(parseInt(e.target.value))}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {MONTH_NAMES_ES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Categoría / Etiqueta
              </label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Ej. Ocio, Cine, Restaurante..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isSplitValid}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all ${
                isSplitValid
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer hover:shadow-lg'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              Confirmar & Alimentar Finanzas
            </button>
          </div>
        </form>
      </div>

      {/* CONFIRM DELETE PARTICIPANT */}
      <ConfirmDeleteModal
        isOpen={!!deletingParticipant}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. El participante será removido de la división del gasto y los montos se redistribuirán."
        itemName={deletingParticipant ? `Participante: ${deletingParticipant.name}` : undefined}
        confirmText="Sí, eliminar participante"
        onClose={() => setDeletingParticipant(null)}
        onConfirm={() => {
          if (deletingParticipant) {
            handleRemoveParticipant(deletingParticipant.id);
            setDeletingParticipant(null);
          }
        }}
      />
    </div>
  );
};
