import React, { useState } from 'react';
import {
  Settings,
  DollarSign,
  Bus,
  Coins,
  Plus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  Split,
  Layers,
  Tag as TagIcon,
  Edit2,
  Edit,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Receipt,
  HelpCircle,
  User,
  Users,
} from 'lucide-react';
import { AdditionalFixedExpense, AppConfig, FamilyGroup, MonthlyDistribution, UserAccount } from '../../types';
import { formatCurrency, getSplitAmounts } from '../../utils/formatters';
import { DEFAULT_CONFIG, DEFAULT_SUGGESTED_TAGS } from '../../utils/storage';
import { UserConfigSection } from './UserConfigSection';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';

interface ConfigManagerProps {
  config: AppConfig;
  currentUser: UserAccount;
  familyGroup: FamilyGroup | null;
  userFamilyGroups: FamilyGroup[];
  onSelectActiveGroup: (groupId: string) => void;
  onUpdateUser: (updates: { name?: string; pin?: string }) => {
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
  onSaveConfig: (config: AppConfig) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetData: () => void;
}

const CURRENCIES = [
  { code: 'COP', symbol: '$', name: 'Peso Colombiano (COP $)' },
  { code: 'USD', symbol: '$', name: 'Dólar Estadounidense (USD $)' },
  { code: 'MXN', symbol: '$', name: 'Peso Mexicano (MXN $)' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR €)' },
  { code: 'CLP', symbol: '$', name: 'Peso Chileno (CLP $)' },
  { code: 'ARS', symbol: '$', name: 'Peso Argentino (ARS $)' },
  { code: 'PEN', symbol: 'S/', name: 'Sol Peruano (PEN S/)' },
];

export const ConfigManager: React.FC<ConfigManagerProps> = ({
  config,
  currentUser,
  familyGroup,
  userFamilyGroups,
  onSelectActiveGroup,
  onUpdateUser,
  onLogout,
  onCreateFamilyGroup,
  onJoinFamilyGroup,
  onLeaveFamilyGroup,
  onGoToSharedDebts,
  onSaveConfig,
  onExportData,
  onImportData,
  onResetData,
}) => {
  const safeConfig = config || DEFAULT_CONFIG;

  // Config Subtab switcher
  const [configSubTab, setConfigSubTab] = useState<'system' | 'user'>('system');

  // Income state
  const [monthlyFixedIncome, setMonthlyFixedIncome] = useState<number>(safeConfig.monthlyFixedIncome);
  const [incomeDistribution, setIncomeDistribution] = useState<MonthlyDistribution>(
    safeConfig.incomeDistribution || 'both_equal'
  );
  const [customIncomeQ1, setCustomIncomeQ1] = useState<number>(
    safeConfig.customIncomeQ1 ?? Math.round(safeConfig.monthlyFixedIncome / 2)
  );
  const [customIncomeQ2, setCustomIncomeQ2] = useState<number>(
    safeConfig.customIncomeQ2 ?? Math.round(safeConfig.monthlyFixedIncome / 2)
  );
  const [incomeQ1Day, setIncomeQ1Day] = useState<number>(safeConfig.incomeQ1Day ?? 15);
  const [incomeQ2Day, setIncomeQ2Day] = useState<number>(safeConfig.incomeQ2Day ?? 30);

  // Additional Fixed Expenses
  const [additionalFixedExpenses, setAdditionalFixedExpenses] = useState<AdditionalFixedExpense[]>(
    safeConfig.additionalFixedExpenses || []
  );

  // Fixed Expense Modal States
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AdditionalFixedExpense | null>(null);
  const [modalExpName, setModalExpName] = useState('');
  const [modalExpAmount, setModalExpAmount] = useState<number | ''>('');
  const [modalExpTag, setModalExpTag] = useState('Hogar');
  const [modalExpDistribution, setModalExpDistribution] = useState<MonthlyDistribution>('both_equal');
  const [modalCustomQ1Amount, setModalCustomQ1Amount] = useState<number>(0);
  const [modalCustomQ2Amount, setModalCustomQ2Amount] = useState<number>(0);
  const [modalQ1Day, setModalQ1Day] = useState<number>(15);
  const [modalQ2Day, setModalQ2Day] = useState<number>(30);

  // Suggested Tags for Fast Expenses and Debts
  const [suggestedTags, setSuggestedTags] = useState<string[]>(() => {
    if (safeConfig.suggestedExpenseTags && safeConfig.suggestedExpenseTags.length > 0) {
      return safeConfig.suggestedExpenseTags;
    }
    return DEFAULT_SUGGESTED_TAGS;
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  // Currency
  const [currencyCode, setCurrencyCode] = useState(safeConfig.currencyCode || 'COP');
  const [currencySymbol, setCurrencySymbol] = useState(safeConfig.currencySymbol || '$');

  // Colchón de Seguridad inicializable
  const [initialCushionBalance, setInitialCushionBalance] = useState<number>(safeConfig.initialCushionBalance ?? 0);
  const [cushionStartYear, setCushionStartYear] = useState<number>(safeConfig.cushionStartYear ?? 2026);
  const [cushionStartMonth, setCushionStartMonth] = useState<number>(safeConfig.cushionStartMonth ?? 0);
  const [cushionStartQuincena, setCushionStartQuincena] = useState<1 | 2>((safeConfig.cushionStartQuincena as 1 | 2) ?? 1);

  // Feedback states
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deletingTag, setDeletingTag] = useState<{ index: number; name: string } | null>(null);
  const [deletingFixedExpense, setDeletingFixedExpense] = useState<AdditionalFixedExpense | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code);
    const found = CURRENCIES.find((c) => c.code === code);
    if (found) {
      setCurrencySymbol(found.symbol);
    }
  };

