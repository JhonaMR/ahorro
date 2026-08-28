import React, { useState, useEffect } from 'react';
import { X, Tag, Calendar, User, Users, FileText, Sparkles, Clock } from 'lucide-react';
import { PendingExpense, PendingExpenseScope } from '../../types';

interface AddPendingExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    expenseData: Omit<PendingExpense, 'id' | 'createdAt'>,
    andRegularize?: boolean,
    id?: string
  ) => void;
  currencyCode: string;
  currencySymbol: string;
  expenseToEdit?: PendingExpense | null;
  suggestedTags?: string[];
  initialDate?: string;
}

export const AddPendingExpenseModal: React.FC<AddPendingExpenseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currencySymbol,
  expenseToEdit,
  suggestedTags,
  initialDate,
}) => {
  const defaultTag = suggestedTags && suggestedTags.length > 0 ? suggestedTags[0] : 'Ocio';
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scope, setScope] = useState<PendingExpenseScope>('shared');
  const [tag, setTag] = useState(defaultTag);
  const [notes, setNotes] = useState('');
  const [actionOption, setActionOption] = useState<'save_pending' | 'save_and_regularize'>('save_pending');

  const tagsList = suggestedTags && suggestedTags.length > 0
    ? suggestedTags
    : ['Ocio', 'Restaurantes', 'Tecnología', 'Bebidas', 'Hogar', 'Otro'];

  useEffect(() => {
    if (expenseToEdit) {
      setTitle(expenseToEdit.title);
      setAmount(expenseToEdit.amount);
      setDate(expenseToEdit.date);
      setScope(expenseToEdit.scope);
      setTag(expenseToEdit.tag || defaultTag);
      setNotes(expenseToEdit.notes || '');
      setActionOption('save_pending');
    } else {
      setTitle('');
      setAmount('');
      setDate(initialDate || new Date().toISOString().slice(0, 10));
      setScope('shared');
      setTag(defaultTag);
      setNotes('');
      setActionOption('save_pending');
    }
  }, [expenseToEdit, isOpen, defaultTag, initialDate]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent, forceRegularize?: boolean) => {
    e.preventDefault();
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) return;

    const shouldRegularize = forceRegularize !== undefined
      ? forceRegularize
      : actionOption === 'save_and_regularize';

    const expensePayload: Omit<PendingExpense, 'id' | 'createdAt'> = {
      title: title.trim(),
      amount: numAmount,
      date,
      scope,
      status: expenseToEdit ? expenseToEdit.status : 'pending',
      tag,
      notes: notes.trim() || undefined,
    };

    onSave(expensePayload, shouldRegularize, expenseToEdit?.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-955/60 backdrop-blur-xs animate-in fade-in duration-200 text-slate-700"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl md:max-w-3xl overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs shrink-0">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {expenseToEdit ? 'Editar Gasto por Clasificar' : 'Nuevo Gasto por Clasificar'}
              </h3>
              <p className="text-xs text-amber-100 font-normal mt-0.5">
                Registra el gasto y decide si dejarlo en lista de espera o regularizarlo de una vez
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => handleSubmit(e)} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Concepto / Nombre */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nombre / Concepto del Gasto *
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Ej. Cine y combos con pareja, Cena de amigos, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-55/50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              />
            </div>
          </div>

          {/* Valor y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-semibold">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Valor Total del Gasto *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm font-mono">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full pl-8 pr-3.5 py-2.5 bg-slate-55/50 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Fecha del Gasto *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-55/50 border border-slate-300 rounded-xl text-sm font-medium text-slate-805 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Alcance: ¿Solo mío o compartido? */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              ¿Quién asumirá este gasto? *
            </label>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => setScope('shared')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left cursor-pointer ${
                  scope === 'shared'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-205 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'shared' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-center font-semibold">
                  <div className="text-xs font-bold">Compartido</div>
                  <div className="text-[10px] text-slate-500 font-normal">Con pareja, amigos, etc.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('personal')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-left cursor-pointer ${
                  scope === 'personal'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-205 bg-slate-50/50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    scope === 'personal' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>
                <div className="text-center font-semibold">
                  <div className="text-xs font-bold">Solo Mío</div>
                  <div className="text-[10px] text-slate-500 font-normal">100% gasto personal</div>
                </div>
              </button>
            </div>
          </div>

          {/* Selector de Acción al Guardar */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              ¿Qué deseas hacer con este gasto al guardar?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setActionOption('save_pending')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  actionOption === 'save_pending'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-955 shadow-2xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${actionOption === 'save_pending' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Dejar en Lista de Espera</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    Queda como pendiente para regularizarlo después
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActionOption('save_and_regularize')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  actionOption === 'save_and_regularize'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-955 shadow-2xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-slate-50/40 hover:bg-slate-100 text-slate-600'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${actionOption === 'save_and_regularize' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">Regularizar Directamente</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    Dividir y ajustar cuentas inmediatamente
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Categoría / Etiqueta */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Etiqueta Sugerida
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 text-xs">
              {tagsList.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    tag === t
                      ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-755 border-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="O escribe otra categoría..."
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-55/50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Notas / Detalles (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ej. Pagado con tarjeta de crédito..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-55/50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition text-center cursor-pointer"
            >
              Cancelar (Esc)
            </button>

            <div className="flex gap-2">
              {actionOption === 'save_and_regularize' ? (
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Guardar y Regularizar Ahora</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>{expenseToEdit ? 'Guardar Cambios' : 'Guardar en Lista de Espera'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
