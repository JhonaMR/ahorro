import React, { useState } from 'react';
import {
  User,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Users,
  Plus,
  ArrowRight,
  LogOut,
  Copy,
  Check,
  HeartHandshake,
  DoorOpen,
  Calendar,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { FamilyGroup, UserAccount } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface UserConfigSectionProps {
  currentUser: UserAccount;
  familyGroup: FamilyGroup | null;
  userFamilyGroups: FamilyGroup[];
  onSelectActiveGroup: (groupId: string) => void;
  onUpdateProfile: (updates: { name?: string; pin?: string }) => {
    success: boolean;
    user?: UserAccount;
    error?: string;
  };
  onLogout: () => void;
  onCreateFamilyGroup: (name: string) => {
    success: boolean;
    group?: FamilyGroup;
    error?: string;
  };
  onJoinFamilyGroup: (code: string) => {
    success: boolean;
    group?: FamilyGroup;
    error?: string;
  };
  onLeaveFamilyGroup: (groupId?: string) => { success: boolean; error?: string };
  onGoToSharedDebts?: () => void;
}

export const UserConfigSection: React.FC<UserConfigSectionProps> = ({
  currentUser,
  familyGroup,
  userFamilyGroups,
  onSelectActiveGroup,
  onUpdateProfile,
  onLogout,
  onCreateFamilyGroup,
  onJoinFamilyGroup,
  onLeaveFamilyGroup,
  onGoToSharedDebts,
}) => {
  // Name edit state
  const [name, setName] = useState(currentUser.name);
  const [isNameSaving, setIsNameSaving] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Pin change states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Family group states
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [familyMode, setFamilyMode] = useState<'create' | 'join'>('create');
  const [newGroupName, setNewGroupName] = useState('');
  const [joinGroupCode, setJoinGroupCode] = useState('');
  const [familySuccess, setFamilySuccess] = useState<string | null>(null);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [copiedCodeGroupId, setCopiedCodeGroupId] = useState<string | null>(null);
  const [leavingGroup, setLeavingGroup] = useState<{ id: string; name: string } | null>(null);

  const handlePinInput = (val: string, setter: (v: string) => void) => {
    const numeric = val.replace(/\D/g, '').slice(0, 6);
    setter(numeric);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSuccess(false);

    if (!name.trim()) {
      setNameError('El nombre no puede estar vacío.');
      return;
    }

    const res = onUpdateProfile({ name: name.trim() });
    if (res.success) {
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 2500);
    } else {
      setNameError(res.error || 'Error al actualizar el nombre.');
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(false);

    if (currentPin !== currentUser.pin) {
      setPinError('La contraseña actual no es correcta.');
      return;
    }

    if (newPin.length !== 6) {
      setPinError('La nueva contraseña debe tener exactamente 6 dígitos numéricos.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setPinError('Las contraseñas nuevas no coinciden.');
      return;
    }

    const res = onUpdateProfile({ pin: newPin });
    if (res.success) {
      setPinSuccess(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setTimeout(() => setPinSuccess(false), 3000);
    } else {
      setPinError(res.error || 'Error al cambiar la contraseña.');
    }
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setFamilyError(null);
    setFamilySuccess(null);

    if (!newGroupName.trim()) {
      setFamilyError('Por favor asigna un nombre a tu grupo familiar.');
      return;
    }

    const res = onCreateFamilyGroup(newGroupName.trim());
    if (res.success && res.group) {
      setFamilySuccess(`¡Grupo familiar "${res.group.name}" creado con éxito! Código para invitar: ${res.group.code}`);
      setNewGroupName('');
      setShowAddGroupModal(false);
      setTimeout(() => setFamilySuccess(null), 4000);
    } else {
      setFamilyError(res.error || 'Error al crear el grupo.');
    }
  };

  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setFamilyError(null);
    setFamilySuccess(null);

    if (!joinGroupCode.trim()) {
      setFamilyError('Por favor escribe el código de 7 dígitos proporcionado por tu familiar.');
      return;
    }

    const res = onJoinFamilyGroup(joinGroupCode.trim());
    if (res.success && res.group) {
      setFamilySuccess(`¡Te has unido exitosamente al grupo "${res.group.name}"!`);
      setJoinGroupCode('');
      setShowAddGroupModal(false);
      setTimeout(() => setFamilySuccess(null), 4000);
    } else {
      setFamilyError(res.error || 'Código incorrecto o grupo no encontrado.');
    }
  };

  const handleCopyCode = (code: string, groupId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeGroupId(groupId);
    setTimeout(() => setCopiedCodeGroupId(null), 2000);
  };

  const handleLeaveGroup = (groupId: string, groupName: string) => {
    setLeavingGroup({ id: groupId, name: groupName });
  };

  const confirmLeaveGroup = () => {
    if (!leavingGroup) return;
    const { id, name } = leavingGroup;
    const res = onLeaveFamilyGroup(id);
    if (res.success) {
      setFamilySuccess(`Has salido del grupo familiar "${name}".`);
      setTimeout(() => setFamilySuccess(null), 2500);
    }
    setLeavingGroup(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. USER PROFILE DETAILS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-black text-xl">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>{currentUser.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Activo
                </span>
              </h2>
              <p className="text-xs text-slate-500">{currentUser.email}</p>
            </div>
          </div>

          <button
            type="button"
            id="btn-logout-user"
            onClick={onLogout}
            className="px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition flex items-center gap-2 cursor-pointer w-fit"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Change Name & View Email */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form onSubmit={handleSaveName} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nombre de Usuario
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="input-config-user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  id="btn-save-user-name"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer shrink-0"
                >
                  Guardar
                </button>
              </div>

              {nameSuccess && (
                <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Nombre actualizado correctamente
                </p>
              )}
              {nameError && (
                <p className="text-xs text-rose-600 flex items-center gap-1 mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> {nameError}
                </p>
              )}
            </div>
          </form>

          {/* Email (Read-only as requested) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Correo Electrónico (No modificable)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={currentUser.email}
                disabled
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed select-all"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              El correo es la identificación única de tu cuenta y se mantiene fijo.
            </p>
          </div>
        </div>

        {/* Change 6-digit PIN / Password */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Cambiar Contraseña Numérica (6 dígitos)</span>
          </h3>

          <form onSubmit={handleSavePin} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Clave Actual
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={currentPin}
                  onChange={(e) => handlePinInput(e.target.value, setCurrentPin)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Nueva Clave (6 dígitos)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={newPin}
                  onChange={(e) => handlePinInput(e.target.value, setNewPin)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Confirmar Nueva
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={confirmNewPin}
                  onChange={(e) => handlePinInput(e.target.value, setConfirmNewPin)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
            </div>

            {pinSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>¡Contraseña numérica de 6 dígitos actualizada con éxito!</span>
              </div>
            )}

            {pinError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>{pinError}</span>
              </div>
            )}

            <button
              type="submit"
              id="btn-update-user-pin"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              Actualizar Contraseña
            </button>
          </form>
        </div>
      </div>

      {/* 2. CAJÓN DE GRUPO FAMILIAR (FAMILY GROUP BOX) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                Cajón de Grupos Familiares
              </h2>
              <p className="text-xs text-slate-500">
                Puedes pertenecer a varios grupos familiares y seleccionar cuál es el Grupo Activo para tus finanzas compartidas.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-add-new-family-group"
            onClick={() => {
              setShowAddGroupModal(true);
              setFamilyError(null);
              setFamilySuccess(null);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Crear o Unirme a Otro Grupo</span>
          </button>
        </div>

        {/* Global Feedback */}
        {familySuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{familySuccess}</span>
          </div>
        )}

        {familyError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{familyError}</span>
          </div>
        )}

        {/* LIST OF ALL USER'S FAMILY GROUPS */}
        {userFamilyGroups.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <p className="text-xs text-slate-500">No perteneces a ningún grupo familiar en este momento.</p>
            <button
              type="button"
              onClick={() => setShowAddGroupModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear mi Primer Grupo Familiar</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tus Grupos Familiares ({userFamilyGroups.length}):
            </div>

            <div className="grid grid-cols-1 gap-4">
              {userFamilyGroups.map((group) => {
                const isActive = familyGroup?.id === group.id;
                const isCopied = copiedCodeGroupId === group.id;

                return (
                  <div
                    key={group.id}
                    className={`rounded-2xl p-5 sm:p-6 border transition space-y-4 ${
                      isActive
                        ? 'bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-800 shadow-md ring-2 ring-indigo-500/40'
                        : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              Grupo Familiar Activo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectActiveGroup(group.id)}
                              className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-300 transition cursor-pointer"
                            >
                              Hacer este el Grupo Activo
                            </button>
                          )}
                        </div>
                        <h3 className={`text-xl font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          {group.name}
                        </h3>
                        <p className={`text-xs ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                          {group.members.length} integrante(s) vinculados
                        </p>
                      </div>

                      {/* Code Badge */}
                      <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border shrink-0 ${
                        isActive ? 'bg-slate-950/80 border-indigo-700/60' : 'bg-white border-slate-200'
                      }`}>
                        <div>
                          <div className={`text-[10px] uppercase font-bold ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                            Código de Invitación
                          </div>
                          <div className={`text-sm font-black font-mono tracking-wider ${isActive ? 'text-indigo-300' : 'text-indigo-700'}`}>
                            {group.code}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(group.code, group.id)}
                          className={`p-1.5 rounded-lg transition cursor-pointer ${
                            isActive ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-500'
                          }`}
                          title="Copiar código de grupo"
                        >
                          {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Members List */}
                    <div className={`pt-3 border-t space-y-2 ${isActive ? 'border-indigo-800/60' : 'border-slate-200'}`}>
                      <div className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                        Integrantes ({group.members.length}):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.members.map((m) => (
                          <div
                            key={m.userId}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                              isActive
                                ? 'bg-slate-950/50 border-indigo-800/40'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs ${
                                isActive ? 'bg-indigo-700/50 text-indigo-200' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {(m.name || m.email || '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className={`font-bold flex items-center gap-1 ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                  <span>{m.name || m.email || 'Usuario'}</span>
                                  {m.userId === currentUser.id && (
                                    <span className="text-[10px] text-emerald-400 font-normal">(Tú)</span>
                                  )}
                                </div>
                                <div className={`text-[10px] ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                                  {m.email}
                                </div>
                              </div>
                            </div>

                            {m.isCreator && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Creador
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      {onGoToSharedDebts && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isActive) onSelectActiveGroup(group.id);
                            onGoToSharedDebts();
                          }}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer ${
                            isActive
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Ver Módulo Compartido de este Grupo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleLeaveGroup(group.id, group.name)}
                        className={`text-xs font-semibold hover:underline flex items-center gap-1.5 cursor-pointer py-1 ${
                          isActive ? 'text-rose-300 hover:text-rose-100' : 'text-rose-600 hover:text-rose-800'
                        }`}
                      >
                        <DoorOpen className="w-3.5 h-3.5" />
                        <span>Salir de este Grupo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL: CREATE OR JOIN NEW FAMILY GROUP */}
        {showAddGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-lg w-full space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>Nuevo Grupo Familiar</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddGroupModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Switch between Create or Join */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setFamilyMode('create');
                    setFamilyError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    familyMode === 'create'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Crear Nuevo Grupo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFamilyMode('join');
                    setFamilyError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    familyMode === 'join'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unirme con Código
                </button>
              </div>

              {familyMode === 'create' ? (
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Nombre del Nuevo Grupo Familiar
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Casa Papás, Familia Madrigal, Pareja 2026"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Se generará un código único de 7 dígitos para que puedas invitar a otros miembros.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddGroupModal(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Grupo</span>
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Código Alfanumérico de 7 Dígitos
                    </label>
                    <input
                      type="text"
                      maxLength={7}
                      placeholder="Ej. FAM7K9X"
                      value={joinGroupCode}
                      onChange={(e) => setJoinGroupCode(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-black font-mono tracking-widest text-slate-900 uppercase placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ingresa el código proporcionado por la persona que creó el grupo.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddGroupModal(false)}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Unirme al Grupo</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CONFIRM LEAVE GROUP */}
      <ConfirmDeleteModal
        isOpen={!!leavingGroup}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. Dejarás de tener acceso a las finanzas compartidas y deudas de este grupo hasta que te vuelvan a invitar."
        itemName={leavingGroup ? `Grupo Familiar: "${leavingGroup.name}"` : undefined}
        confirmText="Sí, salir del grupo"
        onClose={() => setLeavingGroup(null)}
        onConfirm={confirmLeaveGroup}
      />
    </div>
  );
};
