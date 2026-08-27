import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Plus,
} from 'lucide-react';
import { FreeBalanceAllocation } from '../types';
import { formatCurrency } from '../utils/formatters';

interface FreeBalanceCardProps {
  freeBalance: number;
  periodKey: string;
  currencyCode: string;
  currencySymbol: string;
  currentAllocation?: FreeBalanceAllocation;
  onSaveAllocation: (periodKey: string, allocation: FreeBalanceAllocation) => void;
  pocketCarryOver: number;
  cumulativeCushion: number;
}

export const FreeBalanceCard: React.FC<FreeBalanceCardProps> = ({
  freeBalance,
  periodKey,
  currencyCode,
  currencySymbol,
  currentAllocation,
  onSaveAllocation,
  pocketCarryOver,
  cumulativeCushion,
}) => {
  const isPositive = freeBalance > 0;
  const isZero = freeBalance === 0;

  // Local state for spendable vs keep in account
  const [spendable, setSpendable] = useState<number>(0);
  const [keepInAccount, setKeepInAccount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [customItems, setCustomItems] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newCustomAmount, setNewCustomAmount] = useState<string>('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  const defaultSpendable = freeBalance > 0 ? Math.round(freeBalance / 2) : 0;
  const defaultKeepInAccount = freeBalance > 0 ? freeBalance - defaultSpendable : 0;
  
  const currentKeepInAccountSaved = currentAllocation 
    ? currentAllocation.keepInAccountAmount 
    : defaultKeepInAccount;
    
  const previousCushion = Math.max(0, cumulativeCushion - currentKeepInAccountSaved);

  useEffect(() => {
    if (currentAllocation) {
      setSpendable(currentAllocation.spendableAmount);
      setKeepInAccount(currentAllocation.keepInAccountAmount);
      setNotes(currentAllocation.notes || '');
      setCustomItems(currentAllocation.customAllocations || []);
    } else {
      if (freeBalance > 0) {
        const half = Math.round(freeBalance / 2);
        setSpendable(half);
        setKeepInAccount(freeBalance - half);
      } else {
        setSpendable(0);
        setKeepInAccount(0);
      }
      setNotes('');
      setCustomItems([]);
    }
  }, [currentAllocation, freeBalance, periodKey]);

  const handleSpendableChange = (val: number) => {
    const clamped = Math.max(0, Math.min(val, freeBalance));
    setSpendable(clamped);
    setKeepInAccount(Math.max(0, freeBalance - clamped));
  };

  const handleKeepInAccountChange = (val: number) => {
    const clamped = Math.max(0, Math.min(val, freeBalance));
    setKeepInAccount(clamped);
    setSpendable(Math.max(0, freeBalance - clamped));
  };

  const handleQuickPreset = (spendPercent: number) => {
    if (freeBalance <= 0) return;
    const sp = Math.round((freeBalance * spendPercent) / 100);
    const kp = freeBalance - sp;
    setSpendable(sp);
    setKeepInAccount(kp);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(newCustomAmount);
    if (!newCustomName.trim() || isNaN(amt) || amt <= 0) return;

    setCustomItems([
      ...customItems,
      {
        id: `cust-${Date.now()}`,
        name: newCustomName.trim(),
        amount: amt,
      },
    ]);
    setNewCustomName('');
    setNewCustomAmount('');
  };

  const handleRemoveCustom = (id: string) => {
    setCustomItems(customItems.filter((i) => i.id !== id));
  };

  const handleSave = () => {
    onSaveAllocation(periodKey, {
      periodKey,
      spendableAmount: spendable,
      keepInAccountAmount: keepInAccount,
      customAllocations: customItems,
      notes,
    });
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2500);
  };

  const spendablePercent =
    freeBalance > 0 ? Math.min(100, Math.max(0, Math.round((spendable / freeBalance) * 100))) : 0;
  const keepPercent = 100 - spendablePercent;

  return (
    <div
      id="card-free-balance-allocator"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
              isPositive
                ? 'bg-emerald-600 shadow-sm shadow-emerald-200'
                : isZero
                ? 'bg-slate-500'
                : 'bg-rose-500 shadow-sm shadow-rose-200'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                División del Saldo Libre Disponible
              </h3>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  isPositive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isZero
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {isPositive ? 'Superávit / Saldo a favor' : isZero ? 'En balance exacto' : 'Déficit en el periodo'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isPositive
                ? 'Distribuye tu dinero restante: define qué valor puedes gastar libremente y qué valor dejar en la cuenta.'
                : 'El subtotal de gastos supera tus ingresos para este periodo.'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-medium text-slate-500 block">Saldo Libre Total</span>
          <span
            className={`text-2xl font-extrabold tracking-tight ${
              isPositive ? 'text-emerald-700' : isZero ? 'text-slate-700' : 'text-rose-600'
            }`}
          >
            {formatCurrency(freeBalance, currencyCode, currencySymbol)}
          </span>
        </div>
      </div>

      {isPositive ? (
        <div className="mt-5 space-y-5">
          {/* Visual distribution bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-indigo-700 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" />
                Gastar libremente: {spendablePercent}% ({formatCurrency(spendable, currencyCode, currencySymbol)})
              </span>
              <span className="text-teal-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Dejar en cuenta: {keepPercent}% ({formatCurrency(keepInAccount, currencyCode, currencySymbol)})
              </span>
            </div>

            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/80">
              <div
                className="h-full bg-indigo-600 transition-all duration-300 rounded-l-full"
                style={{ width: `${spendablePercent}%` }}
                title={`Para gastar: ${spendablePercent}%`}
              />
              <div
                className="h-full bg-teal-500 transition-all duration-300 rounded-r-full"
                style={{ width: `${keepPercent}%` }}
                title={`Dejar en cuenta: ${keepPercent}%`}
              />
            </div>

            {/* Slider control */}
            <div className="mt-3 flex items-center gap-3">
              <Sliders className="w-4 h-4 text-slate-400" />
              <input
                id="slider-free-balance-split"
                type="range"
                min="0"
                max={freeBalance}
                step={freeBalance > 10000 ? 5000 : 1}
                value={spendable}
                onChange={(e) => handleSpendableChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 font-medium">Preajustes rápidos:</span>
            <button
              type="button"
              onClick={() => handleQuickPreset(50)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              50% / 50%
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(30)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              30% Gastar / 70% Guardar
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(70)}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              70% Gastar / 30% Guardar
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(0)}
              className="px-2.5 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
            >
              100% Dejar en cuenta
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(100)}
              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              100% Disponible para gastar
            </button>
          </div>

          {/* Editable direct amount boxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box 1: Spendable */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag className="w-4 h-4 text-indigo-600" />
                <label htmlFor="input-spendable-amount" className="text-xs font-bold text-indigo-900">
                  1. Disponible para Gastar (Ocio / Salidas / Bolsillo)
                </label>
              </div>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">
                  {currencySymbol}
                </span>
                <input
                  id="input-spendable-amount"
                  type="number"
                  min="0"
                  max={freeBalance}
                  value={spendable}
                  onChange={(e) => handleSpendableChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-indigo-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">
                Dinero con el que puedes contar para antojos, salidas o compras personales sin afectar tus
                obligaciones.
              </p>
              
              <div className="mt-2.5 pt-2.5 border-t border-indigo-100 space-y-1 text-xs text-indigo-950 font-medium">
                <div className="flex justify-between">
                  <span className="text-indigo-700/80">Presupuesto quincena:</span>
                  <span className="font-mono">{formatCurrency(spendable, currencyCode, currencySymbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-700/80">Arrastre acumulado anterior:</span>
                  <span className="font-mono">+{formatCurrency(pocketCarryOver, currencyCode, currencySymbol)}</span>
                </div>
                <div className="flex justify-between border-t border-indigo-200/60 pt-1 font-bold text-indigo-900">
                  <span>Total disponible bolsillo:</span>
                  <span className="font-mono">{formatCurrency(spendable + pocketCarryOver, currencyCode, currencySymbol)}</span>
                </div>
              </div>
            </div>

            {/* Box 2: Keep in account */}
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                <label htmlFor="input-keep-amount" className="text-xs font-bold text-teal-900">
                  2. Dejar en la Cuenta (Colchón / Reserva / No tocar)
                </label>
              </div>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-semibold">
                  {currencySymbol}
                </span>
                <input
                  id="input-keep-amount"
                  type="number"
                  min="0"
                  max={freeBalance}
                  value={keepInAccount}
                  onChange={(e) => handleKeepInAccountChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-teal-200 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1.5">
                Permanecerá en tu cuenta bancaria como saldo de seguridad para emergencias o colchón para el
                siguiente periodo.
              </p>
              
              <div className="mt-2.5 pt-2.5 border-t border-teal-100 space-y-1 text-xs text-teal-950 font-medium">
                <div className="flex justify-between">
                  <span className="text-teal-700/80">Aporte quincena:</span>
                  <span className="font-mono">{formatCurrency(keepInAccount, currencyCode, currencySymbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700/80">Colchón acumulado anterior:</span>
                  <span className="font-mono">+{formatCurrency(previousCushion, currencyCode, currencySymbol)}</span>
                </div>
                <div className="flex justify-between border-t border-teal-200/60 pt-1 font-bold text-teal-900">
                  <span>Total colchón en cuenta:</span>
                  <span className="font-mono">{formatCurrency(previousCushion + keepInAccount, currencyCode, currencySymbol)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional notes & Save button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex-1 min-w-[240px]">
              <input
                id="input-balance-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota o plan para este saldo (ej. Guardar para matrícula, comprar regalo)..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <button
              id="btn-save-free-balance"
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                isSavedRecently
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
              }`}
            >
              {isSavedRecently ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>¡Distribución Guardada!</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Fijar Plan de Saldo</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 space-y-1">
            <p className="font-bold">
              Tus gastos superan los ingresos en este periodo por{' '}
              {formatCurrency(Math.abs(freeBalance), currencyCode, currencySymbol)}.
            </p>
            <p className="text-rose-700">
              Revisa si puedes posponer algún gasto esporádico, ajustar cuotas o destinar fondos de un ahorro
              previo para cubrir el periodo.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
