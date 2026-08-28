import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Users,
  CreditCard,
  PiggyBank,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  LayoutGrid,
  List,
  Eye,
  Trash2,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import {
  AppData,
  FamilyGroup,
  PendingExpense,
  PeriodSelection,
  SharedFamilyDebt,
  SharedFamilySavings,
  UserAccount,
} from '../../types';
import {
  formatCurrency,
  formatCompactCurrency,
  getDaysInMonth,
  MONTH_NAMES_ES,
} from '../../utils/formatters';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { getColombianHolidays } from '../../utils/holidays';

export type CalendarCategory = 'income' | 'expense' | 'pending_shared' | 'family';

export interface CalendarEvent {
  id: string;
  category: CalendarCategory;
  title: string;
  amount: number;
  date: string; // YYYY-MM-DD
  tag?: string;
  subtitle?: string;
  rawType:
    | 'sporadic_income'
    | 'fixed_income'
    | 'sporadic_expense'
    | 'fixed_expense'
    | 'debt_payment'
    | 'saving_deposit'
    | 'pending_expense'
    | 'family_debt_abono'
    | 'family_saving_deposit';
  isScheduled?: boolean;
  isCompleted?: boolean;
  participantCount?: number;
  userName?: string;
  originalRef?: any;
}

interface FinancialCalendarViewProps {
  data: AppData;
  period: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
  currentUser: UserAccount;
  familyGroup: FamilyGroup | null;
  sharedDebts: SharedFamilyDebt[];
  sharedSavings: SharedFamilySavings[];
  currencyCode: string;
  currencySymbol: string;
  onOpenAddTransaction: (type: 'income' | 'expense', date?: string) => void;
  onOpenAddPendingExpense: (date?: string) => void;
  onOpenRegularizeExpense?: (expense: PendingExpense) => void;
  onDeleteTransaction?: (id: string) => void;
  onDeletePendingExpense?: (id: string) => void;
  onNavigateToTab?: (tab: 'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled') => void;
  viewMode: 'grid' | 'list' | 'year';
  setViewMode: (viewMode: 'grid' | 'list' | 'year') => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const FinancialCalendarView: React.FC<FinancialCalendarViewProps> = ({
  data,
  period,
  onPeriodChange,
  sharedDebts,
  sharedSavings,
  currencyCode,
  currencySymbol,
  onOpenAddTransaction,
  onOpenAddPendingExpense,
  onOpenRegularizeExpense,
  onDeleteTransaction,
  onNavigateToTab,
  viewMode,
  setViewMode,
}) => {
  // Active month and year from props
  const selectedYear = period.year;
  const selectedMonth = period.month;
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | CalendarCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const holidays = useMemo(() => getColombianHolidays(selectedYear), [selectedYear]);
  
  // Selected day for side panel / detailed list
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() => {
    const today = new Date();
    if (today.getFullYear() === period.year && today.getMonth() === period.month) {
      return today.toISOString().slice(0, 10);
    }
    const mm = String(period.month + 1).padStart(2, '0');
    return `${period.year}-${mm}-01`;
  });

  // Expand / Collapse state for Detalle del Día panel
  const [isDetailExpanded, setIsDetailExpanded] = useState<boolean>(true);

  // Day selection handler: always selects date and automatically expands detail
  const handleSelectDay = (dateStr: string) => {
    setSelectedDayStr(dateStr);
    setIsDetailExpanded(true);
  };

  // Modal delete state
  const [deletingTx, setDeletingTx] = useState<CalendarEvent | null>(null);

  // Keep selected day inside the active month when period changes from the global header
  React.useEffect(() => {
    const today = new Date();
    if (today.getFullYear() === period.year && today.getMonth() === period.month) {
      setSelectedDayStr(today.toISOString().slice(0, 10));
    } else {
      const mm = String(period.month + 1).padStart(2, '0');
      setSelectedDayStr(`${period.year}-${mm}-01`);
    }
  }, [period.year, period.month]);

