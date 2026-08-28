import React from 'react';
import { useFinancialState } from './hooks/useFinancialState';
// Common / Layout
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AuthScreen } from './components/common/AuthScreen';
import { DottedBackground } from './components/common/DottedBackground';
import { SupportManager } from './components/common/SupportManager';
// Personal Finances
import { Dashboard } from './components/personal/Dashboard';
import { PeriodBalanceView } from './components/personal/PeriodBalanceView';
import { DebtsManager } from './components/personal/DebtsManager';
import { SavingsManager } from './components/personal/SavingsManager';
import { TransactionsManager } from './components/personal/TransactionsManager';
import { ScheduledManager } from './components/personal/ScheduledManager';
import { PendingExpensesManager } from './components/personal/PendingExpensesManager';
import { FinancialCalendarView } from './components/personal/FinancialCalendarView';
import { AddDebtModal } from './components/personal/AddDebtModal';
import { AddSavingsModal } from './components/personal/AddSavingsModal';
import { AddTransactionModal } from './components/personal/AddTransactionModal';
import { AddPendingExpenseModal } from './components/personal/AddPendingExpenseModal';
import { RegularizeExpenseModal } from './components/personal/RegularizeExpenseModal';
import { PaymentModal } from './components/personal/PaymentModal';
import { DepositModal } from './components/personal/DepositModal';
// Shared Finances
import { SharedFinancesManager } from './components/shared/SharedFinancesManager';
import { ParticipantPaymentModal } from './components/shared/ParticipantPaymentModal';
// Config
import { ConfigManager } from './components/config/ConfigManager';

