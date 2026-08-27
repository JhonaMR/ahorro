import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  Users,
  CheckCircle2,
  AlertCircle,
  PiggyBank,
  Sun,
  Moon,
} from 'lucide-react';
import { UserAccount } from '../types';
import { loginUser, registerUser, resetPinForce } from '../utils/storage';
import { DottedBackground } from './DottedBackground';

interface AuthScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  theme,
  onToggleTheme,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset_pin_required'>('login');

  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPin, setLoginPin] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPin, setRegisterPin] = useState('');
  const [registerConfirmPin, setRegisterConfirmPin] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetTempPin, setResetTempPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Validate 6-digit numeric input
  const handlePinInput = (val: string, setter: (v: string) => void) => {
    // Only keep numeric digits up to 6 chars
    const numeric = val.replace(/\D/g, '').slice(0, 6);
    setter(numeric);
    setErrorMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!loginEmail.trim()) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      return;
    }

    if (loginPin.length !== 6) {
      setErrorMsg('La contraseña debe tener exactamente 6 dígitos numéricos.');
      return;
    }

    const res = await loginUser(loginEmail, loginPin);
    if (res.success && res.user) {
      if (res.user.requiresPinReset) {
        setResetEmail(loginEmail);
        setResetTempPin(loginPin);
        setMode('reset_pin_required');
        setErrorMsg(null);
      } else {
        onLoginSuccess(res.user);
      }
    } else {
      setErrorMsg(res.error || 'Error al iniciar sesión.');
    }
  };

  const handleResetPinRequired = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPin.length !== 6) {
      setErrorMsg('El nuevo PIN debe tener exactamente 6 dígitos numéricos.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setErrorMsg('Las nuevas contraseñas de 6 dígitos no coinciden.');
      return;
    }

    if (newPin === resetTempPin) {
      setErrorMsg('El nuevo PIN debe ser diferente al PIN temporal actual.');
      return;
    }

    const res = await resetPinForce(resetEmail, resetTempPin, newPin);
    if (res.success && res.user) {
      setSuccessMsg('¡PIN actualizado exitosamente! Iniciando sesión...');
      setTimeout(() => {
        if (res.user) onLoginSuccess(res.user);
      }, 700);
    } else {
      setErrorMsg(res.error || 'Error al restablecer el PIN.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!registerName.trim()) {
      setErrorMsg('Por favor escribe tu nombre completo.');
      return;
    }

    if (!registerEmail.trim() || !registerEmail.includes('@')) {
      setErrorMsg('Por favor escribe un correo electrónico válido.');
      return;
    }

    if (registerPin.length !== 6) {
      setErrorMsg('La contraseña debe tener exactamente 6 dígitos numéricos (ej. 123456).');
      return;
    }

    if (registerPin !== registerConfirmPin) {
      setErrorMsg('Las contraseñas de 6 dígitos no coinciden.');
      return;
    }

    const res = await registerUser(registerName, registerEmail, registerPin);
    if (res.success && res.user) {
      setSuccessMsg('¡Cuenta creada exitosamente! Iniciando sesión...');
      setTimeout(() => {
        if (res.user) onLoginSuccess(res.user);
      }, 700);
    } else {
      setErrorMsg(res.error || 'Error al registrar la cuenta.');
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 relative overflow-hidden ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
    }`}>
      <DottedBackground />
      {/* Subtle background ambient highlights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 mb-1">
            <PiggyBank className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors duration-300 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Finanzas Quincenales
          </h1>
          <p className={`text-xs sm:text-sm transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Control de nómina, gastos, deudas personales y compartidas
          </p>
        </div>

        {/* Main Card */}
        <div className={`backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 transition-all duration-300 ${
          theme === 'dark' ? 'bg-slate-900/90 border border-slate-800' : 'bg-white border border-slate-200/90'
        }`}>
          {/* Tab Switcher */}
          {mode !== 'reset_pin_required' && (
            <div className={`grid grid-cols-2 p-1 rounded-2xl border transition-all duration-300 ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800/80' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                id="tab-btn-login"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                id="tab-btn-register"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="input-login-email"
                    placeholder="ejemplo@correo.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setErrorMsg(null);
                    }}
                    className={`w-full pl-10 pr-3.5 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Contraseña Numérica (6 dígitos)
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {loginPin.length}/6 dígitos
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    id="input-login-pin"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="•••••• (6 dígitos)"
                    value={loginPin}
                    onChange={(e) => handlePinInput(e.target.value, setLoginPin)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-base tracking-widest font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition ${
                      theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title={showPin ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-login"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Ingresar al Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="input-register-name"
                    placeholder="Ej. Alex Madrigal"
                    value={registerName}
                    onChange={(e) => {
                      setRegisterName(e.target.value);
                      setErrorMsg(null);
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-300 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="input-register-email"
                    placeholder="tu.correo@ejemplo.com"
                    value={registerEmail}
                    onChange={(e) => {
                      setRegisterEmail(e.target.value);
                      setErrorMsg(null);
                    }}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Clave (6 dígitos)
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    id="input-register-pin"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={registerPin}
                    onChange={(e) => handlePinInput(e.target.value, setRegisterPin)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm tracking-widest font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Confirmar Clave
                  </label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    id="input-register-confirm-pin"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="123456"
                    value={registerConfirmPin}
                    onChange={(e) => handlePinInput(e.target.value, setRegisterConfirmPin)}
                    className={`w-full px-3 py-2.5 rounded-xl text-sm tracking-widest font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-register"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Registrarme e Ingresar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* RESET PIN REQUIRED FORM */}
          {mode === 'reset_pin_required' && (
            <form onSubmit={handleResetPinRequired} className="space-y-4">
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Tu contraseña de acceso fue restablecida por soporte. Por seguridad, ingresa un nuevo PIN de 6 dígitos numéricos.</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Nuevo PIN (6 dígitos)
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {newPin.length}/6 dígitos
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    id="input-reset-new-pin"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Nuevo PIN (6 dígitos)"
                    value={newPin}
                    onChange={(e) => handlePinInput(e.target.value, setNewPin)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-base tracking-widest font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Confirmar Nuevo PIN
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    {confirmNewPin.length}/6 dígitos
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    id="input-reset-confirm-pin"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Confirmar PIN (6 dígitos)"
                    value={confirmNewPin}
                    onChange={(e) => handlePinInput(e.target.value, setConfirmNewPin)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl text-base tracking-widest font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition duration-300 ${
                      theme === 'dark'
                        ? 'bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500'
                        : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-reset-pin"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <span>Guardar Nuevo PIN e Ingresar</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setNewPin('');
                  setConfirmNewPin('');
                }}
                className={`w-full text-center text-xs font-semibold hover:underline mt-2 cursor-pointer transition ${
                  theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cancelar y Volver
              </button>
            </form>
          )}
        </div>

        {/* Security and Privacy Note */}
        <div className={`flex items-center justify-center gap-2 text-xs text-center transition-colors duration-300 ${
          theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
        }`}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Sistema de control de ahorros personales Yersi logistics 1.0.2</span>
        </div>

        {/* Sol / Luna Sliding Switch (Toggle Theme) */}
        <div className="flex flex-col items-center justify-center pt-2">
          <div
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className={`w-12 h-6 rounded-full p-0.5 cursor-pointer relative transition-all duration-300 flex items-center border ${
              theme === 'dark' 
                ? 'bg-slate-900 border-slate-800' 
                : 'bg-white border-slate-300 shadow-xs'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300 ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
              }`}
            >
              {theme === 'dark' ? (
                <Moon className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              )}
            </div>
          </div>
          <span className={`text-[10px] font-bold mt-1.5 transition-colors duration-300 ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
          </span>
        </div>

      </div>
    </div>
  );
};
