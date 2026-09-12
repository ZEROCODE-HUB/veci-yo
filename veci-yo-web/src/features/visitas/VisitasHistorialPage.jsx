import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Tabs from '../../components/ui/Tabs';
import StatusTabs from '../../components/ui/StatusTabs';
import Badge from '../../components/ui/Badge';
import TimelineReservaHuespedes from '../../components/ui/TimelineReservaHuespedes';
import VerificacionesConsumo from '../../components/ui/VerificacionesConsumo';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import InputField from '../../components/ui/InputField';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import tipoVisitaIcons from '../../assets/icons/visitas';
import { torres, departamentos } from '../../data/mockData';

const TABS = ['Todas'];

const GUARDIA_TABS = ['Todas'];
const HUESPEDES_TABS = ['Todas', 'Pendiente', 'Aceptado', 'Ingresado'];
const TIPO_TABS_BASE = [
  { value: 'visitas', label: 'Visitas' },
  { value: 'huespedes', label: 'Huéspedes' },
];
const TIPOS = ['Todos', 'Amigos Familiares', 'Profesional Temporal', 'Profesional Permanente'];

const TIMELINE_STEPS = [
  { key: 'preregistroEnviado', label: 'Link de preregistro enviado', icon: '🔗' },
  { key: 'documentacionCompleta', label: 'Documentación completada', icon: '📄' },
  { key: 'terminosAceptados', label: 'Términos y Condiciones aceptados', icon: '📝' },
  { key: 'verificacionPasada', label: 'Verificación superada', icon: '🛡️' },
  { key: 'trasideEntrada', label: 'Ingreso al edificio (TRA/SIRE entrada)', icon: '🟢' },
  { key: 'trasideSalida', label: 'Salida del edificio (TRA/SIRE salida)', icon: '🔴' },
];

const chipFecha = (activo) => ({
  flex: 1,
  padding: '8px 0',
  borderRadius: theme.radius.full,
  border: `1.5px solid ${activo ? theme.colors.primary : theme.colors.border}`,
  background: activo ? theme.colors.primary : theme.colors.bgCard,
  color: activo ? '#fff' : theme.colors.textSecondary,
  fontSize: theme.fonts.sizes.xs,
  fontWeight: theme.fonts.weights.semibold,
  cursor: 'pointer',
  fontFamily: theme.fonts.family,
});

const TIPO_LABELS = {
  amigos: 'Amigos Familiares',
  temporal: 'Profesional Temporal',
  permanente: 'Profesional Permanente',
  'huesped-temporal': 'Huésped Temporal',
};

// Imagen de marcador de posición para fotos de ingreso/salida (demo offline)
const FOTO_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><rect width='120' height='120' fill='#E5E7EB'/><g fill='none' stroke='#9CA3AF' stroke-width='4' stroke-linejoin='round'><rect x='28' y='38' width='64' height='48' rx='6'/><circle cx='60' cy='62' r='12'/><path d='M44 38l6-8h20l6 8'/></g><text x='50%' y='100' text-anchor='middle' font-size='10' fill='#6B7280' font-family='sans-serif'>Foto</text></svg>"
);

// ¿La fecha (fin o inicio) ya pasó respecto a hoy?
const esPasada = (fechaStr) => {
  if (!fechaStr) return false;
  const partes = fechaStr.split('/');
  if (partes.length !== 3) return false;
  const [d, m, y] = partes;
  const f = new Date(+y, +m - 1, +d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return f < hoy;
};

// Texto "quién registró / quién autorizó el ingreso"
const textoAutorizo = (item) => {
  if (item.autorizadoPor) {
    const rol = item.autorizadoPorRol;
    if (rol === 'guardia') return `Autorizado por guardia de seguridad ${item.autorizadoPor}`;
    if (rol === 'administrador') return `Autorizado por administrador ${item.autorizadoPor}`;
    return `Autorizado por ${item.autorizadoPor}`;
  }
  if (item.registradoPor) return `Registrado por ${item.registradoPor}`;
  return null;
};

// Personas con horas de ingreso/salida (nivel visita o invitados)
const personasConHoras = (item) => {
  if (item.invitados && item.invitados.length > 0) {
    return item.invitados.filter(inv => inv.horaIngreso || inv.horaSalida);
  }
  if (item.horaIngreso || item.horaSalida) {
    return [{ nombre: item.nombre, horaIngreso: item.horaIngreso, horaSalida: item.horaSalida }];
  }
  return [];
};

// Texto del "chip" de fecha: para visitas ya ocurridas muestra el ingreso real
// en lugar de un rango de fechas.
const textoFechaChip = (item) => {
  const pasada = esPasada(item.fechaHasta || item.fechaDesde);
  const personas = personasConHoras(item);
  if (pasada) {
    const conHora = personas.find(p => p.horaIngreso);
    if (conHora) return `Ingresó el ${item.fechaDesde} a las ${conHora.horaIngreso}`;
    return `Visitó el ${item.fechaDesde}`;
  }
  return `${item.fechaDesde}${item.fechaHasta ? ` a ${item.fechaHasta}` : ''}`;
};

const lineaInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '12px',
  color: '#4B5563',
};

