import {
  AppConfig,
  AppData,
  PeriodSelection,
  UserAccount,
  FamilyGroup,
  SharedFamilyDebt,
  SharedFamilyDebtAbono,
  SharedFamilySavings,
  SharedFamilySavingsDeposit,
  AdminFamilyGroup,
  FamilyGroupMember,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const DEFAULT_SUGGESTED_TAGS: string[] = [
  'Ocio',
  'Restaurantes',
  'Tecnología',
  'Bebidas',
  'Hogar',
  'Otro',
];

export const DEFAULT_CONFIG: AppConfig = {
  monthlyFixedIncome: 0,
  incomeDistribution: 'both_equal',
  customIncomeQ1: 0,
  customIncomeQ2: 0,
  incomeQ1Day: 15,
  incomeQ2Day: 30,

  monthlyTransportExpense: 0,
  transportDistribution: 'both_equal',
  customTransportQ1: 0,
  customTransportQ2: 0,

  additionalFixedExpenses: [],

  suggestedExpenseTags: DEFAULT_SUGGESTED_TAGS,

  currencyCode: 'COP',
  currencySymbol: '$',
};

export const INITIAL_SEED_DATA: AppData = {
  config: DEFAULT_CONFIG,
  debts: [],
  savings: [],
  sporadicTransactions: [],
  pendingExpenses: [],
  balanceAllocations: {},
  skippedObligations: {},
};

// Helper for API headers
function getHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ----------------------------------------------------
// AUTHENTICATION & PROFILE
// ----------------------------------------------------

export function getCurrentUser(): UserAccount | null {
  const raw = localStorage.getItem('current_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserAccount | null): void {
  if (user) {
    localStorage.setItem('current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('current_user');
    localStorage.removeItem('auth_token');
  }
}

export async function registerUser(
  name: string,
  email: string,
  pin: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pin }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    localStorage.setItem('auth_token', data.token);
    setCurrentUser(data.user);
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: 'No se pudo conectar con el servidor backend.' };
  }
}

export async function loginUser(
  email: string,
  pin: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    localStorage.setItem('auth_token', data.token);
    setCurrentUser(data.user);
    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: 'No se pudo conectar con el servidor backend.' };
  }
}

export async function updateUserProfile(
  userId: string,
  updates: { name?: string; pin?: string }
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    setCurrentUser(data);
    return { success: true, user: data };
  } catch (err) {
    return { success: false, error: 'Error al conectar con el servidor.' };
  }
}

export function logoutUser(): void {
  setCurrentUser(null);
}

// ----------------------------------------------------
// FINANCIAL APP DATA SYNC
// ----------------------------------------------------

export async function loadAppData(): Promise<AppData> {
  try {
    const res = await fetch(`${API_URL}/data`, {
      headers: getHeaders(),
    });
    if (!res.ok) return INITIAL_SEED_DATA;
    const data = await res.json();
    return data;
  } catch {
    return INITIAL_SEED_DATA;
  }
}

export async function loadAppDataForUser(userId: string): Promise<AppData> {
  return loadAppData();
}

export async function saveAppDataForUser(userId: string, data: AppData): Promise<void> {
  try {
    await fetch(`${API_URL}/data/sync`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error('Error batch syncing data to server:', err);
  }
}

export async function resetToSeedData(): Promise<AppData> {
  await saveAppDataForUser('', INITIAL_SEED_DATA);
  return INITIAL_SEED_DATA;
}

export function getCurrentDatePeriod(): PeriodSelection {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const quincena: 1 | 2 = day <= 15 ? 1 : 2;

  return {
    year,
    month,
    periodType: 'quincena',
    quincena,
  };
}

// ----------------------------------------------------
// FAMILY GROUPS
// ----------------------------------------------------

export async function getFamilyGroupsForUser(userId: string): Promise<FamilyGroup[]> {
  try {
    const res = await fetch(`${API_URL}/family/groups`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getActiveFamilyGroupForUser(userId: string): Promise<FamilyGroup | null> {
  const user = getCurrentUser();
  if (!user || !user.activeFamilyGroupId) return null;
  const groups = await getFamilyGroupsForUser(userId);
  return groups.find((g) => g.id === user.activeFamilyGroupId) || null;
}

export async function setActiveFamilyGroupForUser(
  userId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/groups/select`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ groupId }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    setCurrentUser(data);
    return { success: true };
  } catch {
    return { success: false, error: 'Error de servidor.' };
  }
}

export async function getFamilyGroupForUser(userId: string): Promise<FamilyGroup | null> {
  return getActiveFamilyGroupForUser(userId);
}

export async function createFamilyGroup(
  userId: string,
  groupName: string
): Promise<{ success: boolean; group?: FamilyGroup; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/groups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name: groupName }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    // Update local user active group
    const currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.activeFamilyGroupId = data.id;
      setCurrentUser(currentUser);
    }

    return { success: true, group: data };
  } catch {
    return { success: false, error: 'Error al conectar con el servidor.' };
  }
}

export async function joinFamilyGroup(
  userId: string,
  code: string
): Promise<{ success: boolean; group?: FamilyGroup; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/groups/join`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    const currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.activeFamilyGroupId = data.id;
      setCurrentUser(currentUser);
    }

    return { success: true, group: data };
  } catch {
    return { success: false, error: 'Error al conectar con el servidor.' };
  }
}

export async function leaveFamilyGroup(
  userId: string,
  groupId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/groups/leave`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ groupId }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };

    const currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.activeFamilyGroupId = null;
      setCurrentUser(currentUser);
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Error al conectar con el servidor.' };
  }
}

// ----------------------------------------------------
// SHARED FAMILY DEBTS
// ----------------------------------------------------

export async function getSharedFamilyDebts(familyGroupId: string): Promise<SharedFamilyDebt[]> {
  try {
    const res = await fetch(`${API_URL}/family/debts`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveSharedFamilyDebt(debt: SharedFamilyDebt): Promise<SharedFamilyDebt> {
  const res = await fetch(`${API_URL}/family/debts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(debt),
  });
  return await res.json();
}

