import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Calendar from '../../components/ui/Calendar';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { torres, departamentos } from '../../data/mockData';
import tipoVisitaIcons from '../../assets/icons/visitas';

const TIPOS_BASE = [
  { id: 'amigos',    label: 'Amigos Familiares' },
  { id: 'temporal',  label: 'Profesional Temporal' },
  { id: 'permanente',label: 'Profesional Permanente' },
];

const TIPO_HUESPED_TEMPORAL = { id: 'huesped-temporal', label: 'Huésped Temporal' };

const TIPO_LABELS = {
  amigos: 'Amigos Familiares',
  temporal: 'Profesional Temporal',
  permanente: 'Profesional Permanente',
  'huesped-temporal': 'Huésped Temporal',
};

const PROFESIONES = {
  permanente: ['Cuidado de menores', 'Profesional de la salud', 'Limpieza y servicios generales', 'Atencion a mascotas', 'Conductor', 'Jardinero', 'Otros'],
  temporal: ['Domiciliario', 'Pintor', 'carpintero', 'electricista', 'Profesional de la salud', 'Limpieza y servicios generales', 'atención a mascotas', 'Cuidado de menores', 'Peluquero o maquillador', 'Fontanero', 'otros'],
};

const esProfesional = (tipo) => tipo === 'temporal' || tipo === 'permanente';
const profesionOtra = (tipo, valor) =>
  (tipo === 'permanente' && valor === 'Otros') || (tipo === 'temporal' && valor === 'otros');

const inputStyle = {
  width: '100%',
  background: theme.colors.bgMuted,
  borderRadius: theme.radius.lg,
  border: `1px solid ${theme.colors.border}`,
  outline: 'none',
  fontSize: theme.fonts.sizes.sm,
  fontFamily: theme.fonts.family,
  color: theme.colors.text,
  padding: '10px 14px',
  boxSizing: 'border-box',
};

function formatTimeRange(start, end) {
  if (!start && !end) return '';
  if (start && !end) return start;
  if (!start && end) return end;
  return `${start} – ${end}`;
}

