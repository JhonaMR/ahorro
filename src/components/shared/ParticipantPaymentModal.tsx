import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, UserCheck } from 'lucide-react';
import { ParticipantShare, PendingExpense } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ParticipantPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: PendingExpense | null;
  participant: ParticipantShare | null;
  currencyCode: string;
  currencySymbol: string;
  onRegisterPayment: (expenseId: string, participantId: string, amount: number, notes: string) => void;
}

export const ParticipantPaymentModal: React.FC<ParticipantPaymentModalProps> = ({
  isOpen,
  onClose,
  expense,
  participant,
  currencyCode,
  currencySymbol,
  onRegisterPayment,
}) => {
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (participant) {
      const remaining = Math.max(0, participant.assignedAmount - participant.paidAmount);
      const suggested = participant.installmentAmount && participant.installmentAmount > 0
        ? Math.min(participant.installmentAmount, remaining)
        : remaining;
      setAmount(suggested);
      setDate(new Date().toISOString().slice(0, 10));
      setNotes('');
    }
  }, [participant, isOpen]);

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

  if (!isOpen || !expense || !participant) return null;

  const remaining = Math.max(0, participant.assignedAmount - participant.paidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onRegisterPayment(expense.id, participant.id, numAmount, notes.trim());
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">Registrar Pago de Cuota</h3>
              <p className="text-xs text-teal-100">{participant.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Summary Box */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs text-slate-500 font-medium">Gasto Compartido:</div>
            <div className="font-bold text-sm text-slate-800">{expense.title}</div>
            
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-700">
              <div>
                <span className="text-slate-500 block text-[11px]">Total Asignado:</span>
                <span className="font-bold text-slate-800">
                  {formatCurrency(participant.assignedAmount, currencyCode, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Saldo Pendiente:</span>
                <span className="font-bold text-teal-700">
                  {formatCurrency(remaining, currencyCode, currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-705 uppercase tracking-wider mb-1.5 font-sans">
              Monto Recibido / Pagado *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">
                {currencySymbol}
              </span>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              />
            </div>
            {participant.installmentAmount && participant.installmentAmount > 0 && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Cuota programada: {formatCurrency(participant.installmentAmount, currencyCode, currencySymbol)}</span>
                <button
                  type="button"
                  onClick={() => setAmount(Math.min(participant.installmentAmount!, remaining))}
                  className="text-teal-600 font-bold hover:underline cursor-pointer"
                >
                  Poner cuota
                </button>
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-705 uppercase tracking-wider mb-1.5">
              Fecha del Pago
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-705 uppercase tracking-wider mb-1.5">
              Notas / Medio de Pago
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                placeholder="Ej. Transferencia Nequi, efectivo recibido, abono cuota 1..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-205 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Confirmar Abono
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
