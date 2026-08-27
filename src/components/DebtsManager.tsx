import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Edit2,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { DebtItem, PeriodSelection } from '../types';
import { calculateDebtLiquidationInfo, formatCurrency } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DebtsManagerProps {
  debts: DebtItem[];
  period: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  onOpenAddDebt: () => void;
  onEditDebt: (debt: DebtItem) => void;
  onDeleteDebt: (debtId: string) => void;
  onOpenPaymentModal: (debt: DebtItem, expectedAmount: number) => void;
}

export const DebtsManager: React.FC<DebtsManagerProps> = ({
  debts,
  period,
  currencyCode,
  currencySymbol,
  onOpenAddDebt,
  onEditDebt,
  onDeleteDebt,
  onOpenPaymentModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'paid'>('active');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<DebtItem | null>(null);

  const totalOriginal = debts.reduce((sum, d) => sum + d.totalOriginalAmount, 0);
  const totalPaidGlobal = debts.reduce((sum, d) => {
    const info = calculateDebtLiquidationInfo(d);
    return sum + info.totalPaid;
  }, 0);
  const totalRemainingGlobal = debts.reduce((sum, d) => {
    const info = calculateDebtLiquidationInfo(d);
    return sum + info.remainingBalance;
  }, 0);

  const filteredDebts = debts.filter((d) => {
    const info = calculateDebtLiquidationInfo(d);
    if (filter === 'active') return !info.isFullyPaid;
    if (filter === 'paid') return info.isFullyPaid;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedDebtId(expandedDebtId === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Global Stats */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Gestión y Control de Deudas Diferidas
              </h2>
              <p className="text-xs text-slate-500">
                Seguimiento de cuotas quincenales/mensuales, historial de pagos y fecha de liquidación
              </p>
            </div>
          </div>

          <button
            id="btn-add-new-debt"
            onClick={onOpenAddDebt}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nueva Deuda</span>
          </button>
        </div>

        {/* Global Debt Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
            <span className="text-slate-500 block">Total Original Adquirido</span>
            <span className="text-base font-extrabold text-slate-800">
              {formatCurrency(totalOriginal, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs">
            <span className="text-emerald-700 font-medium block">Total Ya Amortizado / Pagado</span>
            <span className="text-base font-extrabold text-emerald-800">
              {formatCurrency(totalPaidGlobal, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60 text-xs">
            <span className="text-rose-700 font-medium block">Saldo Restante por Pagar</span>
            <span className="text-base font-extrabold text-rose-800">
              {formatCurrency(totalRemainingGlobal, currencyCode, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500">Mostrar:</span>
          <button
            id="filter-debts-active"
            onClick={() => setFilter('active')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'active'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Activas ({debts.filter((d) => !calculateDebtLiquidationInfo(d).isFullyPaid).length})
          </button>
          <button
            id="filter-debts-paid"
            onClick={() => setFilter('paid')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Liquidadas ({debts.filter((d) => calculateDebtLiquidationInfo(d).isFullyPaid).length})
          </button>
          <button
            id="filter-debts-all"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todas ({debts.length})
          </button>
        </div>
      </div>

      {/* Debts List */}
      <div className="space-y-4">
        {filteredDebts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hay deudas en esta vista</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Registra tus compras a cuotas, créditos o préstamos para controlar el impacto en cada quincena.
            </p>
            <button
              onClick={onOpenAddDebt}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Deuda</span>
            </button>
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const liqInfo = calculateDebtLiquidationInfo(debt);
            const isExpanded = expandedDebtId === debt.id;
            const progressPercent = liqInfo.progressPercent;

            return (
              <div
                key={debt.id}
                id={`debt-card-${debt.id}`}
                className={`bg-white rounded-2xl border transition-all shadow-2xs ${
                  liqInfo.isFullyPaid
                    ? 'border-emerald-200/90 bg-emerald-50/20'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Title row */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{debt.title}</h3>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          {debt.tag}
                        </span>
                        {liqInfo.isFullyPaid ? (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ¡Liquidada al 100%!
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {debt.frequency === 'quincenal'
                              ? 'Cuotas Quincenales'
                              : `Cuota Mensual (${
                                  debt.monthlyDistribution === 'both_equal'
                                    ? 'Ambas quincenas 50/50'
                                    : debt.monthlyDistribution === 'both_custom'
                                    ? 'Ambas quincenas personalizada'
                                    : debt.monthlyDistribution === 'only_q1'
                                    ? 'Solo 1ra Quincena'
                                    : 'Solo 2da Quincena'
                                })`}
                          </span>
                        )}
                      </div>
                      {debt.notes && (
                        <p className="text-xs text-slate-500 italic">{debt.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!liqInfo.isFullyPaid && (
                        <button
                          id={`btn-pay-debt-${debt.id}`}
                          onClick={() => onOpenPaymentModal(debt, debt.installmentAmount)}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Pagar Cuota</span>
                        </button>
                      )}

                      <button
                        onClick={() => onEditDebt(debt)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar deuda"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingDebt(debt)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar deuda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">
                        {debt.payments.length} de {debt.installmentsCount} cuotas pagadas ({progressPercent}%)
                      </span>
                      <span className="text-rose-700 font-bold">
                        Resta:{' '}
                        {formatCurrency(liqInfo.remainingBalance, currencyCode, currencySymbol)} de{' '}
                        {formatCurrency(debt.totalOriginalAmount, currencyCode, currencySymbol)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          liqInfo.isFullyPaid ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Valor de Cuota</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(debt.installmentAmount, currencyCode, currencySymbol)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Ya Pagado</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(liqInfo.totalPaid, currencyCode, currencySymbol)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Saldo Restante</span>
                      <span className="font-extrabold text-rose-700">
                        {formatCurrency(liqInfo.remainingBalance, currencyCode, currencySymbol)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Liquidación Estimada</span>
                      <span className="font-bold text-indigo-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {liqInfo.estimatedPayoffDate}
                      </span>
                    </div>
                  </div>

                  {/* Payment History Toggle & Accordion */}
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      onClick={() => toggleExpand(debt.id)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-400" />
                        Historial de Cuotas Pagadas ({debt.payments.length})
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                        {debt.payments.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2 italic text-center">
                            Aún no se han registrado pagos para esta deuda.
                          </p>
                        ) : (
                          debt.payments.map((pay, idx) => (
                            <div
                              key={pay.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                                  #{pay.installmentNumber || idx + 1}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-800">
                                    {pay.notes || `Cuota #${pay.installmentNumber || idx + 1}`}
                                  </span>
                                  <span className="block text-[10px] text-slate-400">
                                    Periodo: {pay.periodKey} • Fecha: {new Date(pay.paidAt).toLocaleDateString('es-CO')}
                                  </span>
                                </div>
                              </div>

                              <span className="font-black text-emerald-700">
                                {formatCurrency(pay.amountPaid, currencyCode, currencySymbol)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!deletingDebt}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. La deuda y todo su historial de cuotas registradas serán eliminados permanentemente."
        itemName={deletingDebt ? `${deletingDebt.title} (${formatCurrency(deletingDebt.totalOriginalAmount, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingDebt(null)}
        onConfirm={() => {
          if (deletingDebt) {
            onDeleteDebt(deletingDebt.id);
            setDeletingDebt(null);
          }
        }}
      />
    </div>
  );
};
