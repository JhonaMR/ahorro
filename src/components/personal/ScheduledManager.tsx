import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Trash2,
  Edit2,
} from 'lucide-react';
import { PeriodSelection, SporadicTransaction, TransactionType } from '../../types';
import { MONTH_NAMES_ES, formatCurrency, parsePeriodKey } from '../../utils/formatters';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface ScheduledManagerProps {
  transactions: SporadicTransaction[];
  currentPeriod: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  onOpenAddScheduled: (type: TransactionType) => void;
  onEditTransaction: (tx: SporadicTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onJumpToPeriod: (period: PeriodSelection) => void;
}

export const ScheduledManager: React.FC<ScheduledManagerProps> = ({
  transactions,
  currencyCode,
  currencySymbol,
  onOpenAddScheduled,
  onEditTransaction,
  onDeleteTransaction,
  onJumpToPeriod,
}) => {
  const [deletingTx, setDeletingTx] = useState<SporadicTransaction | null>(null);

  // Filter scheduled transactions
  const scheduledList = transactions
    .filter((t) => t.isScheduled)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalFutureIncomes = scheduledList
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFutureExpenses = scheduledList
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-700">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Ingresos y Gastos Programados para el Futuro
              </h2>
              <p className="text-xs text-slate-500 font-normal">
                Programa con anticipación bonos, matrículas, primas o pagos con fecha específica
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-add-scheduled-income"
              onClick={() => onOpenAddScheduled('income')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Ingreso Futuro</span>
            </button>

            <button
              id="btn-add-scheduled-expense"
              onClick={() => onOpenAddScheduled('expense')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Gasto / Deuda Futura</span>
            </button>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-slate-705 font-medium">
            <span className="text-emerald-700 font-medium block">Total Ingresos Futuros Programados</span>
            <span className="text-base font-extrabold text-emerald-800">
              +{formatCurrency(totalFutureIncomes, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60 font-semibold">
            <span className="text-rose-700 block">Total Gastos / Compromisos Futuros</span>
            <span className="text-base font-extrabold text-rose-800">
              -{formatCurrency(totalFutureExpenses, currencyCode, currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Scheduled Timeline list */}
      <div className="space-y-3">
        {scheduledList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-505 mx-auto flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hay movimientos futuros programados</h3>
            <p className="text-xs text-slate-505 max-w-md mx-auto leading-relaxed">
              Si sabes que en un mes específico recibirás una prima o tendrás que pagar una matrícula o seguro, regístralo aquí para que se refleje automáticamente en esa quincena.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => onOpenAddScheduled('income')}
                className="px-3 py-1.5 text-xs font-bold text-emerald-705 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
              >
                + Programar Ingreso
              </button>
              <button
                onClick={() => onOpenAddScheduled('expense')}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
              >
                + Programar Gasto
              </button>
            </div>
          </div>
        ) : (
          scheduledList.map((tx) => {
            const isIncome = tx.type === 'income';
            const parsed = parsePeriodKey(tx.periodKey);
            const targetMonthName = MONTH_NAMES_ES[parsed.month];
            const targetQuincenaText = parsed.quincena === 1 ? '1ra Quincena (1-15)' : '2da Quincena (16-fin)';

            return (
              <div
                key={tx.id}
                id={`scheduled-card-${tx.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all shadow-2xs p-4 flex flex-wrap items-center justify-between gap-4 text-slate-700"
              >
                <div className="flex items-center gap-3.5 text-xs">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap font-bold">
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{tx.title}</h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tx.tag}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap font-semibold">
                      <span className="font-semibold text-slate-750 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        Fecha pactada: {tx.date}
                      </span>
                      <span>•</span>
                      <span className="text-indigo-700 font-bold">
                        Se aplicará en: {targetMonthName} {parsed.year}, {targetQuincenaText}
                      </span>
                    </div>

                    {tx.notes && (
                      <p className="text-xs text-slate-400 italic mt-0.5">{tx.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-base font-extrabold font-mono ${
                      isIncome ? 'text-emerald-700' : 'text-rose-705'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(tx.amount, currencyCode, currencySymbol)}
                  </span>

                  {/* Jump to that period button */}
                  <button
                    type="button"
                    onClick={() =>
                      onJumpToPeriod({
                        year: parsed.year,
                        month: parsed.month,
                        periodType: 'quincena',
                        quincena: parsed.quincena || 1,
                      })
                    }
                    className="px-2.5 py-1.5 text-xs font-semibold text-indigo-755 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="Ver esta quincena en el visor principal"
                  >
                    <span>Ir a quincena</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingTx(tx)}
                      className="p-1.5 text-slate-400 hover:text-rose-650 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={!!deletingTx}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. La transacción programada será eliminada definitivamente."
        itemName={deletingTx ? `${deletingTx.title} (${formatCurrency(deletingTx.amount, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingTx(null)}
        onConfirm={() => {
          if (deletingTx) {
            onDeleteTransaction(deletingTx.id);
            setDeletingTx(null);
          }
        }}
      />
    </div>
  );
};
