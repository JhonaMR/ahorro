import React from 'react';
import {
  CreditCard,
  PiggyBank,
  TrendingUp,
  Sparkles,
  Calendar,
  ChevronRight,
  Coins,
  ArrowRight,
  CalendarDays,
  Clock,
  Tag,
} from 'lucide-react';
import { AppData, PeriodSelection } from '../../types';
import { PeriodFinancialSummary, calculateGlobalMetrics } from '../../utils/calculator';
import { calculateDebtLiquidationInfo, formatCurrency, getPeriodLabel } from '../../utils/formatters';

interface DashboardProps {
  data: AppData;
  period: PeriodSelection;
  summary: PeriodFinancialSummary;
  onNavigateTab: (tab: 'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled' | 'calendar') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  period,
  summary,
  onNavigateTab,
}) => {
  const globalMetrics = calculateGlobalMetrics(data);
  const currencyCode = data?.config?.currencyCode || 'COP';
  const currencySymbol = data?.config?.currencySymbol || '$';

  // Active debts with liquidation details
  const activeDebtsList = data.debts
    .filter((d) => !d.isArchived)
    .map((debt) => {
      const info = calculateDebtLiquidationInfo(debt);
      return {
        ...debt,
        info,
      };
    })
    .sort((a, b) => (a.info.isFullyPaid ? 1 : -1));

  // Active savings programs with progress
  const activeSavingsList = data.savings
    .filter((s) => !s.isArchived)
    .map((s) => {
      const accumulated = s.deposits.reduce((acc, dep) => acc + dep.amount, 0);
      const percent = s.targetAmount ? Math.min(100, Math.round((accumulated / s.targetAmount) * 100)) : null;
      return {
        ...s,
        accumulated,
        percent,
      };
    });

  // Upcoming scheduled transactions
  const upcomingScheduled = data.sporadicTransactions
    .filter((t) => t.isScheduled && !t.isCompleted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Welcome & Main KPI Metrics Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Dashboard & Resumen Global
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Vista Consolidada
              </span>
            </div>
            <p className="text-xs text-slate-505 mt-0.5">
              Estado financiero general, proyección de deudas, metas de ahorro y saldo mensual
            </p>
          </div>

          <button
            id="btn-goto-period-balance"
            onClick={() => onNavigateTab('balance')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all hover:shadow-md cursor-pointer"
          >
            <span>Ir al Módulo de Saldo ({getPeriodLabel(period)})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          {/* Card 1: Total Deudas Restantes */}
          <div
            id="card-global-debt"
            onClick={() => onNavigateTab('debts')}
            className="bg-slate-50/70 hover:bg-white p-4 rounded-xl border border-slate-200/80 transition-all cursor-pointer group hover:shadow-xs"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Total Deuda Pendiente</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-rose-700 font-mono tracking-tight block">
                {formatCurrency(globalMetrics.totalRemainingDebt, currencyCode, currencySymbol)}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>{globalMetrics.activeDebtsCount} deudas activas</span>
                <span className="text-rose-650 font-semibold group-hover:underline">Ver detalle →</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Ahorro Acumulado */}
          <div
            id="card-global-savings"
            onClick={() => onNavigateTab('savings')}
            className="bg-slate-50/70 hover:bg-white p-4 rounded-xl border border-slate-200/80 transition-all cursor-pointer group hover:shadow-xs"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Ahorro Programado</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-650 flex items-center justify-center">
                <PiggyBank className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-teal-700 font-mono tracking-tight block">
                {formatCurrency(globalMetrics.totalSavedAccumulated, currencyCode, currencySymbol)}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>{globalMetrics.activeSavingsCount} fondos activos</span>
                <span className="text-teal-650 font-semibold group-hover:underline">Ver metas →</span>
              </div>
            </div>
          </div>

          {/* Card 3: Colchón Acumulado en Cuenta */}
          <div
            onClick={() => onNavigateTab('balance')}
            className="bg-slate-50/70 hover:bg-white p-4 rounded-xl border border-slate-200/80 transition-all cursor-pointer group hover:shadow-xs"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Colchón en Cuenta</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Coins className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-indigo-700 font-mono tracking-tight block">
                {formatCurrency(summary.cumulativeCushion, currencyCode, currencySymbol)}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>Reserva acumulada</span>
                <span className="text-indigo-600 font-semibold group-hover:underline">Ver saldo →</span>
              </div>
            </div>
          </div>

          {/* Card 4: Disponible Bolsillo */}
          <div
            onClick={() => onNavigateTab('balance')}
            className="bg-slate-50/70 hover:bg-white p-4 rounded-xl border border-slate-200/80 transition-all cursor-pointer group hover:shadow-xs"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Bolsillo Disponible</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xl font-black text-emerald-700 font-mono tracking-tight block">
                {formatCurrency(summary.totalPocketBudget, currencyCode, currencySymbol)}
              </span>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span className="truncate">Arrastre: +{formatCurrency(summary.pocketCarryOver, currencyCode, currencySymbol)}</span>
                <span className="text-emerald-600 font-semibold group-hover:underline">Ajustar →</span>
              </div>
            </div>
          </div>

          {/* Card 5: Saldo Libre Mes Actual */}
          <div
            className={`p-4 rounded-xl border ${
              globalMetrics.monthlyProjectedFreeBalance >= 0
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                : 'bg-rose-600 text-white border-rose-700 shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
              <span className="uppercase tracking-wider">Saldo Libre Mes</span>
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="mt-2">
              <span className="text-xl font-black font-mono tracking-tight block">
                {formatCurrency(globalMetrics.monthlyProjectedFreeBalance, currencyCode, currencySymbol)}
              </span>
              <span className="text-[11px] text-emerald-100/90 block mt-1">
                Proyección base mensual
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos por Clasificar Banner / Quick Access */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 rounded-2xl border border-amber-200/80 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <h3 className="text-sm font-bold text-slate-900">
                Gastos por Clasificar & Dividir
              </h3>
              {globalMetrics.pendingExpensesCount > 0 && (
                <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                  {globalMetrics.pendingExpensesCount} en espera
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {globalMetrics.pendingExpensesCount > 0
                ? `${formatCurrency(globalMetrics.totalPendingExpensesAmount, currencyCode, currencySymbol)} pendientes por clasificar. Saldo por cobrar a otros: ${formatCurrency(globalMetrics.sharedPendingToCollect, currencyCode, currencySymbol)}.`
                : `Lista de espera al día. Saldo por cobrar a otros en compartidos: ${formatCurrency(globalMetrics.sharedPendingToCollect, currencyCode, currencySymbol)}.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateTab('pending_expenses')}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer shrink-0"
        >
          <span>Abrir Gastos por Clasificar</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Proyección y Liquidación de Deudas */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Proyección y Calendario de Liquidación de Deudas
              </h3>
              <p className="text-xs text-slate-505">
                Seguimiento de cuotas pagadas vs restantes y fecha estimada de terminación
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('debts')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer flex items-center gap-1"
          >
            <span>Gestionar Deudas</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeDebtsList.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No tienes deudas activas registradas. ¡Excelente estado financiero!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {activeDebtsList.map((debt) => (
              <div
                key={debt.id}
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">{debt.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold">
                        {debt.tag}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Cuota: {formatCurrency(debt.installmentAmount, currencyCode, currencySymbol)} ({debt.frequency})
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      debt.info.isFullyPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {debt.info.isFullyPaid ? 'Pagada' : `${debt.info.progressPercent}%`}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      debt.info.isFullyPaid ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${debt.info.progressPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60 text-slate-700">
                  <span className="text-slate-500 font-semibold">
                    Restante:{' '}
                    <strong className="text-slate-800 font-mono">
                      {formatCurrency(debt.info.remainingBalance, currencyCode, currencySymbol)}
                    </strong>
                  </span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Fin: <strong className="text-slate-700">{debt.info.estimatedPayoffDate}</strong></span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Proyección de Metas de Ahorro y Próximos Programados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Metas de Ahorro Programado */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Progreso de Fondos de Ahorro</h3>
                <p className="text-xs text-slate-505">Acumulado y progreso hacia metas</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('savings')}
              className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer flex items-center gap-1"
            >
              <span>Ver Ahorros</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeSavingsList.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No tienes programas de ahorro activos.{' '}
              <button
                onClick={() => onNavigateTab('savings')}
                className="text-teal-600 font-semibold hover:underline cursor-pointer"
              >
                + Crear programa
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSavingsList.map((sav) => (
                <div
                  key={sav.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{sav.name}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({sav.tag})</span>
                    </div>
                    <span className="font-extrabold text-teal-700 font-mono">
                      {formatCurrency(sav.accumulated, currencyCode, currencySymbol)}
                      {sav.targetAmount && (
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          / {formatCurrency(sav.targetAmount, currencyCode, currencySymbol)}
                        </span>
                      )}
                    </span>
                  </div>

                  {sav.percent !== null && (
                    <div className="space-y-1">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full"
                          style={{ width: `${sav.percent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-550">
                        <span>Aporte: {formatCurrency(sav.periodicAmount, currencyCode, currencySymbol)}</span>
                        <span>{sav.percent}% completado</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Próximos Movimientos Programados */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Próximos Movimientos Programados</h3>
                <p className="text-xs text-slate-505">Ingresos y compromisos futuros planificados</p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('scheduled')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"
            >
              <span>Ver Plan Futuro</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingScheduled.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No hay movimientos futuros programados.{' '}
              <button
                onClick={() => onNavigateTab('scheduled')}
                className="text-indigo-600 font-semibold hover:underline cursor-pointer"
              >
                + Planificar futuro
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcomingScheduled.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    tx.type === 'income'
                      ? 'bg-emerald-50/50 border-emerald-200/60'
                      : 'bg-rose-50/50 border-rose-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{tx.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/80 border text-slate-700 font-semibold">
                          {tx.tag}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">Fecha: {tx.date}</span>
                    </div>
                  </div>

                  <span
                    className={`font-extrabold font-mono ${
                      tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currencyCode, currencySymbol)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
