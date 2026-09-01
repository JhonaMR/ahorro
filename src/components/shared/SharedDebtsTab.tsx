import React, { useState } from 'react';
import { CreditCard, Plus, History, User, Calendar, Clock, Sparkles, ChevronDown, ChevronUp, Trash2, Edit2 } from 'lucide-react';
import { FamilyGroup, SharedFamilyDebt, UserAccount } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SharedDebtsTabProps {
  filteredDebts: SharedFamilyDebt[];
  currentUser: UserAccount;
  familyGroup: FamilyGroup | null;
  currencyCode: string;
  currencySymbol: string;
  searchQuery: string;
  filterScope: string;
  onOpenAddDebt: () => void;
  onEditDebt: (debt: SharedFamilyDebt) => void;
  onConfirmDeleteDebt: (debt: SharedFamilyDebt) => void;
  onOpenAbonoModal: (debt: SharedFamilyDebt, participantUserId: string) => void;
  onConfirmDeleteAbono: (abonoInfo: { debtId: string; abonoId: string; amount: number; userName: string }) => void;
}

export const SharedDebtsTab: React.FC<SharedDebtsTabProps> = ({
  filteredDebts,
  currentUser,
  familyGroup,
  currencyCode,
  currencySymbol,
  searchQuery,
  filterScope,
  onOpenAddDebt,
  onEditDebt,
  onConfirmDeleteDebt,
  onOpenAbonoModal,
  onConfirmDeleteAbono,
}) => {
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  const toggleExpandDebt = (id: string) => {
    setExpandedDebtId(expandedDebtId === id ? null : id);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {filteredDebts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center mx-auto">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No se encontraron deudas</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || filterScope !== 'all'
                ? 'No hay registros que coincidan con los filtros aplicados.'
                : 'Registra compras del hogar, créditos conjuntos o gastos compartidos para dividir entre los miembros.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAddDebt}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            + Registrar Nueva Deuda Dividida
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDebts.map((debt) => {
            const isExpanded = expandedDebtId === debt.id;
            const totalPaid = (debt.abonos || []).reduce((sum, a) => sum + a.amount, 0);
            const remaining = Math.max(0, debt.totalOriginalAmount - totalPaid);
            const progressPct = debt.totalOriginalAmount > 0 ? (totalPaid / debt.totalOriginalAmount) * 100 : 0;
            const isLiquidated = remaining <= 0;

            // Breakdown by member
            const contributionsByMember: Record<string, { name: string; email: string; amount: number }> = {};
            (debt.abonos || []).forEach((a) => {
              if (!contributionsByMember[a.userId]) {
                contributionsByMember[a.userId] = { name: a.userName, email: a.userEmail, amount: 0 };
              }
              contributionsByMember[a.userId].amount += a.amount;
            });

            const myParticipation = debt.participants.find((p) => p.userId === currentUser.id);
            const myPaid = (debt.abonos || []).filter((a) => a.userId === currentUser.id).reduce((sum, a) => sum + a.amount, 0);
            const myRemaining = myParticipation ? Math.max(0, myParticipation.assignedAmount - myPaid) : 0;

            return (
              <div
                key={debt.id}
                className={`bg-white rounded-3xl border transition-all shadow-xs overflow-hidden ${
                  isLiquidated
                    ? 'border-emerald-250 bg-emerald-50/5'
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
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">
                          {debt.tag}
                        </span>
                        {isLiquidated && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-600" /> Liquidada
                          </span>
                        )}
                        {debt.payerUserId === currentUser.id && (
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-150">
                            Pagaste Tú (Acreedor)
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">{debt.title}</h3>
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-400 font-semibold">
                        <span>Págador original: {debt.payerName}</span>
                        <span>•</span>
                        <span>{debt.participants.length} dividida entre {debt.participants.length === 1 ? '1 persona' : `${debt.participants.length} personas`}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditDebt(debt)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                        title="Editar deuda compartida"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onConfirmDeleteDebt(debt)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Eliminar deuda compartida"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                      <span>Total abonado: {formatCurrency(totalPaid, currencyCode, currencySymbol)}</span>
                      <span>Restan: {formatCurrency(remaining, currencyCode, currencySymbol)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* Partition stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-250/30 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Monto Total</span>
                      <span className="font-extrabold text-slate-800">
                        {formatCurrency(debt.totalOriginalAmount, currencyCode, currencySymbol)}
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
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Mi Saldo Pendiente</span>
                      <span className={`font-black ${myRemaining > 0 ? 'text-rose-650' : 'text-emerald-700'}`}>
                        {myRemaining > 0 
                          ? formatCurrency(myRemaining, currencyCode, currencySymbol)
                          : 'A paz y salvo'
                        }
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Abonos Registrados</span>
                      <span className="font-bold text-slate-800">
                        {debt.abonos ? debt.abonos.length : 0} abonos
                      </span>
                    </div>
                  </div>

                  {/* Accordion toggle button */}
                  <div className="border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => toggleExpandDebt(debt.id)}
                      className="w-full py-1.5 flex items-center justify-between text-xs font-bold text-slate-505 hover:text-slate-800 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-4 h-4 text-slate-400" />
                        <span>Ver desglose de participantes e historial ({debt.abonos ? debt.abonos.length : 0})</span>
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
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Carga y Aporte de Participantes</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {debt.participants.map((p) => {
                          const pPaid = (debt.abonos || []).filter((ab) => ab.userId === p.userId).reduce((sum, ab) => sum + ab.amount, 0);
                          const pRem = Math.max(0, p.assignedAmount - pPaid);
                          const pPct = p.assignedAmount > 0 ? (pPaid / p.assignedAmount) * 100 : 0;
                          const pIsMe = p.userId === currentUser.id;

                          return (
                            <div key={p.userId} className="bg-white rounded-2xl border border-slate-205 p-4 space-y-3 shadow-xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-700 uppercase shrink-0" title={p.userName}>
                                    {(p.userName || '?').charAt(0)}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-slate-800 block leading-tight">
                                      {p.userName} {pIsMe && '(Tú)'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold block">{p.userEmail}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Cuota</span>
                                  <span className="text-xs font-black text-slate-900">
                                    {formatCurrency(p.assignedAmount, currencyCode, currencySymbol)}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                                  <span>Abonado: {formatCurrency(pPaid, currencyCode, currencySymbol)}</span>
                                  <span className={pRem > 0 ? 'text-rose-650 font-bold' : 'text-emerald-700 font-bold'}>
                                    {pRem > 0 ? `Resta: ${formatCurrency(pRem, currencyCode, currencySymbol)}` : 'Paz y salvo'}
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-250/20">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(100, pPct)}%` }}
                                  />
                                </div>
                              </div>

                              {pRem > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onOpenAbonoModal(debt, p.userId)}
                                  className="w-full py-1.5 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-black rounded-lg hover:bg-rose-100 transition cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Registrar Abono para {p.userName}</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Part 2: History of registered abonos */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Historial de Abonos registrados</h4>
                      {!debt.abonos || debt.abonos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No se han registrado abonos o aportes para este compromiso.</p>
                      ) : (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {debt.abonos.map((abono) => (
                            <div
                              key={abono.id}
                              className="bg-white p-3 rounded-xl border border-slate-250/60 shadow-xs flex items-center justify-between gap-4 text-xs font-semibold"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                                  ✓
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {abono.notes || `Abono de ${abono.userName}`}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-semibold">
                                    Pagado por: {abono.userName} • Fecha: {new Date(abono.paidAt).toLocaleDateString('es-CO')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-black text-emerald-750">
                                  +{formatCurrency(abono.amount, currencyCode, currencySymbol)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onConfirmDeleteAbono({
                                      debtId: debt.id,
                                      abonoId: abono.id,
                                      amount: abono.amount,
                                      userName: abono.userName,
                                    })
                                  }
                                  className="text-slate-400 hover:text-rose-650 p-1 transition cursor-pointer"
                                  title="Eliminar este abono"
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
