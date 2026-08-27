import React, { useState } from 'react';
import {
  Users,
  Plus,
  CreditCard,
  History,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  DollarSign,
  AlertCircle,
  Tag,
  ChevronDown,
  ChevronUp,
  Trash2,
  Share2,
  Copy,
  Check,
  Receipt,
  HeartHandshake,
} from 'lucide-react';
import { FamilyGroup, SharedFamilyDebt, SharedFamilyDebtAbono, UserAccount } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface SharedDebtsManagerProps {
  currentUser: UserAccount;
  familyGroup: FamilyGroup | null;
  sharedDebts: SharedFamilyDebt[];
  currencyCode: string;
  currencySymbol: string;
  suggestedTags: string[];
  onAddSharedDebt: (debt: Omit<SharedFamilyDebt, 'id' | 'createdAt' | 'abonos'>) => void;
  onDeleteSharedDebt: (debtId: string) => void;
  onAddAbono: (debtId: string, abono: Omit<SharedFamilyDebtAbono, 'id' | 'paidAt'>) => void;
  onDeleteAbono: (debtId: string, abonoId: string) => void;
  onGoToFamilyConfig: () => void;
}

export const SharedDebtsManager: React.FC<SharedDebtsManagerProps> = ({
  currentUser,
  familyGroup,
  sharedDebts,
  currencyCode,
  currencySymbol,
  suggestedTags,
  onAddSharedDebt,
  onDeleteSharedDebt,
  onAddAbono,
  onDeleteAbono,
  onGoToFamilyConfig,
}) => {
  const [isAddDebtModalOpen, setIsAddDebtModalOpen] = useState(false);
  const [selectedDebtForAbono, setSelectedDebtForAbono] = useState<SharedFamilyDebt | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [deletingDebt, setDeletingDebt] = useState<SharedFamilyDebt | null>(null);
  const [deletingAbono, setDeletingAbono] = useState<{ debtId: string; abonoId: string; amount: number; memberName: string } | null>(null);

  // New Debt Form states
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState(suggestedTags[0] || 'Hogar');
  const [newTotalAmount, setNewTotalAmount] = useState<number | ''>('');
  const [newInstallmentsCount, setNewInstallmentsCount] = useState<number>(12);
  const [newFrequency, setNewFrequency] = useState<'quincenal' | 'mensual'>('quincenal');
  const [newNotes, setNewNotes] = useState('');

  // New Abono Form states
  const [abonoAmount, setAbonoAmount] = useState<number | ''>('');
  const [abonoDate, setAbonoDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [abonoUserId, setAbonoUserId] = useState(currentUser.id);
  const [abonoNotes, setAbonoNotes] = useState('');

  const handleCopyGroupCode = () => {
    if (familyGroup?.code) {
      navigator.clipboard.writeText(familyGroup.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyGroup) return;
    if (!newTitle.trim() || typeof newTotalAmount !== 'number' || newTotalAmount <= 0) return;

    const count = Number(newInstallmentsCount) || 1;
    const calculatedInstallment = Math.round(newTotalAmount / count);
    const now = new Date();

    onAddSharedDebt({
      familyGroupId: familyGroup.id,
      title: newTitle.trim(),
      tag: newTag,
      totalOriginalAmount: newTotalAmount,
      installmentsCount: count,
      installmentAmount: calculatedInstallment,
      frequency: newFrequency,
      startYear: now.getFullYear(),
      startMonth: now.getMonth(),
      startQuincena: now.getDate() <= 15 ? 1 : 2,
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.name,
      notes: newNotes.trim(),
      isArchived: false,
    });

    setIsAddDebtModalOpen(false);
    setNewTitle('');
    setNewTotalAmount('');
    setNewNotes('');
  };

  const handleCreateAbono = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForAbono) return;
    if (typeof abonoAmount !== 'number' || abonoAmount <= 0) return;

    // Find member details
    const member = familyGroup?.members.find((m) => m.userId === abonoUserId) || {
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
    };

    onAddAbono(selectedDebtForAbono.id, {
      debtId: selectedDebtForAbono.id,
      userId: member.userId,
      userName: member.name,
      userEmail: member.email,
      amount: abonoAmount,
      date: abonoDate,
      notes: abonoNotes.trim(),
    });

    setSelectedDebtForAbono(null);
    setAbonoAmount('');
    setAbonoNotes('');
  };

  // If user is not in a family group
  if (!familyGroup) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs text-center max-w-2xl mx-auto space-y-5 my-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
          <HeartHandshake className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Deudas Compartidas del Grupo Familiar
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
            Organiza compromisos y deudas conjuntas con tu pareja o familiares. Cuando cualquiera de los dos haga un abono, ambos podrán ver el progreso en tiempo real y el historial detallado de aportes.
          </p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-center gap-3 text-left">
          <Users className="w-5 h-5 text-indigo-500 shrink-0" />
          <span>
            Para comenzar, crea o únete a un Grupo Familiar usando un código de 7 dígitos en la pestaña de <strong>Configuración del Usuario</strong>.
          </span>
        </div>

        <button
          type="button"
          onClick={onGoToFamilyConfig}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md transition cursor-pointer inline-flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          <span>Configurar Mi Grupo Familiar</span>
        </button>
      </div>
    );
  }

  // Global calculations
  const totalSharedOriginal = sharedDebts.reduce((sum, d) => sum + d.totalOriginalAmount, 0);
  const totalSharedPaid = sharedDebts.reduce((sum, d) => {
    const debtPaid = (d.abonos || []).reduce((aSum, a) => aSum + a.amount, 0);
    return sum + debtPaid;
  }, 0);
  const totalSharedRemaining = Math.max(0, totalSharedOriginal - totalSharedPaid);
  const overallProgress = totalSharedOriginal > 0 ? Math.min(100, Math.round((totalSharedPaid / totalSharedOriginal) * 100)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Family Group Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5">
              <Users className="w-3 h-3" />
              <span>Grupo Familiar Activo</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {familyGroup.members.length} miembros
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <span>{familyGroup.name}</span>
          </h1>

          <p className="text-xs text-slate-300">
            Control colaborativo de deudas, abonos registrados y liquidación conjunta
          </p>

          {/* Members badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            {familyGroup.members.map((m) => (
              <span
                key={m.userId}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  m.userId === currentUser.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                <User className="w-3 h-3" />
                <span>{m.name}</span>
                {m.userId === currentUser.id && <span className="text-[10px] opacity-75">(Tú)</span>}
              </span>
            ))}
          </div>
        </div>

        {/* Code & Actions */}
        <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800">
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Código de Grupo</div>
              <div className="text-sm font-black font-mono tracking-wider text-indigo-300">
                {familyGroup.code}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyGroupCode}
              className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              title="Copiar código"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAddDebtModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nueva Deuda Compartida</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Deudas Compartidas
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">
            {formatCurrency(totalSharedOriginal, currencyCode, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {sharedDebts.length} {sharedDebts.length === 1 ? 'deuda registrada' : 'deudas registradas'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            Total Abonado Conjunto
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-700">
            {formatCurrency(totalSharedPaid, currencyCode, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="font-bold text-emerald-600">{overallProgress}%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">
            Saldo Pendiente por Pagar
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-700">
            {formatCurrency(totalSharedRemaining, currencyCode, currencySymbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalSharedRemaining === 0 && totalSharedOriginal > 0 ? '¡100% Liquidado!' : 'En proceso de pago'}
          </div>
        </div>
      </div>

      {/* Shared Debts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span>Listado de Deudas del Grupo Familiar</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {sharedDebts.length} compromisos
          </span>
        </div>

        {sharedDebts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-800">
              No hay deudas compartidas registradas en este grupo
            </div>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Registra préstamos conjuntos, electrodomésticos para el hogar o tarjetas para hacer abonos y llevar el balance entre ambos.
            </p>
            <button
              type="button"
              onClick={() => setIsAddDebtModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primera Deuda Compartida</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sharedDebts.map((debt) => {
              const abonos = debt.abonos || [];
              const totalPaid = abonos.reduce((sum, a) => sum + a.amount, 0);
              const remaining = Math.max(0, debt.totalOriginalAmount - totalPaid);
              const isPaid = remaining === 0;
              const progressPct = Math.min(100, Math.round((totalPaid / debt.totalOriginalAmount) * 100));
              const isExpanded = expandedDebtId === debt.id;

              // Member contribution breakdown
              const contributionsByMember: Record<string, { name: string; amount: number }> = {};
              abonos.forEach((a) => {
                if (!contributionsByMember[a.userId]) {
                  contributionsByMember[a.userId] = { name: a.userName, amount: 0 };
                }
                contributionsByMember[a.userId].amount += a.amount;
              });

              return (
                <div
                  key={debt.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
                >
                  {/* Debt Card Header */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {debt.tag}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {debt.installmentsCount} cuotas ({debt.frequency})
                          </span>
                          {isPaid ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Liquidada</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>En Progreso</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-base sm:text-lg font-black text-slate-900">
                          {debt.title}
                        </h3>

                        {debt.notes && (
                          <p className="text-xs text-slate-500 italic">{debt.notes}</p>
                        )}
                      </div>

                      {/* Main Values & CTA */}
                      <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400 uppercase font-semibold">
                            Total Original
                          </div>
                          <div className="text-base sm:text-lg font-black text-slate-900">
                            {formatCurrency(debt.totalOriginalAmount, currencyCode, currencySymbol)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDebtForAbono(debt);
                                setAbonoAmount('');
                                setAbonoNotes('');
                                setAbonoUserId(currentUser.id);
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>+ Registrar Abono</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeletingDebt(debt)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Eliminar deuda compartida"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-emerald-700">
                          Abonado: {formatCurrency(totalPaid, currencyCode, currencySymbol)} ({progressPct}%)
                        </span>
                        <span className="text-rose-600">
                          Resta: {formatCurrency(remaining, currencyCode, currencySymbol)}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isPaid ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Contributions by member */}
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Aportes por Integrante del Grupo:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {familyGroup.members.map((m) => {
                          const contributed = contributionsByMember[m.userId]?.amount || 0;
                          const pct = totalPaid > 0 ? Math.round((contributed / totalPaid) * 100) : 0;

                          return (
                            <div
                              key={m.userId}
                              className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-indigo-500" />
                                <span className="font-semibold text-slate-800">{m.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-900 block">
                                  {formatCurrency(contributed, currencyCode, currencySymbol)}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {pct}% del total pagado
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Toggle Abonos History */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer py-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>
                          {isExpanded ? 'Ocultar Historial de Abonos' : `Ver Historial de Abonos (${abonos.length})`}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <span className="text-[11px] text-slate-400">
                        Creada por: {debt.createdByUserName}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Abonos List */}
                  {isExpanded && (
                    <div className="bg-slate-50/70 border-t border-slate-200 p-5 space-y-3 animate-in fade-in">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Historial Detallado de Abonos</span>
                        <span className="text-slate-500 font-normal">
                          {abonos.length} registros
                        </span>
                      </div>

                      {abonos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">
                          Aún no se han registrado abonos a esta deuda.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {abonos.map((abono, idx) => (
                            <div
                              key={abono.id}
                              className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-xs shrink-0">
                                  #{idx + 1}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{abono.userName}</span>
                                    {abono.userId === currentUser.id && (
                                      <span className="text-[10px] text-emerald-600 font-normal">(Tú)</span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Fecha: {abono.date} {abono.notes ? `• ${abono.notes}` : ''}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-black text-emerald-700 text-sm">
                                  +{formatCurrency(abono.amount, currencyCode, currencySymbol)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingAbono({
                                      debtId: debt.id,
                                      abonoId: abono.id,
                                      amount: abono.amount,
                                      memberName: abono.memberName,
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                                  title="Eliminar abono"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD SHARED DEBT */}
      {isAddDebtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Nueva Deuda Compartida
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDebtModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre o Concepto de la Deuda
                </label>
                <input
                  type="text"
                  placeholder="Ej. Nevera No Frost, Préstamo Vehículo, Viaje"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Valor Total de la Deuda
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      placeholder="0"
                      value={newTotalAmount}
                      onChange={(e) =>
                        setNewTotalAmount(e.target.value ? parseFloat(e.target.value) : '')
                      }
                      className="w-full pl-8 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Número de Cuotas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newInstallmentsCount}
                    onChange={(e) => setNewInstallmentsCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Frecuencia
                  </label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value as 'quincenal' | 'mensual')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Etiqueta
                  </label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    {suggestedTags.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notas / Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Detalles sobre financiación, tasa o acuerdo familiar..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddDebtModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Guardar Deuda Compartida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER ABONO */}
      {selectedDebtForAbono && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Registrar Abono a Deuda
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">
                    {selectedDebtForAbono.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDebtForAbono(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAbono} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  ¿Quién realiza este abono?
                </label>
                <select
                  value={abonoUserId}
                  onChange={(e) => setAbonoUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                >
                  {familyGroup.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} {m.userId === currentUser.id ? '(Tú)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Monto del Abono
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="0"
                    value={abonoAmount}
                    onChange={(e) =>
                      setAbonoAmount(e.target.value ? parseFloat(e.target.value) : '')
                    }
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Fecha del Pago
                </label>
                <input
                  type="date"
                  value={abonoDate}
                  onChange={(e) => setAbonoDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nota / Detalle (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cuota quincena 15 de agosto, abono extraordinario..."
                  value={abonoNotes}
                  onChange={(e) => setAbonoNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDebtForAbono(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE SHARED DEBT */}
      <ConfirmDeleteModal
        isOpen={!!deletingDebt}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. La deuda compartida y todos sus abonos registrados en el grupo familiar serán eliminados permanentemente."
        itemName={deletingDebt ? `${deletingDebt.title} (${formatCurrency(deletingDebt.totalAmount, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingDebt(null)}
        onConfirm={() => {
          if (deletingDebt) {
            onDeleteSharedDebt(deletingDebt.id);
            setDeletingDebt(null);
          }
        }}
      />

      {/* CONFIRM DELETE ABONO */}
      <ConfirmDeleteModal
        isOpen={!!deletingAbono}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. El abono registrado será descontado del historial de la deuda."
        itemName={deletingAbono ? `Abono de ${formatCurrency(deletingAbono.amount, currencyCode, currencySymbol)} por ${deletingAbono.memberName}` : undefined}
        onClose={() => setDeletingAbono(null)}
        onConfirm={() => {
          if (deletingAbono) {
            onDeleteAbono(deletingAbono.debtId, deletingAbono.abonoId);
            setDeletingAbono(null);
          }
        }}
      />
    </div>
  );
};