export async function deleteSharedFamilyDebt(debtId: string): Promise<void> {
  await fetch(`${API_URL}/family/debts/${debtId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
}

export async function addSharedFamilyDebtAbono(
  debtId: string,
  abonoData: any
): Promise<{ success: boolean; abono?: SharedFamilyDebtAbono; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/debts/${debtId}/abonos`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(abonoData),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, abono: data };
  } catch {
    return { success: false, error: 'Error de red.' };
  }
}

export async function deleteSharedFamilyDebtAbono(
  debtId: string,
  abonoId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/debts/${debtId}/abonos/${abonoId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) return { success: false, error: 'Error al eliminar el abono.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Error de red.' };
  }
}

// ----------------------------------------------------
// SHARED FAMILY SAVINGS
// ----------------------------------------------------

export async function getSharedFamilySavings(familyGroupId: string): Promise<SharedFamilySavings[]> {
  try {
    const res = await fetch(`${API_URL}/family/savings`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function saveSharedFamilySaving(saving: SharedFamilySavings): Promise<SharedFamilySavings> {
  const res = await fetch(`${API_URL}/family/savings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(saving),
  });
  return await res.json();
}

export async function deleteSharedFamilySaving(savingId: string): Promise<void> {
  await fetch(`${API_URL}/family/savings/${savingId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
}

export async function addSharedFamilySavingsDeposit(
  savingsId: string,
  depositData: any
): Promise<{ success: boolean; deposit?: SharedFamilySavingsDeposit; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/savings/${savingsId}/deposits`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(depositData),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error };
    return { success: true, deposit: data };
  } catch {
    return { success: false, error: 'Error de red.' };
  }
}

export async function deleteSharedFamilySavingsDeposit(
  savingsId: string,
  depositId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/family/savings/${savingsId}/deposits/${depositId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) return { success: false, error: 'Error al eliminar el aporte.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Error de red.' };
  }
}

// ----------------------------------------------------
// ALIASES
// ----------------------------------------------------

export const getSharedDebtsForGroup = getSharedFamilyDebts;
export const saveSharedDebt = saveSharedFamilyDebt;
export const deleteSharedDebt = deleteSharedFamilyDebt;
export const addAbonoToSharedDebt = addSharedFamilyDebtAbono;
export const deleteAbonoFromSharedDebt = deleteSharedFamilyDebtAbono;

export const getSharedSavingsForGroup = getSharedFamilySavings;
export const saveSharedSaving = saveSharedFamilySaving;
export const deleteSharedSaving = deleteSharedFamilySaving;
export const addDepositToSharedSaving = addSharedFamilySavingsDeposit;
export const deleteDepositFromSharedSaving = deleteSharedFamilySavingsDeposit;

// ----------------------------------------------------
// ADMIN / SUPPORT ACTIONS
// ----------------------------------------------------

export async function getAdminUsers(search?: string): Promise<any[]> {
  try {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_URL}/admin/users${q}`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function adminResetPin(userId: string, tempPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/users/${userId}/reset-pin`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ tempPin }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Error al restablecer el PIN.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Error de conexión con el servidor.' };
  }
}

export async function deleteAdminUser(userId: string, adminPin: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ adminPin }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Error al eliminar el usuario.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Error de conexión con el servidor.' };
  }
}

export async function downloadUserBackup(userId: string, userName: string): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/admin/users/${userId}/backup`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al descargar backup.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${userName}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading user backup:', err);
    alert('No se pudo descargar la copia de seguridad del usuario.');
  }
}

export async function downloadFullSqlDump(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/admin/backup/dump`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al descargar dump.');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ahorro_quincenal_dump_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error downloading DB dump:', err);
    alert('No se pudo descargar el dump de la base de datos.');
  }
}

export async function resetPinForce(
  email: string,
  tempPin: string,
  newPin: string
): Promise<{ success: boolean; user?: any; token?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/reset-pin-force`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tempPin, newPin }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Error al restablecer el PIN.' };
    
    localStorage.setItem('auth_token', data.token);
    setCurrentUser(data.user);
    return { success: true, user: data.user, token: data.token };
  } catch {
    return { success: false, error: 'Error al conectar con el servidor.' };
  }
}

export async function getAdminFamilyGroups(): Promise<AdminFamilyGroup[]> {
  try {
    const res = await fetch(`${API_URL}/admin/groups`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function getFamilyGroupMembers(groupId: string): Promise<FamilyGroupMember[]> {
  try {
    const res = await fetch(`${API_URL}/admin/groups/${groupId}/members`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function addMemberToFamilyGroup(
  groupId: string,
  email: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/groups/${groupId}/members`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Error al agregar miembro.' };
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: 'Error de conexión con el servidor.' };
  }
}

export async function removeMemberFromFamilyGroup(
  groupId: string,
  userId: string,
  adminPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/admin/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ adminPin }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, error: data.error || 'Error al remover miembro.' };
    return { success: true };
  } catch {
    return { success: false, error: 'Error de conexión con el servidor.' };
  }
}

