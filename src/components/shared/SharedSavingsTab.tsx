import React, { useState } from 'react';
import { PiggyBank, Plus, History, ChevronDown, ChevronUp, Trash2, Edit2, Sparkles, User, Calendar } from 'lucide-react';
import { SharedFamilySavings, UserAccount } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SharedSavingsTabProps {
  filteredSavings: SharedFamilySavings[];
  currentUser: UserAccount;
  currencyCode: string;
  currencySymbol: string;
  searchQuery: string;
  filterScope: string;
  onOpenAddSaving: () => void;
  onEditSaving: (saving: SharedFamilySavings) => void;
  onConfirmDeleteSaving: (saving: SharedFamilySavings) => void;
  onOpenDepositModal: (saving: SharedFamilySavings, participantUserId: string) => void;
  onConfirmDeleteDeposit: (depositInfo: { savingId: string; depositId: string; amount: number; userName: string }) => void;
}

export const SharedSavingsTab: React.FC<SharedSavingsTabProps> = ({
  filteredSavings,
  currentUser,
  currencyCode,
  currencySymbol,
  searchQuery,
  filterScope,
  onOpenAddSaving,
  onEditSaving,
  onConfirmDeleteSaving,
  onOpenDepositModal,
  onConfirmDeleteDeposit,
}) => {
  const [expandedSavingId, setExpandedSavingId] = useState<string | null>(null);

  const toggleExpandSaving = (id: string) => {
    setExpandedSavingId(expandedSavingId === id ? null : id);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {filteredSavings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-105 text-teal-500 flex items-center justify-center mx-auto">
            <PiggyBank className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No se encontraron metas de ahorro</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || filterScope !== 'all'
                ? 'No hay metas que coincidan con los filtros aplicados.'
                : 'Crea metas colaborativas (vacaciones, fondo de emergencia, compras grandes) y define cómo aporta cada integrante.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddSaving}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            + Crear Primera Meta de Ahorro Familiar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSavings.map((saving) => {
            const isExpanded = expandedSavingId === saving.id;
            const totalAccumulated = (saving.deposits || []).reduce((sum, d) => sum + d.amount, 0);
            const remaining = Math.max(0, saving.targetAmount - totalAccumulated);
            const progressPct = saving.targetAmount > 0 ? (totalAccumulated / saving.targetAmount) * 100 : 0;
            const isGoalReached = remaining <= 0;

            // Breakdown by member
            const depositsByMember: Record<string, { name: string; email: string; amount: number }> = {};
            (saving.deposits || []).forEach((d) => {
              if (!depositsByMember[d.userId]) {
                depositsByMember[d.userId] = { name: d.userName, email: d.userEmail, amount: 0 };
              }
              depositsByMember[d.userId].amount += d.amount;
            });

            const participants = saving.participants && saving.participants.length > 0
              ? saving.participants
              : [
                  {
                    userId: saving.createdByUserId,
                    userName: saving.createdByUserName,
                    assignedAmount: saving.targetAmount,
                    userEmail: '',
                  },
                ];

            const myParticipation = participants.find((p) => p.userId === currentUser.id);
            const myPaid = (saving.deposits || []).filter((d) => d.userId === currentUser.id).reduce((sum, d) => sum + d.amount, 0);
            const myRemaining = myParticipation ? Math.max(0, myParticipation.assignedAmount - myPaid) : 0;

            return (
              <div
                key={saving.id}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  isGoalReached
                    ? 'border-teal-300 bg-teal-50/5'
                    : isExpanded
                    ? 'border-slate-350 ring-2 ring-slate-100'
                    : 'border-slate-200 hover:border-slate-350'
                }`}
              >
                {/* Header card info */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-650 capitalize">
                          {saving.tag}
                        </span>
                        {isGoalReached && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-250">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> Meta Alcanzada
                          </span>
                        )}
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {saving.frequency === 'quincenal'
                            ? 'Aporte Quincenal'
                            : `Aporte Mensual (${
                                saving.monthlyDistribution === 'both_equal'
                                  ? '50/50 ambas Q'
                                  : saving.monthlyDistribution === 'both_custom'
                                  ? 'Personalizado Q'
                                  : saving.monthlyDistribution === 'only_q1'
                                  ? 'Solo 1ra Q'
                                  : 'Solo 2da Q'
                              })`}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">{saving.name}</h3>
                      {saving.notes && <p className="text-xs text-slate-400 italic font-semibold">{saving.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditSaving(saving)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title="Editar meta"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onConfirmDeleteSaving(saving)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-550 rounded-xl transition cursor-pointer"
                        title="Eliminar meta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                      <span>Total acumulado: {formatCurrency(totalAccumulated, currencyCode, currencySymbol)}</span>
                      <span>Restan: {formatCurrency(remaining, currencyCode, currencySymbol)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-teal-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Partition stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-250/30 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Meta Total</span>
                      <span className="font-extrabold text-slate-800">
                        {formatCurrency(saving.targetAmount, currencyCode, currencySymbol)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Mi Aporte Propio</span>
                      <span className="font-extrabold text-slate-855">
                        {myParticipation 
                          ? formatCurrency(myParticipation.assignedAmount, currencyCode, currencySymbol)
                          : 'No participo'
                        }
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Mi Restante</span>
                      <span className={`font-black ${myRemaining > 0 ? 'text-teal-700' : 'text-emerald-700'}`}>
                        {myRemaining > 0 
                          ? formatCurrency(myRemaining, currencyCode, currencySymbol)
                          : 'Completado'
                        }
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Depósitos Recibidos</span>
                      <span className="font-bold text-slate-800">
                        {saving.deposits ? saving.deposits.length : 0} depósitos
                      </span>
                    </div>
                  </div>

                  {/* Accordion toggle button */}
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleExpandSaving(saving.id)}
                      className="w-full py-1.5 flex items-center justify-between text-xs font-bold text-slate-505 hover:text-slate-800 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-400" />
                        <span>Ver desglose de participantes e historial ({saving.deposits ? saving.deposits.length : 0})</span>
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details section */}
                {isExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 p-5 sm:p-6 space-y-5 animate-in slide-in-from-top-3 duration-250">
                    {/* Part 1: Participant Division splits */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Metas y Ahorro por Integrante</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {participants.map((p) => {
                          const pPaid = (saving.deposits || []).filter((d) => d.userId === p.userId).reduce((sum, d) => sum + d.amount, 0);
                          const pRem = Math.max(0, p.assignedAmount - pPaid);
                          const pPct = p.assignedAmount > 0 ? (pPaid / p.assignedAmount) * 100 : 0;
                          const pIsMe = p.userId === currentUser.id;

                          return (
                            <div key={p.userId} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-250/60 flex items-center justify-center font-bold text-[11px] text-slate-700 uppercase">
                                    {(p.userName || '?').charAt(0)}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-slate-800 block leading-tight">
                                      {p.userName} {pIsMe && '(Tú)'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold block">{p.userEmail || ''}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Meta</span>
                                  <span className="text-xs font-black text-slate-900">
                                    {formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                                  <span>Ahorrado: {formatCurrency(pPaid, currencyCode, currencySymbol)}</span>
                                  <span className={pRem > 0 ? 'text-teal-650 font-bold' : 'text-emerald-700 font-bold'}>
                                    {pRem > 0 ? `Resta: ${formatCurrency(pRem, currencyCode, currencySymbol)}` : 'Meta cumplida'}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-250/20">
                                  <div
                                    className="bg-teal-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, pPct)}%` }}
                                  />
                                </div>
                              </div>

                              {pRem > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onOpenDepositModal(saving, p.userId)}
                                  className="w-full py-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black rounded-lg hover:bg-teal-100 transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Registrar Depósito para {p.userName}</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Part 2: History of registered deposits */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Depósitos registrados</h4>
                      {!saving.deposits || saving.deposits.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No se han registrado aportes para esta meta de ahorro.</p>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {saving.deposits.map((deposit) => (
                            <div
                              key={deposit.id}
                              className="bg-white p-3 rounded-xl border border-slate-250/60 shadow-xs flex items-center justify-between gap-4 text-xs font-semibold"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-[10px]">
                                  ✓
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {deposit.notes || `Aporte de ${deposit.userName}`}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-semibold">
                                    Depositado por: {deposit.userName} • Fecha: {new Date(deposit.depositedAt).toLocaleDateString('es-CO')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-black text-teal-750">
                                  +{formatCurrency(deposit.amount, currencyCode, currencySymbol)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onConfirmDeleteDeposit({
                                      savingId: saving.id,
                                      depositId: deposit.id,
                                      amount: deposit.amount,
                                      userName: deposit.userName,
                                    })
                                  }
                                  className="text-slate-400 hover:text-rose-650 p-1 transition cursor-pointer"
                                  title="Eliminar este depósito"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