export default function App() {
  const state = useFinancialState();
  const [calendarViewMode, setCalendarViewMode] = React.useState<'grid' | 'list' | 'year'>('grid');

  // Force redirect admin users to support tab
  React.useEffect(() => {
    if (state.currentUser?.role === 'admin' && state.activeTab !== 'support') {
      state.setActiveTab('support');
    }
  }, [state.currentUser, state.activeTab]);

  // Beautiful Loading Spinner
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse">Cargando tus finanzas...</p>
      </div>
    );
  }

  // If not authenticated, show AuthScreen
  if (!state.currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(u) => state.setCurrentUser(u)}
        theme={state.theme}
        onToggleTheme={() => state.setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-800 font-sans antialiased flex relative z-10">
      <DottedBackground />
      {/* Mobile backdrop */}
      {state.isMobileSidebarOpen && (
        <div
          onClick={() => state.setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
        />
      )}

      {/* Desktop & Mobile Sidebar */}
      <Sidebar
        activeTab={state.activeTab}
        onTabChange={state.setActiveTab}
        onOpenConfig={() => state.setActiveTab('config')}
        data={state.data}
        period={state.period}
        summary={state.summary}
        isCollapsed={state.isSidebarCollapsed}
        onToggleCollapse={() => state.setIsSidebarCollapsed((prev) => !prev)}
        isOpenMobile={state.isMobileSidebarOpen}
        onCloseMobile={() => state.setIsMobileSidebarOpen(false)}
        currentUser={state.currentUser}
        familyGroup={state.familyGroup}
        sharedDebtsCount={state.sharedDebts.length}
        sharedSavingsCount={state.sharedSavings.length}
        theme={state.theme}
        onToggleTheme={() => state.setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        onLogout={state.handleLogout}
      />

      {/* Main Content Workspace */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          state.isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Header with navigation & period selector */}
        <Header
          period={state.period}
          onPeriodChange={state.setPeriod}
          activeTab={state.activeTab}
          onTabChange={state.setActiveTab}
          currencySymbol={state.data.config.currencySymbol}
          onOpenMobileSidebar={() => state.setIsMobileSidebarOpen(true)}
          calendarViewMode={calendarViewMode}
        />

        {/* Main Content Area */}
        <main className="w-full px-3 sm:px-6 lg:px-8 py-5 flex-1 max-w-7xl mx-auto">
          {state.activeTab === 'dashboard' && (
            <Dashboard
              data={state.data}
              period={state.period}
              summary={state.summary}
              onNavigateTab={state.setActiveTab}
            />
          )}

          {state.activeTab === 'balance' && (
            <PeriodBalanceView
              data={state.data}
              period={state.period}
              summary={state.summary}
              onOpenAddTransaction={(type) => {
                state.setTxModalType(type);
                state.setTxModalIsScheduled(false);
                state.setTxToEdit(null);
                state.setIsTxModalOpen(true);
              }}
              onOpenPaymentModal={state.handleOpenPaymentModal}
              onOpenDepositModal={state.handleOpenDepositModal}
              onSaveBalanceAllocation={state.handleSaveBalanceAllocation}
              onToggleSkipObligation={state.handleToggleSkipObligation}
            />
          )}

          {state.activeTab === 'pending_expenses' && (
            <PendingExpensesManager
              expenses={state.data.pendingExpenses || []}
              period={state.period}
              currencyCode={state.data.config.currencyCode}
              currencySymbol={state.data.config.currencySymbol}
              onOpenAddExpense={() => {
                state.setPendingToEdit(null);
                state.setIsAddPendingModalOpen(true);
              }}
              onEditExpense={(expense) => {
                state.setPendingToEdit(expense);
                state.setIsAddPendingModalOpen(true);
              }}
              onDeleteExpense={state.handleDeletePendingExpense}
              onOpenRegularize={(expense) => {
                state.setPendingToRegularize(expense);
                state.setIsRegularizeModalOpen(true);
              }}
              onOpenParticipantPayment={(expense, participant) => {
                state.setParticipantPaymentExpense(expense);
                state.setParticipantPaymentTarget(participant);
                state.setIsParticipantPaymentModalOpen(true);
              }}
            />
          )}

          {state.activeTab === 'debts' && (
            <DebtsManager
              debts={state.data.debts}
              period={state.period}
              currencyCode={state.data.config.currencyCode}
              currencySymbol={state.data.config.currencySymbol}
              onOpenAddDebt={() => {
                state.setDebtToEdit(null);
                state.setIsDebtModalOpen(true);
              }}
              onEditDebt={(debt) => {
                state.setDebtToEdit(debt);
                state.setIsDebtModalOpen(true);
              }}
              onDeleteDebt={state.handleDeleteDebt}
              onOpenPaymentModal={state.handleOpenPaymentModal}
            />
          )}

          {state.activeTab === 'savings' && (
            <SavingsManager
              savings={state.data.savings}
              period={state.period}
              currencyCode={state.data.config.currencyCode}
              currencySymbol={state.data.config.currencySymbol}
              skippedObligations={state.data.skippedObligations}
              onOpenAddSavings={() => {
                state.setSavingsToEdit(null);
                state.setIsSavingsModalOpen(true);
              }}
              onEditSavings={(sav) => {
                state.setSavingsToEdit(sav);
                state.setIsSavingsModalOpen(true);
              }}
              onDeleteSavings={state.handleDeleteSavings}
              onOpenDepositModal={state.handleOpenDepositModal}
            />
          )}

          {state.activeTab === 'shared_finances' && (
            <SharedFinancesManager
              currentUser={state.currentUser}
              familyGroup={state.familyGroup}
              userFamilyGroups={state.userFamilyGroups}
              onSelectActiveGroup={state.handleSelectActiveGroup}
              sharedDebts={state.sharedDebts}
              sharedSavings={state.sharedSavings}
              currencyCode={state.data.config.currencyCode}
              currencySymbol={state.data.config.currencySymbol}
              suggestedTags={state.data.config.suggestedExpenseTags}
              onAddSharedDebt={state.handleAddSharedDebt}
              onDeleteSharedDebt={state.handleDeleteSharedDebt}
              onAddAbono={state.handleAddSharedAbono}
              onDeleteAbono={state.handleDeleteSharedAbono}
              onAddSharedSaving={state.handleAddSharedSaving}
              onDeleteSharedSaving={state.handleDeleteSharedSaving}
              onAddSharedSavingDeposit={state.handleAddSharedSavingDeposit}
              onDeleteSharedSavingDeposit={state.handleDeleteSharedSavingDeposit}
              onGoToFamilyConfig={() => state.setActiveTab('config')}
              personalConfig={state.data.config}
            />
          )}

          {state.activeTab === 'transactions' && (
            <TransactionsManager
              transactions={state.summary.sporadicIncomes.concat(state.summary.sporadicExpenses)}
              period={state.period}
              currencyCode={state.data.config.currencyCode}
              currencySymbol={state.data.config.currencySymbol}
              onOpenAddTransaction={(type) => {
                state.setTxModalType(type);
                state.setTxModalIsScheduled(false);
                state.setTxToEdit(null);
                state.setIsTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                state.setTxToEdit(tx);
                state.setIsTxModalOpen(true);
              }}
              onDeleteTransaction={state.handleDeleteTransaction}
              onToggleComplete={state.handleToggleCompleteTx}
            />
          )}

          {state.activeTab === 'scheduled' && (
            <ScheduledManager
              transactions={state.data.sporadicTransactions}
              currentPeriod={state.period}
              currencyCode={state.data.config.currencyCode}
              currencySymbol={state.data.config.currencySymbol}
              onOpenAddScheduled={(type) => {
                state.setTxModalType(type);
                state.setTxModalIsScheduled(true);
                state.setTxToEdit(null);
                state.setIsTxModalOpen(true);
              }}
              onEditTransaction={(tx) => {
                state.setTxToEdit(tx);
                state.setIsTxModalOpen(true);
              }}
              onDeleteTransaction={state.handleDeleteTransaction}
              onJumpToPeriod={(newP) => {
                state.setPeriod(newP);
                state.setActiveTab('balance');
              }}
            />
          )}

          {state.activeTab === 'calendar' && (
            <FinancialCalendarView
              data={state.data}
              period={state.period}
              onPeriodChange={state.setPeriod}
              currentUser={state.currentUser!}
              familyGroup={state.familyGroup}
              sharedDebts={state.sharedDebts}
              sharedSavings={state.sharedSavings}
              currencyCode={state.data.config.currencyCode}
              currencySymbol={state.data.config.currencySymbol}
              onOpenAddTransaction={(type, date) => {
                state.setTxModalType(type);
                state.setTxModalIsScheduled(false);
                state.setTxToEdit(null);
                state.setTxModalInitialDate(date);
                state.setIsTxModalOpen(true);
              }}
              onOpenAddPendingExpense={(date) => {
                state.setPendingToEdit(null);
                state.setPendingModalInitialDate(date);
                state.setIsAddPendingModalOpen(true);
              }}
              onOpenRegularizeExpense={(exp) => {
                state.setPendingToRegularize(exp);
                state.setIsRegularizeModalOpen(true);
              }}
              onDeleteTransaction={state.handleDeleteTransaction}
              onDeletePendingExpense={state.handleDeletePendingExpense}
              onNavigateToTab={(tab) => state.setActiveTab(tab)}
              viewMode={calendarViewMode}
              setViewMode={setCalendarViewMode}
            />
          )}

          {state.activeTab === 'support' && (
            <SupportManager />
          )}

          {state.activeTab === 'config' && (
            <ConfigManager
              config={state.data.config}
              currentUser={state.currentUser}
              familyGroup={state.familyGroup}
              userFamilyGroups={state.userFamilyGroups}
              onSelectActiveGroup={state.handleSelectActiveGroup}
              onUpdateUser={state.handleUpdateProfile}
              onLogout={state.handleLogout}
              onCreateFamilyGroup={state.handleCreateFamilyGroup}
              onJoinFamilyGroup={state.handleJoinFamilyGroup}
              onLeaveFamilyGroup={state.handleLeaveFamilyGroup}
              onGoToSharedDebts={() => state.setActiveTab('shared_finances')}
              onSaveConfig={state.handleSaveConfig}
              onExportData={state.handleExportData}
              onImportData={state.handleImportData}
              onResetData={state.handleResetData}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <AddDebtModal
        isOpen={state.isDebtModalOpen}
        onClose={() => {
          state.setIsDebtModalOpen(false);
          state.setDebtToEdit(null);
        }}
        onSave={state.handleSaveDebt}
        initialPeriod={state.period}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        debtToEdit={state.debtToEdit}
        suggestedTags={state.data.config.suggestedExpenseTags}
      />

      <AddSavingsModal
        isOpen={state.isSavingsModalOpen}
        onClose={() => {
          state.setIsSavingsModalOpen(false);
          state.setSavingsToEdit(null);
        }}
        onSave={state.handleSaveSavings}
        initialPeriod={state.period}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        savingsToEdit={state.savingsToEdit}
      />

      <AddTransactionModal
        isOpen={state.isTxModalOpen}
        onClose={() => {
          state.setIsTxModalOpen(false);
          state.setTxToEdit(null);
          state.setTxModalInitialDate(undefined);
        }}
        onSave={state.handleSaveTransaction}
        initialPeriod={state.period}
        initialType={state.txModalType}
        initialIsScheduled={state.txModalIsScheduled}
        initialDate={state.txModalInitialDate}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        txToEdit={state.txToEdit}
      />

      {/* Pending Expenses Modals */}
      <AddPendingExpenseModal
        isOpen={state.isAddPendingModalOpen}
        onClose={() => {
          state.setIsAddPendingModalOpen(false);
          state.setPendingToEdit(null);
          state.setPendingModalInitialDate(undefined);
        }}
        onSave={state.handleSavePendingExpense}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        expenseToEdit={state.pendingToEdit}
        suggestedTags={state.data.config.suggestedExpenseTags}
        initialDate={state.pendingModalInitialDate}
      />

      <RegularizeExpenseModal
        isOpen={state.isRegularizeModalOpen}
        onClose={() => {
          state.setIsRegularizeModalOpen(false);
          state.setPendingToRegularize(null);
        }}
        expense={state.pendingToRegularize}
        currentPeriod={state.period}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        onCompleteRegularization={state.handleCompleteRegularization}
      />

      <ParticipantPaymentModal
        isOpen={state.isParticipantPaymentModalOpen}
        onClose={() => {
          state.setIsParticipantPaymentModalOpen(false);
          state.setParticipantPaymentExpense(null);
          state.setParticipantPaymentTarget(null);
        }}
        expense={state.participantPaymentExpense}
        participant={state.participantPaymentTarget}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        onRegisterPayment={state.handleRegisterParticipantPayment}
      />

      <PaymentModal
        isOpen={state.isPaymentModalOpen}
        onClose={() => {
          state.setIsPaymentModalOpen(false);
          state.setPaymentDebt(null);
        }}
        debt={state.paymentDebt}
        period={state.period}
        expectedAmount={state.paymentExpectedAmount}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        onRegisterPayment={state.handleRegisterPayment}
      />

      <DepositModal
        isOpen={state.isDepositModalOpen}
        onClose={() => {
          state.setIsDepositModalOpen(false);
          state.setDepositSavings(null);
        }}
        savings={state.depositSavings}
        period={state.period}
        expectedAmount={state.depositExpectedAmount}
        currencyCode={state.data.config.currencyCode}
        currencySymbol={state.data.config.currencySymbol}
        onRegisterDeposit={state.handleRegisterDeposit}
      />
    </div>
  );
}
