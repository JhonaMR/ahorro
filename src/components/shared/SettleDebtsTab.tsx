import React, { useMemo, useState } from 'react';
import { Users, HeartHandshake, Sparkles } from 'lucide-react';
import { FamilyGroup, SharedFamilyDebt, UserAccount } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { SettleDebtsModal } from './SettleDebtsModal';

interface SettleDebtsTabProps {
  familyGroup: FamilyGroup | null;
  currentUser: UserAccount;
  sharedDebts: SharedFamilyDebt[];
  currencyCode: string;
  currencySymbol: string;
  onAddAbono: (debtId: string, abono: any) => void;
}

export const SettleDebtsTab: React.FC<SettleDebtsTabProps> = ({
  familyGroup,
  currentUser,
  sharedDebts,
  currencyCode,
  currencySymbol,
  onAddAbono,
}) => {
  const [settlingMemberData, setSettlingMemberData] = useState<any | null>(null);

  const groupMembers = useMemo(() => {
    if (!familyGroup) return [];
    return familyGroup.members.filter(m => m.userId !== currentUser.id);
  }, [familyGroup, currentUser]);

  const memberBalances = useMemo(() => {
    if (!familyGroup) return [];

    return groupMembers.map((member) => {
      const debtsIOwe = sharedDebts
        .map((d) => {
          if (d.payerUserId !== member.userId) return null;
          const myShare = d.participants.find((p) => p.userId === currentUser.id);
          if (!myShare) return null;
          const myPaid = d.abonos.filter((ab) => ab.userId === currentUser.id).reduce((sum, ab) => sum + ab.amount, 0);
          const remaining = Math.max(0, myShare.assignedAmount - myPaid);
          if (remaining <= 0) return null;
          return { debt: d, myShare, myPaid, remaining };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const debtsOwedToMe = sharedDebts
        .map((d) => {
          if (d.payerUserId !== currentUser.id) return null;
          const memberShare = d.participants.find((p) => p.userId === member.userId);
          if (!memberShare) return null;
          const memberPaid = d.abonos.filter((ab) => ab.userId === member.userId).reduce((sum, ab) => sum + ab.amount, 0);
          const remaining = Math.max(0, memberShare.assignedAmount - memberPaid);
          if (remaining <= 0) return null;
          return { debt: d, memberShare, memberPaid, remaining };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      const totalIOwe = debtsIOwe.reduce((sum, item) => sum + item.remaining, 0);
      const totalOwedToMe = debtsOwedToMe.reduce((sum, item) => sum + item.remaining, 0);
      const netBalance = totalOwedToMe - totalIOwe;

      return {
        member,
        debtsIOwe,
        debtsOwedToMe,
        totalIOwe,
        totalOwedToMe,
        netBalance,
      };
    });
  }, [groupMembers, sharedDebts, currentUser, familyGroup]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
            <span>Saldar Cuentas Pendientes</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Revisa y liquida deudas compartidas acumuladas con otros miembros del grupo.
          </p>
        </div>
        
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Consolidación automática global de deudas</span>
        </div>
      </div>

      {memberBalances.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-450 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No hay otros miembros en este grupo</h3>
            <p className="text-xs text-slate-500 mt-1">Invita a otros miembros a unirse a tu grupo desde la configuración.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {memberBalances.map(({ member, debtsIOwe, debtsOwedToMe, totalIOwe, totalOwedToMe, netBalance }) => {
            return (
              <div key={member.userId} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  {/* Member Info */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-black text-slate-700 uppercase">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>
                      <p className="text-[11px] text-slate-400 font-semibold">{member.email}</p>
                    </div>
                  </div>

                  {/* Balances list */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-2xl">
                      <span className="block text-[10px] font-bold text-rose-500 uppercase tracking-wider">Le Debes</span>
                      <span className="text-base font-black text-rose-650">
                        {formatCurrency(totalIOwe, currencyCode, currencySymbol)}
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-1">{debtsIOwe.length} deudas</span>
                    </div>

                    <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                      <span className="block text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Te Debe</span>
                      <span className="text-base font-black text-emerald-600">
                        {formatCurrency(totalOwedToMe, currencyCode, currencySymbol)}
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-1">{debtsOwedToMe.length} deudas</span>
                    </div>
                  </div>

                  {/* Net Balance Status */}
                  <div className={`p-3.5 rounded-2xl border text-xs font-semibold ${
                    netBalance < 0 
                      ? 'bg-rose-50 border-rose-100 text-rose-800' 
                      : netBalance > 0 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                      : 'bg-slate-50 border-slate-200 text-slate-750'
                  }`}>
                    {netBalance < 0 ? (
                      <span>En total, debes transferirle {formatCurrency(Math.abs(netBalance), currencyCode, currencySymbol)} para quedar a paz y salvo.</span>
                    ) : netBalance > 0 ? (
                      <span>En total, te debe transferir {formatCurrency(netBalance, currencyCode, currencySymbol)} para quedar a paz y salvo.</span>
                    ) : (
                      <span>Están a paz y salvo netamente.</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={totalIOwe === 0}
                  onClick={() => {
                    setSettlingMemberData({ member, debtsIOwe, totalIOwe });
                  }}
                  className={`w-full py-3 rounded-2xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    totalIOwe === 0
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Saldar Deudas con {member.name}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {settlingMemberData && (
        <SettleDebtsModal
          isOpen={!!settlingMemberData}
          onClose={() => setSettlingMemberData(null)}
          member={settlingMemberData.member.user}
          debtsIOwe={settlingMemberData.debtsIOwe}
          currentUser={currentUser}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          onAddAbono={onAddAbono}
        />
      )}
    </div>
  );
};
