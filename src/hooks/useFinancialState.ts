import { useState, useEffect, useMemo } from 'react';
import {
  AppData,
  DebtItem,
  FamilyGroup,
  FreeBalanceAllocation,
  ParticipantShare,
  PendingExpense,
  PeriodSelection,
  SavingsProgram,
  SharedFamilyDebt,
  SharedFamilyDebtAbono,
  SharedFamilySavings,
  SharedFamilySavingsDeposit,
  SporadicTransaction,
  TransactionType,
  UserAccount,
} from '../types';
import {
  addAbonoToSharedDebt,
  addDepositToSharedSaving,
  createFamilyGroup,
  deleteAbonoFromSharedDebt,
  deleteDepositFromSharedSaving,
  deleteSharedDebt,
  deleteSharedSaving,
  getCurrentDatePeriod,
  getCurrentUser,
  getFamilyGroupsForUser,
  getSharedDebtsForGroup,
  getSharedSavingsForGroup,
  joinFamilyGroup,
  leaveFamilyGroup,
  loadAppDataForUser,
  loginUser,
  logoutUser,
  registerUser,
  resetToSeedData,
  saveAppDataForUser,
  saveSharedDebt,
  saveSharedSaving,
  setActiveFamilyGroupForUser,
  updateUserProfile,
  INITIAL_SEED_DATA,
} from '../utils/storage';
import { calculatePeriodSummary } from '../utils/calculator';
import { getPeriodKey } from '../utils/formatters';