  // Fixed expense handlers
  const handleOpenAddFixedExpense = () => {
    setEditingExpense(null);
    setModalExpName('');
    setModalExpAmount('');
    setModalExpTag('Hogar');
    setModalExpDistribution('both_equal');
    setModalCustomQ1Amount(0);
    setModalCustomQ2Amount(0);
    setModalQ1Day(15);
    setModalQ2Day(30);
    setIsExpModalOpen(true);
  };

  const handleOpenEditFixedExpense = (exp: AdditionalFixedExpense) => {
    setEditingExpense(exp);
    setModalExpName(exp.name);
    setModalExpAmount(exp.monthlyAmount);
    setModalExpTag(exp.tag);
    setModalExpDistribution(exp.distribution);
    setModalCustomQ1Amount(exp.customQ1Amount ?? 0);
    setModalCustomQ2Amount(exp.customQ2Amount ?? 0);
    setModalQ1Day(exp.q1Day ?? 15);
    setModalQ2Day(exp.q2Day ?? 30);
    setIsExpModalOpen(true);
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalExpName.trim() || !modalExpAmount || Number(modalExpAmount) <= 0) return;

    const amountNum = Number(modalExpAmount);
    const q1Amt = modalExpDistribution === 'both_custom'
      ? modalCustomQ1Amount
      : (modalExpDistribution === 'both_equal' ? Math.round(amountNum / 2) : (modalExpDistribution === 'only_q1' ? amountNum : 0));
    const q2Amt = modalExpDistribution === 'both_custom'
      ? modalCustomQ2Amount
      : (modalExpDistribution === 'both_equal' ? amountNum - Math.round(amountNum / 2) : (modalExpDistribution === 'only_q2' ? amountNum : 0));

    if (editingExpense) {
      const updated = additionalFixedExpenses.map((exp) =>
        exp.id === editingExpense.id
          ? {
              ...exp,
              name: modalExpName.trim(),
              monthlyAmount: amountNum,
              tag: modalExpTag,
              distribution: modalExpDistribution,
              customQ1Amount: q1Amt,
              customQ2Amount: q2Amt,
              q1Day: modalQ1Day,
              q2Day: modalQ2Day,
            }
          : exp
      );
      setAdditionalFixedExpenses(updated);
    } else {
      const newExp: AdditionalFixedExpense = {
        id: `fix-${Date.now()}`,
        name: modalExpName.trim(),
        monthlyAmount: amountNum,
        tag: modalExpTag,
        distribution: modalExpDistribution,
        customQ1Amount: q1Amt,
        customQ2Amount: q2Amt,
        q1Day: modalQ1Day,
        q2Day: modalQ2Day,
      };
      setAdditionalFixedExpenses([...additionalFixedExpenses, newExp]);
    }