// Bloque de información de ingreso para visitas normales (no huésped temporal).
// compact=true → versión resumida para la tarjeta (sin fotos).
// compact=false → versión completa para el modal de detalles (incluye fotos).
const BloqueInfoVisitaNormal = ({ item, compact }) => {
  const autorizo = textoAutorizo(item);
  const personas = personasConHoras(item);
  const pasada = esPasada(item.fechaHasta || item.fechaDesde);
  const anotaciones = item.anotacionesIngreso || item.anotacionesSalida;
  const fotos = [...(item.fotosIngreso || []), ...(item.fotosSalida || [])];

  if (!autorizo && personas.length === 0 && (!compact || (!anotaciones && fotos.length === 0))) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
      {autorizo && (
        <div style={lineaInfoStyle}>
          <span style={{ fontSize: '13px' }}>🛡️</span>
          <span style={{ fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>{autorizo}</span>
        </div>
      )}
      {personas.map((inv, i) => (
        <div key={i} style={lineaInfoStyle}>
          <span style={{ fontSize: '13px' }}>🕐</span>
          <span>
            {inv.horaIngreso && (
              <span>
                {pasada ? 'Ingresó' : 'Ingreso'}{' '}
                {inv.nombre && item.invitados?.length > 1 ? `${inv.nombre}: ` : ''}
                el {item.fechaDesde} a las {inv.horaIngreso}
              </span>
            )}
            {inv.horaSalida && (
              <span style={{ marginLeft: inv.horaIngreso ? '8px' : 0, color: '#92400E', fontWeight: theme.fonts.weights.semibold }}>
                · Salida el {item.fechaHasta || item.fechaDesde} a las {inv.horaSalida}
              </span>
            )}
          </span>
        </div>
      ))}
      {!compact && anotaciones && (
        <div style={{ ...lineaInfoStyle, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '13px', flexShrink: 0 }}>📝</span>
          <span style={{ color: theme.colors.textSecondary }}>
            <span style={{ fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Anotaciones: </span>
            {[item.anotacionesIngreso, item.anotacionesSalida].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
      {!compact && fotos.length > 0 && (
        <div style={{ marginTop: '2px' }}>
          <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.semibold, marginBottom: '4px' }}>📷 Fotos de ingreso / salida</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {fotos.map((f, i) => (
              <img key={i} src={f} alt={`foto ${i}`} style={{ width: '72px', height: '72px', borderRadius: theme.radius.md, objectFit: 'cover', border: `1px solid ${theme.colors.border}` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function VisitasHistorialPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromHome = location.state?.fromHome || false;
  const { visitas, actualizarEstadoVisita, eliminarVisita, toggleLlegoInvitado, toggleFavoritoInvitado, aprobarInvitado, rolActivo, addToast, verificaciones, actualizarVerificacion, actualizarHoraIngreso, actualizarHoraSalida, setLlegoInvitado, marcarLlegadaConVerificacion, toggleInstruccionCumplida, estacionamientosVisitantes, estacionamientosAsignados, asignarEstacionamientoVisita, liberarEstacionamientoVisita, configHuespedesTemporales, ubicacionActiva, suscripcionActiva, activarSuscripcion, reportarTraSire, usuario, actualizarConfigHuespedTemporal, esResidente, actualizarTimeline, aprobarTerminosManual, aprobarVerificacion, aprobarVerificacionConHallazgos, actualizarVisita } = useApp();

  const esAdminRol = rolActivo === 'administrador';
  const esGuardiaRol = rolActivo === 'guardia';

  // El rediseño de la Card de Reserva (Huésped Temporal) aplica para todos los
  // roles excepto Guardia de Seguridad, que mantiene su vista compacta.
  // El Administrador usa el mismo look & feel que el Residente/Anfitrión.
  const mostrarDisenoReserva = rolActivo !== 'guardia';
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todas');
  const [tipoTab, setTipoTab] = useState('visitas');
  const [vistaSub, setVistaSub] = useState('lista');
  const [filterOpen, setFilterOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState('Todos');
  const [fechaDesdeFilter, setFechaDesdeFilter] = useState('');
  const [fechaHastaFilter, setFechaHastaFilter] = useState('');
  const [deptoFilter, setDeptoFilter] = useState('');
  const [torreFilter, setTorreFilter] = useState('');
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [detalleItem, setDetalleItem] = useState(null);
  const [detalleGuardia, setDetalleGuardia] = useState(null);
  const [verificandoInvitado, setVerificandoInvitado] = useState(null);
  const [capturaStep, setCapturaStep] = useState(null);
  const [verifResultado, setVerifResultado] = useState(null);
  const [verificandoPersona, setVerificandoPersona] = useState(null);
  const [ciInput, setCiInput] = useState('');
  const [ciError, setCiError] = useState('');
  const [traSireModal, setTraSireModal] = useState(null);
  const [guardiaStep1, setGuardiaStep1] = useState(null);
  const [guardiaStep2, setGuardiaStep2] = useState(null);
  const [detallePersonaIdx, setDetallePersonaIdx] = useState(null);
  const [hallazgosPopup, setHallazgosPopup] = useState(null);
  const [documentacionDetail, setDocumentacionDetail] = useState(null);
  const [selectedTraSire, setSelectedTraSire] = useState([]);
  const [showAsignarEstacionamiento, setShowAsignarEstacionamiento] = useState(false);
  const [parkingSpot, setParkingSpot] = useState('');
  const [reservaDetail, setReservaDetail] = useState(null);
  const [reservaGuardia, setReservaGuardia] = useState(null);
  const [visitaListaDetalle, setVisitaListaDetalle] = useState(null);
  const [parkingTarget, setParkingTarget] = useState(null);
  const [calendarioMonth, setCalendarioMonth] = useState(new Date());
  const [showSuscripcionModal, setShowSuscripcionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const algunFiltroActivo = search || fechaDesdeFilter || fechaHastaFilter || torreFilter || deptoFilter || tipoFilter !== 'Todos';

  // Seguridad (guardia) y Administrador no tienen acceso al Calendario.
  const sinCalendario = rolActivo === 'guardia' || rolActivo === 'administrador';
  // Solo Seguridad, Administrador y Huésped Temporal pueden filtrar por piso/torre.
  const puedeFiltrarTorrePiso = rolActivo === 'guardia' || rolActivo === 'administrador' || rolActivo === 'huesped-temporal';

  const huespedDisponible = suscripcionActiva || ['guardia','administrador','huesped-temporal'].includes(rolActivo) || (rolActivo !== 'propietario' && rolActivo !== 'inquilino-lider');
  const TIPO_TABS = useMemo(() => {
    if (rolActivo === 'huesped-temporal') return [{ value: 'visitas', label: 'Visitas' }];
    const base = [{ value: 'visitas', label: 'Visitas' }];
    if (huespedDisponible) base.push({ value: 'huespedes', label: 'Huéspedes' });
    return base;
  }, [rolActivo, sinCalendario, huespedDisponible]);

  const diasRestantes = (fechaStr) => {
    if (!fechaStr) return Infinity;
    const [day, month, year] = fechaStr.split('/');
    const fecha = new Date(+year, +month - 1, +day);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
  };

  const colorReserva = (reserva) => {
    if (!reserva.invitados || reserva.invitados.length === 0) return theme.colors.textMuted;
    const todosCompletos = reserva.invitados.every(inv => {
      const t = inv.timeline || {};
      const step4 = t.verificacionAprobada === true || t.verificacionPasada;
      return t.preregistroEnviado && t.documentacionCompleta && t.terminosAceptados && step4 && t.trasideEntrada && t.trasideSalida;
    });
    if (todosCompletos) return theme.colors.success;
    const dias = diasRestantes(reserva.fechaDesde);
    if (dias < 3) return theme.colors.danger;
    return '#F59E0B';
  };

  const textoDiasParaCheckin = (fechaDesde, fechaHasta) => {
    if (!fechaDesde) return null;
    const diasHastaCheckin = diasRestantes(fechaDesde);
    const diasHastaCheckout = fechaHasta ? diasRestantes(fechaHasta) : Infinity;
    if (!Number.isFinite(diasHastaCheckin)) return null;
    // Reserva aún no comienza
    if (diasHastaCheckin > 1) return `${diasHastaCheckin} días para el check-in`;
    if (diasHastaCheckin === 1) return `1 día para el check-in`;
    if (diasHastaCheckin === 0) return `Hoy es el check-in`;
    // Ya comenzó: distinguir en curso vs pasada (checkout)
    if (Number.isFinite(diasHastaCheckout) && diasHastaCheckout < 0) {
      const dias = Math.abs(diasHastaCheckout);
      if (dias === 1) return `El check-out se realizó hace 1 día`;
      return `El check-out se realizó hace ${dias} días`;
    }
    const dias = Math.abs(diasHastaCheckin);
    if (dias === 1) return `El check-in se realizó hace 1 día`;
    return `El check-in se realizó hace ${dias} días`;
  };

  const btnStyle = (bg, color = '#fff') => ({
    padding: '4px 10px', borderRadius: theme.radius.full,
    background: bg, color, border: 'none',
    cursor: 'pointer', fontSize: theme.fonts.sizes['2xs'],
    fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
    whiteSpace: 'nowrap',
  });

  const progresoInvitado = (inv) => {
    const t = inv.timeline || {};
    const step4 = t.verificacionAprobada === true || t.verificacionPasada;
    const pasos = [t.preregistroEnviado, t.documentacionCompleta, t.terminosAceptados, step4, t.trasideEntrada, t.trasideSalida];
    return pasos.filter(Boolean).length;
  };

  // 15b: personas (invitados) de una reserva; si no hay invitados, el titular actúa como persona única
  const personasDeReserva = (item) => item.invitados && item.invitados.length > 0
    ? item.invitados.map((inv, idx) => ({ base: item, persona: inv, idx }))
    : [{ base: item, persona: { nombre: item.nombre, llego: !!item.llego || !!item.horaIngreso, horaIngreso: item.horaIngreso || '', horaSalida: item.horaSalida || '', ciVerificado: item.ciVerificado, ci: item.ci }, idx: -1 }];

  // 16: huéspedes a mostrar en la línea de tiempo — siempre al menos una fila para que sea consistente
  const huespedesTimeline = (item) => item.invitados && item.invitados.length > 0 ? item.invitados : [{ nombre: item.nombre }];

  // Helpers para /visitas tab visitas: decidir si va directo a popup o a lista de personas
  const cantidadPersonasRegistradas = (item) => {
    if (!item) return 0;
    // Permanente siempre es 1 persona (se registra de a uno)
    if (item.tipo === 'permanente') return 1;
    const invitadosCount = item.invitados ? item.invitados.length : 0;
    // titular + invitados; si invitados vacío => 1
    if (invitadosCount === 0) return 1;
    // Si hay invitados, considerar titular + invitados como total
    // Para los datos mock de amigos/temporal, invitados son los acompañantes
    return invitadosCount + 1;
  };
  const esVisitaUnicaPersona = (item) => cantidadPersonasRegistradas(item) <= 1;
  // Lista de personas para una visita normal (titular + invitados)
  const personasDeVisitaNormal = (item) => {
    if (!item) return [];
    if (!item.invitados || item.invitados.length === 0) {
      return [{ nombre: item.nombre, ci: item.ci, esTitular: true, idx: -1, horaIngreso: item.horaIngreso, horaSalida: item.horaSalida }];
    }
    const titular = { nombre: item.nombre, ci: item.ci, esTitular: true, idx: -1, horaIngreso: item.horaIngreso, horaSalida: item.horaSalida };
    const invitados = item.invitados.map((inv, idx) => ({ ...inv, esTitular: false, idx }));
    return [titular, ...invitados];
  };

  // 18: estacionamiento ya asignado a una visita (mapa compartido Home ⇄ Visitas)
  const spotDeVisita = (visitaId) => Object.entries(estacionamientosAsignados || {}).find(([, clave]) => String(clave).startsWith(`${visitaId}-`))?.[0] || null;
  // Todos los cupos asignados a una visita (puede haber más de uno por invitado)
  const spotsDeVisita = (visitaId) => Object.entries(estacionamientosAsignados || {})
    .filter(([, clave]) => String(clave).startsWith(`${visitaId}-`))
    .map(([spot]) => spot);

  const renderGuestDetailInline = (inv, idx, item) => {
    const t = inv.timeline || {};
    const esAnfitrion = rolActivo === 'propietario' || rolActivo === 'inquilino-lider';
    const puedeAprobar = esAnfitrion;
    // Las acciones exclusivas del Anfitrión solo las ve el Anfitrión.
    // Administrador y Guardia no deben ver estos botones (no solo deshabilitados).
    const verAcciones = puedeAprobar;
    const rntCompleto = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id]?.legal?.rnt?.trim()?.length > 0 : false;
    const stepStatus = (key) => {
      if (key === 'terminosAceptados') {
        if (t.terminosAceptados === true) return t.terminosAprobadoPor === 'anfitrion' ? 'aprobado-manual' : true;
        if (t.terminosAceptados === false) return false;
        return null;
      }
      if (key === 'verificacionPasada') {
        if (t.verificacionAprobada === true) return 'aprobada';
        return !!t[key];
      }
      return !!t[key];
    };
    const esExcepcionTc = inv.terminosExcepcion === true && t.terminosAceptados !== true;
    const btn = (bg, color, outline, disabled) => ({
      padding: '5px 10px', borderRadius: theme.radius.md, border: outline ? `1.5px solid ${bg}` : `1.5px solid transparent`,
      background: outline ? 'transparent' : bg, color: outline ? bg : (color || '#fff'),
      fontSize: theme.fonts.sizes['2xs'], fontWeight: theme.fonts.weights.semibold, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: theme.fonts.family, whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
    });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
        {TIMELINE_STEPS.map((step, si) => {
          const st = stepStatus(step.key);
          const isCompleted = st === true || st === 'aprobado-manual' || st === 'aprobada';
          const isPending = st === null;
          const isRejected = st === false && step.key === 'terminosAceptados';
          const isAprobadoManual = st === 'aprobado-manual';
          const icon = isCompleted ? '✅' : (isRejected ? '❌' : '⏳');
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', flexShrink: 0 }}>{step.icon}</span>
              <span style={{ flex: 1, minWidth: '120px', fontSize: theme.fonts.sizes.xs, color: theme.colors.text }}>
                {step.label}
                {isAprobadoManual && <span style={{ color: theme.colors.secondary, fontWeight: theme.fonts.weights.semibold, marginLeft: '4px' }}>(aprobado por anfitrión)</span>}
                {st === 'aprobada' && <span style={{ color: theme.colors.success, fontWeight: theme.fonts.weights.semibold, marginLeft: '4px' }}>(aprobada)</span>}
              </span>
              {step.key === 'documentacionCompleta' && isCompleted && inv.documentos?.length > 0 && verAcciones && (
                <button onClick={(e) => { e.stopPropagation(); setDocumentacionDetail({ invitado: inv, item }); }} style={btn(theme.colors.primary)}>Ver documentación</button>
              )}
              {step.key === 'terminosAceptados' && esExcepcionTc && verAcciones && (
                <button disabled={!puedeAprobar} onClick={puedeAprobar ? () => { aprobarTerminosManual(item.id, idx); addToast('Excepción T&C aceptada para ' + inv.nombre, 'success'); } : undefined} style={btn(theme.colors.secondary, null, false, !puedeAprobar)} title={!puedeAprobar ? 'Acción exclusiva del Anfitrión' : undefined}>Aceptar excepción</button>
              )}
              {step.key === 'verificacionPasada' && verAcciones && !t.verificacionAprobada && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.semibold }}>
                    {t.verificacionHallazgos === true ? 'Con hallazgos' : (t.verificacionHallazgos === false ? 'Sin hallazgos' : 'Sin resultados')}
                  </span>
                  {t.verificacionHallazgos === true && (
                    <button onClick={(e) => { e.stopPropagation(); setHallazgosPopup({ persona: inv, idx, item }); }} style={btn('#F59E0B', '#fff')}>Ver resumen</button>
                  )}
                  <button disabled={!puedeAprobar} onClick={puedeAprobar ? () => { aprobarVerificacion(item.id, idx); addToast('Verificación aprobada para ' + inv.nombre, 'success'); } : undefined} style={btn(theme.colors.success, null, false, !puedeAprobar)} title={!puedeAprobar ? 'Acción exclusiva del Anfitrión' : undefined}>Aprobar</button>
                  <button disabled={!puedeAprobar} onClick={puedeAprobar ? () => { aprobarVerificacionConHallazgos(item.id, idx); addToast('Verificación aprobada con hallazgos para ' + inv.nombre, 'warning'); } : undefined} style={btn('#F59E0B', '#fff', false, !puedeAprobar)} title={!puedeAprobar ? 'Acción exclusiva del Anfitrión' : undefined}>Aprobar con hallazgos</button>
                </div>
              )}
              {step.key === 'trasideEntrada' && isCompleted && verAcciones && !inv.traSireReported && (
                <button disabled={!puedeAprobar} onClick={puedeAprobar ? () => {
                  if (!rntCompleto) { addToast('Completa tu RNT en la configuración de Huéspedes Temporales', 'warning'); return; }
                  reportarTraSire(item.id, idx); addToast('Reporte TRA enviado exitosamente', 'success');
                } : undefined} style={btn(theme.colors.secondary, null, false, !puedeAprobar)} title={!puedeAprobar ? 'Acción exclusiva del Anfitrión' : undefined}>Reportar TRA</button>
              )}
              {step.key === 'trasideSalida' && isCompleted && verAcciones && !inv.traSireReported && (
                <button disabled={!puedeAprobar} onClick={puedeAprobar ? () => {
                  if (!rntCompleto) { addToast('Completa tu RNT en la configuración de Huéspedes Temporales', 'warning'); return; }
                  reportarTraSire(item.id, idx); addToast('Reporte SIRE enviado exitosamente', 'success');
                } : undefined} style={btn(theme.colors.secondary, null, false, !puedeAprobar)} title={!puedeAprobar ? 'Acción exclusiva del Anfitrión' : undefined}>Reportar SIRE</button>
              )}
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: `1px solid ${theme.colors.borderLight}`, flexWrap: 'wrap' }}>
          {inv.traSireReported
            ? <Badge status="Aceptado">TRA/SIRE reportado</Badge>
            : <Badge status="Pendiente">TRA/SIRE pendiente</Badge>}
          {verAcciones && !inv.traSireReported && (
            <button disabled={!puedeAprobar} onClick={puedeAprobar ? () => { reportarTraSire(item.id, idx); addToast('TRA/SIRE marcado como realizado', 'success'); } : undefined} style={btn('#6B7280', '#fff', true, !puedeAprobar)} title={!puedeAprobar ? 'Acción exclusiva del Anfitrión' : undefined}>Ya hice TRA/SIRE</button>
          )}
        </div>
      </div>
    );
  };

  const detalleActual = detalleItem ? visitas.find(v => v.id === detalleItem.id) || null : null;

  const statusForGuardia = (estado) => rolActivo === 'guardia' && estado === 'Rechazado' ? 'Pendiente' : estado;

  const filtered = visitas.filter(v => {
    const estadoVis = statusForGuardia(v.estado);
    const matchTipoGrupo = tipoTab === 'huespedes' ? v.tipo === 'huesped-temporal' : v.tipo !== 'huesped-temporal';
    const matchSearch = !search
      || v.nombre.toLowerCase().includes(search.toLowerCase())
      || (v.invitados || []).some(inv => inv.nombre && inv.nombre.toLowerCase().includes(search.toLowerCase()));
    const matchTab = activeTab === 'Todas' || estadoVis === activeTab;
    const matchTipo = tipoFilter === 'Todos' || TIPO_LABELS[v.tipo] === tipoFilter;
    const matchFechaDesde = !fechaDesdeFilter || (v.fechaDesde && v.fechaDesde >= fechaDesdeFilter);
    const matchFechaHasta = !fechaHastaFilter || (v.fechaHasta && v.fechaHasta <= fechaHastaFilter);
    const matchTorre = !torreFilter || v.torre === torreFilter;
    const matchDepto = !deptoFilter || v.depto === deptoFilter;
    const matchGuest = rolActivo !== 'huesped-temporal' || (usuario?.nombre && v.nombre?.toLowerCase().includes(usuario.nombre.toLowerCase().split(' ')[0]));
    return matchTipoGrupo && matchSearch && matchTab && matchTipo && matchFechaDesde && matchFechaHasta && matchTorre && matchDepto && matchGuest;
  });

  const renderKpiHuespedes = () => {
    const reservas = filtered.filter(v => v.tipo === 'huesped-temporal');
    let total = 0, verificados = 0, traPendiente = 0, menores = 0;
    reservas.forEach(v => (v.invitados || []).forEach(inv => {
      total += 1;
      if (inv.timeline?.verificacionAprobada === true) verificados += 1;
      if (!inv.traSireReported) traPendiente += 1;
      if (inv.esMenor) menores += 1;
    }));
    const kpi = (label, value, color) => (
      <div style={{ flex: '1 1 0', minWidth: '92px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 12px', textAlign: 'center' }}>
        <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color }}>{value}</div>
        <div style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, marginTop: '2px' }}>{label}</div>
      </div>
    );
    // KPIs relevantes arriba — sin "hallazgos" para Seguridad/Anfitrión (top only)
    return (
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {kpi('Huéspedes', total, theme.colors.text)}
        {kpi('Verificados', verificados, theme.colors.success)}
        {kpi('TRA/SIRE pendiente', traPendiente, theme.colors.warning)}
        {kpi('Menores', menores, theme.colors.secondary)}
      </div>
    );
  };

  const statusTabsForTipo = tipoTab === 'huespedes' ? HUESPEDES_TABS : (rolActivo === 'guardia' ? GUARDIA_TABS : TABS);

  const accesoBloqueado = rolActivo === 'propietario' && !esResidente;

  const handleTipoTabChange = (value) => {
    setTipoTab(value);
    setActiveTab('Todas');
    setVistaSub('lista');
    setVisitaListaDetalle(null);
    setReservaDetail(null);
    setReservaGuardia(null);
  };

  const handleEstado = (estado) => {
    actualizarEstadoVisita(menuItem.id, estado);
    if (estado === 'Aceptado' && menuItem) {

    }
    setMenuItem(null);
  };

  const handleEliminar = () => {
    eliminarVisita(deleteItem.id);
    setDeleteItem(null);
  };

  const renderTarjetaVisitaNormal = (item, onOpen) => (
    <div
      key={item.id}
      onClick={onOpen}
      style={{
        background: theme.colors.bgCard,
        borderRadius: theme.radius.xl,
        padding: '14px 16px',
        boxShadow: theme.shadows.card,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <img
            src={tipoVisitaIcons[item.tipo]}
            alt={TIPO_LABELS[item.tipo]}
            style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
              {item.esEvento ? item.nombreEvento : item.nombre}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px' }}>
              {item.torre || item.depto ? `${item.torre} - ${item.depto}` : 'Sin departamento asociado'} · {TIPO_LABELS[item.tipo]}
              {rolActivo === 'administrador' && !item.torre && !item.depto && (
                <span style={{ marginLeft: '6px', fontSize: theme.fonts.sizes['2xs'], fontWeight: theme.fonts.weights.bold, color: '#1E40AF', background: '#DBEAFE', padding: '1px 6px', borderRadius: theme.radius.full }}>Administración</span>
              )}
            </div>
            {item.tipo === 'temporal' && item.ci && (
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>
                DNI: {item.ci}
              </div>
            )}
            {item.tipo === 'permanente' && (
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px' }}>
                Registro permanente · {item.diasLaborales || 'Lun – Vie'} · Vigencia: {item.fechaDesde}{item.fechaHasta ? ` a ${item.fechaHasta}` : ''}
              </div>
            )}
            {(item.tipo === 'temporal' || item.tipo === 'permanente') && item.profesion && (
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>
                Profesión: {item.profesion}{item.profesionOtro ? ` (${item.profesionOtro})` : ''}
              </div>
            )}
          </div>
        </div>
        {(esAdminRol || esGuardiaRol) && (
          <button
            onClick={e => { e.stopPropagation(); setParkingSpot(''); setParkingTarget({ visitaId: item.id, invitadoIdx: -1, nombre: item.esEvento ? item.nombreEvento : item.nombre, torre: item.torre, depto: item.depto }); setShowAsignarEstacionamiento(true); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '16px', padding: '4px', flexShrink: 0 }}
            title="Asignar estacionamiento"
          >
            🅿️
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); setMenuItem(item); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '20px', padding: '4px', flexShrink: 0 }}
        >
          ⋮
        </button>
      </div>

      {/* Chips: notificación + vehículo/placa */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
        {item.tipoNotificacion && (
          <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: '#F3F4F6', fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            🔔 {item.tipoNotificacion === 'notificar-y-anunciar' ? 'Notificar y anunciar' : 'Notificar'}
          </span>
        )}
        {item.tieneVehiculo && (
          <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            🚗 {item.vehiculos?.length > 0 ? item.vehiculos.map(v => v.placa).filter(Boolean).join(', ') : 'Con vehículo'}
          </span>
        )}
        <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary }}>
          📅 {textoFechaChip(item)}
        </span>
        {spotDeVisita(item.id) && (
          <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: '#F0FDF4', fontSize: theme.fonts.sizes['2xs'], color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            🅿️ {spotDeVisita(item.id)}
          </span>
        )}
      </div>

      {/* Información de ingreso: quién autorizó, ingreso/salida, anotaciones */}
      <BloqueInfoVisitaNormal item={item} compact />
    </div>
  );

  return (
    <AppShell>
      {accesoBloqueado ? (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base, marginTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <p>No tienes acceso a Visitas. Solo los Residentes pueden usar esta función.</p>
          <p style={{ fontSize: theme.fonts.sizes.sm, marginTop: '8px' }}>Si eres Propietario, declárate como Residente desde Configuración.</p>
        </div>
      ) : (<>
      <PageHeader
        title="Visitas"
        onBack={fromHome ? () => navigate('/', { replace: true }) : undefined}
        action={
          <ModuloHeaderInfo helpKey="visitas" />
        }
      />

      <ModuloGate helpKey="visitas">
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!huespedDisponible && (
          <div style={{ background: '#F3F4F6', borderRadius: theme.radius.lg, padding: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: `1px solid ${theme.colors.border}` }}>
            <span style={{ fontSize: '20px' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.textSecondary }}>Huésped Temporal — Requiere suscripción</div>
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>Puedes activarlo desde Configuración &gt; Huéspedes Temporales o tocando el card Huésped Temporal aquí mismo para suscribirte.</div>
            </div>
          </div>
        )}
        {/* Tipos de visita directos para registrar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {(rolActivo === 'guardia' || rolActivo === 'huesped-temporal' || rolActivo === 'administrador'
            ? ['amigos', 'temporal']
            : ['amigos', 'temporal', 'permanente', 'huesped-temporal']
          ).map(id => {
            const esHuesped = id === 'huesped-temporal';
            const bloqueado = esHuesped && !huespedDisponible;
            return (
            <button
              key={id}
              onClick={() => { if (bloqueado) { setShowSuscripcionModal(true); return; } navigate('/visitas/nuevo', { state: { tipoPreseleccionado: id } }); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`, background: bloqueado ? '#F3F4F6' : theme.colors.bgCard,
                boxShadow: theme.shadows.card, cursor: bloqueado ? 'pointer' : 'pointer', fontFamily: theme.fonts.family,
                textAlign: 'left', opacity: bloqueado ? 0.6 : 1, filter: bloqueado ? 'grayscale(0.6)' : 'none',
              }}
            >
              <img src={tipoVisitaIcons[id]} alt={TIPO_LABELS[id]} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{TIPO_LABELS[id]} {bloqueado ? '🔒' : ''}</span>
            </button>
          );})}
        </div>

        {/* Type tabs: Visitas / Huéspedes */}
        <Tabs tabs={TIPO_TABS} active={tipoTab} onChange={handleTipoTabChange} centered />

        {/* Sub-vista dentro de cada tab: Lista (cards) o Calendario.
            Control segmentado compacto y neutral para que quede subordinado
            a los tabs principales (Visitas / Huéspedes), que son los que
            deben llevar la jerarquía visual. */}
        {!sinCalendario && (
          <div style={{ alignSelf: 'center', display: 'inline-flex', background: theme.colors.bgMuted, borderRadius: theme.radius.full, padding: '3px', gap: '2px' }}>
            {[
              { value: 'lista', label: 'Lista', Icon: List },
              { value: 'calendario', label: 'Calendario', Icon: Calendar },
            ].map(op => {
              const active = vistaSub === op.value;
              return (
                <button
                  key={op.value}
                  onClick={() => setVistaSub(op.value)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.xs,
                    fontWeight: active ? theme.fonts.weights.bold : theme.fonts.weights.medium,
                    padding: '6px 16px',
                    borderRadius: theme.radius.full,
                    background: active ? theme.colors.bgCard : 'transparent',
                    color: active ? theme.colors.text : theme.colors.textSecondary,
                    boxShadow: active ? theme.shadows.card : 'none',
                    transition: 'all 150ms',
                  }}
                >
                  <op.Icon size={14} />
                  {op.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Filter card — visible solo en vista Lista */}
        {vistaSub === 'lista' && (
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <SearchBar value={search} onChange={setSearch} />
          {tipoTab === 'huespedes' && (
            <div style={{ marginTop: '10px' }}>
              <StatusTabs
                tabs={statusTabsForTipo}
                active={activeTab}
                onChange={tab => setActiveTab(tab || 'Todas')}
                centered
              />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                background: theme.colors.bgMuted,
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '24px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms, background 200ms',
              }}
              aria-label={filterOpen ? 'Cerrar filtros' : 'Abrir filtros'}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tipoTab !== 'huespedes' && (
                <SelectField label="Categoría" value={tipoFilter === 'Todos' ? '' : tipoFilter} options={TIPOS} onChange={setTipoFilter} />
              )}
              {/* Date filters stacked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { const h = new Date().toISOString().slice(0, 10); setFechaDesdeFilter(h); setFechaHastaFilter(h); }} style={chipFecha(fechaDesdeFilter && fechaDesdeFilter === new Date().toISOString().slice(0, 10))}>Hoy</button>
                  <button onClick={() => { const m = new Date(Date.now() + 86400000).toISOString().slice(0, 10); setFechaDesdeFilter(m); setFechaHastaFilter(m); }} style={chipFecha(false)}>Mañana</button>
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha desde</div>
                  <div style={{ width: '100%', overflow: 'hidden', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, background: theme.colors.bgCard }}>
                    <input
                      type="date"
                      value={fechaDesdeFilter}
                      onChange={e => setFechaDesdeFilter(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        maxWidth: '100%',
                        padding: '11px 14px',
                        border: 'none',
                        fontSize: theme.fonts.sizes.sm,
                        fontFamily: theme.fonts.family,
                        color: theme.colors.text,
                        background: 'transparent',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha hasta</div>
                  <div style={{ width: '100%', overflow: 'hidden', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, background: theme.colors.bgCard }}>
                    <input
                      type="date"
                      value={fechaHastaFilter}
                      onChange={e => setFechaHastaFilter(e.target.value)}
                      style={{
                        display: 'block',
                        width: '100%',
                        minWidth: 0,
                        maxWidth: '100%',
                        padding: '11px 14px',
                        border: 'none',
                        fontSize: theme.fonts.sizes.sm,
                        fontFamily: theme.fonts.family,
                        color: theme.colors.text,
                        background: 'transparent',
                        outline: 'none',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Filtro por piso/torre — solo Seguridad y Administrador */}
              {puedeFiltrarTorrePiso && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Torre</div>
                    <SelectField value={torreFilter} options={['', ...torres]} onChange={setTorreFilter} placeholder="Torre" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Departamento</div>
                    <SelectField value={deptoFilter} options={['', ...departamentos]} onChange={setDeptoFilter} placeholder="Depto" />
                  </div>
                </div>
              )}
            </div>
          )}
          {algunFiltroActivo && (
            <button
              onClick={() => { setSearch(''); setFechaDesdeFilter(''); setFechaHastaFilter(''); setTorreFilter(''); setDeptoFilter(''); setTipoFilter('Todos'); }}
              style={{
                background: theme.colors.bgMuted,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.full,
                padding: '8px 16px',
                fontSize: theme.fonts.sizes.xs,
                color: theme.colors.textSecondary,
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                alignSelf: 'center',
                marginTop: '8px',
              }}
            >
               Limpiar filtros
             </button>
           )}
           </div>
        )}

        {/* Calendar — reservas del tab activo (Visitas o Huéspedes) con color según estado */}
        {vistaSub === 'calendario' && (() => {
          const hoy = new Date(calendarioMonth);
          const año = hoy.getFullYear();
          const mes = hoy.getMonth();
          const primerDia = new Date(año, mes, 1).getDay();
          const diasEnMes = new Date(año, mes + 1, 0).getDate();
          const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const estadoColor = {
            Pendiente: theme.colors.textMuted,
            Aceptado: theme.colors.secondary,
            Rechazado: theme.colors.danger,
            Ingresado: theme.colors.success,
          };
          const visitasEnMes = visitas.filter(v => {
            if (!v.fechaDesde) return false;
            if (tipoTab === 'huespedes' ? v.tipo !== 'huesped-temporal' : v.tipo === 'huesped-temporal') return false;
            const [d, m, y] = v.fechaDesde.split('/');
            const fecha = new Date(+y, +m - 1, +d);
            return fecha.getMonth() === mes && fecha.getFullYear() === año;
          });
          const handleClickCalVisita = (v) => {
            setVistaSub('lista');
            if (v.tipo === 'huesped-temporal') {
              setTipoTab('huespedes');
              setReservaDetail(v);
            } else {
              setTipoTab('visitas');
              if (esVisitaUnicaPersona(v)) {
                setDetalleItem(v);
                setDetallePersonaIdx(null);
              } else {
                setVisitaListaDetalle(v);
              }
            }
          };
          const GAP = 1;
          const CELL_HEIGHT = 80;
          return (
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, boxShadow: theme.shadows.card }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                <button onClick={() => setCalendarioMonth(new Date(año, mes - 1, 1))} aria-label="Mes anterior" style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.text, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px' }}><ChevronLeft size={22} /></button>
                <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{hoy.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                <button onClick={() => setCalendarioMonth(new Date(año, mes + 1, 1))} aria-label="Mes siguiente" style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.text, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '44px' }}><ChevronRight size={22} /></button>
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: `${GAP}px`, background: theme.colors.borderLight, padding: '0 8px 8px', position: 'relative' }}>
                  {diasSemana.map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted, padding: '6px 0', fontWeight: theme.fonts.weights.semibold }}>{d}</div>
                  ))}
                  {Array.from({ length: primerDia }, (_, i) => (
                    <div key={`empty-${i}`} style={{ height: `${CELL_HEIGHT}px`, padding: '4px', border: 'none' }} />
                  ))}
                  {Array.from({ length: diasEnMes }, (_, i) => {
                    const dia = i + 1;
                    return (
                      <div key={dia} style={{ height: `${CELL_HEIGHT}px`, padding: '4px', border: 'none', position: 'relative' }}>
                        <div style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{dia}</div>
                        {visitasEnMes.filter(v => {
                          if (!v.fechaDesde) return false;
                          const [d1] = v.fechaDesde.split('/');
                          return parseInt(d1) === dia;
                        }).map((v, idx) => {
                          let span = 1;
                          if (v.fechaHasta) {
                            const [d1] = v.fechaDesde.split('/');
                            const [d2] = v.fechaHasta.split('/');
                            const end = Math.min(parseInt(d2), diasEnMes);
                            span = end - parseInt(d1) + 1;
                          }
                          const color = estadoColor[v.estado] || theme.colors.textMuted;
                          return (
                            <div
                              key={v.id}
                              onClick={() => handleClickCalVisita(v)}
                              style={{
                                position: 'absolute',
                                top: `${22 + idx * 24}px`,
                                left: 0,
                                width: `calc(100% * ${span} + ${GAP}px * ${span - 1})`,
                                height: '20px',
                                background: color,
                                borderRadius: '999px',
                                padding: '0 8px',
                                display: 'flex',
                                alignItems: 'center',
                                zIndex: 1,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                fontSize: theme.fonts.sizes['2xs'],
                                color: '#fff',
                                fontWeight: theme.fonts.weights.medium,
                              }}
                              title={v.nombre}
                            >
                              {v.nombre}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* List — guardia: primero ve las reservas; al tocar una entra a la lista de huéspedes (15b) */}
        {vistaSub === 'lista' && esGuardiaRol && reservaGuardia && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            <button
              onClick={() => setReservaGuardia(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm, color: theme.colors.primary, fontWeight: theme.fonts.weights.semibold, alignSelf: 'flex-start' }}
            >
              ← Volver a reservas
            </button>
          </div>
        )}
        {vistaSub === 'lista' && esGuardiaRol && reservaGuardia && personasDeReserva(reservaGuardia).map((p, pi) => (
            <div
              key={`${p.base.id}-${pi}`}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                overflow: 'hidden',
                boxShadow: theme.shadows.card,
              }}
            >
              <div style={{ padding: '14px 16px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <img
                    src={tipoVisitaIcons[p.base.tipo]}
                    alt={TIPO_LABELS[p.base.tipo]}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                        {p.persona.nombre}
                      </span>
{p.base.tipo === 'huesped-temporal' && <Badge status={statusForGuardia(p.base.estado)} />}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.base.torre} - {p.base.depto} · {TIPO_LABELS[p.base.tipo] || p.base.tipo}
                    </div>
                  </div>
                </div>
                {p.base.tipo === 'huesped-temporal' && (
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '4px' }}>
                    Huésped responsable: {p.base.nombre}
                  </div>
                )}
                {/* Foto extraída del documento con marca de agua (solo Guardia, huésped-temporal) */}
                {p.base.tipo === 'huesped-temporal' && (
                  <div style={{
                    width: '100%', height: '90px', marginTop: '8px',
                    borderRadius: theme.radius.md,
                    background: 'linear-gradient(135deg, #E8EAF6, #C5CAE9)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                    border: `1px solid ${theme.colors.border}`,
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    <div style={{ fontSize: '8px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                      Foto extraída del documento
                    </div>
                    <div style={{
                      position: 'absolute', bottom: '3px', left: 0, right: 0, textAlign: 'center',
                      fontSize: '8px', color: theme.colors.textMuted, background: 'rgba(255,255,255,0.8)',
                      padding: '1px 3px', transform: 'rotate(-15deg)', letterSpacing: '1px',
                    }}>
                      {usuario?.nombre || 'Roberto Hornado'} · Portería
                    </div>
                  </div>
                )}
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>📅 {p.base.fechaDesde}{p.base.fechaHasta ? ` a ${p.base.fechaHasta}` : ''}</span>
                  {p.persona.horaSalida && (
                    <span style={{
                      fontSize: '9px', padding: '1px 5px', borderRadius: theme.radius.full,
                      background: '#FEF3C7', color: '#92400E', fontWeight: theme.fonts.weights.semibold,
                      display: 'inline-flex', alignItems: 'center', gap: '2px',
                    }}>
                      ⚠ Salida
                    </span>
                  )}
                </div>
                {/* Campos Guardia — no-huésped-temporal */}
                {p.base.tipo !== 'huesped-temporal' && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {/* Teléfono del residente solo si "Notificar y anunciar" */}
                    {p.base.tipoNotificacion === 'notificar-y-anunciar' && p.base.telefonoResidente && (
                      <a
                        href={`tel:${p.base.telefonoResidente}`}
                        onClick={e => e.stopPropagation()}
                        style={{ textDecoration: 'none', padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.primaryLight, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.primary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        📞 {p.base.telefonoResidente}
                      </a>
                    )}
                    {/* Vehículo / placa */}
                    {p.base.tieneVehiculo && (
                      <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        🚗 {p.base.vehiculos?.length > 0 ? p.base.vehiculos.map(v => v.placa).filter(Boolean).join(', ') : 'Con vehículo'}
                      </span>
                    )}
                    {/* DNI para Proveedor Temporal (nunca para amigos) */}
                    {p.base.tipo === 'temporal' && p.base.ci && (
                      <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        🆔 DNI: {p.base.ci}
                      </span>
                    )}
                    {/* Aviso de estacionamiento */}
                    {estacionamientosVisitantes && estacionamientosVisitantes.total > 0 && (
                      <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#F0FDF4' : '#FEF2F2', fontSize: theme.fonts.sizes['2xs'], color: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#166534' : '#991B1B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        🅿️ {estacionamientosVisitantes.total - estacionamientosVisitantes.ocupados} libres
                      </span>
                    )}
                  </div>
                )}
                {/* Controles Guardia — huésped-temporal en misma línea */}
                {p.base.tipo === 'huesped-temporal' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}`, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Toggle value={p.persona.llego} onChange={() => setLlegoInvitado(p.base.id, p.idx, !p.persona.llego)} />
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>
                        {p.persona.llego ? 'Llegó' : 'No llegó'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Ingreso</span>
                      <input
                        type="time"
                        value={p.persona.horaIngreso || ''}
                        onChange={e => actualizarHoraIngreso(p.base.id, p.idx, e.target.value)}
                        style={{ width: '120px', padding: '8px 10px', borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, color: theme.colors.text, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Salida</span>
                      <input
                        type="time"
                        value={p.persona.horaSalida || ''}
                        onChange={e => actualizarHoraSalida(p.base.id, p.idx, e.target.value)}
                        style={{ width: '120px', padding: '8px 10px', borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, color: theme.colors.text, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }}
                      />
                      {p.persona.horaSalida && (
                        <span
                          onClick={e => { e.stopPropagation(); const nuevaHora = prompt('Ingrese la hora aproximada de salida:'); if (nuevaHora) actualizarHoraSalida(p.base.id, p.idx, nuevaHora); }}
                          style={{ fontSize: '10px', cursor: 'pointer', color: theme.colors.warning, fontWeight: theme.fonts.weights.bold, display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 4px', borderRadius: theme.radius.sm, background: '#FEF3C7' }}
                          title="Hora inexacta"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex' }}>
                <button
                  onClick={() => { setParkingSpot(''); setParkingTarget({ visitaId: p.base.id, invitadoIdx: p.idx, nombre: p.persona.nombre, torre: p.base.torre, depto: p.base.depto }); setShowAsignarEstacionamiento(true); }}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: theme.colors.bgMuted,
                    border: 'none',
                    borderTop: `1px solid ${theme.colors.borderLight}`,
                    borderRight: `1px solid ${theme.colors.borderLight}`,
                    cursor: 'pointer',
                    fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.sm,
                    fontWeight: theme.fonts.weights.semibold,
                    color: theme.colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  🅿️ Estacionamiento
                </button>
                <button
                  onClick={() => setDetalleGuardia(p)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: theme.colors.bgMuted,
                    border: 'none',
                    borderTop: `1px solid ${theme.colors.borderLight}`,
                    cursor: 'pointer',
                    fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.sm,
                    fontWeight: theme.fonts.weights.semibold,
                    color: theme.colors.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  Ver detalles →
                </button>
              </div>
            </div>
          ))}

        {/* Vista de reservas para Guardia (15b) — con mini línea de tiempo y Torre/Depto (16/19) */}
        {vistaSub === 'lista' && esGuardiaRol && !reservaGuardia && filtered.map(item => {
          if (item.tipo !== 'huesped-temporal') {
            return renderTarjetaVisitaNormal(item, () => {
              if (item.tipo === 'permanente' || esVisitaUnicaPersona(item)) {
                const pers = personasDeReserva(item)[0];
                setDetalleGuardia(pers);
              } else {
                setReservaGuardia(item);
              }
            });
          }
          const invitadosTimeline = huespedesTimeline(item);
          return (
            <div
              key={item.id}
              onClick={() => setReservaGuardia(item)}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '14px 16px',
                boxShadow: theme.shadows.card,
                cursor: 'pointer',
                borderLeft: item.tipo === 'huesped-temporal' ? `4px solid ${colorReserva(item)}` : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <img
                    src={tipoVisitaIcons[item.tipo]}
                    alt={TIPO_LABELS[item.tipo]}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                      {item.tipo === 'huesped-temporal' ? `Reserva de ${item.nombre}` : (item.esEvento ? item.nombreEvento : item.nombre)}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px' }}>
                      {item.torre} - {item.depto} · {TIPO_LABELS[item.tipo] || item.tipo}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>📅 {item.fechaDesde}{item.fechaHasta ? ` a ${item.fechaHasta}` : ''}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>👤 {invitadosTimeline.length}</span>
                      {(item.vehiculos?.length || 0) > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🚗 {item.vehiculos.length}</span>
                      )}
                      {spotDeVisita(item.id) && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🅿️ {spotDeVisita(item.id)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {textoDiasParaCheckin(item.fechaDesde, item.fechaHasta) && (
                <div style={{ marginTop: '8px', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: (() => { const d = diasRestantes(item.fechaDesde); const dOut = item.fechaHasta ? diasRestantes(item.fechaHasta) : Infinity; if (d > 0) return d <= 3 ? theme.colors.danger : theme.colors.secondary; if (dOut < 0) return theme.colors.textSecondary; return theme.colors.secondary; })(), background: (() => { const d = diasRestantes(item.fechaDesde); const dOut = item.fechaHasta ? diasRestantes(item.fechaHasta) : Infinity; if (d > 0) return d <= 3 ? theme.colors.dangerLight : theme.colors.secondaryLight; if (dOut < 0) return theme.colors.bgMuted; return theme.colors.secondaryLight; })(), padding: '6px 10px', borderRadius: theme.radius.full, textAlign: 'center' }}>
                  {textoDiasParaCheckin(item.fechaDesde, item.fechaHasta)}
                </div>
              )}
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
                <TimelineReservaHuespedes invitados={invitadosTimeline} />
              </div>
            </div>
          );
        })}

        {/* Barras de consumo de verificaciones (reemplazan los KPIs) — vista general huéspedes.
            Solo Guardia de Seguridad mantiene sus KPIs numéricos; el resto (incl. Administrador)
            usa el mismo look & feel que el Residente/Anfitrión. */}
        {tipoTab === 'huespedes' && !reservaDetail && (
          rolActivo === 'guardia'
            ? renderKpiHuespedes()
            : (
              <VerificacionesConsumo
                verificaciones={configHuespedesTemporales[ubicacionActiva?.id]?.verificaciones}
                suscripcionActiva={suscripcionActiva}
              />
            )
        )}

        {/* List — normal roles: card per reservation for huesped-temporal */}
        {vistaSub === 'lista' && rolActivo !== 'guardia' && (visitaListaDetalle ? (
          /* Vista lista de personas para visita normal con múltiples registrados */
          <div key="visita-lista-detalle" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setVisitaListaDetalle(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: theme.fonts.family,
                fontSize: theme.fonts.sizes.sm, color: theme.colors.primary, fontWeight: theme.fonts.weights.semibold,
                alignSelf: 'flex-start',
              }}
            >
              ← Volver a visitas
            </button>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.semibold }}>
              {visitaListaDetalle.esEvento ? visitaListaDetalle.nombreEvento : visitaListaDetalle.nombre} · {TIPO_LABELS[visitaListaDetalle.tipo]} · {visitaListaDetalle.fechaDesde}{visitaListaDetalle.fechaHasta ? ` a ${visitaListaDetalle.fechaHasta}` : ''}
            </div>
            {personasDeVisitaNormal(visitaListaDetalle).map((p, pi) => (
              <div
                key={`${visitaListaDetalle.id}-${pi}`}
                onClick={() => { setDetalleItem(visitaListaDetalle); setDetallePersonaIdx(p.idx); }}
                style={{
                  background: theme.colors.bgCard,
                  borderRadius: theme.radius.xl,
                  padding: '14px 16px',
                  boxShadow: theme.shadows.card,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <img
                    src={tipoVisitaIcons[visitaListaDetalle.tipo]}
                    alt={TIPO_LABELS[visitaListaDetalle.tipo]}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                      {p.nombre} {p.esTitular && <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted }}>(Titular)</span>}
                    </div>
                    {p.ci && <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>DNI: {p.ci}</div>}
                    {p.horaIngreso && <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Ingreso: {p.horaIngreso}{p.horaSalida ? ` · Salida: ${p.horaSalida}` : ''}</div>}
                  </div>
                </div>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.primary }}>Ver detalles →</span>
              </div>
            ))}
          </div>
        ) : reservaDetail ? (
          /* Vista detalle de reserva HT — reemplaza la lista */
          <div key="reserva-detail" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setReservaDetail(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: theme.fonts.family,
                fontSize: theme.fonts.sizes.sm, color: theme.colors.primary, fontWeight: theme.fonts.weights.semibold,
                alignSelf: 'flex-start',
              }}
            >
              ← Volver a visitas
            </button>
            {reservaDetail.invitados?.map((inv, idx) => {
              const t = inv.timeline || {};
              const completados = progresoInvitado(inv);
              return (
                <div key={idx} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, borderLeft: inv.esMenor ? `4px solid ${theme.colors.warning}` : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{inv.nombre}</div>
                    {inv.esMenor && (
                      <span style={{ fontSize: theme.fonts.sizes['2xs'], fontWeight: theme.fonts.weights.bold, color: '#92400E', background: '#FEF3C7', padding: '2px 7px', borderRadius: theme.radius.full, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        👶 Menor
                      </span>
                    )}
                  </div>
                  {/* Mini timeline dots conectados por una línea */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '4px' }}>
                    {TIMELINE_STEPS.map((step, si) => {
                      const st = t[step.key];
                      const done = step.key === 'verificacionPasada' ? (t.verificacionAprobada === true || !!st) : !!st;
                      const isSpecial = step.key === 'terminosAceptados' && t.terminosAprobadoPor === 'anfitrion';
                      const isLast = si === TIMELINE_STEPS.length - 1;
                      return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                          <div title={`${step.label}${isSpecial ? ' (aprobado por anfitrión)' : ''}`} style={{ width: '12px', height: '12px', borderRadius: '50%', background: done ? (isSpecial ? theme.colors.secondary : theme.colors.success) : theme.colors.border, flexShrink: 0, zIndex: 1 }} />
                          {!isLast && (
                            <div style={{ flex: 1, height: '2px', background: done ? theme.colors.success : theme.colors.borderLight }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {renderGuestDetailInline(inv, idx, reservaDetail)}
                </div>
              );
            })}
          </div>
        ) : filtered.flatMap(item => {
          if (item.tipo === 'huesped-temporal') {
            const color = colorReserva(item);
            return [(
              <div
                key={item.id}
                onClick={() => setReservaDetail(item)}
                style={{
                  background: theme.colors.bgCard,
                  borderRadius: theme.radius.xl,
                  padding: '14px 16px',
                  boxShadow: theme.shadows.card,
                  cursor: 'pointer',
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <img
                      src={tipoVisitaIcons[item.tipo]}
                      alt={TIPO_LABELS[item.tipo]}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                        Reserva de {item.nombre}
                      </div>
                      <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px' }}>
                        {(esAdminRol || !mostrarDisenoReserva) ? `${item.torre} - ${item.depto} · ${TIPO_LABELS[item.tipo]}` : TIPO_LABELS[item.tipo]}
                      </div>
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{item.fechaDesde} a {item.fechaHasta}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>👤 {item.invitados?.length || 0}</span>
                        {(item.vehiculos?.length || 0) > 0 && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🚗 {item.vehiculos.length}</span>
                        )}
                        {spotDeVisita(item.id) && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>🅿️ {spotDeVisita(item.id)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {esAdminRol && (
                    <button
                      onClick={e => { e.stopPropagation(); setParkingSpot(''); setParkingTarget({ visitaId: item.id, invitadoIdx: -1, nombre: item.nombre, torre: item.torre, depto: item.depto }); setShowAsignarEstacionamiento(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '16px', padding: '4px', flexShrink: 0 }}
                      title="Asignar estacionamiento"
                    >
                      🅿️
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setMenuItem(item); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '20px', padding: '4px', flexShrink: 0 }}
                  >
                    ⋮
                  </button>
                </div>
                {textoDiasParaCheckin(item.fechaDesde, item.fechaHasta) && (
                  <div style={{ marginTop: '8px', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: (() => { const d = diasRestantes(item.fechaDesde); const dOut = item.fechaHasta ? diasRestantes(item.fechaHasta) : Infinity; if (d > 0) return d <= 3 ? theme.colors.danger : theme.colors.secondary; if (dOut < 0) return theme.colors.textSecondary; return theme.colors.secondary; })(), background: (() => { const d = diasRestantes(item.fechaDesde); const dOut = item.fechaHasta ? diasRestantes(item.fechaHasta) : Infinity; if (d > 0) return d <= 3 ? theme.colors.dangerLight : theme.colors.secondaryLight; if (dOut < 0) return theme.colors.bgMuted; return theme.colors.secondaryLight; })(), padding: '6px 10px', borderRadius: theme.radius.full, textAlign: 'center' }}>
                    {textoDiasParaCheckin(item.fechaDesde, item.fechaHasta)}
                  </div>
                )}
                {/* Resumen por huésped — siempre visible para mantener la línea de tiempo consistente (16) */}
                {mostrarDisenoReserva ? (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
                      <TimelineReservaHuespedes invitados={huespedesTimeline(item)} />
                    </div>
                  ) : (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {huespedesTimeline(item).map((inv, idx) => {
                          const completados = progresoInvitado(inv);
                          return (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                                {TIMELINE_STEPS.map((step, si) => {
                                  const t = inv.timeline || {};
                                  const done = si < 4 ? !!t[step.key] : !!t[step.key];
                                  const isSpecial = step.key === 'terminosAceptados' && t.terminosAprobadoPor === 'anfitrion';
                                  return (
                                    <div
                                      key={step.key}
                                      title={`${step.label}${isSpecial ? ' (aprobado por anfitrión)' : ''}`}
                                      style={{
                                        width: '14px', height: '14px', borderRadius: '50%',
                                        background: done ? (isSpecial ? theme.colors.secondary : theme.colors.success) : theme.colors.border,
                                        flexShrink: 0,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            )];
          }
          return [(
            <div
              key={item.id}
              onClick={() => {
                if (esVisitaUnicaPersona(item)) {
                  setDetalleItem(item);
                  setDetallePersonaIdx(null);
                } else {
                  setVisitaListaDetalle(item);
                }
              }}
              style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '14px 16px',
                boxShadow: theme.shadows.card,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <img
                    src={tipoVisitaIcons[item.tipo]}
                    alt={TIPO_LABELS[item.tipo]}
                    style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                      {item.esEvento ? item.nombreEvento : item.nombre}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '1px' }}>
                      {item.torre || item.depto ? `${item.torre} - ${item.depto}` : 'Sin departamento asociado'} · {TIPO_LABELS[item.tipo]}
                      {rolActivo === 'administrador' && !item.torre && !item.depto && (
                        <span style={{ marginLeft: '6px', fontSize: theme.fonts.sizes['2xs'], fontWeight: theme.fonts.weights.bold, color: '#1E40AF', background: '#DBEAFE', padding: '1px 6px', borderRadius: theme.radius.full }}>Administración</span>
                      )}
                    </div>
                    {/* DNI solo para Proveedor Temporal (lo ingresó él) */}
                    {item.tipo === 'temporal' && item.ci && (
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>
                        DNI: {item.ci}
                      </div>
                    )}
                    {item.tipo === 'permanente' && (
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px' }}>
                        Registro permanente · {item.diasLaborales || 'Lun – Vie'} · Vigencia: {item.fechaDesde}{item.fechaHasta ? ` a ${item.fechaHasta}` : ''}
                      </div>
                    )}
                    {(item.tipo === 'temporal' || item.tipo === 'permanente') && item.profesion && (
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>
                        Profesión: {item.profesion}{item.profesionOtro ? ` (${item.profesionOtro})` : ''}
                      </div>
                    )}
                  </div>
                </div>
                {(esAdminRol || esGuardiaRol) && (
                  <button
                    onClick={e => { e.stopPropagation(); setParkingSpot(''); setParkingTarget({ visitaId: item.id, invitadoIdx: -1, nombre: item.esEvento ? item.nombreEvento : item.nombre, torre: item.torre, depto: item.depto }); setShowAsignarEstacionamiento(true); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '16px', padding: '4px', flexShrink: 0 }}
                    title="Asignar estacionamiento"
                  >
                    🅿️
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setMenuItem(item); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '20px', padding: '4px', flexShrink: 0 }}
                >
                  ⋮
                </button>
              </div>

              {/* Chips: notificación + vehículo/placa */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {item.tipoNotificacion && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: '#F3F4F6', fontSize: theme.fonts.sizes['2xs'],
                    color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px',
                  }}>
                    🔔 {item.tipoNotificacion === 'notificar-y-anunciar' ? 'Notificar y anunciar' : 'Notificar'}
                  </span>
                )}
                {item.tieneVehiculo && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'],
                    color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px',
                  }}>
                    🚗 {item.vehiculos?.length > 0 ? item.vehiculos.map(v => v.placa).filter(Boolean).join(', ') : 'Con vehículo'}
                  </span>
                )}
                <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary }}>
                  📅 {textoFechaChip(item)}
                </span>
                {spotDeVisita(item.id) && (
                  <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: '#F0FDF4', fontSize: theme.fonts.sizes['2xs'], color: '#166534', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    🅿️ {spotDeVisita(item.id)}
                  </span>
                )}
              </div>

              {/* Información de ingreso: quién autorizó, ingreso/salida, anotaciones */}
              <BloqueInfoVisitaNormal item={item} compact />
              </div>
            )];
        }))}

        {/* Bulk TRA/SIRE action */}
        {tipoTab === 'huespedes' && selectedTraSire.length > 0 && (
          <div style={{
            background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px 16px',
            boxShadow: theme.shadows.card, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
              {selectedTraSire.length} seleccionado{selectedTraSire.length > 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSelectedTraSire([])}
                style={{
                  padding: '6px 14px', borderRadius: theme.radius.full,
                  background: theme.colors.bgMuted, border: `1px solid ${theme.colors.border}`,
                  cursor: 'pointer', fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary,
                }}
              >
                Limpiar
              </button>
              <button
                onClick={() => {
                  selectedTraSire.forEach(key => {
                    const [visitaId, invitadoIdx] = key.split('-');
                    const idx = parseInt(invitadoIdx);
                    const visita = visitas.find(v => v.id === parseInt(visitaId));
                    if (visita && visita.invitados[idx] && !visita.invitados[idx].traSireReported) {
                      reportarTraSire(parseInt(visitaId), idx);
                    }
                  });
                  addToast(`Reporte TRA/SIRE enviado para ${selectedTraSire.length} huésped(es)`, 'success');
                  setSelectedTraSire([]);
                }}
                style={{
                  padding: '6px 14px', borderRadius: theme.radius.full,
                  background: theme.colors.secondary, color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                }}
              >
                Reportar TRA/SIRE
              </button>
            </div>
          </div>
        )}

        {/* Row counter */}
        {vistaSub === 'lista' && (
          <div style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, padding: '8px 0' }}>
            Mostrando {filtered.length} de {visitas.length} visitas
          </div>
        )}
      </div>
      </ModuloGate>

      {/* Edit bottom sheet — Card de Reserva (Huésped Temporal): solo Editar y Eliminar */}
      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        {menuItem?.tipo === 'huesped-temporal' ? (
          <>
            <BottomSheetOption label="Editar" onPress={() => { setMenuItem(null); navigate('/visitas/nuevo'); }} />
            <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
          </>
        ) : (
          <>
            <BottomSheetOption label="Denunciar / Reportar" variant="primary" onPress={() => { setMenuItem(null); navigate('/perfil/soporte/reclamos/nuevo', { state: { categoriaPreseleccionada: 'Denuncia entre departamentos', titulo: `Denuncia: ${menuItem?.nombre || ''}`, descripcion: `Reporte desde visitas contra: ${menuItem?.nombre || ''} (CI: ${menuItem?.ci || ''})` } }); }} />
            <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
          </>
        )}
      </BottomSheet>

      {/* Delete modal — mismo estilo que Correspondencia */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar visita">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, textAlign: 'center', color: theme.colors.text }}>
            ¿ Seguro que desea eliminar ?
          </p>
          {deleteItem && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={tipoVisitaIcons[deleteItem.tipo]}
                  alt={TIPO_LABELS[deleteItem.tipo]}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>
                    {deleteItem.esEvento ? deleteItem.nombreEvento : deleteItem.nombre}
                  </div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI: {deleteItem.ci}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                {deleteItem.tipo === 'huesped-temporal' && <Badge status={deleteItem.estado} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  <span>🕐</span>
                  <span>{deleteItem.fechaDesde}</span>
                </div>
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleEliminar}>Eliminar</Button>
        </div>
      </Modal>

      {/* Detail modal — document verification enhanced */}
      <Modal
        isOpen={!!detalleItem}
        onClose={() => { setDetalleItem(null); setDetallePersonaIdx(null); }}
        title={detallePersonaIdx !== null && detallePersonaIdx >= 0 && detalleActual?.invitados[detallePersonaIdx] ? `Huésped: ${detalleActual.invitados[detallePersonaIdx].nombre}` : (detalleActual?.tipo === 'huesped-temporal' ? `Reserva: ${detalleActual?.reserva || ''}` : `Visita: ${detalleItem?.fechaDesde || ''}`)}
      >
        {detalleActual && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={tipoVisitaIcons[detalleActual.tipo]}
                  alt={TIPO_LABELS[detalleActual.tipo]}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>
                    {detallePersonaIdx !== null && detallePersonaIdx >= 0 && detalleActual.invitados[detallePersonaIdx]
                      ? detalleActual.invitados[detallePersonaIdx].nombre
                      : detalleActual.nombre}
                  </div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{detalleActual.torre} - {detalleActual.depto}</div>
                </div>
              </div>

              {/* Datos de la visita — todas las visitas normales (no huésped temporal) */}
              {detalleActual.tipo !== 'huesped-temporal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 14px' }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                    Datos de la visita
                  </div>
                  {detalleActual.profesion && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      Profesión: {detalleActual.profesion}{detalleActual.profesionOtro ? ` (${detalleActual.profesionOtro})` : ''}
                    </div>
                  )}
                  {detalleActual.ci && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      Identificación: {detalleActual.ci}
                    </div>
                  )}
                  {/* Quién autorizó / registró el ingreso */}
                  {textoAutorizo(detalleActual) && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.text, background: '#EFF6FF', borderRadius: theme.radius.md, padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>🛡️</span>
                      <span style={{ fontWeight: theme.fonts.weights.semibold }}>{textoAutorizo(detalleActual)}</span>
                    </div>
                  )}
                  {/* Anotaciones */}
                  {detalleActual.anotacionesIngreso && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      <span style={{ fontWeight: theme.fonts.weights.semibold }}>Anotaciones ingreso:</span> {detalleActual.anotacionesIngreso}
                    </div>
                  )}
                  {detalleActual.anotacionesSalida && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      <span style={{ fontWeight: theme.fonts.weights.semibold }}>Anotaciones salida:</span> {detalleActual.anotacionesSalida}
                    </div>
                  )}
                  {/* Fotos de ingreso / salida */}
                  {(detalleActual.fotosIngreso?.length > 0 || detalleActual.fotosSalida?.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.semibold }}>📷 Fotos de ingreso / salida</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[...(detalleActual.fotosIngreso || []), ...(detalleActual.fotosSalida || [])].map((f, i) => (
                          <img key={i} src={f} alt={`foto ${i}`} style={{ width: '56px', height: '56px', borderRadius: theme.radius.md, objectFit: 'cover', border: `1px solid ${theme.colors.border}` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Parking info */}
              {(detalleActual.estacionamientosAsignados > 0 || spotsDeVisita(detalleActual.id).length > 0) && (
                <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                    🚗 Estacionamientos asignados: {Math.max(detalleActual.estacionamientosAsignados || 0, spotsDeVisita(detalleActual.id).length)}
                  </div>
                  {spotsDeVisita(detalleActual.id).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {spotsDeVisita(detalleActual.id).map((spot, i) => (
                        <span key={i} style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: '#F0FDF4', fontSize: theme.fonts.sizes['2xs'], color: '#166534', fontWeight: theme.fonts.weights.semibold, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          🅿️ {spot}
                        </span>
                      ))}
                    </div>
                  )}
                  {detalleActual.vehiculos?.length > 0 && detalleActual.vehiculos.map((v, i) => (
                    <div key={i} style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>🅿️ Vehículo {i + 1}:</span>
                      <span style={{ fontWeight: theme.fonts.weights.medium, color: theme.colors.text }}>{v.placa || 'Sin placa'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Admin: botón asignar estacionamiento — visitas normales */}
              {esAdminRol && detalleActual.tipo !== 'huesped-temporal' && (
                <button
                  onClick={() => { setParkingSpot(''); setParkingTarget({ visitaId: detalleActual.id, invitadoIdx: -1, nombre: detalleActual.nombre, torre: detalleActual.torre, depto: detalleActual.depto }); setShowAsignarEstacionamiento(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '10px', borderRadius: theme.radius.full,
                    background: theme.colors.bgMuted, color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`, cursor: 'pointer', fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                  }}
                >
                  🅿️ Asignar estacionamiento
                </button>
              )}

            {/* Invitados list — solo para huésped-temporal (6 pasos) */}
            {detalleActual.tipo === 'huesped-temporal' && detalleActual.invitados.length > 0 && (
              <div>
                <p style={{ fontWeight: theme.fonts.weights.bold, textDecoration: 'underline', marginBottom: '10px' }}>Huéspedes:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detalleActual.invitados.map((inv, i) => {
                    const t = inv.timeline || {};
                    const esAnfitrion = rolActivo === 'propietario' || rolActivo === 'inquilino-lider';
                    const puedeAprobar = esAnfitrion;
                    const verAcciones = puedeAprobar;
                    const rntCompleto = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id]?.legal?.rnt?.trim()?.length > 0 : false;
                    const stepStatus = (key) => {
                      if (key === 'terminosAceptados') {
                        if (t.terminosAceptados === true) return t.terminosAprobadoPor === 'anfitrion' ? 'aprobado-manual' : true;
                        if (t.terminosAceptados === false) return false;
                        return null;
                      }
                      if (key === 'verificacionPasada') {
                        if (t.verificacionAprobada === true) return 'aprobada';
                        return !!t[key];
                      }
                      return !!t[key];
                    };
                    const esExcepcionTc = inv.terminosExcepcion === true && t.terminosAceptados !== true;
                    return (
                      <div key={i} style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px' }}>
                        <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, marginBottom: '10px' }}>
                          {inv.nombre}
                        </div>
                        {TIMELINE_STEPS.map((step, si) => {
                          const st = stepStatus(step.key);
                          const isCompleted = st === true || st === 'aprobado-manual' || st === 'aprobada';
                          const isPending = st === null;
                          const isRejected = st === false && step.key === 'terminosAceptados';
                          const isAprobadoManual = st === 'aprobado-manual';
                          const icon = isCompleted ? '✅' : (isPending ? '⏳' : (isRejected ? '❌' : '⏳'));
                          return (
                            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: theme.colors.bgCard, borderRadius: theme.radius.md, marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', flexShrink: 0 }}>{icon}</span>
                              <span style={{ flex: 1, fontSize: theme.fonts.sizes.xs, color: theme.colors.text }}>
                                {si + 1}. {step.label}
                                {isAprobadoManual && (
                                  <span style={{ color: theme.colors.secondary, fontWeight: theme.fonts.weights.semibold, marginLeft: '4px' }}>
                                    (aprobado por anfitrión)
                                  </span>
                                )}
                                {st === 'aprobada' && (
                                  <span style={{ color: theme.colors.success, fontWeight: theme.fonts.weights.semibold, marginLeft: '4px' }}>
                                    (aprobada)
                                  </span>
                                )}
                              </span>
                              {/* Step 2 — Ver documentación */}
                              {step.key === 'documentacionCompleta' && isCompleted && inv.documentos?.length > 0 && verAcciones && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDocumentacionDetail({ invitado: inv, item: detalleActual }); }}
                                  style={{
                                    padding: '4px 10px', borderRadius: theme.radius.full,
                                    background: theme.colors.primary, color: '#fff', border: 'none',
                                    cursor: 'pointer', fontSize: theme.fonts.sizes['2xs'],
                                    fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
                                  }}
                                >
                                  Ver documentación
                                </button>
                              )}
                              {/* Step 3 — Excepción T&C */}
                              {step.key === 'terminosAceptados' && esExcepcionTc && verAcciones && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '12px', color: theme.colors.warning, fontWeight: theme.fonts.weights.bold }}>⚠</span>
                                  <button
                                    onClick={() => { aprobarTerminosManual(detalleActual.id, i); addToast('Excepción T&C aceptada para ' + inv.nombre, 'success'); }}
                                    style={{
                                      padding: '4px 10px', borderRadius: theme.radius.full,
                                      background: theme.colors.secondary, color: '#fff', border: 'none',
                                      cursor: 'pointer', fontSize: theme.fonts.sizes['2xs'],
                                      fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
                                    }}
                                  >
                                    Aceptar excepción
                                  </button>
                                </div>
                              )}
                              {/* Step 4 — Resultado de verificación + Aprobar */}
                              {step.key === 'verificacionPasada' && verAcciones && !t.verificacionAprobada && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  {t.verificacionHallazgos === true ? (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setHallazgosPopup({ persona: inv, idx: i, item: detalleActual }); }}
                                      style={{
                                        padding: '4px 10px', borderRadius: theme.radius.full,
                                        background: '#FEF3C7', color: '#92400E', border: 'none',
                                        cursor: 'pointer', fontSize: theme.fonts.sizes['2xs'],
                                        fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
                                      }}
                                    >
                                      Ver resumen
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary }}>
                                      {t.verificacionHallazgos === false ? 'Sin hallazgos' : 'Sin resultados'}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => { aprobarVerificacion(detalleActual.id, i); addToast('Verificación aprobada para ' + inv.nombre, 'success'); }}
                                    style={{
                                      padding: '4px 10px', borderRadius: theme.radius.full,
                                      background: theme.colors.success, color: '#fff', border: 'none',
                                      cursor: 'pointer', fontSize: theme.fonts.sizes['2xs'],
                                      fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
                                    }}
                                  >
                                    Aprobar
                                  </button>
                                </div>
                              )}
                              {/* Step 5 — Reportar TRA (solo si ingresó) */}
                              {step.key === 'trasideEntrada' && isCompleted && verAcciones && !inv.traSireReported && (
                                <button
                                  onClick={() => {
                                    if (!rntCompleto) { addToast('Completa tu RNT en la configuración de Huéspedes Temporales', 'warning'); return; }
                                    reportarTraSire(detalleActual.id, i);
                                    addToast('Reporte TRA enviado exitosamente', 'success');
                                  }}
                                  style={{
                                    padding: '4px 10px', borderRadius: theme.radius.full,
                                    background: theme.colors.secondary, color: '#fff', border: 'none',
                                    cursor: 'pointer', fontSize: theme.fonts.sizes['2xs'],
                                    fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
                                  }}
                                >
                                  Reportar TRA
                                </button>
                              )}
                              {/* Step 6 — Reportar SIRE (solo si salió) */}
                              {step.key === 'trasideSalida' && isCompleted && verAcciones && !inv.traSireReported && (
                                <button
                                  onClick={() => {
                                    if (!rntCompleto) { addToast('Completa tu RNT en la configuración de Huéspedes Temporales', 'warning'); return; }
                                    reportarTraSire(detalleActual.id, i);
                                    addToast('Reporte SIRE enviado exitosamente', 'success');
                                  }}
                                  style={{
                                    padding: '4px 10px', borderRadius: theme.radius.full,
                                    background: theme.colors.secondary, color: '#fff', border: 'none',
                                    cursor: 'pointer', fontSize: theme.fonts.sizes['2xs'],
                                    fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
                                  }}
                                >
                                  Reportar SIRE
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {/* TRA/SIRE — badge de estado */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
                          {inv.traSireReported ? (
                            <Badge status="Aceptado">TRA/SIRE reportado</Badge>
                          ) : (
                            <Badge status="Pendiente">TRA/SIRE pendiente</Badge>
                          )}
                        </div>
                        {/* Admin: botón asignar estacionamiento por huésped */}
                        {esAdminRol && (
                          <button
                            onClick={() => { setParkingSpot(''); setParkingTarget({ visitaId: detalleActual.id, invitadoIdx: i, nombre: inv.nombre, torre: detalleActual.torre, depto: detalleActual.depto }); setShowAsignarEstacionamiento(true); }}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              padding: '8px', borderRadius: theme.radius.full, marginTop: '8px',
                              background: theme.colors.bgMuted, color: theme.colors.text,
                              border: `1px solid ${theme.colors.border}`, cursor: 'pointer', fontFamily: theme.fonts.family,
                              fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                            }}
                          >
                            🅿️ Asignar estacionamiento
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cuerpo visitas normales (no-huésped-temporal) — vista Propietario/Anfitrión */}
            {detalleActual.tipo !== 'huesped-temporal' && (() => {
              const tipo = detalleActual.tipo;
              const notificacionLabel = detalleActual.tipoNotificacion === 'notificar-y-anunciar' ? 'Notificar y anunciar' : 'Notificar';
              let personasBase = detalleActual.invitados && detalleActual.invitados.length > 0
                ? detalleActual.invitados
                : [{ nombre: detalleActual.nombre, horaIngreso: detalleActual.horaIngreso, horaSalida: detalleActual.horaSalida }];
              // Si se eligió una persona específica desde la lista (visita con múltiples registrados), filtrar solo esa
              if (detallePersonaIdx !== null && detallePersonaIdx !== undefined) {
                if (detallePersonaIdx === -1) {
                  personasBase = [{ nombre: detalleActual.nombre, horaIngreso: detalleActual.horaIngreso, horaSalida: detalleActual.horaSalida, ci: detalleActual.ci }];
                } else if (detalleActual.invitados && detalleActual.invitados[detallePersonaIdx]) {
                  personasBase = [detalleActual.invitados[detallePersonaIdx]];
                }
              }
              const personas = personasBase;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tipo === 'permanente' && (
                    <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>Registro permanente</div>
                      <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{detalleActual.diasLaborales || 'Sin días laborales asignados'}</div>
                    </div>
                  )}
                  {personas.map((inv, i) => (
                    <div key={i} style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px' }}>
                      <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base }}>{inv.nombre}</div>
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>
                        📅 {detalleActual.fechaDesde}{detalleActual.fechaHasta ? ` a ${detalleActual.fechaHasta}` : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: '#F3F4F6', fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          🔔 {notificacionLabel}
                        </span>
                        {detalleActual.tieneVehiculo && (
                          <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgCard, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🚗 {detalleActual.vehiculos?.length > 0 ? detalleActual.vehiculos.map(v => v.placa).filter(Boolean).join(', ') : 'Con vehículo'}
                          </span>
                        )}
                        {/* DNI solo para Proveedor Temporal (lo ingresó él) */}
                        {tipo === 'temporal' && detalleActual.ci && (
                          <span style={{ padding: '2px 8px', borderRadius: theme.radius.full, background: theme.colors.bgCard, fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            🆔 DNI: {detalleActual.ci}
                          </span>
                        )}
                      </div>
                      {/* Ingreso / Salida — solo para amigos y temporal (no para permanente) */}
                      {tipo !== 'permanente' && inv.horaIngreso && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            🕐 {esPasada(detalleActual.fechaHasta || detalleActual.fechaDesde) ? 'Ingresó' : 'Ingreso'} el {detalleActual.fechaDesde} a las {inv.horaIngreso}
                          </span>
                          {inv.horaSalida && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#92400E', background: '#FEF3C7', padding: '1px 6px', borderRadius: theme.radius.full }}>
                              ⚠ Salida el {detalleActual.fechaHasta || detalleActual.fechaDesde} a las {inv.horaSalida}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Tutela - solo para Admin y Guardia si es menor de edad */}
            {detalleActual.esMenor && detalleActual.tieneTutela && (rolActivo === 'administrador' || rolActivo === 'guardia') && (
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.xl, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Documento de Tutela</span>
                </div>
                <button
                  type="button"
                  onClick={undefined}
                  style={{
                    padding: '6px 14px',
                    borderRadius: theme.radius.full,
                    background: theme.colors.secondary,
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: theme.fonts.sizes.xs,
                    fontWeight: theme.fonts.weights.semibold,
                    fontFamily: theme.fonts.family,
                  }}
                >
                  Descargar
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Documentación detail modal */}
      <Modal
        isOpen={!!documentacionDetail}
        onClose={() => setDocumentacionDetail(null)}
        title={`Documentación de ${documentacionDetail?.invitado?.nombre || ''}`}
      >
        {documentacionDetail && (() => {
          const inv = documentacionDetail.invitado;
          const item = documentacionDetail.item;
          const docLabels = {
            'cedula-anverso': 'Cédula (anverso)',
            'cedula-reverso': 'Cédula (reverso)',
            'pasaporte': 'Pasaporte',
            'tutela': 'Tutela',
          };
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Tipo de documento */}
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px' }}>
                <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '4px' }}>Tipo de documento</div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{inv.tipoDocumento || 'No especificado'}</div>
              </div>
              {/* Imágenes subidas */}
              {inv.documentos?.length > 0 && (
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '8px' }}>Imágenes del documento</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {inv.documentos.map((doc, di) => (
                      <div key={di} style={{
                        width: 'calc(50% - 4px)', minHeight: '100px',
                        borderRadius: theme.radius.md,
                        background: 'linear-gradient(135deg, #E8EAF6, #C5CAE9)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${theme.colors.border}`,
                        padding: '8px',
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        <div style={{ fontSize: '9px', color: theme.colors.textSecondary, marginTop: '4px', textAlign: 'center' }}>{docLabels[doc] || doc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Datos extraídos automáticamente */}
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px' }}>
                <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '8px' }}>Datos extraídos automáticamente</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Nombre completo</span>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{inv.nombre}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Número de documento</span>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{inv.documentoNumero || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Fecha de nacimiento</span>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{inv.fechaNacimiento || 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="ghost" fullWidth onClick={() => setDocumentacionDetail(null)}>Cerrar</Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Verification camera modal — for Guardia (huesped-temporal) */}
      <Modal
        isOpen={!!verificandoInvitado && capturaStep === null}
        onClose={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}
        title="Verificar documento"
      >
        {verificandoInvitado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Saved document from database — reference for comparison */}
            {verificandoInvitado.documentos?.length > 0 && (
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 12px' }}>
                <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '6px' }}>
                  Documento registrado en base de datos:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {verificandoInvitado.documentos.map((doc, di) => {
                    const docLabels = {
                      'cedula-anverso': 'Cédula (anv.)',
                      'cedula-reverso': 'Cédula (rev.)',
                      'pasaporte': 'Pasaporte',
                      'tutela': 'Tutela',
                    };
                    return (
                      <div key={di} style={{
                        padding: '6px 10px', borderRadius: theme.radius.md,
                        background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`,
                        fontSize: theme.fonts.sizes.xs, color: theme.colors.text,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {docLabels[doc] || doc}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Camera capture area */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '140px', height: '140px', margin: '0 auto',
                borderRadius: theme.radius.xl,
                background: theme.colors.bgMuted,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                border: `2px dashed ${theme.colors.border}`,
                fontSize: '48px', color: theme.colors.textMuted,
              }}>
                📷
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: '8px 0 0' }}>
                Capture una foto del documento presentado por <strong>{verificandoInvitado.nombre}</strong> para compararlo visualmente con el documento registrado
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setCapturaStep('capturando');
                  setTimeout(() => {
                    setCapturaStep('verificando');
                    setTimeout(() => {
                      const resultado = Math.random();
                      let estado, mensaje;
                      if (resultado > 0.6) {
                        estado = 'verificado';
                        mensaje = 'Documento verificado correctamente';
                      } else if (resultado > 0.3) {
                        estado = 'no-coincide';
                        mensaje = 'Documento no coincide';
                      } else {
                        estado = 'fallido';
                        mensaje = 'Verificación fallida';
                      }
                      setVerifResultado({ estado, mensaje });
                      actualizarVerificacion(verificandoInvitado.visitaId, verificandoInvitado.invitadoIdx, {
                        estado,
                        documentoTomado: '/mock/captured-doc.jpg',
                        fechaVerificacion: new Date().toLocaleDateString('es-AR'),
                        verificadoPor: 'Roberto Hornado',
                      });
                      setCapturaStep('resultado');
                    }, 1500);
                  }, 1000);
                }}
              >
                Capturar fotografía
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Verification progress modal */}
      <Modal
        isOpen={capturaStep === 'capturando' || capturaStep === 'verificando'}
        onClose={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}
        title="Verificando documento"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '12px 0' }}>
          {capturaStep === 'capturando' && (
            <>
              <div style={{ fontSize: '48px', animation: 'pulse 1s infinite' }}>📸</div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Capturando imagen...</p>
            </>
          )}
          {capturaStep === 'verificando' && (
            <>
              <div style={{ fontSize: '48px', animation: 'pulse 1s infinite' }}>🔄</div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Comparando documento capturado con el registrado en base de datos...</p>
            </>
          )}
        </div>
      </Modal>

      {/* Verification result modal */}
      <Modal
        isOpen={capturaStep === 'resultado' && !!verifResultado}
        onClose={() => { setVerificandoInvitado(null); setCapturaStep(null); setVerifResultado(null); }}
        title="Resultado de verificación"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
          {verifResultado?.estado === 'verificado' && (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.success, fontWeight: theme.fonts.weights.semibold, margin: 0 }}>
                {verifResultado.mensaje}
              </p>
            </>
          )}
          {verifResultado?.estado === 'no-coincide' && (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.dangerLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.danger} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.danger, fontWeight: theme.fonts.weights.semibold, margin: 0 }}>
                {verifResultado.mensaje}
              </p>
            </>
          )}
          {verifResultado?.estado === 'fallido' && (
            <>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={theme.colors.warning} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.warning, fontWeight: theme.fonts.weights.semibold, margin: 0 }}>
                {verifResultado.mensaje}
              </p>
            </>
          )}
          <Button variant="primary" fullWidth onClick={() => {
            if (verifResultado?.estado === 'verificado' && verificandoInvitado) {
              setGuardiaStep2(`${verificandoInvitado.visitaId}-${verificandoInvitado.invitadoIdx}`);
            }
            setVerificandoInvitado(null);
            setCapturaStep(null);
            setVerifResultado(null);
          }}>
            {verifResultado?.estado === 'verificado' ? 'Continuar' : 'Cerrar'}
          </Button>
        </div>
      </Modal>

      {/* Guardia detail modal */}
      <Modal
        isOpen={!!detalleGuardia}
        onClose={() => setDetalleGuardia(null)}
        title={detalleGuardia?.base?.nombre || ''}
      >
        {detalleGuardia && (() => {
          const p = detalleGuardia;
          const esVerificacionObligatoria = p.base.tipo !== 'amigos' || p.base.instruccionDocumento === 'verificar';
          const cumplidas = p.base.instruccionesCumplidas || {};
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={tipoVisitaIcons[p.base.tipo]}
                  alt={TIPO_LABELS[p.base.tipo]}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{p.persona.nombre}</div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{p.base.torre} - {p.base.depto} · {TIPO_LABELS[p.base.tipo]}</div>
                </div>
                {p.base.tipo === 'huesped-temporal' && <Badge status={statusForGuardia(p.base.estado)} />}
              </div>

              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <span>📅 {p.base.fechaDesde}{p.base.fechaHasta ? ` a ${p.base.fechaHasta}` : ''}</span>
              </div>

              {/* Compact block: instrucción, notificación, vehículo, estacionamiento — una línea cada uno */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '4px 0' }}>
                {p.base.instruccionDocumento && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: p.base.instruccionDocumento === 'verificar' ? '#FEF3C7' : '#DBEAFE',
                    fontSize: theme.fonts.sizes['2xs'], color: p.base.instruccionDocumento === 'verificar' ? '#92400E' : '#1E40AF',
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.base.instruccionDocumento === 'verificar' ? '🆔 Verificar' : '🔓 No verificar'}
                  </span>
                )}
                {p.base.tipoNotificacion && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: '#F3F4F6',
                    fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary,
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap',
                  }}>
                    🔔 {p.base.tipoNotificacion === 'notificar-y-anunciar' ? 'Anunciar' : 'Notificar'}
                  </span>
                )}
                <span style={{
                  padding: '2px 8px', borderRadius: theme.radius.full,
                  background: theme.colors.bgMuted,
                  fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textSecondary,
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  whiteSpace: 'nowrap',
                }}>
                  🚗 {p.base.tieneVehiculo ? `Con vehículo${p.base.vehiculos?.length > 0 ? ` (${p.base.vehiculos.map(v => v.placa).filter(Boolean).join(',')})` : ''}` : 'Sin vehículo'}
                </span>
                {estacionamientosVisitantes && estacionamientosVisitantes.total > 0 && (
                  <span style={{
                    padding: '2px 8px', borderRadius: theme.radius.full,
                    background: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#F0FDF4' : '#FEF2F2',
                    fontSize: theme.fonts.sizes['2xs'],
                    color: estacionamientosVisitantes.ocupados < estacionamientosVisitantes.total ? '#166534' : '#991B1B',
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    whiteSpace: 'nowrap',
                  }}>
                    🅿️ {estacionamientosVisitantes.total - estacionamientosVisitantes.ocupados} libres
                  </span>
                )}
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '8px 0',
                borderTop: `1px solid ${theme.colors.borderLight}`,
              }}>
                {/* Verificación de cédula — automática al validar el documento (solo Proveedor Temporal) */}
                {p.base.tipo === 'temporal' && (
                  p.persona.ciVerificado ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.success, fontWeight: theme.fonts.weights.semibold }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Cédula verificada
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setVerificandoPersona({ ...p, esObligatoria: esVerificacionObligatoria });
                        setCiInput('');
                        setCiError('');
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '8px 12px', borderRadius: theme.radius.full,
                        background: '#FEF3C7', color: '#92400E', border: 'none',
                        cursor: 'pointer', fontFamily: theme.fonts.family,
                        fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                      }}
                    >
                      🆔 Verificar cédula
                    </button>
                  )
                )}
                {/* Llamé / No lo anuncié — único checkbox manual del Guardia */}
                <label
                  onClick={() => toggleInstruccionCumplida(p.base.id, 'llamoAnuncie')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '4px 0',
                    fontSize: theme.fonts.sizes.xs,
                    color: theme.colors.textSecondary,
                    fontFamily: theme.fonts.family,
                    userSelect: 'none',
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: `2px solid ${cumplidas.llamoAnuncie ? theme.colors.success : theme.colors.border}`,
                    background: cumplidas.llamoAnuncie ? theme.colors.success : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 150ms',
                  }}>
                    {cumplidas.llamoAnuncie && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  Llamé / No lo anuncié
                </label>
              </div>

              {/* 2-step flow for huesped-temporal (guardia) */}
              {p.base.tipo === 'huesped-temporal' && !p.persona.llego && (
                <div style={{
                  padding: '12px 0',
                  borderTop: `1px solid ${theme.colors.borderLight}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}>
                  {/* Step 1: Physical appearance check */}
                  <div style={{
                    background: guardiaStep1 === `${p.base.id}-${p.idx}` ? '#F0FDF4' : theme.colors.bgMuted,
                    borderRadius: theme.radius.lg,
                    padding: '12px',
                    border: `1.5px solid ${guardiaStep1 === `${p.base.id}-${p.idx}` ? theme.colors.success : theme.colors.border}`,
                  }}>
                    <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '8px' }}>
                      Paso 1 — Verificar apariencia física
                    </div>
                    <div style={{
                      width: '100%', height: '120px',
                      borderRadius: theme.radius.md,
                      background: 'linear-gradient(135deg, #E8EAF6, #C5CAE9)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      marginBottom: '4px',
                      border: `1px solid ${theme.colors.border}`,
                    }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      <div style={{ fontSize: '9px', color: theme.colors.textSecondary, marginTop: '2px' }}>
                        Foto extraída del documento
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '4px', left: 0, right: 0,
                        textAlign: 'center',
                        fontSize: '9px',
                        color: theme.colors.textMuted,
                        background: 'rgba(255,255,255,0.8)',
                        padding: '2px 4px',
                        transform: 'rotate(-15deg)',
                        letterSpacing: '1px',
                      }}>
                        {usuario?.nombre || 'Roberto Hornado'} · Portería
                      </div>
                    </div>
                    {guardiaStep1 === `${p.base.id}-${p.idx}` ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.success }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Coincide apariencia física
                      </div>
                    ) : (
                      <button
                        onClick={() => setGuardiaStep1(`${p.base.id}-${p.idx}`)}
                        style={{
                          width: '100%', padding: '8px', borderRadius: theme.radius.full,
                          background: theme.colors.primary, color: '#fff', border: 'none',
                          cursor: 'pointer', fontFamily: theme.fonts.family,
                          fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                        }}
                      >
                        Coincide apariencia física
                      </button>
                    )}
                  </div>

                  {/* Step 2: Document scan */}
                  <div style={{
                    background: guardiaStep2 === `${p.base.id}-${p.idx}` ? '#F0FDF4' : theme.colors.bgMuted,
                    borderRadius: theme.radius.lg,
                    padding: '12px',
                    border: `1.5px solid ${guardiaStep2 === `${p.base.id}-${p.idx}` ? theme.colors.success : theme.colors.border}`,
                    opacity: !guardiaStep1 ? 0.5 : 1,
                  }}>
                    <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '8px' }}>
                      Paso 2 — Escanear documento físico
                    </div>
                    {guardiaStep2 === `${p.base.id}-${p.idx}` ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.success }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Documento verificado correctamente
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (!guardiaStep1) return;
                          setVerificandoInvitado({ visitaId: p.base.id, invitadoIdx: p.idx, nombre: p.persona.nombre, documentos: p.persona.documentos || [] });
                        }}
                        disabled={!guardiaStep1}
                        style={{
                          width: '100%', padding: '8px', borderRadius: theme.radius.full,
                          background: guardiaStep1 ? theme.colors.secondary : theme.colors.bgMuted,
                          color: guardiaStep1 ? '#fff' : theme.colors.textMuted,
                          border: 'none', cursor: guardiaStep1 ? 'pointer' : 'not-allowed',
                          fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.xs,
                          fontWeight: theme.fonts.weights.semibold,
                        }}
                      >
                        📷 Escanear documento
                      </button>
                    )}
                  </div>

                  {/* Mark arrived — enabled only after both steps */}
                  {guardiaStep1 && guardiaStep2 && (
                    <button
                      onClick={() => {
                        setLlegoInvitado(p.base.id, p.idx, true);
                        actualizarHoraIngreso(p.base.id, p.idx, new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
                        setGuardiaStep1(null);
                        setGuardiaStep2(null);
                      }}
                      style={{
                        width: '100%', padding: '12px', borderRadius: theme.radius.full,
                        background: theme.colors.success, color: '#fff', border: 'none',
                        cursor: 'pointer', fontFamily: theme.fonts.family,
                        fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold,
                      }}
                    >
                      Marcar ingreso — Llegó
                    </button>
                  )}
                </div>
              )}

              {/* Arrival toggle — always visible for guardia */}
              <div style={{
                padding: '8px 0',
                borderTop: `1px solid ${theme.colors.borderLight}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Toggle value={p.persona.llego}                     onChange={() => {
                      if (p.base.tipo === 'huesped-temporal') {
                        setLlegoInvitado(p.base.id, p.idx, !p.persona.llego);
                        } else if (!p.persona.llego && p.base.tipo === 'temporal' && !p.persona.ciVerificado) {
                          addToast('Debes verificar la cédula (validar el documento) antes de registrar el ingreso', 'warning');
                      } else if (!p.persona.llego && esVerificacionObligatoria && p.base.ci && !p.persona.ciVerificado) {
                        setVerificandoPersona({ ...p, esObligatoria: true });
                        setCiInput('');
                        setCiError('');
                      } else if (!p.persona.llego && !esVerificacionObligatoria && p.base.ci && !p.persona.ciVerificado) {
                        setVerificandoPersona({ ...p, esObligatoria: false });
                        setCiInput('');
                        setCiError('');
                      } else {
                        setLlegoInvitado(p.base.id, p.idx, !p.persona.llego);
                      }
                    }} />
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>
                      {p.persona.llego ? 'Llegó' : 'No llegó'}
                    </span>
                  </div>
                  {p.base.ci && p.persona.llego && p.persona.ciVerificado && (
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.success, display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                      ✓ Identidad verificada
                    </span>
                  )}
                  {p.base.tipo !== 'huesped-temporal' && p.base.tipo !== 'temporal' && p.base.ci && !p.persona.llego && (
                    <button
                      onClick={() => {
                        setVerificandoPersona({ ...p, esObligatoria: esVerificacionObligatoria });
                        setCiInput('');
                        setCiError('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: theme.colors.primary,
                        fontSize: theme.fonts.sizes.xs,
                        cursor: 'pointer',
                        fontFamily: theme.fonts.family,
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      Verificar
                    </button>
                  )}
                  {(
                  <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Ingreso</span>
                      <input
                        type="time"
                        value={p.persona.horaIngreso || ''}
                        onChange={e => actualizarHoraIngreso(p.base.id, p.idx, e.target.value)}
                        style={{
                          width: '110px',
                          padding: '8px 10px',
                          borderRadius: theme.radius.md,
                          border: `1.5px solid ${theme.colors.border}`,
                          fontSize: theme.fonts.sizes.sm,
                          fontFamily: theme.fonts.family,
                          color: theme.colors.text,
                          background: theme.colors.bgMuted,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Salida</span>
                      <input
                        type="time"
                        value={p.persona.horaSalida || ''}
                        onChange={e => actualizarHoraSalida(p.base.id, p.idx, e.target.value)}
                        style={{
                          width: '110px',
                          padding: '8px 10px',
                          borderRadius: theme.radius.md,
                          border: `1.5px solid ${theme.colors.border}`,
                          fontSize: theme.fonts.sizes.sm,
                          fontFamily: theme.fonts.family,
                          color: theme.colors.text,
                          background: theme.colors.bgMuted,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {p.persona.horaSalida && (
                        <span
                          onClick={() => {
                            const nuevaHora = prompt('Ingrese la hora aproximada de salida:');
                            if (nuevaHora) actualizarHoraSalida(p.base.id, p.idx, nuevaHora);
                          }}
                          style={{
                            fontSize: '10px', cursor: 'pointer',
                            color: theme.colors.warning, fontWeight: theme.fonts.weights.bold,
                            display: 'inline-flex', alignItems: 'center', gap: '2px',
                            padding: '2px 4px', borderRadius: theme.radius.sm,
                            background: '#FEF3C7',
                          }}
                          title="Hora inexacta"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                  </div>
                  )}
                  {esGuardiaRol && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.borderLight}` }}>
                      <div>
                        <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '3px' }}>
                          Anotaciones de ingreso
                        </div>
                        <textarea
                          value={p.base.anotacionesIngreso || ''}
                          onChange={e => actualizarVisita(p.base.id, { anotacionesIngreso: e.target.value })}
                          rows={2}
                          placeholder="Observaciones al recibir al profesional"
                          style={{ width: '100%', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, outline: 'none', fontSize: theme.fonts.sizes.xs, fontFamily: theme.fonts.family, color: theme.colors.text, padding: '8px 10px', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(f => {
                              const reader = new FileReader();
                              reader.onload = () => actualizarVisita(p.base.id, { fotosIngreso: [...(p.base.fotosIngreso || []), reader.result] });
                              reader.readAsDataURL(f);
                            });
                          }}
                          style={{ marginTop: '4px', fontSize: theme.fonts.sizes.xs }}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary, marginBottom: '3px' }}>
                          Anotaciones de salida
                        </div>
                        <textarea
                          value={p.base.anotacionesSalida || ''}
                          onChange={e => actualizarVisita(p.base.id, { anotacionesSalida: e.target.value })}
                          rows={2}
                          placeholder="Observaciones al retirarse el profesional"
                          style={{ width: '100%', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, outline: 'none', fontSize: theme.fonts.sizes.xs, fontFamily: theme.fonts.family, color: theme.colors.text, padding: '8px 10px', boxSizing: 'border-box', resize: 'vertical' }}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={e => {
                            const files = Array.from(e.target.files || []);
                            files.forEach(f => {
                              const reader = new FileReader();
                              reader.onload = () => actualizarVisita(p.base.id, { fotosSalida: [...(p.base.fotosSalida || []), reader.result] });
                              reader.readAsDataURL(f);
                            });
                          }}
                          style={{ marginTop: '4px', fontSize: theme.fonts.sizes.xs }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Check de salida + liberación automática de estacionamiento */}
              <label
                onClick={() => {
                  if (!p.persona.llego) {
                    addToast('El visitante aún no ingresó', 'warning');
                    return;
                  }
                  if (p.persona.horaSalida) {
                    // quitar salida
                    actualizarHoraSalida(p.base.id, p.idx, '');
                    addToast('Salida desmarcada', 'info');
                  } else {
                    const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                    actualizarHoraSalida(p.base.id, p.idx, hora);
                    // liberar estacionamiento asociado automáticamente
                    const clave = `${p.base.id}-${p.idx}`;
                    Object.entries(estacionamientosAsignados || {}).forEach(([spot, val]) => {
                      if (String(val) === clave || (p.idx === -1 && String(val).startsWith(`${p.base.id}-`))) {
                        liberarEstacionamientoVisita(spot);
                      }
                    });
                    addToast('Salida registrada y estacionamiento liberado', 'success');
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                  padding: '6px 0', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary,
                  fontFamily: theme.fonts.family, userSelect: 'none', width: '100%',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '4px',
                  border: `2px solid ${p.persona.horaSalida ? theme.colors.success : theme.colors.border}`,
                  background: p.persona.horaSalida ? theme.colors.success : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 150ms',
                }}>
                  {p.persona.horaSalida && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                {p.persona.horaSalida ? `Salida registrada ${p.persona.horaSalida}` : 'Registrar salida'}
              </label>

              {/* Acciones Guardia — registro de ingreso/salida y estacionamiento */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px 0 0',
                borderTop: `1px solid ${theme.colors.borderLight}`,
              }}>
                {/* Salió */}
                <button
                  onClick={() => {
                    if (!p.persona.llego) {
                      addToast('El visitante aún no ingresó', 'warning');
                      return;
                    }
                    if (p.persona.horaSalida) {
                      addToast('La salida ya fue registrada', 'info');
                      return;
                    }
                    actualizarHoraSalida(p.base.id, p.idx, new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
                    const clave = `${p.base.id}-${p.idx}`;
                    Object.entries(estacionamientosAsignados || {}).forEach(([spot, val]) => {
                      if (String(val) === clave || (p.idx === -1 && String(val).startsWith(`${p.base.id}-`))) {
                        liberarEstacionamientoVisita(spot);
                      }
                    });
                    addToast('Salida registrada y estacionamiento liberado', 'success');
                  }}
                  style={{
                    flex: '1 1 auto', minWidth: '120px', padding: '10px', borderRadius: theme.radius.full,
                    background: p.persona.horaSalida ? theme.colors.bgMuted : '#FEF3C7',
                    color: p.persona.horaSalida ? theme.colors.textMuted : '#92400E',
                    border: 'none', cursor: 'pointer', fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  🚪 {p.persona.horaSalida ? `Salió ${p.persona.horaSalida} (aprox.)` : 'Salió'}
                </button>
                {/* Asignar estacionamiento */}
                <button
                  onClick={() => { setParkingSpot(''); setParkingTarget({ visitaId: p.base.id, invitadoIdx: p.idx, nombre: p.persona.nombre, torre: p.base.torre, depto: p.base.depto }); setShowAsignarEstacionamiento(true); }}
                  style={{
                    flex: '1 1 auto', minWidth: '120px', padding: '10px', borderRadius: theme.radius.full,
                    background: theme.colors.bgMuted, color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`, cursor: 'pointer', fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  🅿️ Asignar estacionamiento
                </button>
                {/* Llamar / Anunciar */}
                {p.base.tipoNotificacion === 'notificar-y-anunciar' && (
                  <button
                    onClick={() => {
                      if (p.base.telefonoResidente) {
                        window.location.href = `tel:${p.base.telefonoResidente}`;
                      }
                      addToast(`Anunciado: ${p.persona.nombre} en ${p.base.torre}-${p.base.depto}`, 'info');
                    }}
                    style={{
                      flex: '1 1 auto', minWidth: '120px', padding: '10px', borderRadius: theme.radius.full,
                      background: theme.colors.primary, color: '#fff', border: 'none',
                      cursor: 'pointer', fontFamily: theme.fonts.family,
                      fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    📞 Llamar / Anunciar
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Asignar estacionamiento modal — sincronizado con la gestión central del Home (18) */}
      <Modal isOpen={showAsignarEstacionamiento} onClose={() => setShowAsignarEstacionamiento(false)} title="Asignar estacionamiento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center' }}>
            Asigne un cupo disponible al visitante
          </div>
          <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
            Visitante: <strong>{parkingTarget ? `${parkingTarget.nombre} (${parkingTarget.torre}-${parkingTarget.depto})` : ''}</strong>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
            {Array.from({ length: estacionamientosVisitantes?.total || 20 }, (_, i) => {
              const spot = `B${String(i + 1).padStart(2, '0')}`;
              const ocupanteClave = (estacionamientosAsignados || {})[spot];
              const esMismaVisita = parkingTarget && String(ocupanteClave) === `${parkingTarget.visitaId}-${parkingTarget.invitadoIdx}`;
              const libre = !ocupanteClave || esMismaVisita;
              const ocupanteNombre = ocupanteClave ? (() => {
                const [vidStr, idxStr] = String(ocupanteClave).split('-');
                const v = visitas.find(x => String(x.id) === vidStr);
                if (!v) return 'Ocupado';
                const idx = parseInt(idxStr, 10);
                return idx >= 0 && v.invitados?.[idx] ? v.invitados[idx].nombre : v.nombre;
              })() : null;
              return (
                <button
                  key={spot}
                  disabled={!libre}
                  onClick={() => setParkingSpot(spot)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: theme.radius.lg,
                    border: `2px solid ${parkingSpot === spot ? theme.colors.primary : theme.colors.border}`,
                    background: parkingSpot === spot ? theme.colors.primaryLight : (libre ? theme.colors.bgMuted : '#F3F4F6'),
                    cursor: libre ? 'pointer' : 'not-allowed', fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.sm, color: theme.colors.text,
                    opacity: libre ? 1 : 0.7,
                  }}
                >
                  <span style={{ fontWeight: theme.fonts.weights.bold }}>{spot}</span>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                    {parkingSpot === spot ? 'Seleccionado' : (libre ? 'Disponible' : `Ocupado${ocupanteNombre ? ` · ${ocupanteNombre}` : ''}`)}
                  </span>
                </button>
              );
            })}
          </div>
          <Button variant="primary" fullWidth disabled={!parkingSpot} onClick={() => {
            if (parkingSpot && !(estacionamientosAsignados || {})[parkingSpot]) {
              asignarEstacionamientoVisita(parkingSpot, `${parkingTarget.visitaId}-${parkingTarget.invitadoIdx}`);
              addToast(`Estacionamiento ${parkingSpot} asignado a ${parkingTarget.nombre}`, 'success');
            } else {
              addToast('Ese cupo ya está ocupado', 'warning');
            }
            setShowAsignarEstacionamiento(false);
            setParkingSpot('');
            setParkingTarget(null);
          }}>
            Confirmar asignación
          </Button>
        </div>
      </Modal>

      {/* Identity verification modal — for guardia */}
      <Modal
        isOpen={!!verificandoPersona}
        onClose={() => setVerificandoPersona(null)}
        title="Verificar identidad"
      >
        {verificandoPersona && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
              🆔
            </div>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
              Ingrese el número de identificación de <strong>{verificandoPersona.persona.nombre}</strong>
            </p>
            <div style={{ width: '100%' }}>
              <input
                type="text"
                value={ciInput}
                onChange={e => { setCiInput(e.target.value); setCiError(''); }}
                placeholder="Número de identificación"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: theme.radius.lg,
                  border: `1.5px solid ${ciError ? theme.colors.danger : theme.colors.border}`,
                  fontSize: theme.fonts.sizes.base,
                  fontFamily: theme.fonts.family,
                  color: theme.colors.text,
                  background: theme.colors.bgCard,
                  outline: 'none',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                }}
              />
              {ciError && (
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, marginTop: '6px' }}>{ciError}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              {!verificandoPersona.esObligatoria && (
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setLlegoInvitado(verificandoPersona.base.id, verificandoPersona.idx, true);
                    setVerificandoPersona(null);
                    setCiInput('');
                    setCiError('');
                  }}
                >
                  Saltar verificación
                </Button>
              )}
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  if (ciInput.trim() === verificandoPersona.base.ci) {
                    marcarLlegadaConVerificacion(verificandoPersona.base.id, verificandoPersona.idx);
                    setVerificandoPersona(null);
                    setCiInput('');
                    setCiError('');
                  } else {
                    setCiError('El número de identificación no coincide con el registrado');
                  }
                }}
              >
                Verificar
              </Button>
            </div>
          </div>
        )}
      </Modal>
      {/* TRA/SIRE confirmation modal */}
      <Modal
        isOpen={!!traSireModal}
        onClose={() => setTraSireModal(null)}
        title="Reportar TRA/SIRE"
      >
        {traSireModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
              Se reportarán los siguientes huéspedes a TRA y SIRE:
            </div>
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {traSireModal.invitados?.filter(inv => inv.llego).map((inv, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{inv.nombre}</span>
                  {inv.traSireReported && (
                    <Badge status="Aceptado" />
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 1.5, background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px' }}>
              Los datos se enviarán con la información ya registrada del huésped. No se requiere captura adicional. Sin costo adicional.
            </div>
            <Button variant="primary" fullWidth onClick={() => {
              if (traSireModal) {
                traSireModal.invitados?.forEach((inv, idx) => {
                  if (inv.llego && !inv.traSireReported) {
                    reportarTraSire(traSireModal.id, idx);
                  }
                });
                addToast('Reporte TRA/SIRE enviado exitosamente', 'success');
              }
              setTraSireModal(null);
            }}>
              Ejecutar
            </Button>
          </div>
        )}
      </Modal>

      {/* Suscripción Huésped Temporal */}
      <Modal isOpen={showSuscripcionModal} onClose={() => setShowSuscripcionModal(false)} title="VeciYo Huésped Temporal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '100%', height: '180px', borderRadius: theme.radius.xl, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>▶️</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>Los primeros 30 días son gratuitos. Suscríbete y disfruta de todos los beneficios!</p>
          <Button variant="primary" fullWidth onClick={() => { setShowSuscripcionModal(false); setShowPaymentModal(true); }}>Suscribirse</Button>
        </div>
      </Modal>
      <Modal isOpen={showPaymentModal} onClose={() => { if (!paymentLoading) setShowPaymentModal(false); }} title="Pago de suscripción">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
          <div style={{ textAlign: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
            <div style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>$15.00</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>por mes - Huésped Temporal</div>
          </div>
          <InputField label="Nombre del titular" value={paymentForm.cardName} onChange={v => setPaymentForm(p => ({ ...p, cardName: v }))} placeholder="Como figura en la tarjeta" disabled={paymentLoading} />
          <InputField label="Número de tarjeta" value={paymentForm.cardNumber} onChange={v => { const d=v.replace(/\D/g,'').slice(0,16); const f=d.replace(/(\d{4})(?=\d)/g,'$1 '); setPaymentForm(p=>({...p, cardNumber:f})); }} placeholder="1234 5678 9012 3456" disabled={paymentLoading} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InputField label="Vencimiento" value={paymentForm.cardExpiry} onChange={v => { const d=v.replace(/\D/g,'').slice(0,4); const f=d.length>2?d.slice(0,2)+'/'+d.slice(2):d; setPaymentForm(p=>({...p, cardExpiry:f})); }} placeholder="MM/AA" disabled={paymentLoading} />
            <InputField label="CVV" value={paymentForm.cardCvv} onChange={v => setPaymentForm(p=>({...p, cardCvv:v.replace(/\D/g,'').slice(0,4)}))} placeholder="123" disabled={paymentLoading} />
          </div>
          <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5 }}>Pago 100% simulado. No se realizará ningún cobro real.</div>
          <Button variant="primary" fullWidth disabled={paymentLoading} onClick={() => {
            if (!paymentForm.cardNumber || !paymentForm.cardName || !paymentForm.cardExpiry || !paymentForm.cardCvv) return;
            setPaymentLoading(true);
            setTimeout(() => {
              if (ubicacionActiva) activarSuscripcion(ubicacionActiva.id);
              setPaymentLoading(false); setShowPaymentModal(false); setPaymentForm({ cardNumber:'', cardName:'', cardExpiry:'', cardCvv:'' });
              const base = rolActivo==='inquilino-lider' ? '/inquilino-lider/configuracion/huespedes-temporales' : '/propietario/configuracion/huespedes-temporales';
              navigate(base);
            }, 1200);
          }}>{paymentLoading ? 'Procesando pago...' : 'Pagar $15.00 y suscribirse'}</Button>
        </div>
      </Modal>

      {/* Hallazgos summary popup */}
      <Modal isOpen={!!hallazgosPopup} onClose={() => setHallazgosPopup(null)} title="Resumen de verificación">
        {hallazgosPopup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                {hallazgosPopup.persona.nombre}
              </span>
            </div>
            <div style={{ background: '#FEF3C7', borderRadius: theme.radius.lg, padding: '12px', fontSize: theme.fonts.sizes.sm, color: '#92400E', lineHeight: 1.5 }}>
              <strong>Hallazgos detectados:</strong> El documento no coincide con el registro en base de datos. Se recomienda verificar físicamente el documento presentado.
            </div>
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>Detalles de la verificación</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                Estado: No coincide
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                Fecha: {verificaciones[hallazgosPopup.item.id]?.[hallazgosPopup.idx]?.fechaVerificacion || 'N/A'}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                Verificado por: {verificaciones[hallazgosPopup.item.id]?.[hallazgosPopup.idx]?.verificadoPor || 'N/A'}
              </div>
            </div>
          </div>
        )}
      </Modal>

      </>)}
    </AppShell>
  );
}
