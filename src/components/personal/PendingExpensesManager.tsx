import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Search,
  Users,
  User,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit2,
  HandCoins,
  History,
  ChevronsUpDown,
  Sparkles,
} from 'lucide-react';
import {
  ParticipantShare,
  PendingExpense,
  PeriodSelection,
} from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface PendingExpensesManagerProps {
  expenses: PendingExpense[];
  period: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  onOpenAddExpense: () => void;
  onEditExpense: (expense: PendingExpense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onOpenRegularize: (expense: PendingExpense) => void;
  onOpenParticipantPayment: (expense: PendingExpense, participant: ParticipantShare) => void;
}

export const PendingExpensesManager: React.FC<PendingExpensesManagerProps> = ({
  expenses,
  currencyCode,
  currencySymbol,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onOpenRegularize,
  onOpenParticipantPayment,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'shared' | 'regularized'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [deletingExpense, setDeletingExpense] = useState<PendingExpense | null>(null);

  const toggleExpandCard = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandAll = () => {
    const allExpanded = filteredExpenses.every((e) => expandedCards[e.id]);
    const newState: Record<string, boolean> = {};
    filteredExpenses.forEach((e) => {
      newState[e.id] = !allExpanded;
    });
    setExpandedCards(newState);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const pendingList = expenses.filter((e) => e.status === 'pending');
    const totalPendingAmount = pendingList.reduce((sum, e) => sum + e.amount, 0);

    const sharedList = expenses.filter((e) => e.scope === 'shared');
    
    // Sum of amounts owed by non-owners
    let totalToCollect = 0;
    let totalCollected = 0;

    sharedList.forEach((e) => {
      (e.participants || []).forEach((p) => {
        if (!p.isOwner) {
          totalToCollect += Math.max(0, p.assignedAmount - p.paidAmount);
          totalCollected += p.paidAmount;
        }
      });
    });

    const regularizedCount = expenses.filter((e) => e.status === 'regularized').length;

    return {
      pendingCount: pendingList.length,
      totalPendingAmount,
      sharedCount: sharedList.length,
      totalToCollect,
      totalCollected,
      regularizedCount,
    };
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Tab filter
      if (filterTab === 'pending' && e.status !== 'pending') return false;
      if (filterTab === 'shared' && e.scope !== 'shared') return false;
      if (filterTab === 'regularized' && e.status !== 'regularized') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesTag = e.tag?.toLowerCase().includes(q);
        const matchesNotes = e.notes?.toLowerCase().includes(q);
        const matchesParticipants = e.participants?.some((p) =>
          p.name.toLowerCase().includes(q)
        );
        if (!matchesTitle && !matchesTag && !matchesNotes && !matchesParticipants) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, filterTab, searchQuery]);

  const areAllExpanded =
    filteredExpenses.length > 0 && filteredExpenses.every((e) => expandedCards[e.id]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-5 rounded-2xl border border-amber-200/80">
        <div className="text-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                Gastos por Clasificar & Dividir
              </h1>
              <p className="text-xs text-slate-500 font-normal">
                Bandeja de entradas: registra salidas, cine, compras y gastos compartidos para luego clasificarlos y regularizarlos
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-add-pending-expense"
          onClick={onOpenAddExpense}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Registrar Gasto por Clasificar
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs text-slate-550 font-semibold">
        {/* Metric 1: Pendientes de Regularizar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-500">
            <span>En Lista de Espera</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-slate-900">
            {formatCurrency(metrics.totalPendingAmount, currencyCode, currencySymbol)}
          </div>
          <div className="text-[11px] text-amber-600 font-bold mt-0.5">
            {metrics.pendingCount} gasto{metrics.pendingCount !== 1 ? 's' : ''} por clasificar
          </div>
        </div>

        {/* Metric 2: Por Cobrar a Terceros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-500">
            <span>Por Cobrar a Otros</span>
            <HandCoins className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-teal-700">
            {formatCurrency(metrics.totalToCollect, currencyCode, currencySymbol)}
          </div>
          <div className="text-[11px] text-teal-600 font-bold mt-0.5">
            Saldo pendiente de participantes
          </div>
        </div>

        {/* Metric 3: Total Recuperado */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-500">
            <span>Recuperado / Cobrado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-700">
            {formatCurrency(metrics.totalCollected, currencyCode, currencySymbol)}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
            Abonos ya recibidos de terceros
          </div>
        </div>

        {/* Metric 4: Gastos Compartidos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-slate-500">
            <span>Gastos Compartidos</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-indigo-900">
            {metrics.sharedCount}
          </div>
          <div className="text-[11px] text-slate-500 font-bold mt-0.5">
            {metrics.regularizedCount} regularizados en el sistema
          </div>
        </div>
      </div>

      {/* Filter Tabs, Search & Expand All */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-bold text-slate-600">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-605 hover:bg-slate-100'
            }`}
          >
            Todos ({expenses.length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'pending'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Por Clasificar ({metrics.pendingCount})
          </button>
          <button
            onClick={() => setFilterTab('shared')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'shared'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Compartidos ({metrics.sharedCount})
          </button>
          <button
            onClick={() => setFilterTab('regularized')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterTab === 'regularized'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Regularizados ({metrics.regularizedCount})
          </button>
        </div>

        {/* Right side: Search & Toggle Expand All */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={toggleExpandAll}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 rounded-lg transition-colors cursor-pointer shrink-0"
            title={areAllExpanded ? 'Contraer todas las filas' : 'Expandir todas las filas'}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
            <span>{areAllExpanded ? 'Contraer Todo' : 'Expandir Todo'}</span>
          </button>

          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar gasto, persona, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Expenses Cards List */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Tag className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">No hay gastos en esta vista</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? 'No se encontraron gastos que coincidan con la búsqueda.'
              : 'Registra tus gastos recientes para mantenerlos en lista de espera y luego regularizarlos.'}
          </p>
          <button
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Registrar Nuevo Gasto
          </button>
        </div>
      ) : (
        <div className="space-y-3 text-slate-700">
          {filteredExpenses.map((expense) => {
            const isPending = expense.status === 'pending';
            const isShared = expense.scope === 'shared';
            const isExpanded = !!expandedCards[expense.id];

            // Compute shares summary if shared
            const participants = expense.participants || [];
            const nonOwnerParticipants = participants.filter((p) => !p.isOwner);
            const totalOthersAssigned = nonOwnerParticipants.reduce(
              (sum, p) => sum + p.assignedAmount,
              0
            );
            const totalOthersPaid = nonOwnerParticipants.reduce(
              (sum, p) => sum + p.paidAmount,
              0
            );
            const totalOthersRemaining = Math.max(0, totalOthersAssigned - totalOthersPaid);
            const percentPaid =
              totalOthersAssigned > 0
                ? Math.round((totalOthersPaid / totalOthersAssigned) * 100)
                : 100;

            return (
              <div
                key={expense.id}
                className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-xs ${
                  isPending
                    ? 'border-amber-200/90 ring-1 ring-amber-500/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Main Card Header */}
                <div
                  onClick={() => toggleExpandCard(expense.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
                >
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Scope Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isShared
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isShared ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {isShared ? `Compartido (${participants.length || 2} personas)` : 'Solo Mío'}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isPending
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            En Lista de Espera
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Regularizado en Finanzas
                          </>
                        )}
                      </span>

                      {/* Tag */}
                      {expense.tag && (
                        <span className="text-[10px] font-semibold text-slate-650 bg-slate-100 px-2 py-0.5 rounded-md">
                          {expense.tag}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-semibold">
                        Fecha: {expense.date}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight truncate leading-tight">
                        {expense.title}
                      </h3>
                      {isShared && nonOwnerParticipants.length > 0 && (
                        <span className="hidden md:inline-flex text-[10px] font-bold text-slate-505 bg-slate-105 px-2 py-0.5 rounded-md border border-slate-200">
                          {percentPaid}% cobrado ({formatCurrency(totalOthersPaid, currencyCode, currencySymbol)} / {formatCurrency(totalOthersAssigned, currencyCode, currencySymbol)})
                        </span>
                      )}
                    </div>

                    {expense.notes && (
                      <p className="text-xs text-slate-500 line-clamp-1">{expense.notes}</p>
                    )}
                  </div>

                  {/* Right: Amount & Primary CTA */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 font-medium">Valor Total</div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono">
                        {formatCurrency(expense.amount, currencyCode, currencySymbol)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {/* Button to Regularize / Split */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRegularize(expense);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer ${
                          isPending
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                        title="Ajustar cuentas, dividir o asignar a gastos/deudas"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isPending ? 'Ajustar Cuentas' : 'Reajustar'}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditExpense(expense);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Editar datos básicos"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingExpense(expense);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Eliminar gasto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Expand / Collapse Chevron */}
                      <div
                        className={`p-1.5 rounded-lg border transition-all ${
                          isExpanded
                            ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                            : 'text-slate-500 bg-slate-100/80 border-slate-200/90 hover:bg-slate-200'
                        }`}
                        title={isExpanded ? 'Contraer detalles' : 'Ver más detalles'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-4 animate-in fade-in-50 duration-200 text-xs">
                    {isShared && participants.length > 0 ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-550">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                              Liquidación de Participantes ({participants.length})
                            </span>
                            {expense.settlementType === 'debt_installments' && (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                                {expense.installmentsCount} cuotas {expense.frequency}es
                              </span>
                            )}
                          </div>

                          {nonOwnerParticipants.length > 0 && (
                            <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                              <span>
                                Cobrado: {formatCurrency(totalOthersPaid, currencyCode, currencySymbol)} /{' '}
                                {formatCurrency(totalOthersAssigned, currencyCode, currencySymbol)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  totalOthersRemaining === 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {percentPaid}%
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar for Shared */}
                        {nonOwnerParticipants.length > 0 && (
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                              style={{ width: `${percentPaid}%` }}
                            />
                          </div>
                        )}

                        {/* Participants List */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {participants.map((p) => {
                            const remaining = Math.max(0, p.assignedAmount - p.paidAmount);
                            const isDone = remaining === 0;

                            return (
                              <div
                                key={p.id}
                                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 transition shadow-2xs ${
                                  p.isOwner
                                    ? 'bg-white border-emerald-205 ring-1 ring-emerald-500/10'
                                    : isDone
                                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-700 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-800 font-semibold'
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                        p.isOwner
                                          ? 'bg-emerald-500 text-white shadow-2xs'
                                          : isDone
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {p.isOwner ? 'Yo' : p.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-xs font-bold text-slate-900">
                                        {p.name} {p.isOwner ? '(Mi Parte)' : ''}
                                      </div>
                                      <div className="text-[11px] text-slate-505 font-medium leading-none mt-1">
                                        Asignado:{' '}
                                        <span className="font-bold text-slate-800">
                                          {formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}
                                        </span>
                                        {p.installmentAmount && p.installmentAmount > 0 && (
                                          <span className="ml-1 text-[10px] text-purple-700 font-bold">
                                            ({formatCurrency(p.installmentAmount, currencyCode, currencySymbol)}/cuota)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right">
                                    {isDone ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-150">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Pagado
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                                        Debe: {formatCurrency(remaining, currencyCode, currencySymbol)}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Action Button for non-owners to register payment */}
                                {!p.isOwner && !isDone && (
                                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                                    <span className="text-[11px] text-slate-550">
                                      Pagado: <strong className="text-slate-800">{formatCurrency(p.paidAmount, currencyCode, currencySymbol)}</strong>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenParticipantPayment(expense, p);
                                      }}
                                      className="flex items-center gap-1 text-[10px] font-black text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-205 transition cursor-pointer"
                                    >
                                      <HandCoins className="w-3.5 h-3.5" />
                                      Registrar Pago
                                    </button>
                                  </div>
                                )}

                                {/* Payment history list if payments exist */}
                                {p.payments && p.payments.length > 0 && (
                                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                                    <div className="font-semibold text-slate-700 flex items-center gap-1 text-[11px]">
                                      <History className="w-3 h-3 text-slate-400" /> Abonos ({p.payments.length}):
                                    </div>
                                    {p.payments.map((pay) => (
                                      <div key={pay.id} className="flex items-center justify-between text-[11px] bg-slate-50 px-2 py-1 rounded-md">
                                        <span>{pay.paidAt.slice(0, 10)} {pay.notes ? `• ${pay.notes}` : ''}</span>
                                        <span className="font-bold text-emerald-700">
                                          +{formatCurrency(pay.amount, currencyCode, currencySymbol)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      /* Single / Personal expense details panel */
                      <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                              Detalle del Gasto Personal
                            </span>
                            <p className="text-xs text-slate-505 font-normal">
                              {isPending
                                ? 'Este gasto se encuentra actualmente en tu lista de espera sin regularizar.'
                                : 'Gasto ya regularizado y sincronizado en tu presupuesto.'}
                            </p>
                          </div>

                          {isPending && (
                            <button
                              type="button"
                              onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenRegularize(expense);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              Asignar a Mis Finanzas Ahora
                            </button>
                          )}
                        </div>

                        {expense.notes && (
                          <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100 font-semibold">
                            <strong>Notas:</strong> {expense.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={!!deletingExpense}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. El gasto y todas sus particiones o historial serán eliminados definitivamente."
        itemName={deletingExpense ? `${deletingExpense.title} (${formatCurrency(deletingExpense.amount, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingExpense(null)}
        onConfirm={() => {
          if (deletingExpense) {
            onDeleteExpense(deletingExpense.id);
            setDeletingExpense(null);
          }
        }}
      />
    </div>
  );
};
