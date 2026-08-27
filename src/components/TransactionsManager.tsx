import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import { PeriodSelection, SporadicTransaction, TransactionType } from '../types';
import { formatCurrency, getPeriodLabel } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface TransactionsManagerProps {
  transactions: SporadicTransaction[];
  period: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  onOpenAddTransaction: (type: TransactionType) => void;
  onEditTransaction: (tx: SporadicTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onToggleComplete: (txId: string) => void;
}

export const TransactionsManager: React.FC<TransactionsManagerProps> = ({
  transactions,
  period,
  currencyCode,
  currencySymbol,
  onOpenAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onToggleComplete,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [deletingTx, setDeletingTx] = useState<SporadicTransaction | null>(null);

  const totalIncomes = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netDiff = totalIncomes - totalExpenses;

  const filteredList = transactions.filter((t) => {
    if (filterType === 'income') return t.type === 'income';
    if (filterType === 'expense') return t.type === 'expense';
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Period Summary */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Movimientos Esporádicos del Periodo
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
                  {getPeriodLabel(period)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ingresos extras y gastos imprevistos exclusivos de esta quincena o mes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-add-sporadic-income"
              onClick={() => onOpenAddTransaction('income')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ingreso Extra</span>
            </button>

            <button
              id="btn-add-sporadic-expense"
              onClick={() => onOpenAddTransaction('expense')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Gasto Esporádico</span>
            </button>
          </div>
        </div>

        {/* Totals for this period */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 text-xs">
            <span className="text-emerald-700 font-medium block">Total Ingresos Extra del Periodo</span>
            <span className="text-base font-extrabold text-emerald-800">
              +{formatCurrency(totalIncomes, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-200/60 text-xs">
            <span className="text-rose-700 font-medium block">Total Gastos Esporádicos del Periodo</span>
            <span className="text-base font-extrabold text-rose-800">
              -{formatCurrency(totalExpenses, currencyCode, currencySymbol)}
            </span>
          </div>

          <div
            className={`p-3 rounded-xl border text-xs ${
              netDiff >= 0
                ? 'bg-teal-50/60 border-teal-200/60 text-teal-900'
                : 'bg-amber-50/60 border-amber-200/60 text-amber-900'
            }`}
          >
            <span className="text-slate-500 font-medium block">Impacto Neto en el Periodo</span>
            <span className="text-base font-extrabold">
              {formatCurrency(netDiff, currencyCode, currencySymbol)}
            </span>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500">Filtrar:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Todos ({transactions.length})
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterType === 'income'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ingresos Extras ({transactions.filter((t) => t.type === 'income').length})
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterType === 'expense'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Gastos Esporádicos ({transactions.filter((t) => t.type === 'expense').length})
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No hay movimientos esporádicos en este periodo
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Si tuviste una salida especial, un imprevisto médico, o recibiste un ingreso freelance en esta quincena, regístralo aquí.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => onOpenAddTransaction('income')}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
              >
                + Ingreso Extra
              </button>
              <button
                onClick={() => onOpenAddTransaction('expense')}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
              >
                + Gasto Esporádico
              </button>
            </div>
          </div>
        ) : (
          filteredList.map((tx) => {
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                id={`tx-card-${tx.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 transition-all shadow-2xs p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{tx.title}</h4>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tx.tag}
                      </span>
                      {tx.isScheduled && (
                        <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Programado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                      <span>Fecha: {tx.date}</span>
                      {tx.notes && <span>• {tx.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`text-base font-extrabold ${
                      isIncome ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(tx.amount, currencyCode, currencySymbol)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Editar movimiento"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingTx(tx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar movimiento"
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
        message="Esta acción no se puede revertir. El movimiento será eliminado permanentemente."
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
