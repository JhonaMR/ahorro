import React, { useState, useEffect } from 'react';
import { X, CheckCircle, CreditCard } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DebtItem, PeriodSelection } from '../../types';
import { calculateDebtLiquidationInfo, formatCurrency } from '../../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  period: PeriodSelection;
  expectedAmount: number;
  currencyCode: string;
  currencySymbol: string;
  onRegisterPayment: (debtId: string, amount: number, notes: string, isExtra: boolean) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  debt,
  expectedAmount,
  currencyCode,
  currencySymbol,
  onRegisterPayment,
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [isExtra, setIsExtra] = useState(false);
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
    if (isOpen && debt) {
      const liqInfo = calculateDebtLiquidationInfo(debt);
      const defaultAmount = expectedAmount > 0 ? expectedAmount : Math.min(debt.installmentAmount, liqInfo.remainingBalance);
      setAmount(defaultAmount);
      setIsExtra(false);
      setNotes('');
    }
  }, [isOpen, debt, expectedAmount]);

  if (!isOpen || !debt) return null;

  const liqInfo = calculateDebtLiquidationInfo(debt);
  const nextInstallmentNumber = debt.payments.length + 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    onRegisterPayment(
      debt.id,
      amount,
      notes.trim() || (isExtra ? 'Abono extraordinario a capital' : `Pago cuota #${nextInstallmentNumber}`),
      isExtra
    );

    // If this payment liquidates the debt, launch celebration confetti!
    if (amount >= liqInfo.remainingBalance) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
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
        id="modal-payment-container"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative"
      >
        <button
          id="btn-close-payment-modal"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">Registrar Pago de Cuota</h3>
            <p className="text-xs text-slate-505 font-semibold mt-0.5">{debt.title}</p>
          </div>
        </div>

        {/* Debt status snapshot */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-xs space-y-1.5 font-semibold text-slate-700">
          <div className="flex justify-between">
            <span className="text-slate-500">Saldo Restante Actual:</span>
            <span className="font-bold text-slate-900 font-mono">
              {formatCurrency(liqInfo.remainingBalance, currencyCode, currencySymbol)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-505">Cuotas Pagadas:</span>
            <span className="font-bold text-slate-700">
              {debt.payments.length} de {debt.installmentsCount} cuotas
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-505">Valor Cuota Normal:</span>
            <span className="font-bold text-rose-700 font-mono">
              {formatCurrency(debt.installmentAmount, currencyCode, currencySymbol)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="input-payment-amount" className="block text-xs font-semibold text-slate-700 mb-1">
              Monto a Pagar *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-405 text-xs font-bold font-mono">
                {currencySymbol}
              </span>
              <input
                id="input-payment-amount"
                type="number"
                required
                min="1"
                max={liqInfo.remainingBalance}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={isExtra}
                onChange={(e) => setIsExtra(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
              />
              <span className="font-bold">Es un abono extraordinario a capital (no cuota regular)</span>
            </label>
          </div>

          <div>
            <label htmlFor="input-payment-notes" className="block text-xs font-semibold text-slate-700 mb-1">
              Notas o Comprobante (Opcional)
            </label>
            <input
              id="input-payment-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ej. Transferencia Bancolombia #1234..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-payment"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-655 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-submit-payment"
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 animate-in"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Confirmar Pago</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
