import React, { useState, useEffect } from 'react';
import { X, CheckCircle, PiggyBank } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PeriodSelection, SavingsProgram } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  savings: SavingsProgram | null;
  period: PeriodSelection;
  expectedAmount: number;
  currencyCode: string;
  currencySymbol: string;
  onRegisterDeposit: (savingsId: string, amount: number, notes: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  savings,
  expectedAmount,
  currencyCode,
  currencySymbol,
  onRegisterDeposit,
}) => {
  const [amount, setAmount] = useState<number>(0);
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
    if (isOpen && savings) {
      const defaultAmount = expectedAmount > 0 ? expectedAmount : savings.periodicAmount;
      setAmount(defaultAmount);
      setNotes('');
    }
  }, [isOpen, savings, expectedAmount]);

  if (!isOpen || !savings) return null;

  const currentAccumulated = savings.deposits.reduce((acc, d) => acc + d.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    onRegisterDeposit(
      savings.id,
      amount,
      notes.trim() || `Aporte periódico de ahorro`
    );

    // If reaches target goal with this deposit, celebrate!
    if (savings.targetAmount && currentAccumulated + amount >= savings.targetAmount) {
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (err) {
        // Safe fallback
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs text-slate-700">
      <div
        id="modal-deposit-container"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative"
      >
        <button
          id="btn-close-deposit-modal"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-200 flex items-center justify-center">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Registrar Depósito / Aporte</h3>
            <p className="text-xs text-slate-505 font-semibold mt-0.5">{savings.name}</p>
          </div>
        </div>

        {/* Current status */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-xs space-y-1.5 font-semibold text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Total Acumulado Guardado:</span>
            <span className="font-bold text-teal-800 font-mono">
              {formatCurrency(currentAccumulated, currencyCode, currencySymbol)}
            </span>
          </div>
          {savings.targetAmount && (
            <div className="flex justify-between">
              <span className="text-slate-500">Meta Deseada:</span>
              <span className="font-bold text-slate-700 font-mono">
                {formatCurrency(savings.targetAmount, currencyCode, currencySymbol)}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Aporte Periódico Programado:</span>
            <span className="font-bold text-slate-700 font-mono">
              {formatCurrency(savings.periodicAmount, currencyCode, currencySymbol)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="input-deposit-amount" className="block text-xs font-semibold text-slate-700 mb-1">
              Monto a Aportar al Ahorro *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-405 text-xs font-bold font-mono">
                {currencySymbol}
              </span>
              <input
                id="input-deposit-amount"
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="input-deposit-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <input
              id="input-deposit-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Transferencia a bolsillo Nu..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-deposit"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-655 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-submit-deposit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 animate-in"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Registrar Aporte</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