export function useFinancialState() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // App Data (isolated per user)
  const [data, setData] = useState<AppData>(INITIAL_SEED_DATA);

  // Family Groups & Shared Finances State
  const [userFamilyGroups, setUserFamilyGroups] = useState<FamilyGroup[]>([]);
  const [familyGroup, setFamilyGroup] = useState<FamilyGroup | null>(null);
  const [sharedDebts, setSharedDebts] = useState<SharedFamilyDebt[]>([]);
  const [sharedSavings, setSharedSavings] = useState<SharedFamilySavings[]>([]);

  const [period, setPeriod] = useState<PeriodSelection>(() => getCurrentDatePeriod());
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled' | 'calendar' | 'config'
  >('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<DebtItem | null>(null);

  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [savingsToEdit, setSavingsToEdit] = useState<SavingsProgram | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [txModalIsScheduled, setTxModalIsScheduled] = useState(false);
  const [txModalInitialDate, setTxModalInitialDate] = useState<string | undefined>(undefined);
  const [txToEdit, setTxToEdit] = useState<SporadicTransaction | null>(null);

  // Pending Expenses Modals state
  const [isAddPendingModalOpen, setIsAddPendingModalOpen] = useState(false);
  const [pendingModalInitialDate, setPendingModalInitialDate] = useState<string | undefined>(undefined);
  const [pendingToEdit, setPendingToEdit] = useState<PendingExpense | null>(null);

  const [isRegularizeModalOpen, setIsRegularizeModalOpen] = useState(false);
  const [pendingToRegularize, setPendingToRegularize] = useState<PendingExpense | null>(null);

  const [isParticipantPaymentModalOpen, setIsParticipantPaymentModalOpen] = useState(false);
  const [participantPaymentExpense, setParticipantPaymentExpense] = useState<PendingExpense | null>(null);
  const [participantPaymentTarget, setParticipantPaymentTarget] = useState<ParticipantShare | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<DebtItem | null>(null);
  const [paymentExpectedAmount, setPaymentExpectedAmount] = useState<number>(0);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositSavings, setDepositSavings] = useState<SavingsProgram | null>(null);
  const [depositExpectedAmount, setDepositExpectedAmount] = useState<number>(0);

  // Reload data and groups when user changes or active group changes
  const reloadFamilyData = async (userId: string, userObj?: UserAccount | null) => {
    const allGroups = await getFamilyGroupsForUser(userId);
    setUserFamilyGroups(allGroups);
    
    const activeUser = userObj !== undefined ? userObj : currentUser;
    
    // Find active group based on user preferences
    const active = allGroups.find((g) => g.id === activeUser?.activeFamilyGroupId) || (allGroups.length > 0 ? allGroups[0] : null);
    setFamilyGroup(active);
    
    if (active) {
      const sDebts = await getSharedDebtsForGroup(active.id);
      setSharedDebts(sDebts);
      const sSavings = await getSharedSavingsForGroup(active.id);
      setSharedSavings(sSavings);
    } else {
      setSharedDebts([]);
      setSharedSavings([]);
    }
  };

  useEffect(() => {
    const loadAllUserData = async () => {
      if (currentUser) {
        setIsLoading(true);
        try {
          const userAppData = await loadAppDataForUser(currentUser.id);
          setData(userAppData);
          await reloadFamilyData(currentUser.id, currentUser);
        } catch (err) {
          console.error('Error loading app data from backend:', err);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    loadAllUserData();
  }, [currentUser?.id]);

  // Automatically save to backend database on changes
  useEffect(() => {
    const saveData = async () => {
      if (currentUser && data && data.config && !isLoading) {
        await saveAppDataForUser(currentUser.id, data);
      }
    };
    saveData();
  }, [data, currentUser, isLoading]);

  // Authentication Handlers
  const handleLogin = async (email: string, pin: string) => {
    setIsLoading(true);
    const res = await loginUser(email, pin);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    } else {
      setIsLoading(false);
    }
    return res;
  };

  const handleRegister = async (name: string, email: string, pin: string) => {
    setIsLoading(true);
    const res = await registerUser(name, email, pin);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    } else {
      setIsLoading(false);
    }
    return res;
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setFamilyGroup(null);
    setUserFamilyGroups([]);
    setSharedDebts([]);
    setSharedSavings([]);
    setActiveTab('dashboard');
  };

  const handleUpdateProfile = async (updates: { name?: string; pin?: string }) => {
    if (!currentUser) return { success: false, error: 'No hay usuario autenticado.' };
    setIsLoading(true);
    const res = await updateUserProfile(currentUser.id, updates);
    if (res.success && res.user) {
      setCurrentUser(res.user);
    }
    setIsLoading(false);
    return res;
  };

  // Multi-group active switcher
  const handleSelectActiveGroup = async (groupId: string) => {
    if (!currentUser) return;
    setIsLoading(true);
    const res = await setActiveFamilyGroupForUser(currentUser.id, groupId);
    if (res.success) {
      const updatedUser = getCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
        await reloadFamilyData(updatedUser.id, updatedUser);
      }
    }
    setIsLoading(false);
  };

  // Family Group Handlers
  const handleCreateFamilyGroup = async (name: string) => {
    if (!currentUser) return { success: false, error: 'Inicia sesión primero.' };
    setIsLoading(true);
    const res = await createFamilyGroup(currentUser.id, name);
    if (res.success && res.group) {
      const updatedUser = getCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
        await reloadFamilyData(updatedUser.id, updatedUser);
      }
    }
    setIsLoading(false);
    return res;
  };

  const handleJoinFamilyGroup = async (code: string) => {
    if (!currentUser) return { success: false, error: 'Inicia sesión primero.' };
    setIsLoading(true);
    const res = await joinFamilyGroup(currentUser.id, code);
    if (res.success && res.group) {
      const updatedUser = getCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
        await reloadFamilyData(updatedUser.id, updatedUser);
      }
    }
    setIsLoading(false);
    return res;
  };

  const handleLeaveFamilyGroup = async (groupId?: string) => {
    if (!currentUser) return { success: false, error: 'Inicia sesión primero.' };
    setIsLoading(true);
    const res = await leaveFamilyGroup(currentUser.id, groupId);
    if (res.success) {
      const updatedUser = getCurrentUser();
      if (updatedUser) {
        setCurrentUser(updatedUser);
        await reloadFamilyData(updatedUser.id, updatedUser);
      }
    }
    setIsLoading(false);
    return res;
  };

  // Shared Debts Handlers
  const handleAddSharedDebt = async (
    debtData: Omit<SharedFamilyDebt, 'id' | 'createdAt' | 'abonos'>,
    existingId?: string
  ) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      if (existingId) {
        const existing = sharedDebts.find((d) => d.id === existingId);
        if (existing) {
          const updated: SharedFamilyDebt = {
            ...existing,
            ...debtData,
          };
          await saveSharedDebt(updated);
          await reloadFamilyData(currentUser.id);
          return;
        }
      }
      const newDebt: SharedFamilyDebt = {
        ...debtData,
        id: '',
        familyGroupId: familyGroup.id,
        createdByUserId: currentUser.id,
        createdByUserName: currentUser.name,
        createdAt: new Date().toISOString(),
        abonos: [],
      };
      await saveSharedDebt(newDebt);
      await reloadFamilyData(currentUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSharedDebt = async (debtId: string) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      await deleteSharedDebt(debtId);
      await reloadFamilyData(currentUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSharedAbono = async (
    debtId: string,
    abonoData: Omit<SharedFamilyDebtAbono, 'id' | 'paidAt'>
  ) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      const res = await addAbonoToSharedDebt(debtId, abonoData);
      if (res.success) {
        await reloadFamilyData(currentUser.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSharedAbono = async (debtId: string, abonoId: string) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      const res = await deleteAbonoFromSharedDebt(debtId, abonoId);
      if (res.success) {
        await reloadFamilyData(currentUser.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Shared Savings Handlers
  const handleAddSharedSaving = async (
    savingData: Omit<SharedFamilySavings, 'id' | 'createdAt' | 'deposits'>,
    existingId?: string
  ) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      if (existingId) {
        const existing = sharedSavings.find((s) => s.id === existingId);
        if (existing) {
          const updated: SharedFamilySavings = {
            ...existing,
            ...savingData,
          };
          await saveSharedSaving(updated);
          await reloadFamilyData(currentUser.id);
          return;
        }
      }
      const newSaving: SharedFamilySavings = {
        ...savingData,
        id: '',
        familyGroupId: familyGroup.id,
        createdByUserId: currentUser.id,
        createdByUserName: currentUser.name,
        createdAt: new Date().toISOString(),
        deposits: [],
      };
      await saveSharedSaving(newSaving);
      await reloadFamilyData(currentUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSharedSaving = async (savingId: string) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      await deleteSharedSaving(savingId);
      await reloadFamilyData(currentUser.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSharedSavingDeposit = async (
    savingId: string,
    depositData: Omit<SharedFamilySavingsDeposit, 'id' | 'depositedAt'>
  ) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      const res = await addDepositToSharedSaving(savingId, depositData);
      if (res.success) {
        await reloadFamilyData(currentUser.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSharedSavingDeposit = async (savingId: string, depositId: string) => {
    if (!currentUser || !familyGroup) return;
    setIsLoading(true);
    try {
      const res = await deleteDepositFromSharedSaving(savingId, depositId);
      if (res.success) {
        await reloadFamilyData(currentUser.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Global ESC key listener to close active modals
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddPendingModalOpen) {
          setIsAddPendingModalOpen(false);
          setPendingToEdit(null);
        }
        if (isRegularizeModalOpen) {
          setIsRegularizeModalOpen(false);
          setPendingToRegularize(null);
        }
        if (isParticipantPaymentModalOpen) {
          setIsParticipantPaymentModalOpen(false);
          setParticipantPaymentExpense(null);
          setParticipantPaymentTarget(null);
        }
        if (isDebtModalOpen) setIsDebtModalOpen(false);
        if (isSavingsModalOpen) setIsSavingsModalOpen(false);
        if (isTxModalOpen) setIsTxModalOpen(false);
        if (isPaymentModalOpen) setIsPaymentModalOpen(false);
        if (isDepositModalOpen) setIsDepositModalOpen(false);
        if (isMobileSidebarOpen) setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [
    isAddPendingModalOpen,
    isRegularizeModalOpen,
    isParticipantPaymentModalOpen,
    isDebtModalOpen,
    isSavingsModalOpen,
    isTxModalOpen,
    isPaymentModalOpen,
    isDepositModalOpen,
    isMobileSidebarOpen,
  ]);

  // Financial summary for active period
  const summary = useMemo(() => {
    return calculatePeriodSummary(data, period);
  }, [data, period]);

  // Toggle sidebar for both mobile & desktop
  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  // Toggle skip/omit obligation for a period
  const handleToggleSkipObligation = (obligationId: string) => {
    const periodKey = summary.periodKey;
    setData((prev) => {
      const currentList = prev.skippedObligations?.[periodKey] || [];
      const isCurrentlySkipped = currentList.includes(obligationId);
      const updatedList = isCurrentlySkipped
        ? currentList.filter((id) => id !== obligationId)
        : [...currentList, obligationId];

      return {
        ...prev,
        skippedObligations: {
          ...(prev.skippedObligations || {}),
          [periodKey]: updatedList,
        },
      };
    });
  };

  // 1. Debt handlers
  const handleSaveDebt = (debtData: Omit<DebtItem, 'id' | 'payments' | 'createdAt'>) => {
    if (debtToEdit) {
      setData((prev) => ({
        ...prev,
        debts: prev.debts.map((d) =>
          d.id === debtToEdit.id
            ? { ...d, ...debtData }
            : d
        ),
      }));
    } else {
      const newDebt: DebtItem = {
        ...debtData,
        id: `debt-${Date.now()}`,
        createdAt: new Date().toISOString(),
        payments: [],
      };
      setData((prev) => ({
        ...prev,
        debts: [...prev.debts, newDebt],
      }));
    }
    setDebtToEdit(null);
  };

  const handleDeleteDebt = (debtId: string) => {
    setData((prev) => ({
      ...prev,
      debts: prev.debts.filter((d) => d.id !== debtId),
    }));
  };

  const handleOpenPaymentModal = (debt: DebtItem, expectedAmount: number) => {
    setPaymentDebt(debt);
    setPaymentExpectedAmount(expectedAmount);
    setIsPaymentModalOpen(true);
  };

  const handleRegisterPayment = (
    debtId: string,
    amount: number,
    notes: string,
    isExtra: boolean
  ) => {
    const currentPeriodKey = getPeriodKey(
      period.year,
      period.month,
      period.periodType === 'quincena' ? period.quincena : undefined
    );

    setData((prev) => ({
      ...prev,
      debts: prev.debts.map((d) => {
        if (d.id !== debtId) return d;
        const nextNum = d.payments.length + 1;
        const newRecord = {
          id: `pay-${Date.now()}`,
          periodKey: currentPeriodKey,
          installmentNumber: nextNum,
          amountPaid: amount,
          paidAt: new Date().toISOString(),
          notes,
          isExtraPayment: isExtra,
        };
        return {
          ...d,
          payments: [...d.payments, newRecord],
        };
      }),
    }));
  };

  // 2. Savings handlers
  const handleSaveSavings = (savingsData: Omit<SavingsProgram, 'id' | 'deposits' | 'createdAt'>) => {
    if (savingsToEdit) {
      setData((prev) => ({
        ...prev,
        savings: prev.savings.map((s) =>
          s.id === savingsToEdit.id ? { ...s, ...savingsData } : s
        ),
      }));
    } else {
      const newSav: SavingsProgram = {
        ...savingsData,
        id: `sav-${Date.now()}`,
        createdAt: new Date().toISOString(),
        deposits: [],
      };
      setData((prev) => ({
        ...prev,
        savings: [...prev.savings, newSav],
      }));
    }
    setSavingsToEdit(null);
  };

  const handleDeleteSavings = (savingsId: string) => {
    setData((prev) => ({
      ...prev,
      savings: prev.savings.filter((s) => s.id !== savingsId),
    }));
  };

  const handleOpenDepositModal = (savings: SavingsProgram, expectedAmount: number) => {
    setDepositSavings(savings);
    setDepositExpectedAmount(expectedAmount);
    setIsDepositModalOpen(true);
  };

  const handleRegisterDeposit = (savingsId: string, amount: number, notes: string) => {
    const currentPeriodKey = getPeriodKey(
      period.year,
      period.month,
      period.periodType === 'quincena' ? period.quincena : undefined
    );

    setData((prev) => ({
      ...prev,
      savings: prev.savings.map((s) => {
        if (s.id !== savingsId) return s;
        const newDep = {
          id: `dep-${Date.now()}`,
          periodKey: currentPeriodKey,
          amount,
          depositedAt: new Date().toISOString(),
          notes,
        };
        return {
          ...s,
          deposits: [...s.deposits, newDep],
        };
      }),
    }));
  };

  // 3. Sporadic / Scheduled Transaction handlers
  const handleSaveTransaction = (txData: Omit<SporadicTransaction, 'id'>) => {
    if (txToEdit) {
      setData((prev) => ({
        ...prev,
        sporadicTransactions: prev.sporadicTransactions.map((t) =>
          t.id === txToEdit.id ? { ...t, ...txData } : t
        ),
      }));
    } else {
      const newTx: SporadicTransaction = {
        ...txData,
        id: `tx-${Date.now()}`,
      };
      setData((prev) => ({
        ...prev,
        sporadicTransactions: [...prev.sporadicTransactions, newTx],
      }));
    }
    setTxToEdit(null);
  };

  const handleDeleteTransaction = (txId: string) => {
    setData((prev) => ({
      ...prev,
      sporadicTransactions: prev.sporadicTransactions.filter((t) => t.id !== txId),
    }));
  };

  const handleToggleCompleteTx = (txId: string) => {
    setData((prev) => ({
      ...prev,
      sporadicTransactions: prev.sporadicTransactions.map((t) =>
        t.id === txId ? { ...t, isCompleted: !t.isCompleted } : t
      ),
    }));
  };

  // 4. Pending Expenses handlers
  const handleSavePendingExpense = (
    expenseData: Omit<PendingExpense, 'id' | 'createdAt'>,
    andRegularize?: boolean,
    id?: string
  ) => {
    if (id) {
      const updatedExpense: PendingExpense = {
        ...expenseData,
        id,
        createdAt: (data.pendingExpenses || []).find((e) => e.id === id)?.createdAt || new Date().toISOString(),
      };
      setData((prev) => ({
        ...prev,
        pendingExpenses: (prev.pendingExpenses || []).map((exp) =>
          exp.id === id ? { ...exp, ...expenseData } : exp
        ),
      }));
      if (andRegularize) {
        setPendingToRegularize(updatedExpense);
        setIsRegularizeModalOpen(true);
      }
    } else {
      const newExp: PendingExpense = {
        ...expenseData,
        status: expenseData.status || 'pending',
        id: `pend-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setData((prev) => ({
        ...prev,
        pendingExpenses: [newExp, ...(prev.pendingExpenses || [])],
      }));
      if (andRegularize) {
        setPendingToRegularize(newExp);
        setIsRegularizeModalOpen(true);
      }
    }
  };

  const handleDeletePendingExpense = (expenseId: string) => {
    setData((prev) => ({
      ...prev,
      pendingExpenses: (prev.pendingExpenses || []).filter((exp) => exp.id !== expenseId),
    }));
  };

  const handleCompleteRegularization = (
    updatedExpense: PendingExpense,
    generatedDebt?: Omit<DebtItem, 'id' | 'payments' | 'createdAt'>,
    generatedTransaction?: Omit<SporadicTransaction, 'id'>
  ) => {
    setData((prev) => {
      let updatedDebts = [...prev.debts];
      let updatedTransactions = [...prev.sporadicTransactions];

      if (generatedDebt) {
        const newDebt: DebtItem = {
          ...generatedDebt,
          id: `debt-${Date.now()}`,
          payments: [],
          createdAt: new Date().toISOString(),
        };
        updatedDebts = [newDebt, ...updatedDebts];
      }

      if (generatedTransaction) {
        const newTx: SporadicTransaction = {
          ...generatedTransaction,
          id: `tx-${Date.now()}`,
        };
        updatedTransactions = [...updatedTransactions, newTx];
      }

      const updatedPending = (prev.pendingExpenses || []).map((exp) =>
        exp.id === updatedExpense.id ? updatedExpense : exp
      );

      return {
        ...prev,
        pendingExpenses: updatedPending,
        debts: updatedDebts,
        sporadicTransactions: updatedTransactions,
      };
    });
  };

  const handleRegisterParticipantPayment = (
    expenseId: string,
    participantId: string,
    amount: number,
    notes: string
  ) => {
    setData((prev) => ({
      ...prev,
      pendingExpenses: (prev.pendingExpenses || []).map((exp) => {
        if (exp.id !== expenseId) return exp;
        const updatedParticipants = (exp.participants || []).map((p) => {
          if (p.id !== participantId) return p;
          const newPaidAmount = (p.paidAmount || 0) + amount;
          const newPayment = {
            id: `part-pay-${Date.now()}`,
            amount,
            paidAt: new Date().toISOString(),
            notes: notes || 'Abono de cuota',
          };
          return {
            ...p,
            paidAmount: newPaidAmount,
            isSettled: newPaidAmount >= p.assignedAmount,
            payments: [...(p.payments || []), newPayment],
          };
        });

        return {
          ...exp,
          participants: updatedParticipants,
        };
      }),
    }));
  };

  // 5. Free Balance Allocation handler
  const handleSaveBalanceAllocation = (periodKey: string, allocation: FreeBalanceAllocation) => {
    setData((prev) => ({
      ...prev,
      balanceAllocations: {
        ...prev.balanceAllocations,
        [periodKey]: allocation,
      },
    }));
  };

  // 6. Config handlers & Backup export/import
  const handleSaveConfig = (newConfig: typeof data.config) => {
    setData((prev) => ({
      ...prev,
      config: newConfig,
    }));
  };

  const handleExportData = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finanzas_quincenales_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.config && parsed.debts && parsed.savings) {
          setData(parsed);
          alert('¡Datos importados correctamente!');
        } else {
          alert('El archivo no contiene un formato de respaldo válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    setIsLoading(true);
    try {
      const seed = await resetToSeedData();
      setData(seed);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentUser,
    setCurrentUser,
    theme,
    setTheme,
    isLoading,
    setIsLoading,
    data,
    setData,
    userFamilyGroups,
    setUserFamilyGroups,
    familyGroup,
    setFamilyGroup,
    sharedDebts,
    setSharedDebts,
    sharedSavings,
    setSharedSavings,
    period,
    setPeriod,
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isDebtModalOpen,
    setIsDebtModalOpen,
    debtToEdit,
    setDebtToEdit,
    isSavingsModalOpen,
    setIsSavingsModalOpen,
    savingsToEdit,
    setSavingsToEdit,
    isTxModalOpen,
    setIsTxModalOpen,
    txModalType,
    setTxModalType,
    txModalIsScheduled,
    setTxModalIsScheduled,
    txModalInitialDate,
    setTxModalInitialDate,
    txToEdit,
    setTxToEdit,
    isAddPendingModalOpen,
    setIsAddPendingModalOpen,
    pendingModalInitialDate,
    setPendingModalInitialDate,
    pendingToEdit,
    setPendingToEdit,
    isRegularizeModalOpen,
    setIsRegularizeModalOpen,
    pendingToRegularize,
    setPendingToRegularize,
    isParticipantPaymentModalOpen,
    setIsParticipantPaymentModalOpen,
    participantPaymentExpense,
    setParticipantPaymentExpense,
    participantPaymentTarget,
    setParticipantPaymentTarget,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentDebt,
    setPaymentDebt,
    paymentExpectedAmount,
    setPaymentExpectedAmount,
    isDepositModalOpen,
    setIsDepositModalOpen,
    depositSavings,
    setDepositSavings,
    depositExpectedAmount,
    setDepositExpectedAmount,
    summary,
    handleLogin,
    handleRegister,
    handleLogout,
    handleUpdateProfile,
    handleSelectActiveGroup,
    handleCreateFamilyGroup,
    handleJoinFamilyGroup,
    handleLeaveFamilyGroup,
    handleAddSharedDebt,
    handleDeleteSharedDebt,
    handleAddSharedAbono,
    handleDeleteSharedAbono,
    handleAddSharedSaving,
    handleDeleteSharedSaving,
    handleAddSharedSavingDeposit,
    handleDeleteSharedSavingDeposit,
    handleToggleSidebar,
    handleToggleSkipObligation,
    handleSaveDebt,
    handleDeleteDebt,
    handleOpenPaymentModal,
    handleRegisterPayment,
    handleSaveSavings,
    handleDeleteSavings,
    handleOpenDepositModal,
    handleRegisterDeposit,
    handleSaveTransaction,
    handleDeleteTransaction,
    handleToggleCompleteTx,
    handleSavePendingExpense,
    handleDeletePendingExpense,
    handleCompleteRegularization,
    handleRegisterParticipantPayment,
    handleSaveBalanceAllocation,
    handleSaveConfig,
    handleExportData,
    handleImportData,
    handleResetData,
  };
}
