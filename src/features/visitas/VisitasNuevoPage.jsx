import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Calendar from '../../components/ui/Calendar';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ImageUploadCard from '../../components/ui/ImageUploadCard';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { torres, departamentos, tiposDocumentoPorPais } from '../../data/mockData';
import tipoVisitaIcons, { visitavalida, visitanovalida } from '../../assets/icons/visitas';

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

const PACKS = [
  { id: 1, label: 'Pack de 10 verificaciones', precio: '$10' },
  { id: 2, label: 'Pack de 15 verificaciones', precio: '$15' },
  { id: 3, label: 'Pack de 20 verificaciones', precio: '$20' },
];

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
  const { agregarVisita, rolActivo, suscripcionActiva, activarSuscripcion, ubicacionActiva, addToast, unidades, configHuespedesTemporales, actualizarConfigHuespedTemporal, permisos, esResidente } = useApp();
  const esAnfitrion = rolActivo === 'propietario' || rolActivo === 'inquilino-lider';
  const TIPOS = rolActivo === 'guardia'
    ? TIPOS_BASE.filter(t => t.id !== 'permanente')
    : rolActivo === 'huesped-temporal'
    ? TIPOS_BASE.filter(t => t.id === 'amigos')
    : [...TIPOS_BASE, ...(permisos?.huespedesTemporales !== false ? [TIPO_HUESPED_TEMPORAL] : [])];

  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [torre, setTorre] = useState('');
  const [depto, setDepto] = useState('');
  const [esVisitaAdministracion, setEsVisitaAdministracion] = useState(false);
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
  const [estacionamientosSeleccionados, setEstacionamientosSeleccionados] = useState(0);
  const [vehiculos, setVehiculos] = useState([]);
  const [showSuscripcionModal, setShowSuscripcionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [codigoAcceso, setCodigoAcceso] = useState('');
  const [numeroReserva, setNumeroReserva] = useState('');
  const [showCompraVerificaciones, setShowCompraVerificaciones] = useState(false);
  const [compraStep, setCompraStep] = useState(1);
  const [packCompra, setPackCompra] = useState(null);

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
    setEstacionamientosSeleccionados(0);
    setVehiculos([]);
  }, [torre, depto]);

  useEffect(() => {
    const target = tieneVehiculoToggle ? cantidadVehiculos : 0;
    setVehiculos(prev => {
      const updated = [...prev];
      while (updated.length < target) {
        updated.push({ placa: '', tipo: 'auto', color: '' });
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
        updated.push({ nombre: '', ci: '', tipoDoc: 'Cedula' });
      }
      while (updated.length > compCount) {
        updated.pop();
      }
      return updated;
    });
    setAcompananteDocs(prev => {
      const updated = [...prev];
      while (updated.length < compCount) updated.push(null);
      while (updated.length > compCount) updated.pop();
      return updated;
    });
    setAcompananteMenor(prev => {
      const updated = [...prev];
      while (updated.length < compCount) updated.push(false);
      while (updated.length > compCount) updated.pop();
      return updated;
    });
  }, [personas]);

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
      navigate('/propietario/configuracion/huespedes-temporales', { state: { from: '/visitas/nuevo' } });
    }, 1500);
  };

  const [showVerifModal, setShowVerifModal] = useState(false);
  const [showSaldoModal, setShowSaldoModal] = useState(false);
  const [saldoInfo, setSaldoInfo] = useState({ disponibles: 0, necesarias: 0 });
  const [packSeleccionado, setPackSeleccionado] = useState(null);
  const [verifStep, setVerifStep] = useState(1);
  const [verifResult, setVerifResult] = useState(null);

  const [tieneVehiculoToggle, setTieneVehiculoToggle] = useState(false);
  const [cantidadVehiculos, setCantidadVehiculos] = useState(1);
  const [tipoNotificacion, setTipoNotificacion] = useState('notificar');
  const [showSuccess, setShowSuccess] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [verificarDocumento, setVerificarDocumento] = useState(false);
  const [diasLaborales, setDiasLaborales] = useState('');
  const [acompananteDocs, setAcompananteDocs] = useState([]);
  const [acompananteMenor, setAcompananteMenor] = useState([]);
  const aceptaAdvertenciaRef = useRef(false);
  const [showWarningMinor, setShowWarningMinor] = useState(null);
  const [showWarningRegistro, setShowWarningRegistro] = useState(false);

  const selectedTipo = TIPOS.find(t => t.id === tipoSeleccionado);

  const DOC_WARNING_TEXT = '\u26A0\uFE0F Recuerda pedirle el documento al invitado. Si el invitado es menor de edad, debe ingresar con su padre/madre/tutor legal con la documentación respectiva. El edificio está comprometido con la prevención del abuso sexual de menores y la trata de personas.';

  const handleVerificacion = () => {
    setVerifStep(1);
    setVerifResult(null);
    setShowVerifModal(true);
  };

  const handleVerifNext = () => {
    if (verifStep === 1) {
      if (!packSeleccionado) return;
      setVerifStep(2);
    } else if (verifStep === 2) {
      setVerifStep(3);
      setVerifResult(Math.random() > 0.4 ? 'success' : 'error');
    }
  };

  const generarCodigoAcceso = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

    const handleAceptar = () => {
      // Check verification balance for huesped-temporal
      if (tipoSeleccionado === 'huesped-temporal') {
        const configVerif = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id]?.verificaciones : null;
        if (configVerif) {
          const disponiblesSuscritas = Math.max(0, 20 - (configVerif.suscritasUsadas || 0));
          const disponiblesSuplementarias = configVerif.suplementarias || 0;
          const totalDisponibles = disponiblesSuscritas + disponiblesSuplementarias;
          const numPersonas = parseInt(personas) || 1;
          if (totalDisponibles < numPersonas) {
            setSaldoInfo({ disponibles: totalDisponibles, necesarias: numPersonas });
            setShowSaldoModal(true);
            return;
          }
        }
        // Validate companions for huesped-temporal
        const invalidCompanions = acompanantes.filter(a => a.nombre.trim() && !a.ci.trim());
        if (invalidCompanions.length > 0) {
          addToast('Todos los acompañantes deben tener un número de identificación', 'warning');
          return;
        }
      }
      // Días laborales obligatorios para Profesional Permanente
      if (tipoSeleccionado === 'permanente' && !diasLaborales.trim()) {
        addToast('Debes asignar los días laborales del profesional permanente', 'warning');
        return;
      }
      // Show warning for huesped-temporal registration
      if (tipoSeleccionado === 'huesped-temporal' && !aceptaAdvertenciaRef.current) {
        setShowWarningRegistro(true);
        return;
      }
    const invitados = acompanantes
      .filter(a => a.nombre.trim())
      .map(a => ({ nombre: a.nombre, ci: a.ci || '', llego: false, tipoDoc: a.tipoDoc || 'Cedula' }));
    const tieneVehiculo = tieneVehiculoToggle && vehiculos.some(v => v.placa.trim());
    const vehiculosValidos = tieneVehiculoToggle ? vehiculos.filter(v => v.placa.trim()).map(v => ({ placa: v.placa, tipo: v.tipo || 'auto', color: v.color || '' })) : [];
    const num = Math.floor(Math.random() * 900000 + 100000);
    const cod = generarCodigoAcceso();
    setNumeroReserva(num);
    setCodigoAcceso(cod);
    let docInstruccion = 'no-verificar';
    if (tipoSeleccionado === 'temporal') {
      docInstruccion = verificarDocumento ? 'verificar' : 'no-verificar';
    } else if (tipoSeleccionado === 'huesped-temporal') {
      docInstruccion = 'verificar';
    }
    const visita = {
      tipo: tipoSeleccionado,
      nombre,
      ...(tipoSeleccionado !== 'amigos' ? { ci: identificacion } : {}),
      ...(tipoSeleccionado !== 'amigos' && tipoSeleccionado !== 'temporal' ? { email } : {}),
      ...(tipoSeleccionado !== 'amigos' ? { telefono } : {}),
      ...(tipoSeleccionado === 'permanente' ? { diasLaborales } : {}),
      estado: tipoSeleccionado === 'huesped-temporal' ? 'Pendiente' : 'Aceptado',
      instruccionDocumento: docInstruccion,
      tipoNotificacion,
      tieneVehiculo,
      instruccionesCumplidas: {},
      fechaDesde: selectedDate.toLocaleDateString('es-AR'),
      fechaHasta: selectedDate.toLocaleDateString('es-AR'),
      invitados,
      reserva: tipoSeleccionado === 'huesped-temporal' ? `N°: ${num}` : undefined,
      codigoAcceso: tipoSeleccionado === 'huesped-temporal' ? cod : undefined,
      qrUrl: tipoSeleccionado === 'huesped-temporal' ? `wwww.veciyolink/reserva-${num}` : undefined,
      torre,
      depto,
      personas: parseInt(personas),
      horaEstimadaLlegada: horaEstimada,
      horaEstimadaSalida: horaEstimadaSalida || undefined,
      estacionamientosAsignados: tieneVehiculoToggle ? (estacionamientosSeleccionados || 1) : undefined,
      vehiculos: vehiculosValidos,
    };
    agregarVisita(visita);
    setShowSuccess(true);
  };

  const accesoBloqueado = (rolActivo === 'propietario' && !esResidente) || (rolActivo === 'huesped-temporal' && ubicacionActiva && configHuespedesTemporales[ubicacionActiva.id]?.permiteVisitasHuespedes === 'prohibir-todos');

  return (
    <AppShell>
      {accesoBloqueado ? (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base, marginTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          {rolActivo === 'huesped-temporal' ? (
            <p>El anfitrión ha configurado que los huéspedes temporales no pueden registrar visitas.</p>
          ) : (
            <>
              <p>No tienes acceso a Visitas. Solo los Residentes pueden usar esta función.</p>
              <p style={{ fontSize: theme.fonts.sizes.sm, marginTop: '8px' }}>Si eres Propietario, declárate como Residente desde Configuración.</p>
            </>
          )}
        </div>
      ) : (<>
      <PageHeader title="Visitas" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Type selector */}
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

        {/* Verification banner + bars — solo para propietario/anfitrión, en registro de huésped temporal */}
        {tipoSeleccionado === 'huesped-temporal' && esAnfitrion && (() => {
          const configVerif = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id]?.verificaciones : null;
          if (!configVerif) return null;
          const suscritasTotal = 20;
          const suscritasUsadas = configVerif.suscritasUsadas || 0;
          const restantesSuscritas = Math.max(0, suscritasTotal - suscritasUsadas);
          const suplementarias = configVerif.suplementarias || 0;
          const totalRestantes = restantesSuscritas + suplementarias;
          return (
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Banner */}
              <div style={{ background: '#E8F5E9', borderRadius: theme.radius.lg, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px' }}>🛡️</span>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: '#2E7D32', lineHeight: 1.4 }}>
                  Te quedan <strong>{totalRestantes} verificaciones</strong> disponibles.
                </span>
              </div>
              {/* Barra 1 — Suscritas mensuales */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Suscritas mensuales</span>
                    <span
                      onClick={() => addToast('Las verificaciones suscritas se renuevan el día 1 de cada mes. No son acumulables: si no se usan, no se arrastran al mes siguiente.', 'info')}
                      style={{ cursor: 'pointer', fontSize: '14px', color: theme.colors.primary, fontWeight: 'bold', lineHeight: 1 }}
                      title="Más información"
                    >ⓘ</span>
                  </div>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>{restantesSuscritas}/{suscritasTotal}</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                  <div style={{ width: `${(restantesSuscritas / suscritasTotal) * 100}%`, height: '100%', background: theme.colors.primary, borderRadius: theme.radius.full, transition: 'width 300ms' }} />
                </div>
              </div>
              {/* Barra 2 — Suplementarias */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Suplementarias</span>
                    <span
                      onClick={() => addToast('Las verificaciones suplementarias tienen 90 días de validez desde la compra. Las suscritas mensuales siempre se consumen con prioridad.', 'info')}
                      style={{ cursor: 'pointer', fontSize: '14px', color: theme.colors.secondary, fontWeight: 'bold', lineHeight: 1 }}
                      title="Más información"
                    >ⓘ</span>
                  </div>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>{suplementarias} restantes</span>
                </div>
                <div style={{ width: '100%', height: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (suplementarias / 20) * 100)}%`, height: '100%', background: theme.colors.secondary, borderRadius: theme.radius.full, transition: 'width 300ms' }} />
                </div>
              </div>
              {/* Botón comprar */}
              <button
                onClick={() => { setPackCompra(null); setCompraStep(1); setShowCompraVerificaciones(true); }}
                style={{
                  width: '100%', padding: '8px', borderRadius: theme.radius.full,
                  background: theme.colors.secondary, color: '#fff', border: 'none',
                  cursor: 'pointer', fontFamily: theme.fonts.family,
                  fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                }}
              >
                + Comprar verificaciones
              </button>
            </div>
          );
        })()}

        {tipoSeleccionado && (
          <>
            {/* Guest count */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold, textAlign: 'center', fontSize: theme.fonts.sizes.base }}>
                Cantidad de invitados
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {rolActivo === 'administrador' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', width: '100%' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: theme.fonts.family }}>
                      <input
                        type="checkbox"
                        checked={esVisitaAdministracion}
                        onChange={e => {
                          setEsVisitaAdministracion(e.target.checked);
                          if (e.target.checked) { setTorre('Administración'); setDepto('Administración'); }
                          else { setTorre(''); setDepto(''); }
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Visita para la Administración</span>
                    </label>
                  </div>
                )}
                {!esVisitaAdministracion && (<>
                <div style={{ flex: 1 }}>
                  <SelectField label="Torre:" value={torre} options={torres} onChange={setTorre} />
                </div>
                <div style={{ flex: 1 }}>
                  <SelectField label="Depto:" value={depto} options={departamentos} onChange={setDepto} />
                </div>
                </>)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <input
                    type="number"
                    value={personas}
                    onChange={e => setPersonas(e.target.value)}
                    min="1"
                    style={{ ...inputStyle, width: '80px' }}
                  />
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>personas</span>
                </div>
                
              </div>
            </div>

            {/* Calendar */}
            <Calendar selected={selectedDate} onSelect={setSelectedDate} />

            {/* Person info — campos según tipo de visita */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold }}>Nombre y Apellido</div>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                style={inputStyle}
              />

              {/* CI/DNI — solo para temporal y huesped-temporal */}
              {tipoSeleccionado !== 'amigos' && tipoSeleccionado !== 'permanente' && (
                <div style={{ display: 'grid', gridTemplateColumns: tipoSeleccionado === 'temporal' ? '1fr 1fr auto' : '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Tipo</div>
                    <select value={tipoId} onChange={e => setTipoId(e.target.value)} style={{ ...inputStyle }}>
                      {(tiposDocumentoPorPais?.Argentina || ['Cedula', 'Pasaporte', 'DNI']).map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Identificación</div>
                    <input
                      type="text"
                      value={identificacion}
                      onChange={e => setIdentificacion(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  {tipoSeleccionado === 'temporal' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-end', paddingBottom: '4px' }}>
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Verificar</span>
                      <input
                        type="checkbox"
                        checked={verificarDocumento}
                        onChange={e => setVerificarDocumento(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Días laborales — solo para permanente (obligatorio) */}
              {tipoSeleccionado === 'permanente' && (
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                    Días laborales <span style={{ color: theme.colors.danger }}>*</span>
                  </div>
                  <input
                    type="text"
                    value={diasLaborales}
                    onChange={e => setDiasLaborales(e.target.value)}
                    placeholder="Obligatorio · Ej: Lun-Vie 9:00-18:00"
                    style={{ ...inputStyle, borderColor: diasLaborales.trim() ? theme.colors.border : theme.colors.danger }}
                  />
                  <div style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted, marginTop: '4px' }}>
                    Registro persistente: indica los días y horarios en que el profesional presta servicio.
                  </div>
                </div>
              )}

              {/* Email — oculto para amigos y temporal */}
              {tipoSeleccionado !== 'amigos' && tipoSeleccionado !== 'temporal' && (
              <div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Correo electronico</div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
              )}

              {/* Teléfono — oculto para amigos (solo lo ve el Guardia) */}
              {tipoSeleccionado !== 'amigos' && (
              <div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Teléfono</div>
                <input
                  type="tel"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  style={inputStyle}
                />
              </div>
              )}
            </div>

            {/* Acompañantes */}
            {acompanantes.length > 0 && acompanantes.map((acc, idx) => {
              const esHT = tipoSeleccionado === 'huesped-temporal';
              return (
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
                {esHT && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={acc.tipoDoc || 'Cedula'} onChange={e => {
                      const updated = [...acompanantes];
                      updated[idx] = { ...updated[idx], tipoDoc: e.target.value };
                      setAcompanantes(updated);
                    }} style={{ ...inputStyle, width: '120px', flexShrink: 0 }}>
                      {(tiposDocumentoPorPais?.Argentina || ['Cedula', 'Pasaporte', 'DNI']).map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={acc.ci}
                      onChange={e => {
                        const updated = [...acompanantes];
                        updated[idx] = { ...updated[idx], ci: e.target.value };
                        setAcompanantes(updated);
                      }}
                      placeholder="Identificación *"
                      style={{ ...inputStyle, flex: 1, borderColor: esHT && !acc.ci.trim() ? theme.colors.danger : theme.colors.border }}
                    />
                  </div>
                )}
                {!esHT && (
                <input
                  type="text"
                  value={acc.ci}
                  onChange={e => {
                    const updated = [...acompanantes];
                    updated[idx] = { ...updated[idx], ci: e.target.value };
                    setAcompanantes(updated);
                  }}
                  placeholder="Identificación (opcional)"
                  style={inputStyle}
                />
                )}
                {esHT && (
                  <div>
                    <ImageUploadCard
                      label="Foto del documento"
                      value={acompananteDocs[idx]}
                      onChange={file => {
                        const updated = [...acompananteDocs];
                        updated[idx] = file;
                        setAcompananteDocs(updated);
                      }}
                      height="120px"
                      placeholder="Subir foto del documento"
                    />
                  </div>
                )}
                {esHT && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                      <input
                        type="checkbox"
                        checked={acompananteMenor[idx]}
                        onChange={e => {
                          const updated = [...acompananteMenor];
                          updated[idx] = e.target.checked;
                          setAcompananteMenor(updated);
                          if (e.target.checked) setShowWarningMinor(idx);
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      Es menor de edad
                    </label>
                  </div>
                )}
              </div>
            );
            })}

            {/* Hora estimada de llegada */}
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

            {tipoSeleccionado === 'huesped-temporal' && (
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

            {/* Vehículo — toggle sí/no + cantidad + tipo/color/placa */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>¿Tiene vehículo?</span>
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
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, whiteSpace: 'nowrap' }}>Cantidad de vehículos</span>
                    <input
                      type="number"
                      min="1"
                      value={cantidadVehiculos}
                      onChange={e => setCantidadVehiculos(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ ...inputStyle, width: '80px' }}
                    />
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
                          <option value="moto">Moto</option>
                          <option value="bus">Bus</option>
                        </select>
                        <input
                          type="text"
                          value={v.placa}
                          onChange={e => {
                            const updated = [...vehiculos];
                            updated[idx] = { ...updated[idx], placa: e.target.value.toUpperCase() };
                            setVehiculos(updated);
                          }}
                          placeholder="Placa"
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        <input
                          type="text"
                          value={v.color || ''}
                          onChange={e => {
                            const updated = [...vehiculos];
                            updated[idx] = { ...updated[idx], color: e.target.value };
                            setVehiculos(updated);
                          }}
                          placeholder="Color"
                          style={{ ...inputStyle, width: '80px', flexShrink: 0 }}
                        />
                      </div>
                    </div>
                  ))}
                  {estacionamientosDisponibles > 0 && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, padding: '4px 0' }}>
                      Estacionamientos disponibles en el condominio: {estacionamientosDisponibles}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Notification type selector */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px 16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold, textAlign: 'center', fontSize: theme.fonts.sizes.base }}>
                Tipo de notificación
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { id: 'notificar', label: 'Notificar' },
                  { id: 'notificar-y-anunciar', label: 'Notificar y anunciar por llamada' },
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

            {/* Verificación policial button */}
            <button
              onClick={handleVerificacion}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: theme.radius.full,
                background: '#374151',
                color: '#fff',
                fontWeight: theme.fonts.weights.semibold,
                fontSize: theme.fonts.sizes.base,
                border: 'none',
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              Verificación Policial
              <span style={{ fontSize: '20px' }}>🔢</span>
            </button>

            <Button variant="primary" fullWidth onClick={handleAceptar}>Aceptar</Button>
          </>
        )}

        <div style={{ height: '16px' }} />
      </div>

      {/* Modal suscripcion — Huesped Temporal sin suscripcion */}
      <Modal isOpen={showSuscripcionModal} onClose={() => setShowSuscripcionModal(false)} title="VeciYo Huesped Temporal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: '100%', height: '180px', borderRadius: theme.radius.xl, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
            ▶️
          </div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
            Los primeros 30 dias son gratuitos. Suscribete y disfruta de todos los beneficios!
          </p>
          <div style={{ background: '#E8F5E9', borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: '#2E7D32', lineHeight: 1.5, width: '100%', boxSizing: 'border-box' }}>
            La suscripción incluye 20 verificaciones policiales y judiciales mensuales.
          </div>
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
          <div style={{ background: '#E8F5E9', borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: '#2E7D32', lineHeight: 1.5 }}>
            La suscripción incluye 20 verificaciones policiales y judiciales mensuales.
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

      {/* Verificación policial — step 1 */}
      <Modal isOpen={showVerifModal && verifStep === 1} onClose={() => setShowVerifModal(false)} title="Verificación policial">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
            Escoge un pack de verificaciones y utilízalas cuando las necesites no caducan
          </p>
          {PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => setPackSeleccionado(pack)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderRadius: theme.radius.xl,
                border: `2px solid ${packSeleccionado?.id === pack.id ? theme.colors.primary : theme.colors.border}`,
                background: packSeleccionado?.id === pack.id ? theme.colors.primaryLight : theme.colors.bgMuted,
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
              }}
            >
              <span style={{ fontWeight: theme.fonts.weights.semibold }}>{pack.label}</span>
              <span style={{ fontWeight: theme.fonts.weights.bold }}>{pack.precio}</span>
            </button>
          ))}
          <Button variant="primary" fullWidth onClick={handleVerifNext}>Siguiente</Button>
        </div>
      </Modal>

      {/* Verificación policial — step 2 */}
      <Modal isOpen={showVerifModal && verifStep === 2} onClose={() => setShowVerifModal(false)} title="Verificación policial">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm }}>{packSeleccionado?.label} de antecedentes</p>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes['4xl'], fontWeight: theme.fonts.weights.bold }}>{packSeleccionado?.precio}</p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Seleccione el medio de pago:</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.colors.bgMuted, borderRadius: theme.radius.xl, padding: '14px 16px', border: `1.5px solid ${theme.colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#1A56DB', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '4px 6px', borderRadius: '4px' }}>VISA</div>
              <span style={{ fontWeight: theme.fonts.weights.medium, fontSize: theme.fonts.sizes.sm }}>5647XXXXXX4567</span>
            </div>
            <span style={{ fontWeight: theme.fonts.weights.bold }}>$15</span>
          </div>
          <Toggle value={aceptaTerminos} onChange={setAceptaTerminos} labelRight="Acepta términos y condiciones 🔗" />
          <Button variant="primary" fullWidth onClick={handleVerifNext} disabled={!aceptaTerminos}>Siguiente</Button>
        </div>
      </Modal>

      {/* Verificación policial — step 3: resultado con íconos locales */}
      <Modal isOpen={showVerifModal && verifStep === 3} onClose={() => setShowVerifModal(false)} title="Verificación Policial">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
          {verifResult === 'success' ? (
            <>
              <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
                La persona es apta<br/>para la visita. (sin antecedentes)
              </p>
              <div style={{ background: '#dcfce7', borderRadius: theme.radius.xl, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={visitavalida} alt="Visita válida" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
              </div>
            </>
          ) : (
            <>
              <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5 }}>
                La persona NO es apta para la visita<br/>(Con antecedentes) se notifico a las<br/>autoridades pertinentes
              </p>
              <div style={{ background: '#fee2e2', borderRadius: theme.radius.xl, padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={visitanovalida} alt="Visita no válida" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Insufficient verification balance modal */}
      <Modal isOpen={showSaldoModal} onClose={() => setShowSaldoModal(false)} title="Saldo insuficiente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>{'\u26A0\uFE0F'}</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
            No tienes suficientes verificaciones disponibles. Necesitas <strong>{saldoInfo.necesarias}</strong> y solo tienes <strong>{saldoInfo.disponibles}</strong>.
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0 }}>
            Compra verificaciones suplementarias para continuar.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" fullWidth onClick={() => setShowSaldoModal(false)}>Cancelar</Button>
            <Button variant="primary" fullWidth onClick={() => {
              setShowSaldoModal(false);
              navigate('/propietario/configuracion/huespedes-temporales');
            }}>Comprar verificaciones</Button>
          </div>
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

      {/* Compra de verificaciones modal — solo propietario/anfitrión */}
      <Modal isOpen={showCompraVerificaciones && compraStep === 1} onClose={() => setShowCompraVerificaciones(false)} title="Comprar verificaciones">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
            Las verificaciones suplementarias tienen 90 días de validez desde la compra.
          </p>
          {PACKS.map(pack => (
            <button
              key={pack.id}
              onClick={() => setPackCompra(pack)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px', borderRadius: theme.radius.xl,
                border: `2px solid ${packCompra?.id === pack.id ? theme.colors.primary : theme.colors.border}`,
                background: packCompra?.id === pack.id ? theme.colors.primaryLight : theme.colors.bgMuted,
                cursor: 'pointer', fontFamily: theme.fonts.family,
              }}
            >
              <span style={{ fontWeight: theme.fonts.weights.semibold }}>{pack.label}</span>
              <span style={{ fontWeight: theme.fonts.weights.bold }}>{pack.precio}</span>
            </button>
          ))}
          <Button variant="primary" fullWidth onClick={() => { if (!packCompra) return; setCompraStep(2); }}>
            Siguiente
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showCompraVerificaciones && compraStep === 2} onClose={() => setShowCompraVerificaciones(false)} title="Confirmar compra">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base }}>{packCompra?.label}</p>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes['4xl'], fontWeight: theme.fonts.weights.bold }}>{packCompra?.precio}</p>
          <Button variant="primary" fullWidth onClick={() => {
            if (ubicacionActiva) {
              const cantidad = packCompra?.id === 1 ? 10 : packCompra?.id === 2 ? 15 : 20;
              const configActual = configHuespedesTemporales[ubicacionActiva.id];
              actualizarConfigHuespedTemporal(ubicacionActiva.id, {
                verificaciones: {
                  ...(configActual?.verificaciones || { suscritasUsadas: 0, suplementarias: 0 }),
                  suplementarias: (configActual?.verificaciones?.suplementarias || 0) + cantidad,
                }
              });
              addToast(`${cantidad} verificaciones suplementarias agregadas`, 'success');
            }
            setShowCompraVerificaciones(false);
            setCompraStep(1);
            setPackCompra(null);
          }}>
            Confirmar pago
          </Button>
        </div>
      </Modal>

      {/* Warning modal for registration */}
      <Modal isOpen={showWarningRegistro} onClose={() => setShowWarningRegistro(false)} title="Aviso importante">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>{'\u26A0\uFE0F'}</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
            Recuerda pedirle el documento al invitado. Si el invitado es menor de edad, debe ingresar con su padre/madre/tutor legal con la documentación respectiva. El edificio está comprometido con la prevención del abuso sexual de menores y la trata de personas.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" fullWidth onClick={() => setShowWarningRegistro(false)}>Cancelar</Button>
            <Button variant="primary" fullWidth onClick={() => {
              aceptaAdvertenciaRef.current = true;
              setShowWarningRegistro(false);
              handleAceptar();
            }}>Aceptar y continuar</Button>
          </div>
        </div>
      </Modal>

      {/* Warning modal for minor */}
      <Modal isOpen={showWarningMinor !== null} onClose={() => setShowWarningMinor(null)} title="Menor de edad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>{'\u26A0\uFE0F'}</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: 1.5, margin: 0 }}>
            Recuerda pedirle el documento al invitado. Si el invitado es menor de edad, debe ingresar con su padre/madre/tutor legal con la documentación respectiva. El edificio está comprometido con la prevención del abuso sexual de menores y la trata de personas.
          </p>
          <Button variant="primary" fullWidth onClick={() => setShowWarningMinor(null)}>Entendido</Button>
        </div>
      </Modal>

      </>)}
    </AppShell>
  );
}
