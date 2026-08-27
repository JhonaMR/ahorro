import React, { useState } from 'react';
import {
  PiggyBank,
  Plus,
  Target,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  History,
  Trash2,
  Edit2,
  Sparkles,
} from 'lucide-react';
import { PeriodSelection, SavingsProgram } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface SavingsManagerProps {
  savings: SavingsProgram[];
  period: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  onOpenAddSavings: () => void;
  onEditSavings: (savings: SavingsProgram) => void;
  onDeleteSavings: (savingsId: string) => void;
  onOpenDepositModal: (savings: SavingsProgram, expectedAmount: number) => void;
}

export const SavingsManager: React.FC<SavingsManagerProps> = ({
  savings,
  period,
  currencyCode,
  currencySymbol,
  onOpenAddSavings,
  onEditSavings,
  onDeleteSavings,
  onOpenDepositModal,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingSaving, setDeletingSaving] = useState<SavingsProgram | null>(null);

  const totalAccumulatedGlobal = savings.reduce((sum, s) => {
    return sum + s.deposits.reduce((acc, d) => acc + d.amount, 0);
  }, 0);

  const totalTargetsGlobal = savings.reduce((sum, s) => sum + (s.targetAmount || 0), 0);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and summary cards */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ahorro Programado & Metas Financieras
              </h2>
              <p className="text-xs text-slate-500">
                Controla tus aportes quincenales y mensuales, fondo de emergencia y metas de ahorro
              </p>
            </div>
          </div>

          <button
            id="btn-add-new-savings"
            onClick={onOpenAddSavings}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Programa de Ahorro</span>
          </button>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/60 text-xs">
            <span className="text-teal-700 font-medium block">Total Acumulado Guardado</span>
            <span className="text-base font-extrabold text-teal-900">
              {formatCurrency(totalAccumulatedGlobal, currencyCode, currencySymbol)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
            <span className="text-slate-500 block">Suma de Metas Deseadas</span>
            <span className="text-base font-extrabold text-slate-800">
              {totalTargetsGlobal > 0
                ? formatCurrency(totalTargetsGlobal, currencyCode, currencySymbol)
                : 'Sin metas fijas'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/60 text-xs">
            <span className="text-indigo-700 font-medium block">Programas Activos</span>
            <span className="text-base font-extrabold text-indigo-900">
              {savings.length} {savings.length === 1 ? 'meta activa' : 'metas activas'}
            </span>
          </div>
        </div>
      </div>

      {/* Savings List */}
      <div className="space-y-4">
        {savings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 mx-auto flex items-center justify-center">
              <PiggyBank className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No tienes ahorros programados aún</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crea tu fondo de emergencia o ahorros para viajes, estudios o metas personales con aportes quincenales automáticos.
            </p>
            <button
              onClick={onOpenAddSavings}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Mi Primer Ahorro</span>
            </button>
          </div>
        ) : (
          savings.map((item) => {
            const accumulated = item.deposits.reduce((acc, d) => acc + d.amount, 0);
            const isExpanded = expandedId === item.id;
            const progressPercent = item.targetAmount
              ? Math.min(100, Math.round((accumulated / item.targetAmount) * 100))
              : null;
            const isGoalReached = item.targetAmount ? accumulated >= item.targetAmount : false;

            return (
              <div
                key={item.id}
                id={`savings-card-${item.id}`}
                className={`bg-white rounded-2xl border transition-all shadow-2xs ${
                  isGoalReached
                    ? 'border-teal-300 bg-teal-50/10'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Title & Actions */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          {item.tag}
                        </span>
                        {isGoalReached && (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> ¡Meta Alcanzada!
                          </span>
                        )}
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.frequency === 'quincenal'
                            ? 'Aporte Quincenal'
                            : `Aporte Mensual (${
                                item.monthlyDistribution === 'both_equal'
                                  ? 'Ambas quincenas 50/50'
                                  : item.monthlyDistribution === 'both_custom'
                                  ? 'Personalizado por quincena'
                                  : item.monthlyDistribution === 'only_q1'
                                  ? 'Solo 1ra Quincena'
                                  : 'Solo 2da Quincena'
                              })`}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-xs text-slate-500 italic">{item.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-deposit-savings-${item.id}`}
                        onClick={() => onOpenDepositModal(item, item.periodicAmount)}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Aportar</span>
                      </button>

                      <button
                        onClick={() => onEditSavings(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Editar programa de ahorro"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingSaving(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar programa de ahorro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar (if goal defined) */}
                  {progressPercent !== null && item.targetAmount && (
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-teal-800">
                          {progressPercent}% completado ({formatCurrency(accumulated, currencyCode, currencySymbol)} de{' '}
                          {formatCurrency(item.targetAmount, currencyCode, currencySymbol)})
                        </span>
                        <span className="text-slate-500 font-medium">
                          Faltan: {formatCurrency(Math.max(0, item.targetAmount - accumulated), currencyCode, currencySymbol)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                        <div
                          className="h-full bg-teal-500 transition-all duration-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Aporte por Periodo</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(item.periodicAmount, currencyCode, currencySymbol)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Ahorrado Actual</span>
                      <span className="font-extrabold text-teal-700">
                        {formatCurrency(accumulated, currencyCode, currencySymbol)}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Meta Deseada</span>
                      <span className="font-bold text-slate-800">
                        {item.targetAmount
                          ? formatCurrency(item.targetAmount, currencyCode, currencySymbol)
                          : 'Ahorro continuo'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Total Aportes Registrados</span>
                      <span className="font-bold text-slate-800">
                        {item.deposits.length} {item.deposits.length === 1 ? 'depósito' : 'depósitos'}
                      </span>
                    </div>
                  </div>

                  {/* Deposits History Accordion */}
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer py-1"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-400" />
                        Historial de Aportes ({item.deposits.length})
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                        {item.deposits.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2 italic text-center">
                            Aún no se han registrado aportes para esta meta.
                          </p>
                        ) : (
                          item.deposits.map((dep, idx) => (
                            <div
                              key={dep.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-black flex items-center justify-center">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-800">
                                    {dep.notes || `Aporte #${idx + 1}`}
                                  </span>
                                  <span className="block text-[10px] text-slate-400">
                                    Periodo: {dep.periodKey} • Fecha: {new Date(dep.depositedAt).toLocaleDateString('es-CO')}
                                  </span>
                                </div>
                              </div>

                              <span className="font-black text-teal-700">
                                +{formatCurrency(dep.amount, currencyCode, currencySymbol)}
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
        isOpen={!!deletingSaving}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. La meta de ahorro y todos sus aportes registrados serán eliminados permanentemente."
        itemName={deletingSaving ? `${deletingSaving.name} (${formatCurrency(deletingSaving.targetAmount || 0, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingSaving(null)}
        onConfirm={() => {
          if (deletingSaving) {
            onDeleteSavings(deletingSaving.id);
            setDeletingSaving(null);
          }
        }}
      />
    </div>
  );
};