export default function VisitasNuevoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { agregarVisita, rolActivo, suscripcionActiva, activarSuscripcion, ubicacionActiva, addToast, unidades, configHuespedesTemporales, actualizarConfigHuespedTemporal, permisos, esResidente, usuario, estacionamientosVisitantes, estacionamientosAsignados, asignarEstacionamientoVisita } = useApp();
  const TIPOS = rolActivo === 'guardia'
    ? TIPOS_BASE.filter(t => t.id !== 'permanente')
    : rolActivo === 'huesped-temporal'
    ? TIPOS_BASE.filter(t => t.id === 'amigos' || t.id === 'temporal')
    : rolActivo === 'administrador'
    ? TIPOS_BASE
    : [...TIPOS_BASE, TIPO_HUESPED_TEMPORAL];

  const tipoPreseleccionado = location.state?.tipoPreseleccionado;
  const tipoInicial = (tipoPreseleccionado && TIPOS.some(t => t.id === tipoPreseleccionado)
    && (tipoPreseleccionado !== 'huesped-temporal' || suscripcionActiva))
    ? tipoPreseleccionado
    : null;
  const [tipoSeleccionado, setTipoSeleccionado] = useState(tipoInicial);
  const [torre, setTorre] = useState('');
  const [depto, setDepto] = useState('');
  const [personas, setPersonas] = useState('5');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [nombre, setNombre] = useState('Mariano Lazarto');
  const [tipoId, setTipoId] = useState('Cedula');
  const [identificacion, setIdentificacion] = useState('122652268562');
  const [email, setEmail] = useState('mlazarto@gmail.com');
  const [telefono, setTelefono] = useState('+5965165136546');
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [horaSalidaInicio, setHoraSalidaInicio] = useState('');
  const [horaSalidaFin, setHoraSalidaFin] = useState('');
  const [acompanantes, setAcompanantes] = useState([]);
  const [cantidadMenores, setCantidadMenores] = useState(0);
  const [mostrarAvisoMenores, setMostrarAvisoMenores] = useState(false);
  const [avisoMenoresOpen, setAvisoMenoresOpen] = useState(false);
  const [estacionamientosSeleccionados, setEstacionamientosSeleccionados] = useState(0);
  const [vehiculos, setVehiculos] = useState([]);
  const [tieneVehiculoToggle, setTieneVehiculoToggle] = useState(false);
  const [cantidadVehiculos, setCantidadVehiculos] = useState(1);
  const [showWarningRegistro, setShowWarningRegistro] = useState(false);
  const [showSuscripcionModal, setShowSuscripcionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [numeroReserva, setNumeroReserva] = useState('');
  const [paraAdministracion, setParaAdministracion] = useState(false);
  const [profesion, setProfesion] = useState('');
  const [profesionOtro, setProfesionOtro] = useState('');
  // Guardia específico: hora ingreso, aprobado, anotaciones, foto, estacionamientos
  const [horaIngresoGuardia, setHoraIngresoGuardia] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  });
  const [aprobadoPor, setAprobadoPor] = useState('');
  const [anotacionesGuardia, setAnotacionesGuardia] = useState('');
  const [fotosGuardia, setFotosGuardia] = useState([]);
  const [estacionamientosSelGuardia, setEstacionamientosSelGuardia] = useState([]);

  const horaEstimada = formatTimeRange(horaInicio, horaFin);
  const horaEstimadaSalida = formatTimeRange(horaSalidaInicio, horaSalidaFin);
  const torreNum = parseInt(torre.replace('Torre ', ''), 10);
  const unidadActual = unidades.find(u => u.codigo === depto && u.torreNumero === torreNum);
  const estacionamientosDisponibles = (unidadActual && torre && depto) ? (unidadActual.estacionamientos || 0) : 0;

  useEffect(() => {
    if (tipoSeleccionado === 'huesped-temporal') {
      setHoraInicio('15:00');
      setHoraFin('16:00');
      setHoraSalidaInicio('10:00');
      setHoraSalidaFin('11:00');
    }
  }, [tipoSeleccionado]);

  useEffect(() => {
    if (tipoSeleccionado === 'permanente') {
      setPersonas('1');
      setCantidadMenores(0);
    }
    setProfesion('');
    setProfesionOtro('');
  }, [tipoSeleccionado]);

  const esGuardiaOAdmin = rolActivo === 'guardia' || rolActivo === 'administrador';
  const esGuardia = rolActivo === 'guardia';

  // Guardia: forzar "notificar-y-anunciar" y precargar quien aprobó
  useEffect(() => {
    if (esGuardia) {
      setTipoNotificacion('notificar-y-anunciar');
      if (usuario?.nombre && !aprobadoPor) setAprobadoPor(usuario.nombre);
    }
  }, [esGuardia, usuario]);

  useEffect(() => {
    if (esGuardia && tipoSeleccionado === 'temporal' && telefono.trim() === '' && usuario?.telefono) {
      // opcional precarga
    }
  }, [esGuardia, tipoSeleccionado]);

  useEffect(() => {
    if (!esGuardiaOAdmin && ubicacionActiva) {
      const u = unidades.find(un => un.id === ubicacionActiva.id);
      const torreLabel = `Torre ${u?.torreNumero || ubicacionActiva.torreNumero || ''}`;
      const deptoCodigo = u?.codigo || ubicacionActiva.codigo || `${ubicacionActiva.deptoNumero || ''}`;
      setTorre(torreLabel);
      setDepto(deptoCodigo);
    }
  }, [esGuardiaOAdmin, ubicacionActiva, unidades]);

  useEffect(() => {
    setEstacionamientosSeleccionados(0);
    setVehiculos([]);
  }, [torre, depto]);

  useEffect(() => {
    const target = tieneVehiculoToggle ? cantidadVehiculos : 0;
    setVehiculos(prev => {
      const updated = [...prev];
      while (updated.length < target) {
        updated.push({ placa: '', tipo: 'auto' });
      }
      while (updated.length > target) {
        updated.pop();
      }
      return updated;
    });
  }, [cantidadVehiculos, tieneVehiculoToggle]);

  useEffect(() => {
    const num = parseInt(personas) || 1;
    const compCount = Math.max(0, num - 1);
    setAcompanantes(prev => {
      const updated = [...prev];
      while (updated.length < compCount) {
        updated.push({ nombre: '', ci: '', esMenor: false });
      }
      while (updated.length > compCount) {
        updated.pop();
      }
      return updated;
    });
  }, [personas]);

  // P11: la cantidad de menores marca automáticamente los primeros N acompañantes como menores de edad
  useEffect(() => {
    const n = Math.max(0, Math.min(parseInt(cantidadMenores) || 0, acompanantes.length));
    setAcompanantes(prev => prev.map((a, i) => ({ ...a, esMenor: i < n })));
  }, [personas, cantidadMenores]);

  // Si se llega con "Huésped Temporal" preseleccionado pero sin suscripción,
  // abrimos el flujo de suscripción. Esto evita la pantalla en blanco que
  // ocurría antes (el selector de tipo se ocultaba y no se seleccionaba ninguno).
  const llegoComoHuespedPre = tipoPreseleccionado === 'huesped-temporal' && !suscripcionActiva;
  useEffect(() => {
    if (llegoComoHuespedPre) {
      setShowSuscripcionModal(true);
    }
  }, []);

  const handleCardNumberInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    setPaymentForm(p => ({ ...p, cardNumber: formatted }));
  };

  const handleCardExpiryInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
    setPaymentForm(p => ({ ...p, cardExpiry: formatted }));
  };

  const handleCardCvvInput = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPaymentForm(p => ({ ...p, cardCvv: digits }));
  };

  const handleSubscribeAndPay = () => {
    if (!paymentForm.cardNumber || !paymentForm.cardName || !paymentForm.cardExpiry || !paymentForm.cardCvv) {
      return;
    }
    setPaymentLoading(true);
    setTimeout(() => {
      if (ubicacionActiva) {
        activarSuscripcion(ubicacionActiva.id);
      }
      setPaymentLoading(false);
      setShowPaymentModal(false);
      setShowSuscripcionModal(false);
      setPaymentForm({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
      const base = rolActivo==='inquilino-lider' ? '/inquilino-lider/configuracion/huespedes-temporales' : '/propietario/configuracion/huespedes-temporales';
      navigate(base);
    }, 1500);
  };

  const [tipoNotificacion, setTipoNotificacion] = useState('notificar-y-anunciar');
  const [showSuccess, setShowSuccess] = useState(false);
  const [identificacionError, setIdentificacionError] = useState('');
  const [acompanantesCiErrors, setAcompanantesCiErrors] = useState({});

  const selectedTipo = TIPOS.find(t => t.id === tipoSeleccionado);

  useEffect(() => {
    if (identificacion.trim()) setIdentificacionError('');
  }, [identificacion]);

  useEffect(() => {
    if (!esProfesional(tipoSeleccionado)) setIdentificacionError('');
    if (tipoSeleccionado !== 'temporal') setAcompanantesCiErrors({});
  }, [tipoSeleccionado]);

  useEffect(() => {
    if (tipoSeleccionado === 'temporal') {
      const cleared = {};
      let hasChange = false;
      Object.keys(acompanantesCiErrors).forEach(k => {
        const idx = Number(k);
        if (acompanantes[idx]?.ci?.trim()) { cleared[k] = false; hasChange = true; }
      });
      if (hasChange) setAcompanantesCiErrors(prev => {
        const next = { ...prev };
        Object.keys(cleared).forEach(k => delete next[k]);
        return next;
      });
    }
  }, [acompanantes]);

  const generarCodigoAcceso = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleAceptar = () => {
    if (rolActivo === 'huesped-temporal') {
      setShowWarningRegistro(true);
      return;
    }
    handleAceptarContinuar();
  };

  const handleAceptarContinuar = () => {
    if (esProfesional(tipoSeleccionado) && !identificacion.trim()) {
      setIdentificacionError('La identificación es obligatoria');
      addToast('La identificación es obligatoria', 'error');
      return;
    }
    // Para profesional temporal, identificación obligatoria para todos los acompañantes de la lista
    if (tipoSeleccionado === 'temporal' && acompanantes.length > 0) {
      const errores = {};
      acompanantes.forEach((a, idx) => {
        if (!a.ci.trim()) errores[idx] = true;
      });
      if (Object.keys(errores).length > 0) {
        setAcompanantesCiErrors(errores);
        addToast('La identificación es obligatoria para todos los acompañantes', 'error');
        return;
      }
    }
    // Validaciones específicas Guardia
    if (esGuardia) {
      if (!horaIngresoGuardia) {
        addToast('La hora de ingreso es obligatoria', 'error');
        return;
      }
      if (!aprobadoPor.trim()) {
        addToast('Debe indicar quién aprobó el ingreso', 'error');
        return;
      }
      if (tipoSeleccionado === 'temporal' && !telefono.trim()) {
        addToast('El teléfono es obligatorio para profesional temporal', 'error');
        return;
      }
    }
    setIdentificacionError('');
    setAcompanantesCiErrors({});
    const fechaVisita = esGuardia ? new Date() : selectedDate;
    const invitadosBase = acompanantes
      .filter(a => a.nombre.trim())
      .map(a => ({ nombre: a.nombre, ci: a.ci || '', esMenor: !!a.esMenor, llego: esGuardia ? true : false, horaIngreso: esGuardia ? horaIngresoGuardia : '', horaSalida: '' }));
    // Para guardia con ingreso inmediato, si no hay acompañantes (visita única), también marcamos titular como llegado
    const tieneVehiculo = tieneVehiculoToggle && vehiculos.some(v => v.placa.trim());
    const vehiculosValidos = tieneVehiculoToggle ? vehiculos.filter(v => v.placa.trim()).map(v => ({ placa: v.placa, tipo: v.tipo || 'auto' })) : [];
    const num = Math.floor(Math.random() * 900000 + 100000);
    const cod = generarCodigoAcceso();
    setNumeroReserva(num);
    setCodigoAcceso(cod);
    const visitaId = Date.now();
    const visita = {
      id: visitaId,
      tipo: tipoSeleccionado,
      nombre,
      ci: identificacion,
      email: esGuardia ? undefined : email,
      telefono: esGuardia ? (tipoSeleccionado === 'temporal' ? telefono : undefined) : telefono,
      estado: esGuardia ? 'Ingresado' : 'Pendiente',
      instruccionDocumento: tipoSeleccionado === 'amigos' ? 'no-verificar' : 'verificar',
      tipoNotificacion: esGuardia ? 'notificar-y-anunciar' : tipoNotificacion,
      tieneVehiculo,
      instruccionesCumplidas: {},
      fechaDesde: fechaVisita.toLocaleDateString('es-AR'),
      fechaHasta: fechaVisita.toLocaleDateString('es-AR'),
      invitados: invitadosBase,
      reserva: `N°: ${num}`,
      codigoAcceso: cod,
      qrUrl: `wwww.veciyolink/reserva-${num}`,
      torre,
      depto,
      paraAdministracion,
      personas: parseInt(personas),
      horaEstimadaLlegada: esGuardia ? horaIngresoGuardia : horaEstimada,
      horaEstimadaSalida: esGuardia ? undefined : (horaEstimadaSalida || undefined),
      horaIngreso: esGuardia ? horaIngresoGuardia : undefined,
      horaSalida: esGuardia ? undefined : undefined,
      // para visitas únicas sin invitados, guardamos llego a nivel visita para que el detalle lo refleje
      llego: esGuardia ? true : undefined,
      vehiculos: vehiculosValidos,
      profesion: esProfesional(tipoSeleccionado) ? profesion : undefined,
      profesionOtro: esProfesional(tipoSeleccionado) && profesionOtra(tipoSeleccionado, profesion) ? profesionOtro : undefined,
      registradoPor: (rolActivo === 'administrador' || rolActivo === 'guardia') ? (usuario?.nombre || usuario?.correo || 'Usuario') : undefined,
      autorizadoPor: esGuardia ? aprobadoPor : undefined,
      autorizadoPorRol: esGuardia ? 'guardia' : undefined,
      anotacionesIngreso: esGuardia ? anotacionesGuardia : '',
      fotosIngreso: esGuardia ? fotosGuardia : [],
      anotacionesSalida: '',
      fotosSalida: [],
    };
    agregarVisita(visita);
    // Asignar estacionamientos seleccionados por guardia (si aplica)
    if (esGuardia && estacionamientosSelGuardia.length > 0) {
      estacionamientosSelGuardia.forEach((spot, idx) => {
        const invIdx = invitadosBase.length === 0 ? -1 : idx;
        asignarEstacionamientoVisita(spot, `${visitaId}-${invIdx}`);
      });
    }
    setShowSuccess(true);
  };

  return (
    <AppShell>
      <PageHeader title="Visitas" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Type selector — hidden when pre-selected from option 2 */}
        {!tipoPreseleccionado && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {TIPOS.map(tipo => {
            const isActive = tipoSeleccionado === tipo.id;
            const isHuesped = tipo.id === 'huesped-temporal';
            const sinSuscripcion = isHuesped && !suscripcionActiva;
            const isDisabled = sinSuscripcion;
            return (
              <button
                key={tipo.id}
                onClick={() => {
                  if (isDisabled) {
                    setShowSuscripcionModal(true);
                    return;
                  }
                  setTipoSeleccionado(tipo.id);
                }}
                style={{
                  background: isActive ? theme.colors.primary : theme.colors.bgCard,
                  borderRadius: theme.radius.xl,
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  border: `2px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: theme.fonts.family,
                  boxShadow: theme.shadows.card,
                  gridColumn: tipo.id === 'permanente' ? '1' : 'auto',
                  opacity: isDisabled ? 0.45 : 1,
                  filter: isDisabled ? 'grayscale(0.6)' : 'none',
                }}
              >
                <img
                  src={tipoVisitaIcons[tipo.id]}
                  alt={tipo.label}
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <span style={{
                  fontSize: theme.fonts.sizes.sm,
                  fontWeight: theme.fonts.weights.medium,
                  color: isDisabled ? theme.colors.textMuted : (isActive ? theme.colors.text : theme.colors.textSecondary),
                  textAlign: 'center',
                }}>
                  {tipo.label}
                </span>

              </button>
            );
          })}
        </div>
        )}

        {tipoSeleccionado && (
          <>
            {/* Guest count */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold, textAlign: 'center', fontSize: theme.fonts.sizes.base }}>
                Cantidad de invitados
              </div>
              {esGuardiaOAdmin ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <SelectField label="Torre:" value={torre} options={torres} onChange={setTorre} />
                </div>
                <div style={{ flex: 1 }}>
                  <SelectField label="Depto:" value={depto} options={departamentos} onChange={setDepto} />
                </div>
              </div>
              ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Torre:</div>
                  <div style={{ padding: '10px 14px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{torre || '—'}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Depto:</div>
                  <div style={{ padding: '10px 14px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{depto || '—'}</div>
                </div>
              </div>
              )}
              {rolActivo === 'administrador' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontFamily: theme.fonts.family, userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={paraAdministracion}
                    onChange={e => setParaAdministracion(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: theme.colors.primary }}
                  />
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Visita para administración</span>
                </label>
              )}
              {tipoSeleccionado !== 'permanente' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <input
                  type="number"
                  value={personas}
                  onChange={e => setPersonas(e.target.value)}
                  min="1"
                  style={{ ...inputStyle, width: '60px', flex: '0 0 auto', textAlign: 'center' }}
                />
                <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>personas</span>
                <span style={{ margin: '0 2px', color: theme.colors.textMuted }}>·</span>
                <input
                  type="number"
                  value={cantidadMenores}
                  onChange={e => setCantidadMenores(Math.max(0, Math.min(parseInt(e.target.value) || 0, Math.max(0, parseInt(personas) - 1))))}
                  min="0"
                  style={{ ...inputStyle, width: '60px', flex: '0 0 auto', textAlign: 'center' }}
                />
                <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>👶 menores</span>
              </div>
              )}
            </div>

            {tipoSeleccionado === 'permanente' && (
              <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
                El profesional permanente se registra de a uno. Podés registrar visitas adicionales creando una nueva visita.
              </div>
            )}

            {/* Calendar — Guardia solo hoy */}
            {esGuardia ? (
              <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, textAlign: 'center' }}>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Fecha de la visita</div>
                <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Hoy — {new Date().toLocaleDateString('es-AR')}</div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '4px' }}>El Guardia solo puede registrar visitas del mismo día</div>
              </div>
            ) : (
              <Calendar selected={selectedDate} onSelect={setSelectedDate} />
            )}

            {/* Person info — todos los campos editables */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold }}>Nombre y Apellido</div>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                style={inputStyle}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Tipo</div>
                  <select value={tipoId} onChange={e => setTipoId(e.target.value)} style={{ ...inputStyle }}>
                    <option>Cedula</option>
                    <option>Pasaporte</option>
                    <option>DNI</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                    Identificación {esProfesional(tipoSeleccionado) && <span style={{ color: theme.colors.danger }}>*</span>}
                    {!esProfesional(tipoSeleccionado) && <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>(opcional)</span>}
                  </div>
                  <input
                    type="text"
                    value={identificacion}
                    onChange={e => setIdentificacion(e.target.value)}
                    required={esProfesional(tipoSeleccionado)}
                    aria-required={esProfesional(tipoSeleccionado)}
                    aria-invalid={!!identificacionError}
                    placeholder={esProfesional(tipoSeleccionado) ? 'Obligatorio para profesional' : 'Opcional'}
                    style={{
                      ...inputStyle,
                      borderColor: identificacionError ? theme.colors.danger : theme.colors.border,
                      background: identificacionError ? theme.colors.dangerLight : theme.colors.bgMuted,
                    }}
                  />
                  {identificacionError && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, marginTop: '4px' }}>{identificacionError}</div>
                  )}
                </div>
              </div>

              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
                Recuerda indicar a tu invitado que debe presentar su documento (cédula, pasaporte o DNI) en portería al ingresar al edificio.
              </div>

              {!esGuardia && (
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Correo electrónico (opcional)</div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}

              {(!esGuardia || tipoSeleccionado === 'temporal') && (
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                    Teléfono {tipoSeleccionado === 'temporal' && esGuardia ? <span style={{ color: theme.colors.danger }}>*</span> : '(opcional)'}
                  </div>
                  <input
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder={tipoSeleccionado === 'temporal' && esGuardia ? 'Obligatorio para profesional temporal' : 'Opcional'}
                    style={inputStyle}
                  />
                </div>
              )}

              {esProfesional(tipoSeleccionado) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Profesión</div>
                  <SelectField
                    label=""
                    value={profesion}
                    options={PROFESIONES[tipoSeleccionado] || []}
                    onChange={setProfesion}
                    placeholder="Seleccione profesión"
                  />
                  {profesionOtra(tipoSeleccionado, profesion) && (
                    <input
                      type="text"
                      value={profesionOtro}
                      onChange={e => setProfesionOtro(e.target.value)}
                      placeholder="Especifique la profesión"
                      style={inputStyle}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Acompañantes */}
            {acompanantes.length > 0 && acompanantes.map((acc, idx) => (
              <div key={idx} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.sm }}>Acompañante {idx + 1}</div>
                <input
                  type="text"
                  value={acc.nombre}
                  onChange={e => {
                    const updated = [...acompanantes];
                    updated[idx] = { ...updated[idx], nombre: e.target.value };
                    setAcompanantes(updated);
                  }}
                  placeholder="Nombre y Apellido"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                    Identificación {tipoSeleccionado === 'temporal' ? <span style={{ color: theme.colors.danger }}>*</span> : <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>(opcional)</span>}
                  </div>
                  <input
                    type="text"
                    value={acc.ci}
                    onChange={e => {
                      const updated = [...acompanantes];
                      updated[idx] = { ...updated[idx], ci: e.target.value };
                      setAcompanantes(updated);
                      if (acompanantesCiErrors[idx] && e.target.value.trim()) {
                        setAcompanantesCiErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
                      }
                    }}
                    placeholder={tipoSeleccionado === 'temporal' ? 'Obligatorio para profesional temporal' : 'Identificación (opcional)'}
                    required={tipoSeleccionado === 'temporal'}
                    aria-required={tipoSeleccionado === 'temporal'}
                    aria-invalid={!!acompanantesCiErrors[idx]}
                    style={{
                      ...inputStyle,
                      borderColor: acompanantesCiErrors[idx] ? theme.colors.danger : theme.colors.border,
                      background: acompanantesCiErrors[idx] ? theme.colors.dangerLight : theme.colors.bgMuted,
                    }}
                  />
                  {acompanantesCiErrors[idx] && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger }}>La identificación es obligatoria</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Menor de edad</span>
                  <Toggle
                    value={!!acc.esMenor}
                    onChange={(v) => {
                      const updated = [...acompanantes];
                      updated[idx] = { ...updated[idx], esMenor: v };
                      setAcompanantes(updated);
                      setMostrarAvisoMenores(true);
                      if (v) setAvisoMenoresOpen(true);
                    }}
                  />
                </div>
              </div>
            ))}

            {(acompanantes.some(a => a.esMenor) || mostrarAvisoMenores) && (
              <div style={{ background: '#FEF3C7', borderRadius: theme.radius.lg, padding: '12px 14px', fontSize: theme.fonts.sizes.xs, color: '#92400E', lineHeight: 1.5 }}>
                Advertencia legal: Si el invitado es menor de edad, debe ingresar con su padre/madre/tutor legal con la documentación respectiva. Este edificio está comprometido con la prevención del abuso sexual de menores y la trata de personas.
              </div>
            )}

            {/* Hora de ingreso - Guardia registra hora real, residente estima rango */}
            {esGuardia ? (
              <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Hora de ingreso <span style={{ color: theme.colors.danger }}>*</span></div>
                <input
                  type="time"
                  value={horaIngresoGuardia}
                  onChange={e => setHoraIngresoGuardia(e.target.value)}
                  style={{ ...inputStyle, width: '100%' }}
                />
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>La salida se registra posteriormente desde el detalle del ingreso.</div>
              </div>
            ) : (
              <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Hora estimada de llegada</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="time"
                    value={horaInicio}
                    onChange={e => setHoraInicio(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', flex: 1 }}
                  />
                  <span style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>a</span>
                  <input
                    type="time"
                    value={horaFin}
                    onChange={e => setHoraFin(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', flex: 1 }}
                  />
                </div>
              </div>
            )}

            {!esGuardia && tipoSeleccionado === 'huesped-temporal' && (
              <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Hora estimada de salida</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="time"
                    value={horaSalidaInicio}
                    onChange={e => setHoraSalidaInicio(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', flex: 1 }}
                  />
                  <span style={{ color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>a</span>
                  <input
                    type="time"
                    value={horaSalidaFin}
                    onChange={e => setHoraSalidaFin(e.target.value)}
                    style={{ ...inputStyle, width: 'auto', flex: 1 }}
                  />
                </div>
              </div>
            )}

            {/* Vehículo — toggle sí/no + cantidad + tipo + placa */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>¿Traes vehículos?</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: theme.fonts.family, userSelect: 'none' }}>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>No</span>
                  <div onClick={() => setTieneVehiculoToggle(!tieneVehiculoToggle)} style={{
                    width: '40px', height: '22px', borderRadius: '11px',
                    background: tieneVehiculoToggle ? theme.colors.primary : theme.colors.bgMuted,
                    border: `1.5px solid ${tieneVehiculoToggle ? theme.colors.primary : theme.colors.border}`,
                    position: 'relative', cursor: 'pointer', transition: 'all 200ms', flexShrink: 0,
                  }}>
                    <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: '#fff', position: 'absolute', top: '2px',
                      left: tieneVehiculoToggle ? '21px' : '2px',
                      transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Sí</span>
                </label>
              </div>
              {tieneVehiculoToggle && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Cantidad</span>
                    <input type="number" min="1" value={cantidadVehiculos} onChange={e => setCantidadVehiculos(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ ...inputStyle, width: '80px' }} />
                  </div>
                  {vehiculos.map((v, idx) => (
                    <div key={idx} style={{ padding: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>Vehículo {idx + 1}</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={v.tipo || 'auto'} onChange={e => {
                          const updated = [...vehiculos];
                          updated[idx] = { ...updated[idx], tipo: e.target.value };
                          setVehiculos(updated);
                        }} style={{ ...inputStyle, width: '100px', flexShrink: 0 }}>
                          <option value="auto">Auto</option>
                          <option value="camioneta">Camioneta</option>
                          <option value="van">Van</option>
                          <option value="bus">Bus</option>
                          <option value="moto">Moto</option>
                        </select>
                        <input type="text" value={v.placa} onChange={e => {
                          const updated = [...vehiculos];
                          updated[idx] = { ...updated[idx], placa: e.target.value.toUpperCase() };
                          setVehiculos(updated);
                        }} placeholder="Placa" style={{ ...inputStyle, flex: 1 }} />
                      </div>
                    </div>
                  ))}
                  {esGuardia && estacionamientosVisitantes && estacionamientosVisitantes.total > 0 && (
                    <div style={{ marginTop: '4px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>
                        Estacionamientos disponibles: {estacionamientosVisitantes.total - Object.keys(estacionamientosAsignados||{}).length} libres
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                        {Array.from({ length: estacionamientosVisitantes.total }, (_, i) => {
                          const spot = `B${String(i+1).padStart(2,'0')}`;
                          const ocupado = !!(estacionamientosAsignados||{})[spot];
                          const seleccionado = estacionamientosSelGuardia.includes(spot);
                          return (
                            <button
                              key={spot}
                              type="button"
                              disabled={ocupado}
                              onClick={() => {
                                if (ocupado) return;
                                setEstacionamientosSelGuardia(prev => prev.includes(spot) ? prev.filter(s=>s!==spot) : [...prev, spot]);
                              }}
                              style={{
                                padding: '6px 10px', borderRadius: theme.radius.full,
                                border: `1.5px solid ${seleccionado ? theme.colors.primary : theme.colors.border}`,
                                background: ocupado ? '#F3F4F6' : (seleccionado ? theme.colors.primary : theme.colors.bgCard),
                                color: ocupado ? theme.colors.textMuted : (seleccionado ? '#fff' : theme.colors.text),
                                fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                                cursor: ocupado ? 'not-allowed' : 'pointer', fontFamily: theme.fonts.family,
                                opacity: ocupado ? 0.6 : 1,
                              }}
                            >
                              {spot}{ocupado ? ' • ocupado' : (seleccionado ? ' ✓' : '')}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>
                        Seleccionados: {estacionamientosSelGuardia.length ? estacionamientosSelGuardia.join(', ') : 'ninguno'}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Notification type selector - Guardia siempre es mediante anuncio */}
            {esGuardia ? (
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', border: `1px solid ${theme.colors.border}` }}>
                Ingreso mediante <strong>anuncio</strong> — se notificará y anunciará al residente. La opción "solo notificado" aplica únicamente cuando el residente pre-registró la visita.
              </div>
            ) : (
              <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: theme.fonts.weights.semibold, textAlign: 'center', fontSize: theme.fonts.sizes.base }}>
                  Tipo de notificación
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'solo-notificar', label: 'Solo notificar' },
                    { id: 'notificar-y-anunciar', label: 'Notificar y anunciar' },
                  ].map(op => (
                    <button
                      key={op.id}
                      onClick={() => setTipoNotificacion(op.id)}
                      style={{
                        flex: 1,
                        padding: '12px 8px',
                        borderRadius: theme.radius.lg,
                        background: tipoNotificacion === op.id ? theme.colors.primary : theme.colors.bgMuted,
                        border: `1.5px solid ${tipoNotificacion === op.id ? theme.colors.primary : theme.colors.border}`,
                        color: tipoNotificacion === op.id ? '#fff' : theme.colors.text,
                        cursor: 'pointer',
                        fontFamily: theme.fonts.family,
                        fontSize: theme.fonts.sizes.sm,
                        fontWeight: tipoNotificacion === op.id ? theme.fonts.weights.semibold : theme.fonts.weights.normal,
                        textAlign: 'center',
                        transition: 'all 200ms',
                      }}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Campos exclusivos de Guardia: quién aprobó, anotaciones y foto */}
            {esGuardia && (
              <>
                <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base }}>Anuncio</div>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>¿Quién aprobó el ingreso? <span style={{ color: theme.colors.danger }}>*</span></div>
                    <input
                      type="text"
                      value={aprobadoPor}
                      onChange={e => setAprobadoPor(e.target.value)}
                      placeholder="Nombre de quien aprobó (ej. Residente 105, Administración)"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Anotaciones adicionales</div>
                    <textarea
                      value={anotacionesGuardia}
                      onChange={e => setAnotacionesGuardia(e.target.value)}
                      placeholder="Ej.: ingresó con una maleta, acompañado de..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Foto (opcional)</div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        files.forEach(f => {
                          const reader = new FileReader();
                          reader.onload = () => setFotosGuardia(prev => [...prev, reader.result]);
                          reader.readAsDataURL(f);
                        });
                      }}
                      style={{ fontSize: theme.fonts.sizes.sm }}
                    />
                    {fotosGuardia.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {fotosGuardia.map((f,i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={f} alt={`foto ${i}`} style={{ width: '72px', height: '72px', borderRadius: theme.radius.md, objectFit: 'cover', border: `1px solid ${theme.colors.border}` }} />
                            <button type="button" onClick={()=> setFotosGuardia(prev=> prev.filter((_,idx)=> idx!==i))} style={{ position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%', background: theme.colors.danger, color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px' }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Button variant="primary" fullWidth onClick={handleAceptar}>Aceptar</Button>
          </>
        )}

        <div style={{ height: '16px' }} />
      </div>

      {/* Modal suscripcion — Huesped Temporal sin suscripcion */}
      <Modal isOpen={showSuscripcionModal} onClose={() => {
        if (llegoComoHuespedPre && !suscripcionActiva) {
          navigate('/visitas');
        } else {
          setShowSuscripcionModal(false);
        }
      }} title="VeciYo Huesped Temporal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '100%', height: '180px', borderRadius: theme.radius.xl, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
            ▶️
          </div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
            Los primeros 30 dias son gratuitos. Suscribete y disfruta de todos los beneficios!
          </p>
          <Button variant="primary" fullWidth onClick={() => { setShowSuscripcionModal(false); setShowPaymentModal(true); }}>
            Suscribirse
          </Button>
        </div>
      </Modal>

      {/* Modal pago — datos de tarjeta */}
      <Modal isOpen={showPaymentModal} onClose={() => { if (!paymentLoading) setShowPaymentModal(false); }} title="Pago de suscripcion">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
          <div style={{ textAlign: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
            <div style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>$15.00</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>por mes - Huesped Temporal</div>
          </div>
          <InputField label="Nombre del titular" value={paymentForm.cardName} onChange={v => setPaymentForm(p => ({ ...p, cardName: v }))} placeholder="Como figura en la tarjeta" disabled={paymentLoading} />
          <InputField label="Numero de tarjeta" value={paymentForm.cardNumber} onChange={handleCardNumberInput} placeholder="1234 5678 9012 3456" disabled={paymentLoading} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InputField label="Vencimiento" value={paymentForm.cardExpiry} onChange={handleCardExpiryInput} placeholder="MM/AA" disabled={paymentLoading} />
            <InputField label="CVV" value={paymentForm.cardCvv} onChange={handleCardCvvInput} placeholder="123" disabled={paymentLoading} />
          </div>
          <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5 }}>
            Pago 100% simulado. No se realizara ningun cobro real.
          </div>
          <Button variant="primary" fullWidth onClick={handleSubscribeAndPay} disabled={paymentLoading}>
            {paymentLoading ? 'Procesando pago...' : 'Pagar $15.00 y suscribirse'}
          </Button>
        </div>
      </Modal>

      {/* Success modal */}
      <Modal isOpen={showSuccess} onClose={() => { setShowSuccess(false); navigate('/visitas'); }} title={TIPO_LABELS[tipoSeleccionado] || 'Visita'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.semibold }}>Visita cargada con exito</p>
          <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={tipoVisitaIcons[tipoSeleccionado]} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
              <span style={{ fontWeight: theme.fonts.weights.bold }}>{nombre}</span>
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI:{identificacion}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge status="Aceptado" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                <span>🕐</span>
                <span>{selectedDate.toLocaleDateString('es-AR')}</span>
              </div>
            </div>
          </div>
          {tipoSeleccionado === 'permanente' && (
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '10px 12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5, textAlign: 'left' }}>
              Recuerda indicar a tu invitado que debe presentar su documento (cédula, pasaporte o DNI) en portería al ingresar al edificio.
            </div>
          )}
          {tipoSeleccionado === 'huesped-temporal' && (
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.xl, padding: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                Mensaje para compartir:
              </div>
              <div style={{
                background: theme.colors.bgCard,
                borderRadius: theme.radius.lg,
                padding: '12px',
                fontSize: theme.fonts.sizes.sm,
                color: theme.colors.textSecondary,
                lineHeight: 1.5,
                fontStyle: 'italic',
                border: `1px solid ${theme.colors.border}`,
              }}>
                "Este es el enlace de tu reservación wwww.veciyolink/reserva-{numeroReserva}. Tu código de acceso es {codigoAcceso}. Bienvenido"
              </div>
              <button
                onClick={() => {
                  const enlace = `wwww.veciyolink/reserva-${numeroReserva}`;
                  const mensaje = `Este es el enlace de tu reservación ${enlace}. Tu código de acceso es ${codigoAcceso}. Bienvenido`;
                  navigator.clipboard?.writeText(mensaje);
                  addToast('Mensaje copiado al portapapeles');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: theme.radius.full,
                  background: theme.colors.primary,
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.sm,
                  fontWeight: theme.fonts.weights.semibold,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copiar mensaje para WhatsApp
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Warning modal for HT registration */}
      <Modal isOpen={showWarningRegistro} onClose={() => setShowWarningRegistro(false)} title="Aviso importante">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>⚠️</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
            Al registrar la visita, ingresa el número de documento del invitado en el sistema. El invitado debe traer su documento físico (cédula, pasaporte o DNI) al ingresar al edificio. Si el invitado es menor de edad, debe ingresar con su padre/madre/tutor legal con la documentación respectiva. Este edificio está comprometido con la prevención del abuso sexual de menores y la trata de personas.
          </p>
          <Button variant="primary" fullWidth onClick={() => { setShowWarningRegistro(false); handleAceptarContinuar(); }}>Entendido, continuar</Button>
          <Button variant="ghost" fullWidth onClick={() => setShowWarningRegistro(false)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Aviso legal al marcar un acompañante como menor de edad (P12) */}
      <Modal isOpen={avisoMenoresOpen} onClose={() => setAvisoMenoresOpen(false)} title="Aviso legal — menores de edad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>👶⚠️</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
            Si el invitado es menor de edad, debe ingresar con su padre/madre/tutor legal con la documentación respectiva. Este edificio está comprometido con la prevención del abuso sexual de menores y la trata de personas.
          </p>
          <Button variant="primary" fullWidth onClick={() => setAvisoMenoresOpen(false)}>Entendido</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
