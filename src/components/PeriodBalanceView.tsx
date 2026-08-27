import React from 'react';
import {
  Wallet,
  CreditCard,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Plus,
  Minus,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
  Bus,
  CheckCircle2,
  Calendar,
  Layers,
  Coins,
  AlertTriangle,
  Receipt,
  Info,
} from 'lucide-react';
import { AppData, DebtItem, FreeBalanceAllocation, PeriodSelection, SavingsProgram, SporadicTransaction } from '../types';
import { PeriodFinancialSummary } from '../utils/calculator';
import { formatCurrency, getPeriodLabel } from '../utils/formatters';
import { FreeBalanceCard } from './FreeBalanceCard';

interface PeriodBalanceViewProps {
  data: AppData;
  period: PeriodSelection;
  summary: PeriodFinancialSummary;
  onOpenAddTransaction: (type: 'income' | 'expense') => void;
  onOpenPaymentModal: (debt: DebtItem, expectedAmount: number) => void;
  onOpenDepositModal: (savings: SavingsProgram, expectedAmount: number) => void;
  onSaveBalanceAllocation: (periodKey: string, allocation: FreeBalanceAllocation) => void;
  onToggleSkipObligation: (obligationId: string) => void;
}

export const PeriodBalanceView: React.FC<PeriodBalanceViewProps> = ({
  data,
  period,
  summary,
  onOpenAddTransaction,
  onOpenPaymentModal,
  onOpenDepositModal,
  onSaveBalanceAllocation,
  onToggleSkipObligation,
}) => {
  const currencyCode = data.config.currencyCode;
  const currencySymbol = data.config.currencySymbol;
  const currentAllocation = data.balanceAllocations[summary.periodKey];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Hero for this Specific Period */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Presupuesto & Saldo: {getPeriodLabel(period)}
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {period.periodType === 'mes' ? 'Mensual' : `Quincena ${period.quincena}`}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Flujo de caja exclusivo para este periodo, control de cuotas a pagar y asignación de saldo libre
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-period-add-income"
              onClick={() => onOpenAddTransaction('income')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ingreso en Periodo</span>
            </button>

            <button
              id="btn-period-add-expense"
              onClick={() => onOpenAddTransaction('expense')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Gasto en Periodo</span>
            </button>
          </div>
        </div>

        {/* Skipped Notice Banner if obligations are skipped */}
        {summary.skippedCount > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-amber-900 block">
                {summary.skippedCount} {summary.skippedCount === 1 ? 'cuota omitida / pospuesta' : 'cuotas omitidas / pospuestas'} en este periodo
              </span>
              <span className="text-amber-800 text-[11px]">
                Has liberado <strong className="font-mono">{formatCurrency(summary.totalSkippedAmount, currencyCode, currencySymbol)}</strong> de tus gastos para esta quincena. Las deudas omitidas retrasarán su fecha de finalización. Puedes volver a incluir cualquier cuota haciendo clic en el botón <strong className="font-semibold">+ Restaurar</strong>.
              </span>
            </div>
          </div>
        )}

        {/* 3 Metric Cards for this Period */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span>Total Ingresos del Periodo</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-black text-emerald-700 font-mono block">
                {formatCurrency(summary.totalIncome, currencyCode, currencySymbol)}
              </span>
              <span className="text-[11px] text-emerald-600">
                Fijo: {formatCurrency(summary.fixedIncome, currencyCode, currencySymbol)}
                {summary.totalSporadicIncome > 0 && ` • Extra: +${formatCurrency(summary.totalSporadicIncome, currencyCode, currencySymbol)}`}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/70">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
              <span>Total Gastos & Obligaciones</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-1">
              <span className="text-xl font-black text-rose-700 font-mono block">
                {formatCurrency(summary.totalExpenses, currencyCode, currencySymbol)}
              </span>
              <span className="text-[11px] text-rose-600">
                Fijos: {formatCurrency(summary.totalFixedExpenses, currencyCode, currencySymbol)} • Deudas: {formatCurrency(summary.totalDebtDue, currencyCode, currencySymbol)}
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              summary.freeBalance >= 0
                ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-700 shadow-xs'
                : 'bg-gradient-to-br from-rose-600 to-red-700 text-white border-rose-700 shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-100">
              <span className="uppercase tracking-wider">Saldo Libre Disponible</span>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="mt-1">
              <span className="text-2xl font-black font-mono tracking-tight block">
                {formatCurrency(summary.freeBalance, currencyCode, currencySymbol)}
              </span>
              <span className="text-[11px] text-emerald-100/90">
                {summary.freeBalance >= 0 ? 'Para libre disposición y ahorro' : 'Déficit presupuestario'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Free Balance Allocator (División del Saldo Libre Disponible) */}
      <FreeBalanceCard
        freeBalance={summary.freeBalance}
        periodKey={summary.periodKey}
        currencyCode={currencyCode}
        currencySymbol={currencySymbol}
        currentAllocation={currentAllocation}
        onSaveAllocation={onSaveBalanceAllocation}
        pocketCarryOver={summary.pocketCarryOver}
        cumulativeCushion={summary.cumulativeCushion}
      />

      {/* 3. Detailed Cash Flow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Incomes */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ingresos de este Periodo</h3>
                <p className="text-xs text-slate-500">
                  {period.periodType === 'mes' ? 'Ingreso mensual total' : `Ingresos correspondientes a la Quincena ${period.quincena}`}
                </p>
              </div>
            </div>

            <span className="text-sm font-black text-emerald-700 font-mono">
              {formatCurrency(summary.totalIncome, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="space-y-2.5">
            {/* Fixed Salary Item */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
                  <Coins className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Salario / Ingreso Fijo Base</h4>
                  <p className="text-[11px] text-slate-500">
                    {period.periodType === 'mes' ? 'Monto mensual completo' : `Cuota quincenal correspondiente (Q${period.quincena})`}
                  </p>
                </div>
              </div>
              <span className="font-extrabold text-slate-900 font-mono">
                {formatCurrency(summary.fixedIncome, currencyCode, currencySymbol)}
              </span>
            </div>

            {/* Sporadic / Extra Incomes */}
            {summary.sporadicIncomes.length > 0 ? (
              summary.sporadicIncomes.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900">{inc.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          {inc.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {inc.date} {inc.notes ? `• ${inc.notes}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className="font-extrabold text-emerald-700 font-mono">
                    +{formatCurrency(inc.amount, currencyCode, currencySymbol)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No hay ingresos esporádicos en este periodo.{' '}
                <button
                  onClick={() => onOpenAddTransaction('income')}
                  className="text-emerald-600 font-semibold hover:underline cursor-pointer ml-1"
                >
                  + Agregar ingreso extra
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Expenses & Obligations with the "-" Omit / Postpone Button */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Gastos y Obligaciones</h3>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    Usa [-] para no pagar en esta quincena
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Haz clic en el botón <strong className="text-rose-600 font-semibold">[-]</strong> al inicio para omitir esa cuota y posponerla
                </p>
              </div>
            </div>

            <span className="text-sm font-black text-rose-700 font-mono">
              {formatCurrency(summary.totalExpenses, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {/* 2. Additional Fixed Expenses */}
            {summary.otherFixedExpenses.map((exp) => (
              <div
                key={exp.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                  exp.isSkipped
                    ? 'bg-slate-100/80 border-slate-300 opacity-60'
                    : 'bg-slate-50 border-slate-200/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    id={`btn-skip-fixed-${exp.id}`}
                    onClick={() => onToggleSkipObligation(exp.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                      exp.isSkipped
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                    }`}
                    title={exp.isSkipped ? 'Restaurar gasto fijo para este periodo' : 'Omitir gasto fijo en este periodo'}
                  >
                    {exp.isSkipped ? <RotateCcw className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>

                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${exp.isSkipped ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                        {exp.name}
                      </span>
                      {exp.isSkipped ? (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded">
                          Omitido
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          {exp.tag}
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-500">Gasto fijo recurrente</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-extrabold font-mono ${exp.isSkipped ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {formatCurrency(exp.amount, currencyCode, currencySymbol)}
                  </span>
                </div>
              </div>
            ))}

            {/* 3. Debt Installments due */}
            {summary.debtDues.map((debtDue) => {
              const fullDebt = data.debts.find((d) => d.id === debtDue.debtId);
              return (
                <div
                  key={debtDue.debtId}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    debtDue.isSkipped
                      ? 'bg-slate-100/80 border-slate-300 opacity-60'
                      : 'bg-rose-50/50 border-rose-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* "-" / Restore button for this debt installment */}
                    <button
                      id={`btn-skip-debt-${debtDue.debtId}`}
                      onClick={() => onToggleSkipObligation(debtDue.debtId)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                        debtDue.isSkipped
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                          : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'
                      }`}
                      title={
                        debtDue.isSkipped
                          ? 'Volver a incluir esta cuota en la quincena'
                          : 'No pagar esta cuota en esta quincena (atrasa la deuda)'
                      }
                    >
                      {debtDue.isSkipped ? <RotateCcw className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>

                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${debtDue.isSkipped ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {debtDue.title}
                        </span>
                        {debtDue.isSkipped ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            Cuota Omitida (Atrasa deuda)
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold">
                            {debtDue.tag}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-500">
                        Saldo: {formatCurrency(debtDue.remainingBalance, currencyCode, currencySymbol)} • Liq. est: {debtDue.estimatedPayoffDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-extrabold font-mono ${debtDue.isSkipped ? 'line-through text-slate-400' : 'text-rose-700'}`}>
                      {formatCurrency(debtDue.amountDue, currencyCode, currencySymbol)}
                    </span>
                    {!debtDue.isSkipped && fullDebt && (
                      <button
                        onClick={() => onOpenPaymentModal(fullDebt, debtDue.amountDue)}
                        className="px-2 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                        title="Pagar cuota de esta deuda"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 4. Savings due */}
            {summary.savingsDues.map((savDue) => {
              const fullSav = data.savings.find((s) => s.id === savDue.savingsId);
              return (
                <div
                  key={savDue.savingsId}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                    savDue.isSkipped
                      ? 'bg-slate-100/80 border-slate-300 opacity-60'
                      : 'bg-teal-50/50 border-teal-200/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      id={`btn-skip-savings-${savDue.savingsId}`}
                      onClick={() => onToggleSkipObligation(savDue.savingsId)}
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                        savDue.isSkipped
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                          : 'bg-teal-100 text-teal-700 hover:bg-teal-200 border border-teal-200'
                      }`}
                      title={
                        savDue.isSkipped
                          ? 'Volver a incluir aporte de ahorro en la quincena'
                          : 'Omitir aporte de ahorro en esta quincena'
                      }
                    >
                      {savDue.isSkipped ? <RotateCcw className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>

                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <PiggyBank className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${savDue.isSkipped ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {savDue.name}
                        </span>
                        {savDue.isSkipped ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                            Aporte Omitido
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold">
                            {savDue.tag}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-500">
                        Acumulado: {formatCurrency(savDue.accumulatedTotal, currencyCode, currencySymbol)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`font-extrabold font-mono ${savDue.isSkipped ? 'line-through text-slate-400' : 'text-teal-700'}`}>
                      {formatCurrency(savDue.amountDue, currencyCode, currencySymbol)}
                    </span>
                    {!savDue.isSkipped && fullSav && (
                      <button
                        onClick={() => onOpenDepositModal(fullSav, savDue.amountDue)}
                        className="px-2 py-1 text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors cursor-pointer"
                        title="Registrar aporte de ahorro"
                      >
                        Aportar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 5. Sporadic Expenses for this period */}
            {summary.sporadicExpenses.map((exp) => (
              <div
                key={exp.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                  exp.isSkipped
                    ? 'bg-slate-100/80 border-slate-300 opacity-60'
                    : 'bg-amber-50/40 border-amber-200/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    id={`btn-skip-sporadic-${exp.id}`}
                    onClick={() => onToggleSkipObligation(exp.id)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                      exp.isSkipped
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                    }`}
                    title={exp.isSkipped ? 'Restaurar gasto esporádico' : 'Omitir este gasto'}
                  >
                    {exp.isSkipped ? <RotateCcw className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                  </button>

                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold ${exp.isSkipped ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {exp.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                        {exp.tag}
                      </span>
                      {exp.isSkipped && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                          Omitido
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] text-slate-500">{exp.date}</span>
                  </div>
                </div>
                <span className={`font-extrabold font-mono ${exp.isSkipped ? 'line-through text-slate-400' : 'text-amber-900'}`}>
                  {formatCurrency(exp.amount, currencyCode, currencySymbol)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
