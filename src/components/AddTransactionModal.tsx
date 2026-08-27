import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  Tag,
} from 'lucide-react';
import { PeriodSelection, SporadicTransaction, TransactionType } from '../types';
import { getPeriodKey } from '../utils/formatters';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<SporadicTransaction, 'id'>) => void;
  initialPeriod: PeriodSelection;
  initialType?: TransactionType;
  initialIsScheduled?: boolean;
  initialDate?: string;
  currencyCode: string;
  currencySymbol: string;
  txToEdit?: SporadicTransaction | null;
}

const COMMON_EXPENSE_TAGS = [
  'Alimentación & Supermercado',
  'Restaurantes & Salidas',
  'Salud & Medicamentos',
  'Mantenimiento / Reparación',
  'Ropa & Calzado',
  'Educación / Cursos',
  'Mascotas',
  'Regalos & Celebraciones',
  'Imprevistos',
  'Otro Gasto',
];

const COMMON_INCOME_TAGS = [
  'Trabajo Extra / Freelance',
  'Bono / Comisión',
  'Venta de Artículos',
  'Devolución de Dinero',
  'Regalo / Apoyo Familiar',
  'Rendimientos / Inversión',
  'Otro Ingreso',
];

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPeriod,
  initialType = 'expense',
  initialIsScheduled = false,
  initialDate,
  currencyCode,
  currencySymbol,
  txToEdit,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [tag, setTag] = useState(initialType === 'income' ? COMMON_INCOME_TAGS[0] : COMMON_EXPENSE_TAGS[0]);
  const [customTag, setCustomTag] = useState('');
  const [date, setDate] = useState<string>('');
  const [isScheduled, setIsScheduled] = useState(initialIsScheduled);
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
    if (txToEdit) {
      setType(txToEdit.type);
      setTitle(txToEdit.title);
      setAmount(txToEdit.amount);
      const tagsList = txToEdit.type === 'income' ? COMMON_INCOME_TAGS : COMMON_EXPENSE_TAGS;
      if (tagsList.includes(txToEdit.tag)) {
        setTag(txToEdit.tag);
        setCustomTag('');
      } else {
        setTag(txToEdit.type === 'income' ? 'Otro Ingreso' : 'Otro Gasto');
        setCustomTag(txToEdit.tag);
      }
      setDate(txToEdit.date);
      setIsScheduled(txToEdit.isScheduled);
      setNotes(txToEdit.notes || '');
    } else {
      setType(initialType);
      setTitle('');
      setAmount('');
      const defaultTag = initialType === 'income' ? COMMON_INCOME_TAGS[0] : COMMON_EXPENSE_TAGS[0];
      setTag(defaultTag);
      setCustomTag('');

      // Default date to initialDate, or period midpoint
      if (initialDate) {
        setDate(initialDate);
      } else {
        const currentYear = initialPeriod.year;
        const currentMonth = String(initialPeriod.month + 1).padStart(2, '0');
        const defaultDay = initialPeriod.quincena === 1 ? '10' : '20';
        setDate(`${currentYear}-${currentMonth}-${defaultDay}`);
      }

      setIsScheduled(initialIsScheduled);
      setNotes('');
    }
  }, [txToEdit, initialPeriod, initialType, initialIsScheduled, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setTag(newType === 'income' ? COMMON_INCOME_TAGS[0] : COMMON_EXPENSE_TAGS[0]);
    setCustomTag('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = typeof amount === 'number' ? amount : 0;
    if (!title.trim() || finalAmount <= 0 || !date) return;

    // Calculate corresponding periodKey from date
    const d = new Date(date + 'T12:00:00');
    const txYear = d.getFullYear();
    const txMonth = d.getMonth();
    const txDay = d.getDate();
    const txQuincena: 1 | 2 = txDay <= 15 ? 1 : 2;
    const computedPeriodKey = getPeriodKey(txYear, txMonth, txQuincena);

    const isOther = tag === 'Otro Gasto' || tag === 'Otro Ingreso';
    const finalTag = isOther && customTag.trim() ? customTag.trim() : tag;

    onSave({
      title: title.trim(),
      type,
      amount: finalAmount,
      tag: finalTag,
      periodKey: computedPeriodKey,
      date,
      isScheduled,
      notes: notes.trim(),
      isCompleted: !isScheduled,
    });

    onClose();
  };

  const availableTags = type === 'income' ? COMMON_INCOME_TAGS : COMMON_EXPENSE_TAGS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="modal-add-transaction-container"
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative my-8"
      >
        <button
          id="btn-close-tx-modal"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              type === 'income'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}
          >
            {type === 'income' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {txToEdit
                ? 'Editar Movimiento'
                : isScheduled
                ? type === 'income'
                  ? 'Programar Ingreso Futuro'
                  : 'Programar Gasto / Deuda Futura'
                : type === 'income'
                ? 'Nuevo Ingreso Esporádico'
                : 'Nuevo Gasto Esporádico'}
            </h2>
            <p className="text-xs text-slate-500">
              {type === 'income'
                ? 'Ingreso adicional específico para esta quincena o programado'
                : 'Gasto esporádico o imprevisto específico para esta quincena o programado'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle ONLY when not in scheduled mode */}
          {!isScheduled && !txToEdit && (
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                id="btn-tx-type-expense"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-white text-rose-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Gasto Esporádico</span>
              </button>

              <button
                type="button"
                id="btn-tx-type-income"
                onClick={() => handleTypeChange('income')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Ingreso Extra</span>
              </button>
            </div>
          )}

          {/* Title & Tag */}
          <div>
            <label htmlFor="input-tx-title" className="block text-xs font-semibold text-slate-700 mb-1">
              Descripción del movimiento *
            </label>
            <input
              id="input-tx-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'income' ? 'ej. Freelance diseño logo' : 'ej. Reparación plomería baño'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="input-tx-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Monto *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">
                  {currencySymbol}
                </span>
                <input
                  id="input-tx-amount"
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="ej. 150000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="select-tx-tag" className="block text-xs font-semibold text-slate-700 mb-1">
                Etiqueta / Categoría *
              </label>
              <select
                id="select-tx-tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(tag === 'Otro Gasto' || tag === 'Otro Ingreso') && (
            <div>
              <label htmlFor="input-tx-custom-tag" className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre de la categoría
              </label>
              <input
                id="input-tx-custom-tag"
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="ej. Regalo Cumpleaños"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {/* Date & Scheduled checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label htmlFor="input-tx-date" className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha del movimiento *
              </label>
              <input
                id="input-tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  Programado para fecha futura
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="input-tx-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <input
              id="input-tx-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalle o referencia del movimiento..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-tx-modal"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-save-tx-submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {txToEdit ? 'Guardar Cambios' : 'Registrar Movimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
