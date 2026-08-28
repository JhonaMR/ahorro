import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { FamilyGroup, UserAccount, AppConfig } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  getSimulatorData,
  saveSimulatorExpense,
  deleteSimulatorExpense,
  saveSimulatorContribution,
} from '../../utils/storage';

interface SharedExpensesSimulatorTabProps {
  familyGroup: FamilyGroup | null;
  currentUser: UserAccount;
  personalConfig?: AppConfig;
  currencyCode: string;
  currencySymbol: string;
}

export const SharedExpensesSimulatorTab: React.FC<SharedExpensesSimulatorTabProps> = ({
  familyGroup,
  currentUser,
  personalConfig,
  currencyCode,
  currencySymbol,
}) => {
  // Group Simulator states
  const [simExpenses, setSimExpenses] = useState<any[]>([]);
  const [simContributions, setSimContributions] = useState<any[]>([]);
  const [loadingSim, setLoadingSim] = useState(false);
  const [decIncome, setDecIncome] = useState<number | ''>('');
  const [hideInc, setHideInc] = useState(false);
  const [usePers, setUsePers] = useState(false);
  const [savingSimCont, setSavingSimCont] = useState(false);
  const [showAddSimExpense, setShowAddSimExpense] = useState(false);
  const [simExpName, setSimExpName] = useState('');
  const [simExpAmount, setSimExpAmount] = useState<number | ''>('');
  const [editingSimExpId, setEditingSimExpId] = useState<string | null>(null);

  const fetchSimulatorData = async () => {
    if (!familyGroup) return;
    setLoadingSim(true);
    try {
      const { sharedExpenses, contributions } = await getSimulatorData(familyGroup.id);
      setSimExpenses(sharedExpenses);
      setSimContributions(contributions);

      // Populate form if exists
      const myCont = contributions.find((c: any) => c.userId === currentUser.id);
      if (myCont) {
        setDecIncome(myCont.declaredIncome);
        setHideInc(myCont.hideIncome);
        setUsePers(myCont.usePersonalConfig);
      } else {
        setDecIncome('');
        setHideInc(false);
        setUsePers(false);
      }
    } catch (e) {
      console.error('Error fetching simulator data:', e);
    } finally {
      setLoadingSim(false);
    }
  };

  useEffect(() => {
    if (familyGroup) {
      fetchSimulatorData();
    }
  }, [familyGroup]);

  // Handle toggling of "use config personal"
  useEffect(() => {
    if (usePers && personalConfig) {
      setDecIncome(personalConfig.monthlyFixedIncome);
    }
  }, [usePers, personalConfig]);

  const handleSaveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyGroup) return;
    setSavingSimCont(true);
    try {
      const finalIncome = decIncome === '' ? 0 : Number(decIncome);
      await saveSimulatorContribution(familyGroup.id, {
        declaredIncome: finalIncome,
        hideIncome: hideInc,
        usePersonalConfig: usePers
      });
      fetchSimulatorData();
    } catch (e) {
      console.error('Error saving contribution:', e);
    } finally {
      setSavingSimCont(false);
    }
  };

  const handleSaveSimExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyGroup || !simExpName.trim() || !simExpAmount || Number(simExpAmount) <= 0) return;

    try {
      await saveSimulatorExpense(familyGroup.id, {
        id: editingSimExpId || undefined,
        name: simExpName.trim(),
        monthlyAmount: Number(simExpAmount)
      });
      setSimExpName('');
      setSimExpAmount('');
      setEditingSimExpId(null);
      setShowAddSimExpense(false);
      fetchSimulatorData();
    } catch (e) {
      console.error('Error saving simulator expense:', e);
    }
  };

  const handleDeleteSimExpense = async (id: string) => {
    if (!familyGroup) return;
    try {
      await deleteSimulatorExpense(familyGroup.id, id);
      fetchSimulatorData();
    } catch (e) {
      console.error('Error deleting simulator expense:', e);
    }
  };

  const simulatorMetrics = useMemo(() => {
    const totalSimExpenses = simExpenses.reduce((sum, e) => sum + e.monthlyAmount, 0);
    const totalGroupIncome = simContributions.reduce((sum, c) => sum + c.declaredIncome, 0);

    const membersList = familyGroup 
      ? familyGroup.members.map(m => m.user) 
      : [];

    const splits = membersList.map((user) => {
      const cont = simContributions.find((c) => c.userId === user.id);
      const declaredIncome = cont ? cont.declaredIncome : 0;
      const hideIncome = cont ? cont.hideIncome : false;
      const percentage = totalGroupIncome > 0 ? (declaredIncome / totalGroupIncome) : 0;
      const totalSuggested = totalSimExpenses * percentage;

      const breakdown = simExpenses.map((exp) => ({
        expenseId: exp.id,
        name: exp.name,
        totalAmount: exp.monthlyAmount,
        suggestedShare: exp.monthlyAmount * percentage,
      }));

      return {
        user,
        declaredIncome,
        hideIncome,
        percentage: percentage * 100,
        totalSuggested,
        breakdown,
      };
    });

    return {
      totalSimExpenses,
      totalGroupIncome,
      splits,
    };
  }, [simExpenses, simContributions, familyGroup]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-650" />
            <span>Simulador de Gastos Compartidos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Calcula la distribución proporcional de los gastos fijos del hogar según los ingresos declarados de cada integrante.
          </p>
        </div>
        
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl text-[11px] font-semibold max-w-sm">
          💡 <strong>Nota Informativa:</strong> Este simulador es puramente informativo y de planificación. No realiza débitos, no afecta tu disponible de quincena, ni crea deudas en el sistema.
        </div>
      </div>

      {loadingSim ? (
        <p className="text-xs text-slate-500 text-center py-8">Cargando simulador...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* 1. MY CONTRIBUTION DATA */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2.5">
                Mis Datos de Aporte
              </h3>

              <form onSubmit={handleSaveContribution} className="space-y-3.5 text-xs font-semibold text-slate-700">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={usePers}
                      onChange={(e) => setUsePers(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Usar datos de mi configuración personal</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1">
                    <input
                      type="checkbox"
                      checked={hideInc}
                      onChange={(e) => setHideInc(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>Ocultar mi ingreso a los demás miembros</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase mb-1">Ingreso Mensual Declarado</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      disabled={usePers}
                      min="0"
                      step="any"
                      required
                      value={decIncome}
                      onChange={(e) => setDecIncome(e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder="ej. 3500000"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 disabled:bg-slate-100 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingSimCont}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer text-center"
                >
                  {savingSimCont ? 'Guardando...' : 'Actualizar mis datos'}
                </button>
              </form>
            </div>

            {/* 2. SHARED FIXED EXPENSES LIST */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Gastos Comunes ({simExpenses.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSimExpId(null);
                    setSimExpName('');
                    setSimExpAmount('');
                    setShowAddSimExpense(!showAddSimExpense);
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.8 rounded-lg cursor-pointer transition"
                >
                  {showAddSimExpense ? 'Cerrar' : '+ Agregar'}
                </button>
              </div>

              {showAddSimExpense && (
                <form onSubmit={handleSaveSimExpense} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs font-semibold text-slate-700 animate-in slide-in-from-top-2 duration-150">
                  <h4 className="text-[11px] font-bold text-slate-800">
                    {editingSimExpId ? 'Editar Gasto' : 'Nuevo Gasto Fijo Común'}
                  </h4>
                  <div>
                    <label className="block mb-0.5">Nombre del Gasto</label>
                    <input
                      type="text"
                      required
                      placeholder="ej. Arriendo, Internet Fibra"
                      value={simExpName}
                      onChange={(e) => setSimExpName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block mb-0.5">Monto Mensual</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold">{currencySymbol}</span>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Monto"
                        value={simExpAmount}
                        onChange={(e) => setSimExpAmount(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition cursor-pointer"
                    >
                      Guardar Gasto
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSimExpense(false)}
                      className="py-1.5 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {simExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">No se han registrado gastos fijos compartidos.</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                  {simExpenses.map((exp) => (
                    <div key={exp.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-800 block leading-tight">{exp.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">Mensual</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-950">
                          {formatCurrency(exp.monthlyAmount, currencyCode, currencySymbol)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSimExpId(exp.id);
                            setSimExpName(exp.name);
                            setSimExpAmount(exp.monthlyAmount);
                            setShowAddSimExpense(true);
                          }}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded transition cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSimExpense(exp.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs font-bold mt-2">
                <span className="text-slate-400 uppercase text-[9px] tracking-wider">Total de Gastos Comunes</span>
                <span className="text-sm font-black text-emerald-400">
                  {formatCurrency(simulatorMetrics.totalSimExpenses, currencyCode, currencySymbol)}/mes
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
                Propuesta de Aporte Proporcional a los Ingresos
              </h3>

              <div className="divide-y divide-slate-100">
                {simulatorMetrics.splits.map((split) => {
                  const isMe = split.user.id === currentUser.id;
                  const hasIncome = split.declaredIncome > 0;
                  return (
                    <div key={split.user.id} className="py-4 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {split.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block leading-tight flex items-center gap-1.5">
                              <span>{split.user.name}</span>
                              {isMe && <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-800">Tú</span>}
                              {split.hideIncome && !isMe && <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Privado</span>}
                            </span>
                            <span className="text-[10px] text-slate-505 font-semibold">{split.user.email}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Ingreso Declarado</span>
                          <span className="text-xs font-black text-slate-800">
                            {split.hideIncome && !isMe 
                              ? '$ *******' 
                              : formatCurrency(split.declaredIncome, currencyCode, currencySymbol)
                            }
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Porcentaje de Carga</span>
                          <span className="text-sm font-black text-indigo-700">
                            {hasIncome ? `${split.percentage.toFixed(1)}%` : '0%'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Aporte Sugerido (Total)</span>
                          <span className="text-sm font-black text-emerald-600">
                            {formatCurrency(split.totalSuggested, currencyCode, currencySymbol)}
                          </span>
                        </div>
                      </div>

                      {hasIncome && simExpenses.length > 0 && (
                        <div className="pl-4 space-y-1.5 border-l border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Desglose por Concepto:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {split.breakdown.map((item) => (
                              <div key={item.expenseId} className="flex justify-between items-center text-[11px] font-medium text-slate-600 bg-slate-50/20 p-2 rounded-xl border border-slate-100">
                                <span className="truncate max-w-[120px]">{item.name}</span>
                                <span className="font-bold text-slate-900">
                                  {formatCurrency(item.suggestedShare, currencyCode, currencySymbol)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {simulatorMetrics.totalSimExpenses > 0 && simulatorMetrics.totalGroupIncome === 0 && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold text-center mt-4">
                  ⚠️ Ningún miembro del grupo ha configurado su ingreso mensual declarado aún. Sube tus ingresos en la columna izquierda para ver la distribución.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