    setIsExpModalOpen(false);
  };

  const handleRemoveFixedExpense = (id: string) => {
    setAdditionalFixedExpenses(additionalFixedExpenses.filter((e) => e.id !== id));
  };

  // Suggested Tags Handlers (Add, Edit, Delete, Reset)
  const handleAddSuggestedTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newTagInput.trim();
    if (!clean) return;
    if (suggestedTags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setNewTagInput('');
      return;
    }
    setSuggestedTags([...suggestedTags, clean]);
    setNewTagInput('');
  };

  const handleStartEditTag = (index: number) => {
    setEditingTagIndex(index);
    setEditingTagValue(suggestedTags[index]);
  };

  const handleSaveEditTag = (index: number) => {
    const clean = editingTagValue.trim();
    if (!clean) {
      setEditingTagIndex(null);
      return;
    }
    const updated = [...suggestedTags];
    updated[index] = clean;
    setSuggestedTags(updated);
    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  const handleCancelEditTag = () => {
    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  const handleDeleteTag = (index: number) => {
    const updated = suggestedTags.filter((_, i) => i !== index);
    setSuggestedTags(updated);
  };

  const handleResetDefaultTags = () => {
    setSuggestedTags(DEFAULT_SUGGESTED_TAGS);
  };

  // Main Save
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const finalTags = suggestedTags.length > 0 ? suggestedTags : DEFAULT_SUGGESTED_TAGS;

    onSaveConfig({
      monthlyFixedIncome,
      incomeDistribution,
      customIncomeQ1:
        incomeDistribution === 'both_custom'
          ? customIncomeQ1
          : Math.round(monthlyFixedIncome / 2),
      customIncomeQ2:
        incomeDistribution === 'both_custom'
          ? customIncomeQ2
          : monthlyFixedIncome - Math.round(monthlyFixedIncome / 2),
      incomeQ1Day,
      incomeQ2Day,
      monthlyTransportExpense: 0,
      transportDistribution: 'both_equal',
      customTransportQ1: 0,
      customTransportQ2: 0,
      additionalFixedExpenses,
      suggestedExpenseTags: finalTags,
      currencyCode,
      currencySymbol,
      initialCushionBalance,
      cushionStartYear,
      cushionStartMonth,
      cushionStartQuincena,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Subtab Navigation Buttons */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/80 w-fit">
        <button
          type="button"
          id="btn-subtab-system-config"
          onClick={() => setConfigSubTab('system')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            configSubTab === 'system'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4 text-emerald-600" />
          <span>Configuración del Sistema</span>
        </button>

        <button
          type="button"
          id="btn-subtab-user-config"
          onClick={() => setConfigSubTab('user')}
          className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            configSubTab === 'user'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-4 h-4 text-indigo-600" />
          <span>Configuración del Usuario</span>
          {familyGroup && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              Grupo Familiar
            </span>
          )}
        </button>
      </div>

      {/* RENDER USER CONFIGURATION */}
      {configSubTab === 'user' && (
        <UserConfigSection
          currentUser={currentUser}
          familyGroup={familyGroup}
          userFamilyGroups={userFamilyGroups}
          onSelectActiveGroup={onSelectActiveGroup}
          onUpdateProfile={onUpdateUser}
          onLogout={onLogout}
          onCreateFamilyGroup={onCreateFamilyGroup}
          onJoinFamilyGroup={onJoinFamilyGroup}
          onLeaveFamilyGroup={onLeaveFamilyGroup}
          onGoToSharedDebts={onGoToSharedDebts}
        />
      )}

      {/* RENDER SYSTEM CONFIGURATION */}
      {configSubTab === 'system' && (
        <>
          {/* Top Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs shrink-0">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Configuración del Sistema
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Ajustes Globales
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Personaliza tus ingresos, gastos fijos, etiquetas sugeridas para gastos rápidos y deudas, y respaldos
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-save-system-config"
                onClick={() => handleSave()}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 hover:shadow-lg'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>¡Configuración Guardada!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Financial Bases, Suggested Tags & Fixed Expenses */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION: GESTIÓN DE ETIQUETAS SUGERIDAS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                  <TagIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Etiquetas Sugeridas (Gastos Rápidos y Deudas)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Aparecen como accesos rápidos en el modal de nuevo gasto rápido y en deudas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDefaultTags}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                title="Restablecer etiquetas por defecto"
              >
                Restablecer Predeterminadas
              </button>
            </div>

            {/* Add new tag form */}
            <form onSubmit={handleAddSuggestedTag} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <TagIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Escribe una nueva etiqueta (ej. Mascotas, Entretenimiento, Ropa)..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Etiqueta</span>
              </button>
            </form>

            {/* Active Suggested Tags List */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Etiquetas Activas ({suggestedTags.length})
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {suggestedTags.map((tagItem, idx) => {
                  const isEditing = editingTagIndex === idx;

                  if (isEditing) {
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-amber-50 border-2 border-amber-500 rounded-xl p-1 shadow-xs"
                      >
                        <input
                          type="text"
                          value={editingTagValue}
                          onChange={(e) => setEditingTagValue(e.target.value)}
                          className="px-2 py-0.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg outline-none w-28 focus:ring-1 focus:ring-amber-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditTag(idx);
                            if (e.key === 'Escape') handleCancelEditTag();
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditTag(idx)}
                          className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-md transition cursor-pointer"
                          title="Guardar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditTag}
                          className="p-1 text-slate-500 hover:bg-slate-200 rounded-md transition cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      className="group flex items-center gap-2 bg-slate-100 hover:bg-slate-200/90 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs"
                    >
                      <TagIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>{tagItem}</span>

                      <div className="flex items-center gap-0.5 pl-1 border-l border-slate-300">
                        <button
                          type="button"
                          onClick={() => handleStartEditTag(idx)}
                          className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-100 rounded-md transition cursor-pointer"
                          title={`Editar "${tagItem}"`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingTag({ index: idx, name: tagItem })}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-md transition cursor-pointer"
                          title={`Eliminar "${tagItem}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Estas etiquetas se reflejan automáticamente en los selectores rápidos de{' '}
                <strong>Gastos Rápidos por Etiquetar</strong> y en el formulario de{' '}
                <strong>Deudas Diferidas</strong>.
              </div>
            </div>
          </div>

          {/* SECTION: INGRESOS FIJOS MENSUALES */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Ingresos Fijos Mensuales (Nómina / Salario)
                </h2>
                <p className="text-xs text-slate-500">
                  Base económica recurrente para la liquidación quincenal y mensual
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ingreso Total Mensual
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={monthlyFixedIncome}
                    onChange={(e) => {
                      const val = e.target.value ? parseFloat(e.target.value) : 0;
                      setMonthlyFixedIncome(val);
                      if (incomeDistribution === 'both_equal') {
                        setCustomIncomeQ1(Math.round(val / 2));
                        setCustomIncomeQ2(val - Math.round(val / 2));
                      }
                    }}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Income Distribution */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Distribución en las Quincenas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'both_equal' as const, label: '50% / 50% (Igual)' },
                    { id: 'both_custom' as const, label: 'Personalizado' },
                    { id: 'only_q1' as const, label: 'Solo Q1 (1-15)' },
                    { id: 'only_q2' as const, label: 'Solo Q2 (16-fin)' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setIncomeDistribution(mode.id);
                        if (mode.id === 'both_equal') {
                          setCustomIncomeQ1(Math.round(monthlyFixedIncome / 2));
                          setCustomIncomeQ2(monthlyFixedIncome - Math.round(monthlyFixedIncome / 2));
                        }
                      }}
                      className={`p-2 rounded-xl text-xs font-semibold border text-center transition cursor-pointer ${
                        incomeDistribution === mode.id
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {incomeDistribution === 'both_custom' && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Pago Quincena 1 (Q1)
                    </label>
                    <input
                      type="number"
                      value={customIncomeQ1}
                      onChange={(e) => setCustomIncomeQ1(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Pago Quincena 2 (Q2)
                    </label>
                    <input
                      type="number"
                      value={customIncomeQ2}
                      onChange={(e) => setCustomIncomeQ2(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Income Days Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200/60 mt-3.5">
                {(incomeDistribution === 'both_equal' || incomeDistribution === 'both_custom' || incomeDistribution === 'only_q1') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Día de Pago Quincena 1 (Q1)
                    </label>
                    <select
                      value={incomeQ1Day}
                      onChange={(e) => setIncomeQ1Day(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          Día {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(incomeDistribution === 'both_equal' || incomeDistribution === 'both_custom' || incomeDistribution === 'only_q2') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Día de Pago Quincena 2 (Q2)
                    </label>
                    <select
                      value={incomeQ2Day}
                      onChange={(e) => setIncomeQ2Day(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {Array.from({ length: 16 }, (_, i) => i + 16).map((day) => (
                        <option key={day} value={day}>
                          Día {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION: GASTOS FIJOS */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Gastos Fijos
                  </h2>
                  <p className="text-xs text-slate-500">
                    Deducciones fijas obligatorias cada mes o quincena
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenAddFixedExpense}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Gasto Fijo</span>
              </button>
            </div>

            {/* List of existing fixed expenses */}
            <div className="space-y-2">
              {additionalFixedExpenses.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  No tienes gastos fijos registrados.
                </p>
              ) : (
                additionalFixedExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex items-center justify-between gap-3 transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{exp.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatCurrency(exp.monthlyAmount, currencyCode, currencySymbol)} / mes •{' '}
                        {exp.distribution === 'both_equal'
                          ? `50/50 ambas quincenas (Día ${exp.q1Day || 15} y Día ${exp.q2Day || 30})`
                          : exp.distribution === 'only_q1'
                          ? `Solo Q1 (Día ${exp.q1Day || 15})`
                          : exp.distribution === 'only_q2'
                          ? `Solo Q2 (Día ${exp.q2Day || 30})`
                          : `Personalizado (Q1: Día ${exp.q1Day || 15}, Q2: Día ${exp.q2Day || 30})`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditFixedExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                        title="Editar gasto fijo"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingFixedExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Eliminar gasto fijo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Currency & Backups */}
        <div className="space-y-6">
          {/* Currency Config */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Moneda y Formato</h2>
                <p className="text-xs text-slate-500">Divisa y símbolos mostrados</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seleccionar Moneda
                </label>
                <select
                  value={currencyCode}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Símbolo de Moneda
                </label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Colchón de Seguridad Config */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Colchón de Seguridad</h2>
                <p className="text-xs text-slate-500">Saldo inicial y fecha de inicio</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Saldo Inicial del Fondo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={initialCushionBalance}
                    onChange={(e) => setInitialCushionBalance(e.target.value ? parseFloat(e.target.value) : 0)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Año</label>
                  <select
                    value={cushionStartYear}
                    onChange={(e) => setCushionStartYear(parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {[2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Mes</label>
                  <select
                    value={cushionStartMonth}
                    onChange={(e) => setCushionStartMonth(parseInt(e.target.value))}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'].map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Quincena</label>
                  <select
                    value={cushionStartQuincena}
                    onChange={(e) => setCushionStartQuincena(parseInt(e.target.value) as 1 | 2)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value={1}>Q1</option>
                    <option value={2}>Q2</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Backup & Data Management */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Copias de Seguridad</h2>
                <p className="text-xs text-slate-500">Exporta o importa tus datos locales</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onExportData}
                className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Copia de Seguridad JSON</span>
              </button>

              <label className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Importar Archivo JSON</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportData(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restablecer Datos de Ejemplo</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-slate-900 text-slate-200 rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Privacidad & Persistencia</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Toda la información se guarda de forma segura y privada en la base de datos PostgreSQL. Puedes exportar copias de respaldo en cualquier momento para restaurarlas en otros dispositivos.
            </p>
          </div>
        </div>
      </div>
      </>
      )}

      {/* CONFIRM DELETE TAG */}
      <ConfirmDeleteModal
        isOpen={!!deletingTag}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. La etiqueta dejará de sugerirse en los nuevos gastos o deudas."
        itemName={deletingTag ? `Etiqueta: "${deletingTag.name}"` : undefined}
        onClose={() => setDeletingTag(null)}
        onConfirm={() => {
          if (deletingTag) {
            handleDeleteTag(deletingTag.index);
            setDeletingTag(null);
          }
        }}
      />

      {/* CONFIRM DELETE FIXED EXPENSE */}
      <ConfirmDeleteModal
        isOpen={!!deletingFixedExpense}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. El gasto fijo adicional será removido de tu configuración mensual y quincenal."
        itemName={deletingFixedExpense ? `${deletingFixedExpense.name} (${formatCurrency(deletingFixedExpense.monthlyAmount, currencyCode, currencySymbol)}/mes)` : undefined}
        onClose={() => setDeletingFixedExpense(null)}
        onConfirm={() => {
          if (deletingFixedExpense) {
            handleRemoveFixedExpense(deletingFixedExpense.id);
            setDeletingFixedExpense(null);
          }
        }}
      />

      {/* CONFIRM RESET DATA */}
      <ConfirmDeleteModal
        isOpen={showResetConfirm}
        title="¿Seguro que desea realizar esta acción?"
        message="Esta acción no se puede revertir. Se sobreescribirán todos los datos actuales con la plantilla inicial de ejemplo."
        itemName="Restablecer toda la aplicación a datos de ejemplo"
        confirmText="Sí, restablecer datos"
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          setShowResetConfirm(false);
          onResetData();
        }}
      />

      {/* ADD/EDIT FIXED EXPENSE MODAL */}
      {isExpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingExpense ? 'Editar Gasto Fijo' : 'Agregar Gasto Fijo'}
              </h3>
              <button
                type="button"
                onClick={() => setIsExpModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block uppercase tracking-wider mb-1">Nombre del Gasto Fijo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Arriendo, Internet, Plan Celular"
                  value={modalExpName}
                  onChange={(e) => setModalExpName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block uppercase tracking-wider mb-1">Valor Mensual</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="Monto"
                      value={modalExpAmount}
                      onChange={(e) => setModalExpAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block uppercase tracking-wider mb-1">Categoría / Etiqueta</label>
                  <select
                    value={modalExpTag}
                    onChange={(e) => setModalExpTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {suggestedTags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block uppercase tracking-wider mb-1">Distribución Quincenal</label>
                <select
                  value={modalExpDistribution}
                  onChange={(e) => setModalExpDistribution(e.target.value as MonthlyDistribution)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="both_equal">50% / 50% (En ambas quincenas)</option>
                  <option value="both_custom">Personalizado por quincena</option>
                  <option value="only_q1">Solo Quincena 1 (Q1)</option>
                  <option value="only_q2">Solo Quincena 2 (Q2)</option>
                </select>
              </div>

              {modalExpDistribution === 'both_custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block mb-1 text-slate-600">Cuota Quincena 1 (Q1)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={modalCustomQ1Amount}
                      onChange={(e) => setModalCustomQ1Amount(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-slate-600">Cuota Quincena 2 (Q2)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={modalCustomQ2Amount}
                      onChange={(e) => setModalCustomQ2Amount(e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Day of Month Selector */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/50 rounded-xl border border-slate-200/60">
                {(modalExpDistribution === 'both_equal' || modalExpDistribution === 'both_custom' || modalExpDistribution === 'only_q1') && (
                  <div>
                    <label className="block mb-1">Día de Gasto Quincena 1 (Q1)</label>
                    <select
                      value={modalQ1Day}
                      onChange={(e) => setModalQ1Day(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {Array.from({ length: 15 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          Día {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {(modalExpDistribution === 'both_equal' || modalExpDistribution === 'both_custom' || modalExpDistribution === 'only_q2') && (
                  <div>
                    <label className="block mb-1">Día de Gasto Quincena 2 (Q2)</label>
                    <select
                      value={modalQ2Day}
                      onChange={(e) => setModalQ2Day(parseInt(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {Array.from({ length: 16 }, (_, i) => i + 16).map((day) => (
                        <option key={day} value={day}>
                          Día {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
