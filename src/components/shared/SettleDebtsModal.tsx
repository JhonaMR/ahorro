import React, { useState, useMemo } from 'react';
import { HeartHandshake, Building2, QrCode, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserAccount, SharedFamilyDebt } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DebtOwedItem {
  debt: SharedFamilyDebt;
  myShare: any;
  myPaid: number;
  remaining: number;
}

interface SettleDebtsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: any; // FamilyGroupMember.user
  debtsIOwe: DebtOwedItem[];
  currentUser: UserAccount;
  currencyCode: string;
  currencySymbol: string;
  onAddAbono: (debtId: string, abono: any) => void;
}

export const SettleDebtsModal: React.FC<SettleDebtsModalProps> = ({
  isOpen,
  onClose,
  member,
  debtsIOwe,
  currentUser,
  currencyCode,
  currencySymbol,
  onAddAbono,
}) => {
  const [selectedDebtIds, setSelectedDebtIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    debtsIOwe.forEach((item) => {
      initial[item.debt.id] = true;
    });
    return initial;
  });

  const [activeQrIndex, setActiveQrIndex] = useState(0);

  const selectedTotal = useMemo(() => {
    return debtsIOwe
      .filter((item) => selectedDebtIds[item.debt.id])
      .reduce((sum, item) => sum + item.remaining, 0);
  }, [debtsIOwe, selectedDebtIds]);

  if (!isOpen) return null;

  const handleConfirmPayment = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    debtsIOwe.forEach((item) => {
      if (selectedDebtIds[item.debt.id]) {
        onAddAbono(item.debt.id, {
          userId: currentUser.id,
          userName: currentUser.name,
          userEmail: currentUser.email,
          amount: item.remaining,
          date: todayStr,
          notes: `Pago liquidado desde el módulo de saldar cuentas con ${member.name}`
        });
      }
    });

    try {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (e) {
      console.error('Confetti error:', e);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-955/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-in zoom-in-95 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              Saldar Deudas con {member.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-650 font-bold p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer font-sans"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: checklist */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Deudas Pendientes</h4>
              <p className="text-[11px] text-slate-500">Selecciona cuáles deudas vas a pagar en esta transferencia:</p>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {debtsIOwe.map((item) => {
                const isChecked = !!selectedDebtIds[item.debt.id];
                return (
                  <label
                    key={item.debt.id}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-rose-50/20 border-rose-200'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setSelectedDebtIds(prev => ({
                          ...prev,
                          [item.debt.id]: !prev[item.debt.id]
                        }));
                      }}
                      className="rounded text-rose-650 focus:ring-rose-500 w-4 h-4 mt-0.5 shrink-0"
                    />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 leading-tight">{item.debt.title}</p>
                      <p className="text-[10px] text-slate-550 font-semibold">{item.debt.tag}</p>
                      <p className="text-[11px] font-black text-rose-650 mt-1">
                        Debes: {formatCurrency(item.remaining, currencyCode, currencySymbol)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1 shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total a Transferir</span>
              <div className="text-xl font-black text-emerald-400">
                {formatCurrency(selectedTotal, currencyCode, currencySymbol)}
              </div>
            </div>
          </div>

          {/* Right Column: QRs */}
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Datos de Transferencia</h4>
                <p className="text-[11px] text-slate-500">Escanea el código QR de {member.name} para transferir:</p>
              </div>

              {member.paymentQRs && member.paymentQRs.length > 0 ? (
                <div className="space-y-3">
                  {member.paymentQRs.length > 1 && (
                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                      {member.paymentQRs.map((qr: any, idx: number) => (
                        <button
                          key={qr.id}
                          type="button"
                          onClick={() => setActiveQrIndex(idx)}
                          className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            activeQrIndex === idx ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-550'
                          }`}
                        >
                          {qr.bankName}
                        </button>
                      ))}
                    </div>
                  )}

                  {(() => {
                    const qr = member.paymentQRs[activeQrIndex] || member.paymentQRs[0];
                    return (
                      <div className="space-y-3 text-center animate-in fade-in duration-200">
                        <div className="w-full aspect-square bg-slate-50 rounded-2xl border border-slate-200 p-3.5 flex items-center justify-center overflow-hidden max-w-[200px] mx-auto bg-white shadow-xs">
                          <img src={qr.qrImageUrl} alt="QR Pago" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="space-y-0.5 text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                          <div className="flex items-center justify-center gap-1.5 font-bold text-slate-900">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{qr.bankName}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-800">{qr.accountName}</p>
                          <p className="text-[10px] text-slate-500 capitalize">{qr.accountType}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center gap-2 py-8">
                  <QrCode className="w-8 h-8 text-slate-300 animate-pulse" />
                  <p className="text-xs font-bold text-slate-700">Sin Códigos QR</p>
                  <p className="text-[10px] text-slate-550 max-w-[200px] leading-relaxed">
                    {member.name} no ha subido códigos QR de pago en su perfil. Realiza la transferencia por tus medios de pago habituales.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={selectedTotal <= 0}
                onClick={handleConfirmPayment}
                className={`w-full py-3 rounded-2xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  selectedTotal <= 0
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-lg'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirmar Pago de {formatCurrency(selectedTotal, currencyCode, currencySymbol)}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-650 hover:text-slate-800 text-[11px] font-bold rounded-xl border border-slate-200 transition cursor-pointer text-center"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
