import React, { useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  Wallet,
  PiggyBank,
  CreditCard,
  Receipt,
  Tag,
  CalendarDays,
  Users,
  Calendar,
  Settings,
  Info,
  CheckCircle,
  HelpCircle,
  HelpCircle as HelpIcon,
  TrendingUp,
  Percent,
  FileText,
  DollarSign
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'dashboard' | 'balance' | 'pending_expenses' | 'debts' | 'savings' | 'shared_finances' | 'transactions' | 'scheduled' | 'calendar' | 'config';
}

interface HelpContent {
  title: string;
  icon: React.ReactNode;
  subtitle: string;
  general: string;
  loadingData: string[];
  distribution?: string[];
  reports: string[];
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, activeTab }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getHelpData = (): HelpContent => {
    switch (activeTab) {
      case 'dashboard':
        return {
          title: 'Dashboard (Inicio)',
          icon: <LayoutDashboard className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Resumen Financiero Global',
          general: 'El Dashboard es la pantalla principal que te da un panorama inmediato y simplificado del estado de tus finanzas en la quincena seleccionada. Reúne los datos clave de ingresos, gastos, deudas y ahorros para que no tengas que navegar por cada módulo individualmente.',
          loadingData: [
            'No requiere cargar datos directamente: recopila y consolida la información ingresada en el resto de los módulos en tiempo real.',
            'Usa los accesos directos en el panel para añadir gastos rápidos sin salir de la pantalla de inicio.'
          ],
          reports: [
            'Resumen de KPI: Ingresos Totales, Gastos Totales, Ahorro Programado y tu Saldo Disponible Neto.',
            'Gráfico circular de categorías: Muestra la proporción de tus gastos de la quincena.',
            'Barra de progreso de presupuesto general: Te avisa visualmente cuánto de tu presupuesto fijo o libre ya has consumido.'
          ]
        };
      case 'balance':
        return {
          title: 'Saldo y Presupuesto',
          icon: <Wallet className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Planificación de Ingresos y Gastos Fijos',
          general: 'Este módulo sirve para estructurar tu presupuesto quincenal base. Te permite registrar el dinero que recibes (ingresos fijos y variables) y reservar lo necesario para tus obligaciones periódicas recurrentes antes de realizar gastos libres.',
          loadingData: [
            'Ingresos: Registra tu sueldo base, compensaciones u otros ingresos quincenales pulsando "Agregar Ingreso".',
            'Gastos Fijos: Registra compromisos como arriendo, servicios, alimentación y transporte básico pulsando "Agregar Gasto Fijo". Puedes configurar si ocurren de manera quincenal o mensual.'
          ],
          distribution: [
            'Asignación Quincenal: Al registrar un gasto fijo mensual, puedes configurar si se paga en la 1ra quincena (1-15), en la 2da quincena (16-fin), o si se divide entre ambas.',
            'Opciones de División Mensual: Si eliges ambas quincenas, puedes dividir el monto en partes iguales (50% / 50%) o ingresar montos específicos para cada quincena.'
          ],
          reports: [
            'Saldo Libre Quincenal: Se calcula restando tus gastos fijos presupuestados e ingresos netos de la quincena.',
            'Lista y Estado de Egresos Fijos: Muestra un checkmark visual para que marques qué gastos ya han sido liquidados o pagados en la quincena.'
          ]
        };
      case 'savings':
        return {
          title: 'Ahorro Programado',
          icon: <PiggyBank className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Gestión de Metas de Ahorro',
          general: 'Diseñado para que guardes dinero de forma disciplinada con metas concretas (ej. fondo de emergencia, viajes, compras mayores), evitando que uses esos fondos en el día a día.',
          loadingData: [
            'Crear Meta: Define el nombre del objetivo, el monto total que necesitas, la fecha límite en la que deseas completarlo y la frecuencia del aporte (quincenal o mensual).',
            'Registrar Aportes: Cuando transfieras dinero a tu cuenta de ahorros real, registra un "Depósito" en la meta correspondiente dentro de la app para actualizar el saldo.'
          ],
          distribution: [
            'Cálculo Automático de Cuota: Basado en la fecha límite y el monto total, el sistema calcula de forma exacta cuánto debes aportar en la quincena activa para cumplir la meta a tiempo.',
            'Aportes Libres: Puedes aportar sumas mayores o adicionales en cualquier quincena para acortar el plazo o reducir la cuota futura.'
          ],
          reports: [
            'Progreso Porcentual: Indicador visual en barra de cuánto te falta para completar cada meta.',
            'Historial de Depósitos: Registro detallado de todos los movimientos de ahorro realizados en la meta.'
          ]
        };
      case 'debts':
        return {
          title: 'Deudas Personales',
          icon: <CreditCard className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Amortización y Control de Préstamos o Tarjetas',
          general: 'Te ayuda a mantener un control estricto de los saldos que debes (tarjetas de crédito, préstamos de bancos o deudas con terceros) y a planificar su pago periódico estructurado.',
          loadingData: [
            'Registrar Deuda: Ingresa el nombre del acreedor/deuda, el monto original total, el número de cuotas pactadas, la tasa de interés (opcional) y la quincena/año en la que inicia el primer pago.',
            'Registrar Cuotas: Cada quincena puedes registrar el pago de la cuota correspondiente para que el sistema descuente el saldo pendiente y aumente el contador de cuotas.'
          ],
          distribution: [
            'Frecuencia de Cuota: Configura si la deuda es Mensual (se paga en una quincena específica al mes) o Quincenal (se cobra en ambas quincenas).',
            'Distribución Mensual: Si es mensual, puedes definir si se debita en la 1ra quincena, 2da quincena, o si se reparte en partes iguales (ambas quincenas).'
          ],
          reports: [
            'Saldo Insoluto Neto: El total real que debes actualmente considerando los abonos registrados.',
            'Progreso de Cuotas: Métrica visual del tipo "Cuota 3 de 12" para saber cuánto te falta para liquidar la deuda.',
            'Proyección de Pago: Fecha estimada de finalización basada en las cuotas restantes y la frecuencia.'
          ]
        };
      case 'transactions':
        return {
          title: 'Gastos Esporádicos',
          icon: <Receipt className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Registro de Transacciones Diarias',
          general: 'El lugar ideal para registrar tus gastos variables, diarios y no planificados de la quincena (salidas a comer, compras de supermercado fuera del básico fijos, compras de ropa, ocio o imprevistos).',
          loadingData: [
            'Registrar Gasto: Pulsa "Agregar Gasto", indica la descripción, el monto, selecciona la categoría correspondiente y el método de pago utilizado (efectivo, tarjeta, transferencia).',
            'Asociar Etiquetas: Puedes agregar etiquetas adicionales para filtrar tus gastos más adelante.'
          ],
          reports: [
            'Listado Cronológico: Detalle ordenado de todos tus movimientos diarios en la quincena activa.',
            'Consumo de Saldo Libre: Resta automáticamente cada gasto esporádico de tu saldo disponible quincenal, manteniéndote al tanto de cuánto dinero real te queda en el bolsillo.'
          ]
        };
      case 'pending_expenses':
        return {
          title: 'Gastos por Clasificar',
          icon: <Tag className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Bandeja de Entrada de Transacciones Pendientes',
          general: 'Una zona de transiciones donde se almacenan los gastos importados desde extractos bancarios, hojas de cálculo o APIs externas que aún no tienen una categoría o asignación formal dentro de tu presupuesto.',
          loadingData: [
            'Clasificar: Selecciona un gasto y asígnale una categoría del presupuesto. Puedes guardarlo como un "Gasto Fijo" (dentro del presupuesto quincenal) o como un "Gasto Esporádico" (gasto variable del día a día).',
            'Descartar/Eliminar: Si una transacción está duplicada o no corresponde, puedes borrarla directamente.'
          ],
          distribution: [
            'Dividir Gasto: Si un pago grande incluye conceptos diferentes (ej. una compra en supermercado que incluye comida y también artículos del hogar), el sistema te permite dividir la transacción y asignarle diferentes categorías e importes a cada parte.'
          ],
          reports: [
            'Contador de Pendientes: Alerta visual en rojo en el menú que indica cuántas transacciones requieren tu atención para mantener el presupuesto quincenal al día.'
          ]
        };
      case 'scheduled':
        return {
          title: 'Plan Futuro',
          icon: <CalendarDays className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Proyección de Flujo de Caja',
          general: 'Este módulo te permite mirar hacia el futuro. Te ayuda a prever ingresos y gastos extraordinarios que ocurrirán en las próximas quincenas o meses, asegurándote de que no te tomen por sorpresa.',
          loadingData: [
            'Registrar Evento Programado: Agrega ingresos proyectados (ej. primas, bonos, aguinaldos) o gastos proyectados (ej. impuestos anuales, matrículas, seguros) indicando el monto y la quincena/año del evento.'
          ],
          reports: [
            'Gráfico de Proyección de Saldo: Muestra una línea de tendencia estimada de tu cuenta para los siguientes 6 a 12 periodos.',
            'Alertas de Déficit: Te notifica de forma temprana si alguna quincena futura tiene una proyección de saldo negativo, dándote tiempo para ajustar tus gastos actuales.'
          ]
        };
      case 'shared_finances':
        return {
          title: 'Finanzas Compartidas',
          icon: <Users className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Cuentas Claras en Pareja o Grupos',
          general: 'Ideal para gestionar gastos conjuntos (alquiler compartido, viajes grupales, compras de víveres en pareja) sin mezclar tus cuentas personales por completo. Permite registrar quién pagó qué y calcular las compensaciones automáticas.',
          loadingData: [
            'Crear Grupo: Crea un espacio compartido con un nombre (ej. "Hogar", "Viaje 2026") y añade a los participantes.',
            'Registrar Gasto Compartido: Registra el monto total del gasto, quién de los participantes realizó el pago real y quiénes se benefician de dicho gasto.',
            'Registrar Liquidación: Cuando un miembro le pague a otro para saldar su deuda, regístralo como un pago de liquidación para poner los balances en cero.'
          ],
          distribution: [
            'División Equitativa (Partes Iguales): El gasto se divide automáticamente en partes iguales entre los beneficiarios seleccionados.',
            'División por Monto Fijo: Permite ingresar manualmente la cantidad exacta de dinero que le corresponde asumir a cada participante.',
            'División por Porcentaje: Permite definir porcentajes personalizados (ej. 60% / 40%) para el reparto del gasto.'
          ],
          reports: [
            'Balance Neto Consolidado ("Quién le debe a quién"): Resumen automático que calcula las deudas cruzadas y te dice el monto mínimo de transferencias necesarias para saldar las cuentas del grupo.',
            'Historial de Saldos: Lista detallada de aportes individuales y deudas pendientes.'
          ]
        };
      case 'calendar':
        return {
          title: 'Calendario Financiero',
          icon: <Calendar className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Línea de Tiempo de tus Finanzas',
          general: 'Te ofrece una representación visual clásica en formato de calendario mensual de todos tus eventos financieros. Te ayuda a entender la cronología de tus flujos de dinero y a identificar los días de mayor presión de egresos.',
          loadingData: [
            'Sincroniza y lee automáticamente las fechas de cobro de ingresos, vencimientos de gastos fijos y cuotas de deudas.',
            'Muestra los días en los que registraste transacciones esporádicas individuales.'
          ],
          reports: [
            'Resumen Diario: Al hacer clic en un día del calendario, se despliega el listado completo de ingresos, gastos fijos y transacciones de esa fecha específica.',
            'Sumatorias Mensuales: Te muestra de manera consolidada los ingresos proyectados del mes completo versus los gastos reales ejecutados en ese lapso.'
          ]
        };
      case 'config':
        return {
          title: 'Configuración',
          icon: <Settings className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Ajustes y Mantenimiento del Sistema',
          general: 'Es el centro de control técnico de tu aplicación. Te permite personalizar el comportamiento general de la app y proteger tus datos financieros locales.',
          loadingData: [
            'Moneda: Configura el símbolo de divisa ($, €, S/, etc.) que se mostrará en todas las vistas.',
            'Categorías: Agrega, edita o elimina las categorías personalizadas de tus presupuestos y gastos.',
            'Respaldos (Backup): Permite exportar toda tu base de datos a un archivo JSON o importar un respaldo previo para restaurar tus datos en caso de cambio de dispositivo o navegador.',
            'Reiniciar Sistema: Opción para borrar de forma segura todos tus datos registrados y empezar desde cero.'
          ],
          reports: [
            'Estado de conexión de la Base de Datos.',
            'Estadísticas del tamaño de tu base de datos local y número de registros guardados.'
          ]
        };
      default:
        return {
          title: 'Ayuda',
          icon: <HelpCircle className="w-6 h-6 text-emerald-600" />,
          subtitle: 'Guía del Sistema',
          general: 'Selecciona una pestaña en la aplicación para ver la ayuda detallada correspondiente al módulo activo.',
          loadingData: [],
          reports: []
        };
    }
  };

  const help = getHelpData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[85vh] scale-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration band */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 w-full" />

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 shadow-2xs">
              {help.icon}
            </div>
            <div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md mb-0.5">
                <HelpIcon className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span>Guía del Módulo</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 leading-snug">
                {help.title}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Cerrar ayuda"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {/* Subtitle / Intro */}
          <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-2xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{help.subtitle}</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed font-normal">
              {help.general}
            </p>
          </div>

          {/* Section 1: Carga de Datos */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cómo Cargar o Registrar Datos</span>
            </h4>
            <ul className="grid grid-cols-1 gap-2 pl-1">
              {help.loadingData.map((item, idx) => (
                <li key={idx} className="flex gap-2.5 text-xs text-slate-600 leading-relaxed">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2: Distribution/Cuotas Options (if available) */}
          {help.distribution && help.distribution.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Opciones de Distribución y Cuotas</span>
              </h4>
              <ul className="space-y-2 pl-1">
                {help.distribution.map((item, idx) => (
                  <li key={idx} className="flex gap-2.5 text-xs text-slate-600 leading-relaxed">
                    <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span className="flex-1">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 3: Reportes y Resultados */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Reportes y Resultados de este Módulo</span>
            </h4>
            <ul className="space-y-2 pl-1">
              {help.reports.map((item, idx) => (
                <li key={idx} className="flex gap-2.5 text-xs text-slate-600 leading-relaxed">
                  <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 active:bg-slate-950 text-white text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>Entendido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