  const handleGoToToday = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    setSelectedDayStr(now.toISOString().slice(0, 10));
    if (period.year !== curYear || period.month !== curMonth) {
      onPeriodChange({ ...period, year: curYear, month: curMonth });
    }
  };

  // Compile all calendar events for the active year and month
  const compileEventsForMonth = React.useCallback((year: number, month: number) => {
    const events: CalendarEvent[] = [];
    const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    // 1. 🟢 INGRESOS (Verde)
    // A) Transacciones esporádicas de ingreso
    (data.sporadicTransactions || [])
      .filter((tx) => tx.type === 'income' && tx.date.startsWith(targetMonthStr))
      .forEach((tx) => {
        events.push({
          id: `tx-${tx.id}`,
          category: 'income',
          title: tx.title,
          amount: tx.amount,
          date: tx.date,
          tag: tx.tag || 'Ingreso',
          subtitle: tx.isScheduled ? 'Ingreso programado' : 'Ingreso esporádico',
          rawType: 'sporadic_income',
          isScheduled: tx.isScheduled,
          isCompleted: tx.isCompleted,
          originalRef: tx,
        });
      });

    // B) Ingreso fijo mensual / quincenal distribuido
    if (data.config?.monthlyFixedIncome && data.config.monthlyFixedIncome > 0) {
      const dist = data.config.incomeDistribution || 'both_equal';
      let q1 = 0;
      let q2 = 0;
      if (dist === 'both_equal') {
        q1 = data.config.monthlyFixedIncome / 2;
        q2 = data.config.monthlyFixedIncome / 2;
      } else if (dist === 'both_custom') {
        q1 = data.config.customIncomeQ1 || 0;
        q2 = data.config.customIncomeQ2 || 0;
      } else if (dist === 'only_q1') {
        q1 = data.config.monthlyFixedIncome;
      } else if (dist === 'only_q2') {
        q2 = data.config.monthlyFixedIncome;
      }

      if (q1 > 0) {
        const dayQ1 = data.config.incomeQ1Day || 15;
        const dateQ1 = `${targetMonthStr}-${String(dayQ1).padStart(2, '0')}`;
        events.push({
          id: `fixed-income-q1-${year}-${month}`,
          category: 'income',
          title: 'Ingreso Fijo (1ra Quincena)',
          amount: q1,
          date: dateQ1,
          tag: 'Nómina / Salario',
          subtitle: 'Ingreso fijo quincenal',
          rawType: 'fixed_income',
          isCompleted: true,
        });
      }
      if (q2 > 0) {
        const dayQ2 = data.config.incomeQ2Day || 30;
        const dateQ2 = `${targetMonthStr}-${String(dayQ2).padStart(2, '0')}`;
        events.push({
          id: `fixed-income-q2-${year}-${month}`,
          category: 'income',
          title: 'Ingreso Fijo (2da Quincena)',
          amount: q2,
          date: dateQ2,
          tag: 'Nómina / Salario',
          subtitle: 'Ingreso fijo quincenal',
          rawType: 'fixed_income',
          isCompleted: true,
        });
      }
    }

    // 2. 🔴 GASTOS (Rojo)
    // A) Transacciones esporádicas de gasto
    (data.sporadicTransactions || [])
      .filter((tx) => tx.type === 'expense' && tx.date.startsWith(targetMonthStr))
      .forEach((tx) => {
        events.push({
          id: `tx-${tx.id}`,
          category: 'expense',
          title: tx.title,
          amount: tx.amount,
          date: tx.date,
          tag: tx.tag || 'Gasto',
          subtitle: tx.isScheduled ? 'Gasto programado' : 'Gasto esporádico',
          rawType: 'sporadic_expense',
          isScheduled: tx.isScheduled,
          isCompleted: tx.isCompleted,
          originalRef: tx,
        });
      });

    // B) Gastos fijos
    (data.config?.additionalFixedExpenses || []).forEach((fe) => {
      let q1 = 0;
      let q2 = 0;
      if (fe.distribution === 'both_equal') {
        q1 = Math.round(fe.monthlyAmount / 2);
        q2 = fe.monthlyAmount - q1;
      } else if (fe.distribution === 'both_custom') {
        q1 = fe.customQ1Amount || 0;
        q2 = fe.customQ2Amount || 0;
      } else if (fe.distribution === 'only_q1') {
        q1 = fe.monthlyAmount;
      } else if (fe.distribution === 'only_q2') {
        q2 = fe.monthlyAmount;
      }

      if (q1 > 0) {
        const dayQ1 = fe.q1Day || 15;
        events.push({
          id: `fixed-exp-${fe.id}-q1-${year}-${month}`,
          category: 'expense',
          title: `${fe.name} (Q1)`,
          amount: q1,
          date: `${targetMonthStr}-${String(dayQ1).padStart(2, '0')}`,
          tag: fe.tag || 'Gasto Fijo',
          subtitle: 'Gasto fijo mensual configurado',
          rawType: 'fixed_expense',
        });
      }
      if (q2 > 0) {
        const dayQ2 = fe.q2Day || 30;
        events.push({
          id: `fixed-exp-${fe.id}-q2-${year}-${month}`,
          category: 'expense',
          title: `${fe.name} (Q2)`,
          amount: q2,
          date: `${targetMonthStr}-${String(dayQ2).padStart(2, '0')}`,
          tag: fe.tag || 'Gasto Fijo',
          subtitle: 'Gasto fijo mensual configurado',
          rawType: 'fixed_expense',
        });
      }
    });

    // C) Cuotas de Deudas pagadas
    (data.debts || []).forEach((debt) => {
      (debt.payments || []).forEach((p) => {
        const pDate = (p.paidAt || '').slice(0, 10);
        if (pDate.startsWith(targetMonthStr)) {
          events.push({
            id: `debt-pay-${p.id}`,
            category: 'expense',
            title: `Pago Cuota: ${debt.title}`,
            amount: p.amountPaid,
            date: pDate,
            tag: debt.tag || 'Deuda',
            subtitle: `Cuota #${p.installmentNumber} cancelada`,
            rawType: 'debt_payment',
            isCompleted: true,
            originalRef: debt,
          });
        }
      });
    });

    // D) Depósitos de Ahorro personal
    (data.savings || []).forEach((sav) => {
      (sav.deposits || []).forEach((dep) => {
        const dDate = (dep.depositedAt || '').slice(0, 10);
        if (dDate.startsWith(targetMonthStr)) {
          events.push({
            id: `saving-dep-${dep.id}`,
            category: 'expense',
            title: `Aporte Ahorro: ${sav.name}`,
            amount: dep.amount,
            date: dDate,
            tag: sav.tag || 'Ahorro',
            subtitle: 'Depósito a meta de ahorro',
            rawType: 'saving_deposit',
            isCompleted: true,
            originalRef: sav,
          });
        }
      });
    });

    // 3. 🟡 COMPARTIDOS POR ETIQUETAR / CLASIFICAR
    (data.pendingExpenses || []).forEach((pe) => {
      const peDate = pe.date || (pe.createdAt ? pe.createdAt.slice(0, 10) : `${targetMonthStr}-01`);
      if (peDate.startsWith(targetMonthStr)) {
        const isShared = pe.scope === 'shared' || (pe.participants && pe.participants.length > 0);
        const participantCount = pe.participants?.length || 0;
        events.push({
          id: `pending-${pe.id}`,
          category: 'pending_shared',
          title: pe.title,
          amount: pe.amount,
          date: peDate,
          tag: pe.tag || 'Por Clasificar',
          subtitle: pe.status === 'pending'
            ? 'Pendiente por etiquetar y clasificar'
            : isShared
            ? `Dividido entre ${participantCount} personas`
            : 'Regularizado',
          rawType: 'pending_expense',
          participantCount,
          originalRef: pe,
        });
      }
    });

    // 4. 🔵 LO DE FAMILIA / FINANZAS COMPARTIDAS
    // A) Abonos de deudas compartidas
    (sharedDebts || []).forEach((sDebt) => {
      (sDebt.abonos || []).forEach((ab) => {
        const abDate = ab.date || (ab.paidAt ? ab.paidAt.slice(0, 10) : '');
        if (abDate.startsWith(targetMonthStr)) {
          events.push({
            id: `shared-debt-abono-${ab.id}`,
            category: 'family',
            title: `Abono Familiar: ${sDebt.title}`,
            amount: ab.amount,
            date: abDate,
            tag: sDebt.tag || 'Familiar',
            subtitle: `Abono por ${ab.userName}`,
            userName: ab.userName,
            rawType: 'family_debt_abono',
            originalRef: sDebt,
          });
        }
      });
    });

    // B) Depósitos a ahorros familiares
    (sharedSavings || []).forEach((sSav) => {
      (sSav.deposits || []).forEach((sDep) => {
        const depDate = sDep.date || (sDep.depositedAt ? sDep.depositedAt.slice(0, 10) : '');
        if (depDate.startsWith(targetMonthStr)) {
          events.push({
            id: `shared-sav-dep-${sDep.id}`,
            category: 'family',
            title: `Ahorro Familiar: ${sSav.name}`,
            amount: sDep.amount,
            date: depDate,
            tag: sSav.tag || 'Ahorro Familiar',
            subtitle: `Aporte de ${sDep.userName}`,
            userName: sDep.userName,
            rawType: 'family_saving_deposit',
            originalRef: sSav,
          });
        }
      });
    });

    return events;
  }, [data, sharedDebts, sharedSavings]);

  const allEvents = useMemo(() => {
    return compileEventsForMonth(selectedYear, selectedMonth);
  }, [compileEventsForMonth, selectedYear, selectedMonth]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (activeCategoryFilter !== 'all' && ev.category !== activeCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchTag = (ev.tag || '').toLowerCase().includes(q);
        const matchSub = (ev.subtitle || '').toLowerCase().includes(q);
        const matchUser = (ev.userName || '').toLowerCase().includes(q);
        return matchTitle || matchTag || matchSub || matchUser;
      }
      return true;
    });
  }, [allEvents, activeCategoryFilter, searchQuery]);

  // Events indexed by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    filteredEvents.forEach((ev) => {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // Monthly totals
  const monthlyMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let pendingShared = 0;
    let family = 0;

    allEvents.forEach((ev) => {
      if (ev.category === 'income') income += ev.amount;
      else if (ev.category === 'expense') expense += ev.amount;
      else if (ev.category === 'pending_shared') pendingShared += ev.amount;
      else if (ev.category === 'family') family += ev.amount;
    });

    const netBalance = income - expense;
    return { income, expense, pendingShared, family, netBalance };
  }, [allEvents]);

  // Yearly totals and metrics per month
  const yearlyMetrics = useMemo(() => {
    let yearlyIncome = 0;
    let yearlyExpense = 0;

    const months = Array.from({ length: 12 }, (_, monthIdx) => {
      const monthEvents = compileEventsForMonth(selectedYear, monthIdx);
      let income = 0;
      let expense = 0;

      monthEvents.forEach((ev) => {
        if (ev.category === 'income') {
          income += ev.amount;
        } else if (ev.category === 'expense' || ev.category === 'pending_shared' || ev.category === 'family') {
          expense += ev.amount;
        }
      });

      yearlyIncome += income;
      yearlyExpense += expense;

      return {
        monthIndex: monthIdx,
        income,
        expense,
        netBalance: income - expense,
        events: monthEvents,
      };
    });

    return {
      months,
      yearlyIncome,
      yearlyExpense,
      yearlyNet: yearlyIncome - yearlyExpense,
    };
  }, [compileEventsForMonth, selectedYear]);

  // Calendar Grid Calculation
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInCurrent = getDaysInMonth(selectedYear, selectedMonth);
    const prevMonthDays = getDaysInMonth(
      selectedMonth === 0 ? selectedYear - 1 : selectedYear,
      selectedMonth === 0 ? 11 : selectedMonth - 1
    );

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      events: CalendarEvent[];
      incomeTotal: number;
      expenseTotal: number;
      pendingTotal: number;
      familyTotal: number;
    }[] = [];

    // Previous month filler days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevY = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDayStr,
        events: eventsByDate[dateStr] || [],
        incomeTotal: 0,
        expenseTotal: 0,
        pendingTotal: 0,
        familyTotal: 0,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrent; d++) {
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvs = eventsByDate[dateStr] || [];
      let inc = 0;
      let exp = 0;
      let pen = 0;
      let fam = 0;
      dayEvs.forEach((e) => {
        if (e.category === 'income') inc += e.amount;
        if (e.category === 'expense') exp += e.amount;
        if (e.category === 'pending_shared') pen += e.amount;
        if (e.category === 'family') fam += e.amount;
      });

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDayStr,
        events: dayEvs,
        incomeTotal: inc,
        expenseTotal: exp,
        pendingTotal: pen,
        familyTotal: fam,
      });
    }

    // Next month filler days
    const remaining = 7 - (cells.length % 7);
    if (remaining > 0 && remaining < 7) {
      const nextM = selectedMonth === 11 ? 0 : selectedMonth + 1;
      const nextY = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
      for (let d = 1; d <= remaining; d++) {
        const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cells.push({
          dateStr,
          dayNumber: d,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === selectedDayStr,
          events: eventsByDate[dateStr] || [],
          incomeTotal: 0,
          expenseTotal: 0,
          pendingTotal: 0,
          familyTotal: 0,
        });
      }
    }

    return cells;
  }, [selectedYear, selectedMonth, todayStr, selectedDayStr, eventsByDate]);

  // Selected Day's details
  const selectedDayEvents = useMemo(() => {
    return (eventsByDate[selectedDayStr] || []).sort((a, b) => b.amount - a.amount);
  }, [eventsByDate, selectedDayStr]);

  const selectedDayMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let pending = 0;
    let family = 0;
    selectedDayEvents.forEach((e) => {
      if (e.category === 'income') income += e.amount;
      if (e.category === 'expense') expense += e.amount;
      if (e.category === 'pending_shared') pending += e.amount;
      if (e.category === 'family') family += e.amount;
    });
    return { income, expense, pending, family };
  }, [selectedDayEvents]);

  // Format selected day label
  const formattedSelectedDay = useMemo(() => {
    if (!selectedDayStr) return '';
    const parts = selectedDayStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d);
    const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dateObj.getDay()];
    return `${dayName}, ${d} de ${MONTH_NAMES_ES[m]} de ${y}`;
  }, [selectedDayStr]);

  return (
    <div id="financial-calendar-module" className="space-y-5 animate-in fade-in duration-200 pb-8 text-slate-700">
      {/* Header with Navigation & Quick Period Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Calendario Financiero
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 capitalize">
                {MONTH_NAMES_ES[selectedMonth]} {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-normal">
              Visualiza tus ingresos del mes activo
            </p>
          </div>
        </div>

        {/* Date Navigator & Layout Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Go to Today Button */}
          <button
            type="button"
            onClick={handleGoToToday}
            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-650" />
            <span>Hoy</span>
          </button>

          {/* View Toggle */}
          <div className="flex items-center p-1 bg-slate-105 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-505 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-505 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('year')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'year'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-505 hover:text-slate-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Año</span>
            </button>
          </div>

          {/* Expand / Collapse Detail Section Button */}
          <button
            type="button"
            onClick={() => setIsDetailExpanded((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs active:scale-95 ${
              isDetailExpanded
                ? 'bg-indigo-650 text-white border-indigo-600 hover:bg-indigo-700'
                : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50'
            }`}
          >
            {isDetailExpanded ? (
              <>
                <PanelRightClose className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="hidden sm:inline">Contraer Detalle</span>
              </>
            ) : (
              <>
                <PanelRightOpen className="w-3.5 h-3.5 text-indigo-650 shrink-0" />
                <span className="hidden sm:inline">Expandir Detalle</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Colored Category Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs font-bold">
        {/* 🟢 Verde: Ingresos */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'income' ? 'all' : 'income')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'income'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white hover:bg-emerald-50/30 border-slate-200/90 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
              <span className="text-xs font-bold text-emerald-805 uppercase tracking-wider">
                Ingresos
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-900 tracking-tight">
            {formatCurrency(monthlyMetrics.income, currencyCode, currencySymbol)}
          </div>
          <div className="text-[10px] text-emerald-700/80 font-semibold mt-0.5">
            {allEvents.filter((e) => e.category === 'income').length} movimientos
          </div>
        </div>

        {/* 🔴 Rojo: Gastos */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'expense' ? 'all' : 'expense')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'expense'
              ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white hover:bg-rose-50/30 border-slate-200/90 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100"></span>
              <span className="text-xs font-bold text-rose-805 uppercase tracking-wider">
                Gastos
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-rose-100/70 text-rose-700 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-rose-900 tracking-tight">
            {formatCurrency(monthlyMetrics.expense, currencyCode, currencySymbol)}
          </div>
          <div className="text-[10px] text-rose-700/80 font-semibold mt-0.5">
            {allEvents.filter((e) => e.category === 'expense').length} salidas
          </div>
        </div>

        {/* 🟡 Amarillo: Por Clasificar */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'pending_shared' ? 'all' : 'pending_shared')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'pending_shared'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white hover:bg-amber-50/30 border-slate-200/90 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100"></span>
              <span className="text-xs font-bold text-amber-805 uppercase tracking-wider">
                Por Clasificar
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-amber-900 tracking-tight font-mono">
            {formatCurrency(monthlyMetrics.pendingShared, currencyCode, currencySymbol)}
          </div>
          <div className="text-[10px] text-amber-700/80 font-semibold mt-0.5">
            {allEvents.filter((e) => e.category === 'pending_shared').length} pendientes
          </div>
        </div>

        {/* 🔵 Azul: Familia & Compartidas */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'family' ? 'all' : 'family')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'family'
              ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white hover:bg-blue-50/30 border-slate-200/90 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-100"></span>
              <span className="text-xs font-bold text-blue-805 uppercase tracking-wider">
                Familia & Grupo
              </span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-extrabold text-blue-900 tracking-tight">
            {formatCurrency(monthlyMetrics.family, currencyCode, currencySymbol)}
          </div>
          <div className="text-[10px] text-blue-700/80 font-semibold mt-0.5">
            {allEvents.filter((e) => e.category === 'family').length} registros
          </div>
        </div>
      </div>

      {/* Filter Chips & Quick Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs text-xs font-semibold">
        <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
          <span className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar:</span>
          </span>

          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeCategoryFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
            }`}
          >
            Todos ({allEvents.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveCategoryFilter('income')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeCategoryFilter === 'income'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>🟢 Ingresos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategoryFilter('expense')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeCategoryFilter === 'expense'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            <span>🔴 Gastos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategoryFilter('pending_shared')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeCategoryFilter === 'pending_shared'
                ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>🟡 Por Clasificar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategoryFilter('family')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeCategoryFilter === 'family'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span>🔵 Familia</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, tag..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Calendar Section & Details Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Calendar Grid or List View */}
        <div
          className={`${
            isDetailExpanded ? 'lg:col-span-8' : 'lg:col-span-12'
          } bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col transition-all duration-300`}
        >
          {viewMode === 'grid' ? (
            <div className="p-3 sm:p-5 flex-1 flex flex-col select-none">
              {/* Day names header */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                {WEEKDAYS.map((w, idx) => (
                  <div
                    key={w}
                    className={`py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
                      idx >= 5 ? 'text-slate-405 font-bold' : 'text-slate-655'
                    }`}
                  >
                    {w}
                  </div>
                ))}
              </div>

              {/* Day cells grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1 auto-rows-fr">
                {calendarCells.map((cell) => {
                  const hasEvents = cell.events.length > 0;
                  const isSelected = cell.dateStr === selectedDayStr;
                  const isHoliday = holidays.has(cell.dateStr);
                  const isSunday = new Date(cell.dateStr + 'T12:00:00').getDay() === 0;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => handleSelectDay(cell.dateStr)}
                      className={`min-h-[78px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        !cell.isCurrentMonth
                          ? 'bg-slate-50/50 border-slate-100 opacity-40 hover:opacity-80'
                          : isSelected
                          ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : cell.isToday
                          ? 'bg-amber-50/30 border-amber-300 hover:border-indigo-300 hover:bg-slate-50'
                          : isHoliday
                          ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300 hover:bg-rose-50/60'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Top Day Header */}
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            cell.isToday
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : isSelected
                              ? 'bg-indigo-100 text-indigo-900'
                              : cell.isCurrentMonth
                              ? isHoliday || isSunday
                                ? 'text-rose-600 font-bold'
                                : 'text-slate-805'
                              : 'text-slate-400'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {hasEvents && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1 rounded-md">
                            {cell.events.length}
                          </span>
                        )}
                      </div>

                      {/* Event category pills per day */}
                      <div className="space-y-1 my-1">
                        {cell.incomeTotal > 0 && (
                          <div
                            className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-1 py-0.5 rounded flex items-center justify-between leading-none truncate font-mono"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mr-1"></span>
                            <span className="truncate">+{formatCompactCurrency(cell.incomeTotal, currencySymbol)}</span>
                          </div>
                        )}

                        {cell.expenseTotal > 0 && (
                          <div
                            className="text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80 px-1 py-0.5 rounded flex items-center justify-between leading-none truncate font-mono"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mr-1"></span>
                            <span className="truncate">-{formatCompactCurrency(cell.expenseTotal, currencySymbol)}</span>
                          </div>
                        )}

                        {cell.pendingTotal > 0 && (
                          <div
                            className="text-[10px] font-extrabold bg-amber-50 text-amber-850 border border-amber-300 px-1 py-0.5 rounded flex items-center justify-between leading-none truncate font-mono"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mr-1"></span>
                            <span className="truncate">⏳{formatCompactCurrency(cell.pendingTotal, currencySymbol)}</span>
                          </div>
                        )}

                        {cell.familyTotal > 0 && (
                          <div
                            className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80 px-1 py-0.5 rounded flex items-center justify-between leading-none truncate font-mono"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mr-1"></span>
                            <span className="truncate">👥{formatCompactCurrency(cell.familyTotal, currencySymbol)}</span>
                          </div>
                        )}
                      </div>

                      {!hasEvents && cell.isCurrentMonth && (
                        <div className="text-[10px] text-slate-300 text-center font-bold">
                          —
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'year' ? (
            <div className="p-4 sm:p-5 flex-1 flex flex-col space-y-4">
              {/* Year Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-center shadow-3xs">
                  <span className="text-slate-500 font-semibold block">Ingresos del Año</span>
                  <span className="text-base font-extrabold text-emerald-700">
                    +{formatCurrency(yearlyMetrics.yearlyIncome, currencyCode, currencySymbol)}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-center shadow-3xs">
                  <span className="text-slate-500 font-semibold block">Gastos del Año</span>
                  <span className="text-base font-extrabold text-rose-700 font-mono">
                    -{formatCurrency(yearlyMetrics.yearlyExpense, currencyCode, currencySymbol)}
                  </span>
                </div>
                <div className={`p-3 border rounded-xl text-center shadow-3xs ${
                  yearlyMetrics.yearlyNet >= 0
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800 font-semibold'
                    : 'bg-rose-50/50 border-rose-200 text-rose-800 font-semibold'
                }`}>
                  <span className="text-slate-600 block">Balance Neto Anual</span>
                  <span className="text-lg font-black font-mono">
                    {yearlyMetrics.yearlyNet >= 0 ? '+' : ''}
                    {formatCurrency(yearlyMetrics.yearlyNet, currencyCode, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* 3x4 Months Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
                {yearlyMetrics.months.map((m) => {
                  const isCurrentRealMonth = new Date().getFullYear() === selectedYear && new Date().getMonth() === m.monthIndex;

                  const firstDay = new Date(selectedYear, m.monthIndex, 1);
                  let startDay = firstDay.getDay() - 1;
                  if (startDay === -1) startDay = 6;
                  const totalDays = getDaysInMonth(selectedYear, m.monthIndex);

                  const dayCells: (number | null)[] = [
                    ...Array(startDay).fill(null),
                    ...Array.from({ length: totalDays }, (_, i) => i + 1)
                  ];

                  return (
                    <div
                      key={m.monthIndex}
                      onClick={() => {
                        onPeriodChange({ year: selectedYear, month: m.monthIndex, periodType: 'mes', quincena: 1 });
                        setViewMode('grid');
                      }}
                      className={`bg-white border rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:border-indigo-400 cursor-pointer relative group flex flex-col justify-between ${
                        isCurrentRealMonth
                          ? 'border-indigo-500 ring-2 ring-indigo-500/10'
                          : 'border-slate-200 hover:scale-[1.01]'
                      }`}
                    >
                      {/* Month Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors capitalize font-sans leading-none">
                            {MONTH_NAMES_ES[m.monthIndex]}
                          </span>
                          {isCurrentRealMonth && (
                            <span className="bg-indigo-100 text-indigo-700 font-bold text-[9px] px-1.5 py-0.2 rounded-full border border-indigo-200">
                              Este Mes
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          m.netBalance >= 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                            : 'bg-rose-50 text-rose-805 border-rose-100'
                        }`}>
                          {m.netBalance >= 0 ? '+' : ''}
                          {formatCompactCurrency(m.netBalance, currencySymbol)}
                        </span>
                      </div>

                      {/* Mini Grid Header */}
                      <div className="grid grid-cols-7 gap-0.5 text-[8px] font-bold text-slate-400 text-center uppercase tracking-wider mb-1">
                        <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span className="text-rose-550">D</span>
                      </div>

                      {/* Mini Grid Days */}
                      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-[9px] text-center font-medium">
                        {dayCells.map((dayNum, cellIdx) => {
                          if (dayNum === null) {
                            return <div key={`empty-${cellIdx}`} className="h-4" />;
                          }

                          const dateStr = `${selectedYear}-${String(m.monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                          const isHoliday = holidays.has(dateStr);
                          const isSunday = cellIdx % 7 === 6;
                          const isRealToday = new Date().getFullYear() === selectedYear &&
                                              new Date().getMonth() === m.monthIndex &&
                                              new Date().getDate() === dayNum;

                          let cellClass = "text-slate-600 hover:bg-slate-100 rounded-md py-0.5 transition-colors";

                          if (isRealToday) {
                            cellClass = "bg-indigo-600 text-white font-black rounded-md py-0.5 shadow-2xs";
                          } else if (isHoliday) {
                            cellClass = "bg-rose-50 text-rose-600 font-black rounded-md py-0.5 border border-rose-200/50";
                          } else if (isSunday) {
                            cellClass = "text-rose-500 font-bold py-0.5";
                          }

                          return (
                            <div
                              key={dateStr}
                              className={cellClass}
                              title={isHoliday ? "Día Festivo en Colombia" : undefined}
                            >
                              {dayNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda / List View */
            <div className="p-4 sm:p-5 space-y-4 max-h-[600px] overflow-y-auto">
              {Object.keys(eventsByDate).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-655">No hay movimientos registrados para este mes.</p>
                  <p className="text-xs text-slate-400 mt-1">Usa los botones de acción rápida para agregar transacciones.</p>
                </div>
              ) : (
                Object.keys(eventsByDate)
                  .sort()
                  .map((dateStr) => {
                    const dayEvents = eventsByDate[dateStr];
                    const isSelected = dateStr === selectedDayStr;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleSelectDay(dateStr)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-indigo-650" />
                            <span className="font-bold text-slate-900">
                              {dateStr}
                            </span>
                            {dateStr === todayStr && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                                Hoy
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-505">
                            {dayEvents.length} items
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {dayEvents.map((ev) => (
                            <div
                              key={ev.id}
                              className={`p-2 rounded-xl flex items-center justify-between text-xs border ${
                                ev.category === 'income'
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                                  : ev.category === 'expense'
                                  ? 'bg-rose-50/80 border-rose-200 text-rose-900 font-semibold'
                                  : ev.category === 'pending_shared'
                                  ? 'bg-amber-50/90 border-amber-300 text-amber-900 font-semibold'
                                  : 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    ev.category === 'income'
                                      ? 'bg-emerald-500'
                                      : ev.category === 'expense'
                                      ? 'bg-rose-500'
                                      : ev.category === 'pending_shared'
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500'
                                  }`}
                                ></span>
                                <div className="truncate">
                                  <div className="font-bold truncate">{ev.title}</div>
                                  <div className="text-[10px] text-slate-505 truncate font-medium">{ev.subtitle || ev.tag}</div>
                                </div>
                              </div>
                              <span className="font-black shrink-0 ml-2 font-mono">
                                {ev.category === 'income' ? '+' : ev.category === 'expense' ? '-' : ''}
                                {formatCurrency(ev.amount, currencyCode, currencySymbol)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* Bottom quick color guide */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-500 text-[10px]">Colores:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-emerald-800">Verde: Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="font-medium text-rose-800">Rojo: Gastos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="font-medium text-amber-800">Amarillo: Por Clasificar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="font-medium text-blue-800">Azul: Familia</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isDetailExpanded && (
                <button
                  type="button"
                  onClick={() => setIsDetailExpanded(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs animate-in"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-650" />
                  <span>Ver Detalle ({selectedDayStr})</span>
                </button>
              )}

              <div className="text-[11px] font-bold text-slate-500">
                Neto Mes:{' '}
                <strong className={monthlyMetrics.netBalance >= 0 ? 'text-emerald-700 font-mono' : 'text-rose-705 font-mono'}>
                  {formatCurrency(monthlyMetrics.netBalance, currencyCode, currencySymbol)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Day Details Panel */}
        {isDetailExpanded && (
          <div className="lg:col-span-4 space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Day Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Detalle del Día
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 capitalize">
                    {formattedSelectedDay}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedDayStr === todayStr && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                      Hoy
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsDetailExpanded(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Financial Mini Summary */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-semibold">
                <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-805 uppercase block">🟢 Ingresos</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-900 font-mono">
                    {formatCurrency(selectedDayMetrics.income, currencyCode, currencySymbol)}
                  </span>
                </div>

                <div className="p-2.5 bg-rose-50/70 border border-rose-100 rounded-xl">
                  <span className="text-[10px] font-bold text-rose-805 uppercase block">🔴 Gastos</span>
                  <span className="text-xs sm:text-sm font-extrabold text-rose-900 font-mono">
                    {formatCurrency(selectedDayMetrics.expense, currencyCode, currencySymbol)}
                  </span>
                </div>

                <div className="p-2.5 bg-amber-50/70 border border-amber-100 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-805 uppercase block">🟡 Por Clasificar</span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-900 font-mono">
                    {formatCurrency(selectedDayMetrics.pending, currencyCode, currencySymbol)}
                  </span>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-900">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">🔵 Familia</span>
                  <span className="text-xs sm:text-sm font-extrabold font-mono">
                    {formatCurrency(selectedDayMetrics.family, currencyCode, currencySymbol)}
                  </span>
                </div>
              </div>

              {/* List of items in selected day */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 text-xs">
                {selectedDayEvents.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-500">No hay movimientos en este día.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Puedes registrar un ingreso, gasto o gasto por clasificar.</p>
                  </div>
                ) : (
                  selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className={`p-3 rounded-xl border text-xs transition relative group ${
                        ev.category === 'income'
                          ? 'bg-emerald-50/50 border-emerald-200/90 text-emerald-950 font-semibold'
                          : ev.category === 'expense'
                          ? 'bg-rose-50/50 border-rose-200/90 text-rose-955 font-semibold'
                          : ev.category === 'pending_shared'
                          ? 'bg-amber-50/60 border-amber-300 text-amber-955'
                          : 'bg-blue-50/50 border-blue-200/90 text-blue-955'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              ev.category === 'income'
                                ? 'bg-emerald-100 text-emerald-700'
                                : ev.category === 'expense'
                                ? 'bg-rose-100 text-rose-700'
                                : ev.category === 'pending_shared'
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {ev.category === 'income' && <ArrowUpRight className="w-3.5 h-3.5" />}
                            {ev.category === 'expense' && <ArrowDownRight className="w-3.5 h-3.5" />}
                            {ev.category === 'pending_shared' && <Tag className="w-3.5 h-3.5" />}
                            {ev.category === 'family' && <Users className="w-3.5 h-3.5" />}
                          </div>

                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {ev.title}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                              {ev.tag && (
                                <span className="bg-white/80 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                                  {ev.tag}
                                </span>
                              )}
                              {ev.subtitle && <span className="font-normal">{ev.subtitle}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-black text-xs sm:text-sm font-mono ${
                              ev.category === 'income'
                                ? 'text-emerald-700'
                                : ev.category === 'expense'
                                ? 'text-rose-700'
                                : ev.category === 'pending_shared'
                                ? 'text-amber-800'
                                : 'text-blue-700'
                            }`}
                          >
                            {ev.category === 'income' ? '+' : ev.category === 'expense' ? '-' : ''}
                            {formatCurrency(ev.amount, currencyCode, currencySymbol)}
                          </div>

                          {/* Action buttons */}
                          {ev.category === 'pending_shared' && onOpenRegularizeExpense && ev.originalRef && (
                            <button
                              type="button"
                              onClick={() => onOpenRegularizeExpense(ev.originalRef as PendingExpense)}
                              className="mt-1 px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] transition cursor-pointer shadow-2xs"
                            >
                              Clasificar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Delete button if delete handler exists */}
                      {(ev.rawType === 'sporadic_expense' || ev.rawType === 'sporadic_income') && onDeleteTransaction && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setDeletingTx(ev)}
                            className="text-[10px] text-slate-400 hover:text-rose-650 flex items-center gap-1 transition cursor-pointer"
                            title="Eliminar este movimiento"
                          >
                            <Trash2 className="w-3 h-3 text-rose-500" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Quick Add Buttons on Selected Date */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => onOpenAddTransaction('expense', selectedDayStr)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Gasto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenAddTransaction('income', selectedDayStr)}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Ingreso</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenAddPendingExpense(selectedDayStr)}
                  className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs animate-in"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-700" />
                  <span>+ Registrar por Clasificar</span>
                </button>
              </div>
            </div>

            {/* Quick Module Jump Links */}
            {onNavigateToTab && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Accesos Directos
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('pending_expenses')}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-805 border border-slate-205 transition text-left flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer"
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-500" />
                    <span className="truncate">Por Clasificar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToTab('shared_finances')}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-805 border border-slate-205 transition text-left flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span className="truncate">Familiares</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToTab('debts')}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-805 border border-slate-205 transition text-left flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-rose-500" />
                    <span className="truncate">Mis Deudas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigateToTab('savings')}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-teal-50 hover:text-teal-805 border border-slate-205 transition text-left flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer"
                  >
                    <PiggyBank className="w-3.5 h-3.5 text-teal-500" />
                    <span className="truncate">Mi Ahorro</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONFIRM DELETE TRANSACTION MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deletingTx}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. El movimiento será eliminado permanentemente de tu registro y calendario."
        itemName={deletingTx ? `${deletingTx.title} (${formatCurrency(deletingTx.amount, currencyCode, currencySymbol)})` : undefined}
        onClose={() => setDeletingTx(null)}
        onConfirm={() => {
          if (deletingTx && onDeleteTransaction && deletingTx.originalRef) {
            onDeleteTransaction(deletingTx.originalRef.id);
            setDeletingTx(null);
          }
        }}
      />
    </div>
  );
};
