import React, { useState } from 'react';
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Receipt,
  CalendarDays,
  Calendar,
  Settings,
  LayoutDashboard,
  Tag,
  User,
  Users,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { AppData, FamilyGroup, PeriodSelection, UserAccount } from '../types';
import { PeriodFinancialSummary, calculateGlobalMetrics } from '../utils/calculator';
import { formatCurrency, getPeriodLabel } from '../utils/formatters';

interface SidebarProps {
  activeTab: 'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled' | 'calendar' | 'config' | 'support';
  onTabChange: (tab: 'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled' | 'calendar' | 'config' | 'support') => void;
  onOpenConfig?: () => void;
  data: AppData;
  period: PeriodSelection;
  summary: PeriodFinancialSummary;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  currentUser?: UserAccount | null;
  familyGroup?: FamilyGroup | null;
  sharedDebtsCount?: number;
  sharedSavingsCount?: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenConfig,
  data,
  period,
  summary,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  currentUser,
  familyGroup,
  sharedDebtsCount = 0,
  sharedSavingsCount = 0,
  theme,
  onToggleTheme,
  onLogout,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const globalMetrics = calculateGlobalMetrics(data);
  const currencyCode = data?.config?.currencyCode || 'COP';
  const currencySymbol = data?.config?.currencySymbol || '$';

  const sporadicCount =
    summary.sporadicIncomes.length + summary.sporadicExpenses.length;
  const scheduledCount = (data.sporadicTransactions || []).filter(
    (t) => t.isScheduled && !t.isCompleted
  ).length;
  const totalSharedItems = sharedDebtsCount + sharedSavingsCount;
  const navItems = currentUser?.role === 'admin' ? [
    {
      id: 'support' as const,
      label: 'Módulo de Soporte',
      shortLabel: 'Soporte',
      icon: Users,
      badge: 'Admin',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    }
  ] : [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'balance' as const,
      label: 'Saldo y Presupuesto',
      shortLabel: 'Saldo',
      icon: Wallet,
      badge: summary.freeBalance >= 0 ? 'OK' : '!',
      badgeColor: summary.freeBalance >= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'savings' as const,
      label: 'Ahorro Programado',
      shortLabel: 'Ahorro',
      icon: PiggyBank,
      badge: globalMetrics.activeSavingsCount > 0 ? `${globalMetrics.activeSavingsCount}` : null,
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    },
    {
      id: 'debts' as const,
      label: 'Deudas Personales',
      shortLabel: 'Deudas',
      icon: CreditCard,
      badge: globalMetrics.activeDebtsCount > 0 ? `${globalMetrics.activeDebtsCount}` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'transactions' as const,
      label: 'Gastos Esporádicos',
      shortLabel: 'Esporádicos',
      icon: Receipt,
      badge: sporadicCount > 0 ? `${sporadicCount}` : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'pending_expenses' as const,
      label: 'Gastos por Clasificar',
      shortLabel: 'Por Clasificar',
      icon: Tag,
      badge: globalMetrics.pendingExpensesCount > 0 ? `${globalMetrics.pendingExpensesCount}` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'scheduled' as const,
      label: 'Plan Futuro',
      shortLabel: 'Plan Futuro',
      icon: CalendarDays,
      badge: scheduledCount > 0 ? `${scheduledCount}` : null,
      badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
    },
    {
      id: 'shared_finances' as const,
      label: 'Finanzas Compartidas',
      shortLabel: 'Compartidas',
      icon: Users,
      badge: familyGroup ? (totalSharedItems > 0 ? `${totalSharedItems}` : 'Familiar') : 'Grupo',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'calendar' as const,
      label: 'Calendario',
      shortLabel: 'Calendario',
      icon: Calendar,
      badge: 'Mes',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
  ];

