import React, { useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Wallet,
  CreditCard,
  PiggyBank,
  Receipt,
  CalendarDays,
  LayoutDashboard,
  Tag,
  Menu,
  Settings,
  Users,
  Home,
  HelpCircle,
} from 'lucide-react';
import { PeriodSelection } from '../types';
import { MONTH_NAMES_ES, getPeriodLabel } from '../utils/formatters';
import { HelpModal } from './HelpModal';

interface HeaderProps {
  period: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
  activeTab: 'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled' | 'calendar' | 'config';
  onTabChange: (tab: 'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled' | 'calendar' | 'config') => void;
  currencySymbol: string;
  onOpenMobileSidebar?: () => void;
  calendarViewMode?: 'grid' | 'list' | 'year';
}

export const Header: React.FC<HeaderProps> = ({
  period,
  onPeriodChange,
  activeTab,
  onTabChange,
  onOpenMobileSidebar,
  calendarViewMode,
}) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const currentRealDate = new Date();
  const currentRealYear = currentRealDate.getFullYear();
  const currentRealMonth = currentRealDate.getMonth();
  const currentRealQuincena: 1 | 2 = currentRealDate.getDate() <= 15 ? 1 : 2;

  const isCurrentPeriod =
    period.year === currentRealYear &&
    period.month === currentRealMonth &&
    (period.periodType === 'mes' || period.quincena === currentRealQuincena);

  const goToToday = () => {
    onPeriodChange({
      year: currentRealYear,
      month: currentRealMonth,
      periodType: 'quincena',
      quincena: currentRealQuincena,
    });
  };

  const handlePrev = () => {
    if (activeTab === 'calendar' && calendarViewMode === 'year') {
      onPeriodChange({ ...period, year: period.year - 1 });
      return;
    }
    if (period.periodType === 'mes') {
      let newMonth = period.month - 1;
      let newYear = period.year;
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      }
      onPeriodChange({ ...period, year: newYear, month: newMonth });
    } else {
      if (period.quincena === 2) {
        onPeriodChange({ ...period, quincena: 1 });
      } else {
        let newMonth = period.month - 1;
        let newYear = period.year;
        if (newMonth < 0) {
          newMonth = 11;
          newYear -= 1;
        }
        onPeriodChange({ ...period, year: newYear, month: newMonth, quincena: 2 });
      }
    }
  };

  const handleNext = () => {
    if (activeTab === 'calendar' && calendarViewMode === 'year') {
      onPeriodChange({ ...period, year: period.year + 1 });
      return;
    }
    if (period.periodType === 'mes') {
      let newMonth = period.month + 1;
      let newYear = period.year;
      if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      onPeriodChange({ ...period, year: newYear, month: newMonth });
    } else {
      if (period.quincena === 1) {
        onPeriodChange({ ...period, quincena: 2 });
      } else {
        let newMonth = period.month + 1;
        let newYear = period.year;
        if (newMonth > 11) {
          newMonth = 0;
          newYear += 1;
        }
        onPeriodChange({ ...period, year: newYear, month: newMonth, quincena: 1 });
      }
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top bar: Period Controller */}
        <div className="py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            {onOpenMobileSidebar && (
              <button
                type="button"
                id="btn-open-mobile-sidebar"
                onClick={onOpenMobileSidebar}
                className="md:hidden p-1.5 text-slate-700 hover:text-slate-950 bg-slate-100/90 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Abrir menú"
                aria-label="Abrir menú lateral"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            {/* Home/Dashboard Button */}
            <button
              type="button"
              onClick={() => onTabChange('dashboard')}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/10'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
              title="Ir al Dashboard (Inicio)"
            >
              <Home className="w-4 h-4" />
            </button>

            {/* Navigation Controls: Prev, Year, Month, Next */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-lg border border-slate-200 ml-1.5 sm:ml-3">
              <button
                id="btn-prev-period"
                onClick={handlePrev}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-all cursor-pointer"
                title="Periodo anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Year selector */}
              <select
                id="select-period-year"
                value={period.year}
                onChange={(e) => onPeriodChange({ ...period, year: parseInt(e.target.value, 10) })}
                className="bg-white text-xs font-semibold text-slate-800 border border-slate-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Month selector */}
              <select
                id="select-period-month"
                value={period.month}
                onChange={(e) => onPeriodChange({ ...period, month: parseInt(e.target.value, 10) })}
                className="bg-white text-xs font-semibold text-slate-800 border border-slate-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                {MONTH_NAMES_ES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              <button
                id="btn-next-period"
                onClick={handleNext}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-all cursor-pointer"
                title="Periodo siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Period Mode Selector: Q1, Q2, or Month */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              id="btn-mode-q1"
              onClick={() => onPeriodChange({ ...period, periodType: 'quincena', quincena: 1 })}
              className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer text-xs ${
                period.periodType === 'quincena' && period.quincena === 1
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              1ra Quincena
            </button>

            <button
              id="btn-mode-q2"
              onClick={() => onPeriodChange({ ...period, periodType: 'quincena', quincena: 2 })}
              className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer text-xs ${
                period.periodType === 'quincena' && period.quincena === 2
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              2da Quincena
            </button>

            <button
              id="btn-mode-month"
              onClick={() => onPeriodChange({ ...period, periodType: 'mes' })}
              className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer text-xs ${
                period.periodType === 'mes'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Mes Completo
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            {!isCurrentPeriod && (
              <button
                id="btn-go-current-period"
                onClick={goToToday}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                title="Volver a la quincena actual de hoy"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quincena Actual</span>
                <span className="sm:hidden">Hoy</span>
              </button>
            )}

            {/* Active Period Badge */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg mr-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>{getPeriodLabel(period)}</span>
            </div>

            {/* Help Button */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-full border border-slate-200 hover:border-emerald-200 transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-3xs hover:shadow-2xs active:scale-95"
              title="Ayuda del módulo actual"
              aria-label="Ayuda del módulo actual"
            >
              <HelpCircle className="w-4 h-4 text-slate-600 hover:text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Tab Navigation (Mobile bar) */}
        <nav className="flex space-x-1 sm:space-x-3 overflow-x-auto py-1 border-t border-slate-100 scrollbar-none md:hidden">
          <button
            id="nav-tab-dashboard"
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'dashboard'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            id="nav-tab-balance"
            onClick={() => onTabChange('balance')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'balance'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Saldo y Presupuesto</span>
          </button>

          <button
            id="nav-tab-savings"
            onClick={() => onTabChange('savings')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'savings'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PiggyBank className="w-3.5 h-3.5" />
            <span>Ahorro Programado</span>
          </button>

          <button
            id="nav-tab-debts"
            onClick={() => onTabChange('debts')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'debts'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Deudas Personales</span>
          </button>

          <button
            id="nav-tab-transactions"
            onClick={() => onTabChange('transactions')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'transactions'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Gastos Esporádicos</span>
          </button>

          <button
            id="nav-tab-pending-expenses"
            onClick={() => onTabChange('pending_expenses')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'pending_expenses'
                ? 'border-amber-500 text-amber-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Gastos por Clasificar</span>
          </button>

          <button
            id="nav-tab-scheduled"
            onClick={() => onTabChange('scheduled')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'scheduled'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Plan Futuro</span>
          </button>

          <button
            id="nav-tab-shared-finances"
            onClick={() => onTabChange('shared_finances')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'shared_finances'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Compartidas</span>
          </button>

          <button
            id="nav-tab-calendar"
            onClick={() => onTabChange('calendar')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'calendar'
                ? 'border-indigo-600 text-indigo-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>

          <button
            id="nav-tab-config"
            onClick={() => onTabChange('config')}
            className={`flex items-center gap-1.5 py-1.5 px-2.5 border-b-2 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configuración</span>
          </button>
        </nav>
      </div>

      {/* Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        activeTab={activeTab}
      />
    </header>
  );
};
