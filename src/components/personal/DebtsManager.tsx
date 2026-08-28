import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DebtItem, PeriodSelection } from '../../types';
import { calculateDebtLiquidationInfo, formatCurrency } from '../../utils/formatters';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

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

  // Debt Simulator Sub-tab states
  const [subTab, setSubTab] = useState<'list' | 'simulator'>('list');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [extraPayment, setExtraPayment] = useState<number>(100000);

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

  // Simulator Logic
  const activeDebts = React.useMemo(() => {
    return debts.filter((d) => !calculateDebtLiquidationInfo(d).isFullyPaid);
  }, [debts]);

  const initializedRates = React.useMemo(() => {
    const initial: Record<string, number> = {};
    activeDebts.forEach((d) => {
      const tagLower = d.tag.toLowerCase();
      if (tagLower.includes('tarjeta') || tagLower.includes('credito') || tagLower.includes('credit')) {
        initial[d.id] = 28; // standard credit card rate
      } else if (tagLower.includes('banco') || tagLower.includes('prestamo') || tagLower.includes('crédito') || tagLower.includes('credito')) {
        initial[d.id] = 14; // standard bank loan
      } else {
        initial[d.id] = 0; // zero interest
      }
    });
    return initial;
  }, [activeDebts]);

  const currentRates = { ...initializedRates, ...rates };

  const runSimulation = React.useCallback((method: 'snowball' | 'avalanche') => {
    const simDebts = activeDebts.map((d) => {
      const info = calculateDebtLiquidationInfo(d);
      return {
        id: d.id,
        title: d.title,
        balance: info.remainingBalance,
        minPayment: d.installmentAmount * (d.frequency === 'quincenal' ? 2 : 1),
        rate: currentRates[d.id] || 0,
      };
    });

    let months = 0;
    let totalInterest = 0;
    const maxMonths = 360; // 30 years

    while (simDebts.some(d => d.balance > 0) && months < maxMonths) {
      months++;

      if (method === 'snowball') {
        simDebts.sort((a, b) => {
          if (a.balance <= 0) return 1;
          if (b.balance <= 0) return -1;
          return a.balance - b.balance;
        });
      } else {
        simDebts.sort((a, b) => {
          if (a.balance <= 0) return 1;
          if (b.balance <= 0) return -1;
          return b.rate - a.rate;
        });
      }

      let extraPool = extraPayment;

      // 1. Accrue interest and collect minimum payments
      for (let i = 0; i < simDebts.length; i++) {
        const d = simDebts[i];
        if (d.balance <= 0) continue;

        const monthlyInterest = d.balance * (d.rate / 12 / 100);
        totalInterest += monthlyInterest;
        d.balance += monthlyInterest;

        const minToPay = Math.min(d.balance, d.minPayment);
        d.balance -= minToPay;
        
        if (d.balance === 0) {
          extraPool += (d.minPayment - minToPay);
        }
      }

      // 2. Apply extra pool to the highest priority active debt
      for (let i = 0; i < simDebts.length; i++) {
        const d = simDebts[i];
        if (d.balance <= 0) continue;

        const extraToPay = Math.min(d.balance, extraPool);
        d.balance -= extraToPay;
        extraPool -= extraToPay;

        if (extraPool <= 0) break;
      }
    }

    return { months, totalInterest };
  }, [activeDebts, currentRates, extraPayment]);

  const snowballResult = React.useMemo(() => runSimulation('snowball'), [runSimulation]);
  const avalancheResult = React.useMemo(() => runSimulation('avalanche'), [runSimulation]);

  const toggleExpand = (id: string) => {
    setExpandedDebtId(expandedDebtId === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Global Stats */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-700">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Gestión y Control de Deudas Diferidas
              </h2>
              <p className="text-xs text-slate-500 font-normal">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-550 block font-medium">Total Original Adquirido</span>
            <span className="text-base font-extrabold text-slate-800">
              {formatCurrency(totalOriginal, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
            <span className="text-emerald-700 font-medium block">Total Ya Amortizado / Pagado</span>
            <span className="text-base font-extrabold text-emerald-800">
              {formatCurrency(totalPaidGlobal, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60">
            <span className="text-rose-705 font-medium block">Saldo Restante por Pagar</span>
            <span className="text-base font-extrabold text-rose-800">
              {formatCurrency(totalRemainingGlobal, currencyCode, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 pt-1 text-xs">
          <span className="font-semibold text-slate-500">Mostrar:</span>
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

      {/* SUB-TAB TOGGLE */}
      <div className="flex border-b border-slate-200 text-xs">
        <button
          type="button"
          onClick={() => setSubTab('list')}
          className={`px-4 py-2.5 font-black border-b-2 transition-all cursor-pointer ${
            subTab === 'list'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-505 hover:text-slate-900'
          }`}
        >
          Lista de Deudas
        </button>
        <button
          type="button"
          onClick={() => setSubTab('simulator')}
          className={`px-4 py-2.5 font-black border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'simulator'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-505 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-500" />
          <span>Simulador Bola de Nieve vs Avalancha</span>
        </button>
      </div>

      {subTab === 'list' ? (
        <div className="space-y-4">
          {filteredDebts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 mx-auto flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No hay deudas en esta vista</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
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
                  <div className="p-5 space-y-4 text-slate-700">
                    {/* Title row */}
                    <div className="flex flex-wrap items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 leading-tight">{debt.title}</h3>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            {debt.tag}
                          </span>
                          {liqInfo.isFullyPaid ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-250 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ¡Liquidada!
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {debt.frequency === 'quincenal'
                                ? 'Cuotas Quincenales'
                                : `Cuota Mensual (${
                                    debt.monthlyDistribution === 'both_equal'
                                      ? '50/50 ambas Q'
                                      : debt.monthlyDistribution === 'both_custom'
                                      ? 'Personalizada Q'
                                      : debt.monthlyDistribution === 'only_q1'
                                      ? 'Solo 1ra Q'
                                      : 'Solo 2da Q'
                                  })`}
                            </span>
                          )}
                        </div>
                        {debt.notes && (
                          <p className="text-xs text-slate-500 italic font-semibold">{debt.notes}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!liqInfo.isFullyPaid && (
                          <button
                            id={`btn-pay-debt-${debt.id}`}
                            onClick={() => onOpenPaymentModal(debt, debt.installmentAmount)}
                            className="px-3.5 py-1.5 text-[10px] font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
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
                          className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200/60 font-semibold">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Valor de Cuota</span>
                        <span className="font-bold text-slate-800">
                          {formatCurrency(debt.installmentAmount, currencyCode, currencySymbol)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Total Ya Pagado</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(liqInfo.totalPaid, currencyCode, currencySymbol)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Saldo Restante</span>
                        <span className="font-extrabold text-rose-700 text-xs">
                          {formatCurrency(liqInfo.remainingBalance, currencyCode, currencySymbol)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px]">Liquidación Estimada</span>
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
                        className="flex items-center justify-between w-full text-xs font-semibold text-slate-505 hover:text-slate-900 transition-colors cursor-pointer py-1"
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
                            <p className="text-xs text-slate-400 py-2 italic text-center font-normal">
                              Aún no se han registrado pagos para esta deuda.
                            </p>
                          ) : (
                            debt.payments.map((pay, idx) => (
                              <div
                                key={pay.id}
                                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-semibold"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-850 text-[10px] font-black flex items-center justify-center">
                                    #{pay.installmentNumber || idx + 1}
                                  </span>
                                  <div>
                                    <span className="font-bold text-slate-800">
                                      {pay.notes || `Cuota #${pay.installmentNumber || idx + 1}`}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 font-normal">
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
      ) : (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top description */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Acelera la Liquidación de tus Deudas</h3>
              <p className="text-xs text-slate-500 mt-1">
                Compara las dos estrategias de desendeudamiento más efectivas del mundo usando tu propio saldo extra.
              </p>
            </div>

            {/* Extra payment controller */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 font-sans">
                  Abono Mensual Extra Propuesto
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value ? parseFloat(e.target.value) : 0)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none animate-in"
                  />
                </div>
                <span className="block text-[10px] text-slate-405 mt-1 font-semibold">
                  Dinero adicional que estás dispuesto a aportar mensualmente además de tus cuotas mínimas fijos.
                </span>
              </div>

              <div className="flex flex-col justify-end space-y-2 text-slate-505 font-bold text-[10px]">
                <span className="uppercase tracking-wider">Abonos Rápidos</span>
                <div className="flex gap-2">
                  {[50000, 100000, 200000, 500000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setExtraPayment(val)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        extraPayment === val
                          ? 'bg-rose-650 border-rose-600 text-white'
                          : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                      }`}
                    >
                      +{formatCurrency(val, currencyCode, currencySymbol)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {activeDebts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400 font-normal">
              No tienes deudas activas para simular. ¡Estás a paz y salvo!
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Side: Debt Rates Editor */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Configurar Tasas de Interés
                </h3>
                <p className="text-[11px] text-slate-505 font-semibold">
                  Ingresa la tasa efectiva anual (%) de tus deudas para que el cálculo de intereses sea exacto.
                </p>

                <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                  {activeDebts.map((d) => {
                    const rateValue = currentRates[d.id] ?? 0;
                    return (
                      <div key={d.id} className="space-y-1 bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="font-bold text-slate-850 truncate max-w-[150px]">{d.title}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-150">{d.tag}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="0.5"
                            value={rateValue}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setRates((prev) => ({ ...prev, [d.id]: v }));
                            }}
                            className="flex-1 accent-rose-605 cursor-pointer"
                          />
                          <span className="text-xs font-black text-slate-800 shrink-0 w-12 text-right">
                            {rateValue}% E.A.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Simulation Results */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Snowball Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden text-slate-700">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full flex items-center justify-center text-rose-650 opacity-10 font-sans">
                      ❄️
                    </div>
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                      Método Bola de Nieve
                    </span>
                    <h4 className="text-xs font-semibold text-slate-505 mt-0.5">Primero las deudas más pequeñas</h4>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Tiempo Estimado</span>
                        <span className="text-base font-extrabold text-slate-800">
                          {snowballResult.months} meses
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Interés a Pagar</span>
                        <span className="text-base font-extrabold text-slate-850">
                          {formatCurrency(snowballResult.totalInterest, currencyCode, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Avalanche Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden text-slate-700">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-bl-full flex items-center justify-center text-teal-650 opacity-10 font-sans">
                      ⚡
                    </div>
                    <span className="text-[10px] font-bold text-teal-650 uppercase tracking-wider block">
                      Método Avalancha
                    </span>
                    <h4 className="text-xs font-semibold text-slate-505 mt-0.5">Primero deudas con mayor interés</h4>
                    
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Tiempo Estimado</span>
                        <span className="text-base font-extrabold text-slate-800">
                          {avalancheResult.months} meses
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Interés a Pagar</span>
                        <span className="text-base font-extrabold text-slate-850">
                          {formatCurrency(avalancheResult.totalInterest, currencyCode, currencySymbol)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comparative Summary Alert */}
                {(() => {
                  const interestDiff = Math.abs(snowballResult.totalInterest - avalancheResult.totalInterest);
                  const monthsDiff = Math.abs(snowballResult.months - avalancheResult.months);
                  const avalancheIsCheaper = avalancheResult.totalInterest < snowballResult.totalInterest;

                  return (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-950 space-y-2">
                      <div className="flex items-center gap-2 text-rose-800 font-bold">
                        <Sparkles className="w-4 h-4 text-rose-600" />
                        <span>Recomendación Estratégica del Simulador</span>
                      </div>
                      <p className="leading-relaxed">
                        {avalancheIsCheaper ? (
                          <span>
                            El método de <strong>Avalancha</strong> es matemáticamente más barato, ahorrándote{' '}
                            <strong className="text-emerald-700 font-bold">
                              {formatCurrency(interestDiff, currencyCode, currencySymbol)}
                            </strong>{' '}
                            en cargos de interés totales en comparación con Bola de Nieve.
                          </span>
                        ) : (
                          <span>
                            Ambos métodos conllevan gastos de interés similares debido a la composición de las tasas actuales.
                          </span>
                        )}
                        {' '}
                        {monthsDiff > 0 && (
                          <span>
                            Además, la estrategia más veloz te permite liberarte por completo de las deudas{' '}
                            <strong>{monthsDiff} {monthsDiff === 1 ? 'mes' : 'meses'} antes</strong>.
                          </span>
                        )}
                      </p>
                      
                      <div className="pt-2 border-t border-rose-200/60 mt-1 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-bold">
                        <div>
                          💡 <strong>Bola de Nieve</strong> te da victorias psicológicas rápidas al liquidar primero los saldos pequeños.
                        </div>
                        <div>
                          💡 <strong>Avalancha</strong> minimiza el costo financiero neto liquidando primero las tasas caras.
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

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