  return (
    <aside
      id="app-sidebar"
      className={`fixed inset-y-0 left-0 z-40 bg-slate-900 text-slate-200 border-r border-slate-800/90 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden md:translate-x-0 ${
        isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      } ${isCollapsed ? 'md:w-20' : 'md:w-64 w-64'}`}
    >
      {/* Brand Header & Toggle (Click entire brand header to expand/collapse) */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between overflow-hidden">
        <button
          type="button"
          id="btn-sidebar-brand-toggle"
          onClick={onToggleCollapse}
          className="flex items-center gap-3 overflow-hidden text-left cursor-pointer group bg-transparent border-0 p-0 focus:outline-none w-full"
          title={isCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
        >
          <div
            className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-center font-bold shadow-xs shrink-0 group-hover:bg-slate-800 transition-colors"
          >
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          {!isCollapsed && (
            <div className="truncate flex-1">
              <div className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-emerald-400 transition-colors">
                Finanzas & Ahorro
              </div>
              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{period.periodType === 'mes' ? 'Vista Mensual' : `Q${period.quincena} Quincenal`}</span>
              </div>
            </div>
          )}
        </button>

        {/* Mobile close button only */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg shrink-0 ml-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-2.5 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden flex flex-col">
        {!isCollapsed && (
          <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Módulos Principales
          </div>
        )}

        <div className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  onTabChange(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={isCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs font-semibold transition-all cursor-pointer group relative ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-2xs'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                      item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Floating tooltip on hover when collapsed */}
                {isCollapsed && (
                  <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-950 text-slate-100 text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day/Night Theme Toggle */}
        <div className="px-0.5 my-3 shrink-0">
          {isCollapsed ? (
            <div
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              className="w-12 h-6 bg-slate-950/60 border border-slate-800/80 rounded-full p-0.5 cursor-pointer relative transition group flex items-center"
            >
              <div
                className={`w-5 h-5 rounded-full bg-emerald-500 shadow-xs flex items-center justify-center transition-all duration-300 ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              >
                {theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                )}
              </div>
              <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-950 text-slate-100 text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              </span>
            </div>
          ) : (
            <div
              onClick={onToggleTheme}
              className="bg-slate-950/45 p-1 rounded-xl flex items-center relative border border-slate-850 w-full select-none cursor-pointer h-9 shrink-0"
            >
              <div
                className="absolute top-1 bottom-1 bg-emerald-500 shadow-xs rounded-lg transition-all duration-300"
                style={{
                  left: theme === 'dark' ? 'calc(50% - 2px)' : '4px',
                  width: 'calc(50% - 2px)',
                }}
              />
              
              <div
                className={`flex-1 py-1 z-10 flex items-center justify-center gap-1.5 text-[9px] font-extrabold tracking-wider uppercase transition-colors duration-300 ${
                  theme === 'light' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Claro</span>
              </div>

              <div
                className={`flex-1 py-1 z-10 flex items-center justify-center gap-1.5 text-[9px] font-extrabold tracking-wider uppercase transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Oscuro</span>
              </div>
            </div>
          )}
        </div>

        {/* Period Mini Summary Card (positioned at the bottom, directly above the user footer) */}
        {!isCollapsed && currentUser?.role !== 'admin' && (
          <div className="mt-auto pt-6 px-0.5 pb-1">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300 border-b border-slate-700/50 pb-1.5">
                <span className="truncate">{getPeriodLabel(period)}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/50">
                  {period.periodType === 'mes' ? 'Mes' : 'Q' + period.quincena}
                </span>
              </div>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Ingresos:</span>
                  <span className="font-semibold text-emerald-400 font-mono">
                    {formatCurrency(summary.totalIncome, currencyCode, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Gastos:</span>
                  <span className="font-semibold text-rose-400 font-mono">
                    {formatCurrency(summary.totalExpenses, currencyCode, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-700/50">
                  <span className="text-slate-200 font-medium">Saldo Libre:</span>
                  <span
                    className={`font-bold font-mono ${
                      summary.freeBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(summary.freeBalance, currencyCode, currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / User Profile & Settings */}
      <div className="p-2.5 border-t border-slate-800/90 bg-slate-950/40 space-y-1.5 relative">
        {/* Backdrop for closing dropdown */}
        {showProfileMenu && (
          <div
            onClick={() => setShowProfileMenu(false)}
            className="fixed inset-0 z-40 bg-transparent cursor-default"
          />
        )}

        {/* Profile Dropdown Menu */}
        {showProfileMenu && currentUser && (
          <div
            className="absolute bottom-16 left-2.5 right-2.5 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 space-y-2 text-xs font-semibold text-slate-300"
            id="profile-dropdown-menu"
          >
            <div className="pb-2 border-b border-slate-800/60 overflow-hidden text-left">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Usuario</span>
              <div className="text-sm font-bold text-white truncate mt-0.5">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{currentUser.email}</div>
            </div>
            
            {currentUser.role !== 'admin' && (
              <button
                onClick={() => {
                  onTabChange('config');
                  setShowProfileMenu(false);
                  if (onCloseMobile) onCloseMobile();
                }}
                className="w-full text-left py-2 px-2.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer border-0 bg-transparent outline-none"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Configuración y Perfil</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowProfileMenu(false);
                onLogout();
              }}
              className="w-full text-left py-2 px-2.5 hover:bg-rose-950/50 hover:text-rose-400 rounded-lg text-rose-500 transition border border-transparent hover:border-rose-900/30 flex items-center gap-2 cursor-pointer bg-transparent outline-none"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}

        {currentUser && !isCollapsed && (
          <div
            onClick={() => setShowProfileMenu(prev => !prev)}
            className="p-2 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer transition select-none"
            title="Opciones de Usuario"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 truncate">
                  {familyGroup ? familyGroup.name : 'Personal'}
                </div>
              </div>
            </div>
            {familyGroup && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 ring-2 ring-indigo-400/20 shrink-0" title="En Grupo Familiar" />
            )}
          </div>
        )}

        {currentUser?.role !== 'admin' && (
          <button
            id="btn-sidebar-settings"
            onClick={() => {
              onTabChange('config');
              if (onOpenConfig) onOpenConfig();
              if (onCloseMobile) onCloseMobile();
            }}
            title={isCollapsed ? 'Módulo de Configuración' : undefined}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            } text-xs font-semibold rounded-xl border transition-colors cursor-pointer group relative ${
              activeTab === 'config'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings
                className={`w-4 h-4 transition-transform ${
                  activeTab === 'config'
                    ? 'text-emerald-400 rotate-45'
                    : 'text-slate-400 group-hover:text-white group-hover:rotate-45'
                }`}
              />
              {!isCollapsed && <span>Módulo de Configuración</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
                  activeTab === 'config'
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : 'text-slate-400 bg-slate-800'
                }`}
              >
                {currencyCode}
              </span>
            )}

            {isCollapsed && (
              <span className="absolute left-full ml-2.5 px-2 py-1 bg-slate-950 text-slate-100 text-xs font-medium rounded-lg shadow-xl border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                Módulo de Configuración ({currencyCode})
              </span>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};
