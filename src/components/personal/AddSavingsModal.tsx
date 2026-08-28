import React, { useState, useEffect } from 'react';
import {
  X,
  PiggyBank,
  Calendar,
  Layers,
  Split,
  Percent,
} from 'lucide-react';
import { MonthlyDistribution, PeriodSelection, SavingsProgram } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AddSavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (savings: Omit<SavingsProgram, 'id' | 'deposits' | 'createdAt'>) => void;
  initialPeriod: PeriodSelection;
  currencyCode: string;
  currencySymbol: string;
  savingsToEdit?: SavingsProgram | null;
}

const COMMON_SAVINGS_TAGS = [
  'Fondo de Emergencia',
  'Vacaciones / Viajes',
  'Inversión',
  'Vehículo / Moto',
  'Educación',
  'Vivienda / Arriendo',
  'Tecnología',
  'Retiro / Futuro',
  'Regalos / Fiestas',
  'Otro',
];

export const AddSavingsModal: React.FC<AddSavingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPeriod,
  currencyCode,
  currencySymbol,
  savingsToEdit,
}) => {
  const [name, setName] = useState('');
  const [tag, setTag] = useState(COMMON_SAVINGS_TAGS[0]);
  const [customTag, setCustomTag] = useState('');
  const [targetAmount, setTargetAmount] = useState<number | ''>('');
  const [periodicAmount, setPeriodicAmount] = useState<number | ''>('');
  const [frequency, setFrequency] = useState<'quincenal' | 'mensual'>('mensual');
  const [monthlyDistribution, setMonthlyDistribution] = useState<MonthlyDistribution>('both_equal');
  const [customQ1Amount, setCustomQ1Amount] = useState<number | ''>('');
  const [customQ2Amount, setCustomQ2Amount] = useState<number | ''>('');
  const [startYear] = useState<number>(initialPeriod.year);
  const [startMonth] = useState<number>(initialPeriod.month);
  const [startQuincena] = useState<1 | 2>(initialPeriod.quincena);
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
    if (savingsToEdit) {
      setName(savingsToEdit.name);
      if (COMMON_SAVINGS_TAGS.includes(savingsToEdit.tag)) {
        setTag(savingsToEdit.tag);
        setCustomTag('');
      } else {
        setTag('Otro');
        setCustomTag(savingsToEdit.tag);
      }
      setTargetAmount(savingsToEdit.targetAmount ?? '');
      setPeriodicAmount(savingsToEdit.periodicAmount);
      setFrequency(savingsToEdit.frequency);
      setMonthlyDistribution(savingsToEdit.monthlyDistribution || 'both_equal');
      setCustomQ1Amount(savingsToEdit.customQ1Amount ?? '');
      setCustomQ2Amount(savingsToEdit.customQ2Amount ?? '');
    } else {
      setName('');
      setTag(COMMON_SAVINGS_TAGS[0]);
      setCustomTag('');
      setTargetAmount('');
      setPeriodicAmount('');
      setFrequency('mensual');
      setMonthlyDistribution('both_equal');
      setCustomQ1Amount('');
      setCustomQ2Amount('');
      setNotes('');
    }
  }, [savingsToEdit, initialPeriod, isOpen]);

  const handleMonthlyDistChange = (mode: MonthlyDistribution) => {
    setMonthlyDistribution(mode);
    if (mode === 'both_custom' && typeof periodicAmount === 'number') {
      const half = Math.round(periodicAmount / 2);
      setCustomQ1Amount(half);
      setCustomQ2Amount(periodicAmount - half);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPeriodic = typeof periodicAmount === 'number' ? periodicAmount : 0;
    if (!name.trim() || finalPeriodic <= 0) return;

    const finalTag = tag === 'Otro' && customTag.trim() ? customTag.trim() : tag;

    onSave({
      name: name.trim(),
      tag: finalTag,
      targetAmount: typeof targetAmount === 'number' && targetAmount > 0 ? targetAmount : undefined,
      periodicAmount: finalPeriodic,
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
        id="modal-add-savings-container"
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8"
      >
        <button
          id="btn-close-savings-modal"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-tight">
              {savingsToEdit ? 'Editar Ahorro Programado' : 'Crear Nuevo Ahorro Programado'}
            </h2>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Establece tu meta periódica de ahorro y su distribución quincenal o mensual
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input-savings-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Ahorro / Meta *
              </label>
              <input
                id="input-savings-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Fondo de Emergencia o Vacaciones"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="select-savings-tag" className="block text-xs font-semibold text-slate-700 mb-1">
                Etiqueta / Categoría *
              </label>
              <select
                id="select-savings-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {COMMON_SAVINGS_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {tag === 'Otro' && (
            <div>
              <label htmlFor="input-savings-custom-tag" className="block text-xs font-semibold text-slate-700 mb-1">
                Etiqueta personalizada
              </label>
              <input
                id="input-savings-custom-tag"
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="ej. Inversión CDT o Fondo Indexado"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          )}

          {/* Amounts: Periodic & Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            <div>
              <label htmlFor="input-savings-periodic" className="block text-xs font-semibold text-slate-700 mb-1">
                Valor a Ahorrar por Periodo *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-405 text-xs font-bold font-mono">
                  {currencySymbol}
                </span>
                <input
                  id="input-savings-periodic"
                  type="number"
                  required
                  min="1"
                  value={periodicAmount}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : '';
                    setPeriodicAmount(val);
                    if (typeof val === 'number' && monthlyDistribution === 'both_custom') {
                      const half = Math.round(val / 2);
                      setCustomQ1Amount(half);
                      setCustomQ2Amount(val - half);
                    }
                  }}
                  placeholder="ej. 200000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-savings-target" className="block text-xs font-semibold text-slate-700 mb-1">
                Meta Total Deseada (Opcional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-405 text-xs font-bold font-mono">
                  {currencySymbol}
                </span>
                <input
                  id="input-savings-target"
                  type="number"
                  min="1"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="ej. 5000000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Frequency & Bi-weekly distribution */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              Frecuencia del Ahorro *
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                id="btn-savings-freq-mensual"
                onClick={() => setFrequency('mensual')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  frequency === 'mensual'
                    ? 'bg-teal-650 text-white border-teal-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Ahorro Mensual</span>
              </button>

              <button
                type="button"
                id="btn-savings-freq-quincenal"
                onClick={() => setFrequency('quincenal')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  frequency === 'quincenal'
                    ? 'bg-teal-650 text-white border-teal-600 shadow-xs'
                    : 'bg-white text-slate-705 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Ahorro Quincenal</span>
              </button>
            </div>

            {/* If Mensual: choose Bi-weekly distribution */}
            {frequency === 'mensual' && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  ¿Cómo quieres reflejar este aporte mensual en el visor quincenal?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                  <button
                    type="button"
                    onClick={() => handleMonthlyDistChange('both_equal')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'both_equal'
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Split className="w-3.5 h-3.5 text-teal-600" />
                      Dividir en ambas quincenas (50% / 50%)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      {typeof periodicAmount === 'number'
                        ? `${formatCurrency(periodicAmount / 2, currencyCode, currencySymbol)} en Q1 y Q2`
                        : 'Mitad en Q1 y mitad en Q2'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMonthlyDistChange('both_custom')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'both_custom'
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-705 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-teal-600" />
                      Dividir con valores a medida
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      Personalizar cuánto va en Q1 y cuánto en Q2
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMonthlyDistChange('only_q1')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'only_q1'
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-755 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Solo en la 1ra Quincena (Q1)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      Aporte completo en días 1 - 15
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMonthlyDistChange('only_q2')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      monthlyDistribution === 'only_q2'
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold'
                        : 'bg-white border-slate-200 text-slate-755 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold">Solo en la 2da Quincena (Q2)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      Aporte completo en días 16 - fin
                    </div>
                  </button>
                </div>

                {monthlyDistribution === 'both_custom' && (
                  <div className="p-3 rounded-lg bg-teal-50/70 border border-teal-200 grid grid-cols-2 gap-3 mt-2 text-xs font-semibold">
                    <div>
                      <label className="block text-[11px] font-bold text-teal-900 mb-1">
                        Aporte en Q1:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customQ1Amount}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : '';
                          setCustomQ1Amount(val);
                          if (typeof val === 'number' && typeof periodicAmount === 'number') {
                            setCustomQ2Amount(Math.max(0, periodicAmount - val));
                          }
                        }}
                        className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        placeholder="Monto Q1"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-teal-900 mb-1">
                        Aporte en Q2:
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={customQ2Amount}
                        onChange={(e) => setCustomQ2Amount(e.target.value ? parseFloat(e.target.value) : '')}
                        className="w-full bg-white border border-teal-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        placeholder="Monto Q2"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="input-savings-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notas u Objetivos (Opcional)
            </label>
            <input
              id="input-savings-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Guardar en cuenta de alta rentabilidad..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-savings-modal"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-655 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-save-savings-submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {savingsToEdit ? 'Guardar Cambios' : 'Crear Ahorro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
