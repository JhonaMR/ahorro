import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  Layers,
  Percent,
  Split,
} from 'lucide-react';
import { DebtFrequency, DebtItem, MonthlyDistribution, PeriodSelection } from '../../types';
import { MONTH_NAMES_ES, formatCurrency } from '../../utils/formatters';

interface AddDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Omit<DebtItem, 'id' | 'payments' | 'createdAt'>) => void;
  initialPeriod: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  debtToEdit?: DebtItem | null;
  suggestedTags?: string[];
}

export const AddDebtModal: React.FC<AddDebtModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPeriod,
  currencyCode,
  currencySymbol,
  debtToEdit,
  suggestedTags,
}) => {
  const availableTags = suggestedTags && suggestedTags.length > 0
    ? suggestedTags
    : ['Ocio', 'Restaurantes', 'Tecnología', 'Bebidas', 'Hogar', 'Otro'];

  const defaultTag = availableTags[0];
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState(defaultTag);
  const [customTag, setCustomTag] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [installmentsCount, setInstallmentsCount] = useState<number>(12);
  const [installmentAmount, setInstallmentAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState<DebtFrequency>('mensual');
  const [monthlyDistribution, setMonthlyDistribution] = useState<MonthlyDistribution>('both_equal');
  const [customQ1Amount, setCustomQ1Amount] = useState<number | ''>('');
  const [customQ2Amount, setCustomQ2Amount] = useState<number | ''>('');
  const [startYear, setStartYear] = useState<number>(initialPeriod.year);
  const [startMonth, setStartMonth] = useState<number>(initialPeriod.month);
  const [startQuincena, setStartQuincena] = useState<1 | 2>(initialPeriod.quincena);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (debtToEdit) {
      setTitle(debtToEdit.title);
      if (availableTags.includes(debtToEdit.tag)) {
        setTag(debtToEdit.tag);
        setCustomTag('');
      } else {
        setTag('Otro');
        setCustomTag(debtToEdit.tag);
      }
      setTotalAmount(debtToEdit.totalOriginalAmount);
      setInstallmentsCount(debtToEdit.installmentsCount);
      setInstallmentAmount(debtToEdit.installmentAmount);
      setFrequency(debtToEdit.frequency);
      setMonthlyDistribution(debtToEdit.monthlyDistribution || 'both_equal');
      setCustomQ1Amount(debtToEdit.customQ1Amount ?? '');
      setCustomQ2Amount(debtToEdit.customQ2Amount ?? '');
      setStartYear(debtToEdit.startYear);
      setStartMonth(debtToEdit.startMonth);
      setStartQuincena(debtToEdit.startQuincena);
      setNotes(debtToEdit.notes || '');
    } else {
      setTitle('');
      setTag(defaultTag);
      setCustomTag('');
      setTotalAmount('');
      setInstallmentsCount(12);
      setInstallmentAmount('');
      setFrequency('mensual');
      setMonthlyDistribution('both_equal');
      setCustomQ1Amount('');
      setCustomQ2Amount('');
      setStartYear(initialPeriod.year);
      setStartMonth(initialPeriod.month);
      setStartQuincena(initialPeriod.quincena);
      setNotes('');
    }
  }, [debtToEdit, initialPeriod, isOpen, defaultTag]);

  // Recalculate default installment amount when total or count changes
  const handleTotalOrCountChange = (newTotal: number | '', newCount: number) => {
    if (typeof newTotal === 'number' && newTotal > 0 && newCount > 0) {
      const calculated = Math.round(newTotal / newCount);
      setInstallmentAmount(calculated);
      if (monthlyDistribution === 'both_custom') {
        const half = Math.round(calculated / 2);
        setCustomQ1Amount(half);
        setCustomQ2Amount(calculated - half);
      }
    }
  };

  const handleMonthlyDistChange = (mode: MonthlyDistribution) => {
    setMonthlyDistribution(mode);
    if (mode === 'both_custom' && typeof installmentAmount === 'number') {
      const half = Math.round(installmentAmount / 2);
      setCustomQ1Amount(half);
      setCustomQ2Amount(installmentAmount - half);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTotal = typeof totalAmount === 'number' ? totalAmount : 0;
    const finalInstAmount = typeof installmentAmount === 'number' ? installmentAmount : 0;

    if (!title.trim() || finalTotal <= 0 || installmentsCount <= 0 || finalInstAmount <= 0) {
      return;
    }

    const finalTag = tag === 'Otro' && customTag.trim() ? customTag.trim() : tag;

    onSave({
      title: title.trim(),
      tag: finalTag,
      totalOriginalAmount: finalTotal,
      installmentsCount,
      installmentAmount: finalInstAmount,
      frequency,
      monthlyDistribution: frequency === 'mensual' ? monthlyDistribution : undefined,
      customQ1Amount:
        frequency === 'mensual' && monthlyDistribution === 'both_custom' && typeof customQ1Amount === 'number'
          ? customQ1Amount
          : undefined,
      customQ2Amount:
        frequency === 'mensual' && monthlyDistribution === 'both_custom' && typeof customQ2Amount === 'number'
          ? customQ2Amount
          : undefined,
      startYear,
      startMonth,
      startQuincena,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto text-slate-700">
      <div
        id="modal-add-debt-container"
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8"
      >
        <button
          id="btn-close-debt-modal"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {debtToEdit ? 'Editar Deuda / Obligación' : 'Registrar Nueva Deuda Diferida'}
            </h2>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Define el valor, cuotas diferidas y su distribución mensual o quincenal
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title & Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input-debt-title" className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la deuda *
              </label>
              <input
                id="input-debt-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ej. Tarjeta Éxito - Computador"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="select-debt-tag" className="block text-xs font-semibold text-slate-700 mb-1">
                Etiqueta / Categoría *
              </label>
              <select
                id="select-debt-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Tag Pills for Deudas */}
          <div>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`text-[11px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                    tag === t
                      ? 'bg-rose-500 text-white border-rose-600 font-semibold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-755 border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tag === 'Otro' && (
            <div>
              <label htmlFor="input-debt-custom-tag" className="block text-xs font-semibold text-slate-700 mb-1">
                Escribe tu etiqueta personalizada
              </label>
              <input
                id="input-debt-custom-tag"
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="ej. Arreglo Vehículo"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          )}

          {/* Total amount and installments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
            <div className="sm:col-span-1">
              <label htmlFor="input-debt-total" className="block text-xs font-semibold text-slate-700 mb-1">
                Monto Total Original *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-405 text-xs font-bold font-mono">
                  {currencySymbol}
                </span>
                <input
                  id="input-debt-total"
                  type="number"
                  required
                  min="1"
                  value={totalAmount}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : '';
                    setTotalAmount(val);
                    handleTotalOrCountChange(val, installmentsCount);
                  }}
                  placeholder="ej. 1200000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-debt-installments" className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Cuotas *
              </label>
              <input
                id="input-debt-installments"
                type="number"
                required
                min="1"
                max="120"
                value={installmentsCount}
                onChange={(e) => {
                  const cnt = parseInt(e.target.value, 10) || 1;
                  setInstallmentsCount(cnt);
                  handleTotalOrCountChange(totalAmount, cnt);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="input-debt-installment-val" className="block text-xs font-semibold text-slate-700 mb-1">
                Valor por Cuota *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-405 text-xs font-bold font-mono">
                  {currencySymbol}
                </span>
                <input
                  id="input-debt-installment-val"
                  type="number"
                  required
                  min="1"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="Calculado"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Payment Frequency */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Frecuencia de las cuotas diferidas *
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                id="btn-freq-mensual"
                onClick={() => setFrequency('mensual')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  frequency === 'mensual'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Cuota Mensual ({installmentsCount} meses)</span>
              </button>

              <button
                type="button"
                id="btn-freq-quincenal"
                onClick={() => setFrequency('quincenal')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  frequency === 'quincenal'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Cuota Quincenal ({installmentsCount} quincenas)</span>
              </button>
            </div>

            {/* If Mensual: choose Bi-weekly distribution! */}
            {frequency === 'mensual' && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  ¿Cómo quieres reflejar esta cuota mensual en el visor quincenal?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  <button
                    type="button"
                    id="btn-dist-equal"
                    onClick={() => handleMonthlyDistChange('both_equal')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'both_equal'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Split className="w-3.5 h-3.5 text-rose-600" />
                      Dividir en ambas quincenas (50% / 50%)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      {typeof installmentAmount === 'number'
                        ? `${formatCurrency(installmentAmount / 2, currencyCode, currencySymbol)} en Q1 y Q2`
                        : 'Mitad en Q1 y mitad en Q2'}
                    </div>
                  </button>

                  <button
                    type="button"
                    id="btn-dist-custom"
                    onClick={() => handleMonthlyDistChange('both_custom')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'both_custom'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-rose-600" />
                      Dividir en ambas con valores a medida
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      Personalizar cuánto va en Q1 y cuánto en Q2
                    </div>
                  </button>

                  <button
                    type="button"
                    id="btn-dist-q1"
                    onClick={() => handleMonthlyDistChange('only_q1')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'only_q1'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-755 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Solo en la 1ra Quincena (Q1)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      100% de la cuota exigible en días 1 - 15
                    </div>
                  </button>

                  <button
                    type="button"
                    id="btn-dist-q2"
                    onClick={() => handleMonthlyDistChange('only_q2')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'only_q2'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-755 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Solo en la 2da Quincena (Q2)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      100% de la cuota exigible en días 16 - fin
                    </div>
                  </button>
                </div>

                {/* Custom Split Inputs */}
                {monthlyDistribution === 'both_custom' && (
                  <div className="p-3 rounded-lg bg-rose-50/70 border border-rose-200 grid grid-cols-2 gap-3 mt-2 text-xs font-semibold">
                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 mb-1">
                        Valor en Q1:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customQ1Amount}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : '';
                          setCustomQ1Amount(val);
                          if (typeof val === 'number' && typeof installmentAmount === 'number') {
                            setCustomQ2Amount(Math.max(0, installmentAmount - val));
                          }
                        }}
                        className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        placeholder="Monto Q1"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 mb-1">
                        Valor en Q2:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customQ2Amount}
                        onChange={(e) => setCustomQ2Amount(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        placeholder="Monto Q2"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Starting Period */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label htmlFor="select-debt-start-year" className="block text-xs font-semibold text-slate-700 mb-1">
                Año de Inicio
              </label>
              <select
                id="select-debt-start-year"
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="select-debt-start-month" className="block text-xs font-semibold text-slate-700 mb-1">
                Mes de Inicio
              </label>
              <select
                id="select-debt-start-month"
                value={startMonth}
                onChange={(e) => setStartMonth(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {MONTH_NAMES_ES.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="select-debt-start-quincena" className="block text-xs font-semibold text-slate-700 mb-1">
                Quincena de Inicio
              </label>
              <select
                id="select-debt-start-quincena"
                value={startQuincena}
                onChange={(e) => setStartQuincena(parseInt(e.target.value, 10) as 1 | 2)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                <option value={1}>1ra Quincena (1-15)</option>
                <option value={2}>2da Quincena (16-fin)</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="input-debt-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <input
              id="input-debt-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Tasa de interés 0%, débito automático..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-debt-modal"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-650 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-save-debt-submit"
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {debtToEdit ? 'Guardar Cambios' : 'Registrar Deuda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
