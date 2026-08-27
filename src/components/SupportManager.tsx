import React, { useState, useEffect } from 'react';
import {
  Search,
  RotateCcw,
  Trash2,
  Download,
  Database,
  AlertTriangle,
  CheckCircle,
  X,
  Lock,
  Loader2,
  Users
} from 'lucide-react';
import { AdminUser, AdminFamilyGroup, FamilyGroupMember } from '../types';
import {
  getAdminUsers,
  adminResetPin,
  deleteAdminUser,
  downloadUserBackup,
  downloadFullSqlDump,
  getAdminFamilyGroups,
  getFamilyGroupMembers,
  addMemberToFamilyGroup,
  removeMemberFromFamilyGroup
} from '../utils/storage';

export const SupportManager: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [resetModalUser, setResetModalUser] = useState<AdminUser | null>(null);
  const [tempPin, setTempPin] = useState('000000');

  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(null);
  const [confirmBackup, setConfirmBackup] = useState(true);
  const [adminPin, setAdminPin] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Family Groups states
  const [groups, setGroups] = useState<AdminFamilyGroup[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [isGroupsLoading, setIsGroupsLoading] = useState(false);

  // Group members states
  const [activeGroup, setActiveGroup] = useState<AdminFamilyGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<FamilyGroupMember[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [memberActionLoading, setMemberActionLoading] = useState(false);

  // Remove member verification states
  const [deleteMemberUser, setDeleteMemberUser] = useState<FamilyGroupMember | null>(null);
  const [deleteMemberPin, setDeleteMemberPin] = useState('');

  const filteredGroups = groups.filter((g) =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
    g.code.toLowerCase().includes(groupSearch.toLowerCase()) ||
    g.creatorName.toLowerCase().includes(groupSearch.toLowerCase()) ||
    g.creatorEmail.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // Fetch users from API
  const fetchUsers = async (query = '') => {
    setIsLoading(true);
    try {
      const data = await getAdminUsers(query);
      setUsers(data);
    } catch (err) {
      showFeedback('error', 'Error al cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    setIsGroupsLoading(true);
    try {
      const data = await getAdminFamilyGroups();
      setGroups(data);
    } catch (err) {
      showFeedback('error', 'Error al cargar los grupos familiares.');
    } finally {
      setIsGroupsLoading(false);
    }
  };

  const fetchMembers = async (groupId: string) => {
    setIsMembersLoading(true);
    try {
      const data = await getFamilyGroupMembers(groupId);
      setGroupMembers(data);
    } catch (err) {
      showFeedback('error', 'Error al cargar los miembros del grupo.');
    } finally {
      setIsMembersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(search);
  }, [search]);

  useEffect(() => {
    fetchGroups();
  }, []);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setIsActionLoading(true);

    const res = await adminResetPin(resetModalUser.id, tempPin);
    setIsActionLoading(false);

    if (res.success) {
      showFeedback('success', `PIN restablecido temporalmente a ${tempPin} para ${resetModalUser.name}.`);
      setResetModalUser(null);
      setTempPin('000000');
      fetchUsers(search);
    } else {
      showFeedback('error', res.error || 'No se pudo restablecer el PIN.');
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalUser) return;

    if (adminPin !== '142126') {
      alert('PIN de soporte incorrecto.');
      return;
    }

    setIsActionLoading(true);

    try {
      // 1. Download backup if selected
      if (confirmBackup) {
        await downloadUserBackup(deleteModalUser.id, deleteModalUser.name);
      }

      // 2. Perform deletion
      const res = await deleteAdminUser(deleteModalUser.id, adminPin);
      if (res.success) {
        showFeedback('success', `Usuario ${deleteModalUser.name} eliminado del sistema.`);
        setDeleteModalUser(null);
        setAdminPin('');
        fetchUsers(search);
      } else {
        showFeedback('error', res.error || 'No se pudo eliminar el usuario.');
      }
    } catch (err) {
      showFeedback('error', 'Error durante la operación de eliminación.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDownloadBackup = async (user: AdminUser) => {
    await downloadUserBackup(user.id, user.name);
  };

  const handleDownloadFullDump = async () => {
    showFeedback('success', 'Generando dump de la base de datos...');
    await downloadFullSqlDump();
  };

  const handleOpenMembersModal = (group: AdminFamilyGroup) => {
    setActiveGroup(group);
    setNewMemberEmail('');
    fetchMembers(group.id);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !newMemberEmail.trim()) return;
    setMemberActionLoading(true);

    const res = await addMemberToFamilyGroup(activeGroup.id, newMemberEmail);
    setMemberActionLoading(false);

    if (res.success) {
      showFeedback('success', `Usuario ${res.user.name} agregado con éxito al grupo.`);
      setNewMemberEmail('');
      fetchMembers(activeGroup.id);
      fetchGroups();
    } else {
      showFeedback('error', res.error || 'No se pudo agregar al usuario.');
    }
  };

  const handleRemoveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !deleteMemberUser) return;

    if (deleteMemberPin !== '142126') {
      alert('PIN de soporte incorrecto.');
      return;
    }

    setMemberActionLoading(true);
    const res = await removeMemberFromFamilyGroup(activeGroup.id, deleteMemberUser.userId, deleteMemberPin);
    setMemberActionLoading(false);

    if (res.success) {
      showFeedback('success', `Usuario ${deleteMemberUser.name} removido con éxito del grupo.`);
      setDeleteMemberUser(null);
      setDeleteMemberPin('');
      fetchMembers(activeGroup.id);
      fetchGroups();
    } else {
      showFeedback('error', res.error || 'No se pudo remover al usuario.');
    }
  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-500" />
            Panel de Administración y Soporte
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Control de usuarios, restablecimiento de PINs, backups y mantenimiento general.
          </p>
        </div>
      </div>

      {/* Feedback Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 transition duration-300 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users Management Section */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Cuentas de Usuarios
            </h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">
              {users.length} Registrados
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo electrónico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Scrollable Container (5 rows visible, scroll to see more) */}
          <div className="h-[310px] overflow-y-auto border border-slate-200 rounded-2xl pr-1.5 custom-scrollbar">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Users className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500">No se encontraron usuarios registrados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {users.map((user) => (
                  <div key={user.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {user.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                          {user.name}
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {user.requiresPinReset && (
                        <span className="text-[9px] font-bold bg-amber-500/15 border border-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full shrink-0 mr-1">
                          Bloqueado (Cambio PIN)
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setResetModalUser(user);
                          setTempPin('000000');
                        }}
                        title="Restablecer PIN de acceso"
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-amber-500 transition cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadBackup(user)}
                        title="Descargar Backup JSON"
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-emerald-500 transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteModalUser(user);
                          setAdminPin('');
                          setConfirmBackup(true);
                        }}
                        title="Eliminar Cuenta Permanentemente"
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Database Utilities Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              Mantenimiento DB
            </h3>
            <p className="text-xs text-slate-500 text-left leading-relaxed">
              Descarga un volcado SQL completo de la base de datos del sistema. Este archivo incluirá las instrucciones DDL para recrear las tablas y los inserts DML para restaurar todos los registros.
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-600 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <span className="text-left">Use este dump solo para restauraciones de emergencia. No lo comparta con terceros ya que contiene datos financieros.</span>
            </div>
          </div>

          <button
            onClick={handleDownloadFullDump}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Generar Volcado Completo (SQL)
          </button>
        </div>
      </div>

      {/* Family Groups Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Grupos Familiares Creados
            </h3>
            <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">
              {filteredGroups.length} Creados
            </span>
          </div>

          {/* Search Bar for Groups */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre de grupo, código o creador..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
          </div>

          {/* Scrollable Container (5 rows visible, scroll to see more) */}
          <div className="h-[310px] overflow-y-auto border border-slate-200 rounded-2xl pr-1.5 custom-scrollbar">
            {isGroupsLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Users className="w-10 h-10 text-slate-400 mb-2" />
                <p className="text-xs text-slate-500">No se encontraron grupos familiares creados.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {filteredGroups.map((group) => (
                  <div key={group.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {group.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                          <span className="truncate">{group.name}</span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                            {group.code}
                          </span>
                        </div>
                        <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                          Creador: {group.creatorName} ({group.creatorEmail})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full shrink-0 mr-1">
                        {group.memberCount} miembro{group.memberCount !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => handleOpenMembersModal(group)}
                        className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Gestionar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL 1: RESTABLECER PIN */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-4 relative shadow-2xl">
            <button
              onClick={() => setResetModalUser(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-2">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Restablecer PIN de Acceso
              </h3>
              <p className="text-xs text-slate-500">
                Se definirá una clave numérica temporal para <strong>{resetModalUser.name}</strong> y se le obligará a crear una nueva contraseña en su próximo inicio de sesión.
              </p>
            </div>

            <form onSubmit={handleResetPin} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  PIN Temporal (6 dígitos)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="000000"
                    value={tempPin}
                    onChange={(e) => setTempPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-base tracking-widest font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirmar PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR ELIMINACION DE USUARIO */}
      {deleteModalUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-4 relative shadow-2xl">
            <button
              onClick={() => setDeleteModalUser(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                ¿Eliminar este usuario?
              </h3>
              <p className="text-xs text-slate-500">
                Esta acción eliminará de forma permanente a <strong>{deleteModalUser.name}</strong> ({deleteModalUser.email}) y todas sus deudas, ahorros, configuraciones y transacciones asociadas.
              </p>
            </div>

            <form onSubmit={handleDeleteUser} className="space-y-4 pt-2">
              {/* Optional Backup Checkbox */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="checkbox"
                  id="chk-backup-delete"
                  checked={confirmBackup}
                  onChange={(e) => setConfirmBackup(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="chk-backup-delete" className="text-xs font-semibold text-slate-700 cursor-pointer text-left select-none">
                  Descargar copia de seguridad (JSON) antes de eliminar
                </label>
              </div>

              {/* Enter Admin PIN to Confirm */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirmar con PIN de Soporte (142126)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-base tracking-widest font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalUser(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionLoading || adminPin !== '142126'}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-55 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Eliminar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL 3: GESTIONAR MIEMBROS DE GRUPO */}
      {activeGroup && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-lg space-y-4 relative shadow-2xl flex flex-col max-h-[90vh]">
            <button
              onClick={() => setActiveGroup(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-left space-y-1 pr-8 shrink-0">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Miembros del Grupo: {activeGroup.name}
              </h3>
              <p className="text-xs text-slate-500">
                Código de invitación: <span className="font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{activeGroup.code}</span>
              </p>
            </div>

            {/* Form to add user by email */}
            <form onSubmit={handleAddMember} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 shrink-0">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Agregar Usuario por Correo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ejemplo@correo.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs sm:text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  required
                />
                <button
                  type="submit"
                  disabled={memberActionLoading || !newMemberEmail.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition"
                >
                  {memberActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Agregar
                </button>
              </div>
            </form>

            {/* Members List */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl custom-scrollbar min-h-[200px]">
              {isMembersLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              ) : groupMembers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center p-4">
                  <p className="text-xs text-slate-500">Este grupo no tiene miembros.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {groupMembers.map((member) => (
                    <div key={member.userId} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                          {member.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="truncate">{member.name}</span>
                            {member.isCreator && (
                              <span className="text-[9px] font-bold bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 px-1.5 py-0.5 rounded-full">
                                Creador
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                            {member.email}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setDeleteMemberUser(member);
                          setDeleteMemberPin('');
                        }}
                        title="Remover de este Grupo"
                        className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-rose-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveGroup(null)}
                className="w-full py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRMAR ELIMINACION DE MIEMBRO */}
      {deleteMemberUser && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md space-y-4 relative shadow-2xl">
            <button
              onClick={() => setDeleteMemberUser(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                ¿Remover usuario del grupo?
              </h3>
              <p className="text-xs text-slate-500">
                Se removerá a <strong>{deleteMemberUser.name}</strong> del grupo familiar {activeGroup?.name}. Si este es su grupo activo actual, se desvinculará de su vista al iniciar sesión.
              </p>
            </div>

            <form onSubmit={handleRemoveMember} className="space-y-4 pt-2">
              {/* Enter Admin PIN to Confirm */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirmar con PIN de Soporte (142126)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="••••••"
                    value={deleteMemberPin}
                    onChange={(e) => setDeleteMemberPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-base tracking-widest font-mono bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteMemberUser(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={memberActionLoading || deleteMemberPin !== '142126'}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-55 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {memberActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Remover Miembro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
