import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import InfoButton from '../../components/ui/InfoButton';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';

const sectionCard = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  padding: '20px',
  boxShadow: theme.shadows.card,
};

const sectionTitle = {
  textAlign: 'center',
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  marginBottom: '16px',
};

const inputStyle = {
  width: '100%',
  background: theme.colors.bgMuted,
  borderRadius: theme.radius.lg,
  border: `1px solid ${theme.colors.border}`,
  outline: 'none',
  fontSize: theme.fonts.sizes.base,
  fontFamily: theme.fonts.family,
  color: theme.colors.text,
  padding: '10px 14px',
  boxSizing: 'border-box',
};

export default function PropietarioHuespedesTemporalesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    ubicacionActiva, suscripcionActiva, suscripciones, activarSuscripcion,
    configHuespedesTemporales, actualizarConfigHuespedTemporal, addToast,
    unidades, tipologias, usuario,
  } = useApp();

  const ubicacionId = ubicacionActiva?.id;
  const config = ubicacionId ? configHuespedesTemporales[ubicacionId] : null;
  const tieneSuscripcion = ubicacionId ? suscripciones[ubicacionId]?.activa : false;

  const [minDias, setMinDias] = useState(config?.minDias ?? 2);
  const [maxHuespedes, setMaxHuespedes] = useState(config?.maxHuespedes ?? 2);
  const [politicaMascotas, setPoliticaMascotas] = useState(config?.politicaMascotas ?? 'no-permitidas');
  const [aptoNinos, setAptoNinos] = useState(config?.aptoNinos ?? false);
  const [descripcion, setDescripcion] = useState(config?.descripcion ?? '');
  const [numHabitaciones, setNumHabitaciones] = useState(config?.numHabitaciones ?? 1);
  const [estacionamientosProp, setEstacionamientosProp] = useState(config?.estacionamientos ?? 0);
  const [plataformas, setPlataformas] = useState(config?.plataformas ?? { airbnb: false, booking: false, otras: '' });
  const [pms, setPms] = useState(config?.pms ?? { activo: false, cual: '' });
  const [permiteVisitasHuespedes, setPermiteVisitasHuespedes] = useState(config?.permiteVisitasHuespedes ?? 'permitir-todos');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [nuevoMaximoSolicitado, setNuevoMaximoSolicitado] = useState(0);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
  const [paymentLoading, setPaymentLoading] = useState(false);

  const unidadActual = unidades.find(u =>
    u.propietarioEmail === usuario?.correo ||
    (ubicacionActiva?.alias && u.codigo === ubicacionActiva.alias)
  );
  const tipologiaUnidad = unidadActual ? tipologias.find(t => t.id === unidadActual.tipologiaId) : null;
  const capacidadMaximaAdmin = tipologiaUnidad?.capacidadMaxima ?? config?.capacidadMaximaAdmin ?? 6;
  const minDiasAdmin = config?.minDiasAdmin ?? 1;

  const [legal, setLegal] = useState(config?.legal ?? { rnt: '' });

  const handleGuardar = () => {
    if (!ubicacionId) return;
    actualizarConfigHuespedTemporal(ubicacionId, {
      minDias,
      maxHuespedes,
      politicaMascotas,
      aptoNinos,
      descripcion,
      numHabitaciones,
      estacionamientos: estacionamientosProp,
      plataformas,
      pms,
      legal,
      permiteVisitasHuespedes,
    });
    addToast('Configuración guardada exitosamente', 'success');
    const from = location.state?.from;
    if (from) {
      navigate(from, { replace: true });
    } else {
      navigate('/propietario/configuracion', { replace: true });
    }
  };

  const handleMaxHuespedesChange = (val) => {
    const num = parseInt(val) || 0;
    if (num > capacidadMaximaAdmin) {
      setNuevoMaximoSolicitado(num);
      setShowWarningModal(true);
      return;
    }
    setMaxHuespedes(num);
  };

  const handleMinDiasChange = (val) => {
    const num = parseInt(val) || 1;
    if (num < minDiasAdmin) {
      setMinDias(minDiasAdmin);
      return;
    }
    setMinDias(num);
  };

  const handleSolicitarAprobacion = () => {
    setShowWarningModal(false);
  };

  const togglePlataforma = (key) => {
    setPlataformas(prev => ({ ...prev, [key]: !prev[key] }));
  };


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
      if (ubicacionId) activarSuscripcion(ubicacionId);
      setPaymentLoading(false);
      setShowPayment(false);
      setPaymentForm({ cardNumber: '', cardName: '', cardExpiry: '', cardCvv: '' });
    }, 1500);
  };

  return (
    <AppShell>
      <PageHeader title="Conf. Huespedes Temporales" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!tieneSuscripcion && (
          <div style={{ ...sectionCard, textAlign: 'center' }}>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, marginBottom: '12px' }}>
              Esta propiedad no tiene una suscripcion activa para Huespedes Temporales.
            </p>
            <Button variant="primary" fullWidth onClick={() => setShowPayment(true)}>
              Suscribirse
            </Button>
          </div>
        )}

        {tieneSuscripcion && (
          <>
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Parametros de estancia y aforo</h3>
              <div style={{
                background: '#FEF9C3', borderRadius: theme.radius.lg, padding: '12px 14px',
                marginBottom: '14px', fontSize: theme.fonts.sizes.xs, color: '#854D0E',
                lineHeight: 1.5, display: 'flex', gap: '8px', alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{'\u26A0\uFE0F'}</span>
                <span>El Administrador ha configurado un mínimo de <strong>{minDiasAdmin} noche{minDiasAdmin !== 1 ? 's' : ''}</strong> y una capacidad máxima de <strong>{capacidadMaximaAdmin} huéspedes</strong> para este condominio. Puedes establecer valores más restrictivos, pero no menos.</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <InputField label="Mínimo de días" type="number" min={String(minDiasAdmin)} value={String(minDias)} onChange={v => handleMinDiasChange(v)} />
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>
                      Capacidad máxima
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginLeft: '4px' }}>(límite: {capacidadMaximaAdmin} - {tipologiaUnidad?.nombre || 'Estándar'})</span>
                    </div>
                    <input type="number" min="1" max={capacidadMaximaAdmin} value={maxHuespedes} onChange={e => handleMaxHuespedesChange(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Reglas de convivencia y preferencias</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, flex: '1 1 auto' }}>Politica de mascotas</span>
                  <div style={{ width: '140px', flexShrink: 0 }}>
                    <SelectField value={politicaMascotas} options={['permitidas', 'no-permitidas']} onChange={setPoliticaMascotas} placeholder="Seleccione" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Apta para ninos</span>
                  <Toggle value={aptoNinos} onChange={setAptoNinos} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>Descripción del alojamiento</span>
                  <InfoButton
                    titulo="Descripción del alojamiento"
                    descripcion="Usa la misma descripción que ya tienes en tus publicaciones de otras plataformas (Airbnb, Booking, etc.). No se importa automáticamente, debes copiarla manualmente."
                    variant="info"
                    size={16}
                  />
                </div>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="N habitaciones, camas, info de aforo..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                <InputField label="Habitaciones" type="number" min="1" value={String(numHabitaciones)} onChange={v => setNumHabitaciones(parseInt(v) || 1)} />
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Configuracion de estacionamientos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ width: '100px', flexShrink: 0 }}>
                    <InputField label="Cantidad" type="number" min="0" value={String(estacionamientosProp)} onChange={v => setEstacionamientosProp(parseInt(v) || 0)} />
                  </div>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, flex: 1 }}>Estacionamientos disponibles para visitantes</span>
                </div>
                <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, lineHeight: 1.5 }}>
                  Cuando se intente registrar una visita y no existan estacionamientos disponibles, se mostrara automaticamente una alerta.
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Plataformas en las que está publicado tu alojamiento</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'airbnb', label: 'Airbnb', icon: '\uD83C\uDFE0', integrable: true },
                  { key: 'booking', label: 'Booking', icon: '\uD83D\uDCD8', integrable: false },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.colors.borderLight}`, flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {plataformas[item.key] && item.integrable && (
                        <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.success, display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Integrar
                        </span>
                      )}
                      <Toggle value={plataformas[item.key]} onChange={() => togglePlataforma(item.key)} />
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.colors.borderLight}`, flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Otras</span>
                  {plataformas.otras ? (
                    <input
                      type="text"
                      value={plataformas.otras}
                      onChange={e => setPlataformas(prev => ({ ...prev, otras: e.target.value }))}
                      placeholder="Nombre de la plataforma"
                      style={{ ...inputStyle, width: '160px', fontSize: theme.fonts.sizes.xs }}
                    />
                  ) : (
                    <button
                      onClick={() => setPlataformas(prev => ({ ...prev, otras: ' ' }))}
                      style={{ background: 'none', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.full, padding: '4px 12px', fontSize: theme.fonts.sizes.xs, cursor: 'pointer', fontFamily: theme.fonts.family, color: theme.colors.textSecondary }}
                    >
                      + Agregar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>¿Quieres integrar tu alojamiento con un PMS (Property Management System)?</span>
                <InfoButton
                  titulo="Integración con PMS"
                  descripcion="Para completar la integración con un Property Management System (PMS), se requieren las credenciales o claves de acceso al sistema. Estas credenciales las proporciona tu proveedor de PMS."
                  variant="info"
                  size={16}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: pms.activo ? '12px' : 0 }}>
                <button
                  onClick={() => setPms({ activo: true, cual: pms.cual })}
                  style={{
                    padding: '8px 24px', borderRadius: theme.radius.full,
                    background: pms.activo ? theme.colors.primary : theme.colors.bgMuted,
                    border: `1.5px solid ${pms.activo ? theme.colors.primary : theme.colors.border}`,
                    color: pms.activo ? '#fff' : theme.colors.text,
                    cursor: 'pointer', fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold,
                  }}
                >Sí</button>
                <button
                  onClick={() => setPms({ activo: false, cual: '' })}
                  style={{
                    padding: '8px 24px', borderRadius: theme.radius.full,
                    background: !pms.activo ? theme.colors.primary : theme.colors.bgMuted,
                    border: `1.5px solid ${!pms.activo ? theme.colors.primary : theme.colors.border}`,
                    color: !pms.activo ? '#fff' : theme.colors.text,
                    cursor: 'pointer', fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold,
                  }}
                >No</button>
              </div>
              {pms.activo && (
                <input
                  type="text"
                  value={pms.cual}
                  onChange={e => setPms(prev => ({ ...prev, cual: e.target.value }))}
                  placeholder="Indica cuál PMS usas (ej: Mews, Cloudbeds, etc.)"
                  style={{ ...inputStyle, marginTop: '8px' }}
                />
              )}
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Visitas de huéspedes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: '4px' }}>
                  ¿Permites que tus huéspedes temporales registren visitas?
                </div>
                {[
                  { value: 'permitir-todos', label: 'Permitir automáticamente a todos' },
                  { value: 'prohibir-todos', label: 'Prohibir automáticamente a todos' },
                  { value: 'aprobar-por-huesped', label: 'Aprobar huésped por huésped' },
                ].map(op => (
                  <button
                    key={op.value}
                    onClick={() => setPermiteVisitasHuespedes(op.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px', borderRadius: theme.radius.lg,
                      border: `1.5px solid ${permiteVisitasHuespedes === op.value ? theme.colors.primary : theme.colors.border}`,
                      background: permiteVisitasHuespedes === op.value ? theme.colors.primaryLight : theme.colors.bgMuted,
                      cursor: 'pointer', fontFamily: theme.fonts.family,
                      textAlign: 'left', width: '100%',
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: `2px solid ${permiteVisitasHuespedes === op.value ? theme.colors.primary : theme.colors.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {permiteVisitasHuespedes === op.value && (
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: theme.colors.primary }} />
                      )}
                    </div>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{op.label}</span>
                  </button>
                ))}
                <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, lineHeight: 1.5 }}>
                  Esta configuración aplica a todos los huéspedes temporales de esta propiedad. Los huéspedes no podrán modificar esta configuración.
                </div>
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Cumplimiento legal</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>RNT (Registro Nacional de Turismo)</span>
                    <InfoButton
                      titulo="TRA y SIRE"
                      descripcion="El RNT es el número que identifica tu alojamiento ante las autoridades de turismo."
                      bullets={[
                        'TRA (Tributación de Alquileres): Reporte tributario para alquileres de corta estancia.',
                        'SIRE (Sistema de Registro de Inmuebles): Registro de inmuebles para alquiler temporal.',
                        'Ambos requieren tener el RNT completo.',
                        'Son opcionales y se deciden huésped por huésped, no automáticos.',
                        'Cargar el RNT aquí no implica que el reporte se haga automáticamente.',
                      ]}
                      variant="info"
                      size={16}
                    />
                  </div>
                  <input type="text" value={legal.rnt} onChange={e => setLegal(p => ({ ...p, rnt: e.target.value }))} placeholder="Ej: RNT-12345" style={inputStyle} />
                </div>
              </div>
            </div>

            <Button variant="primary" fullWidth onClick={handleGuardar}>
              Guardar configuracion
            </Button>
          </>
        )}

        <div style={{ height: '24px' }} />
      </div>

      <Modal isOpen={showPayment} onClose={() => { if (!paymentLoading) setShowPayment(false); }} title="Suscripcion a Huespedes Temporales">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
          <div style={{ textAlign: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
            <div style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>$15.00</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>por mes</div>
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

      <Modal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title="Limite de aforo excedido">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>{'\u26a0\uFE0F'}</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
            La capacidad configurada ({nuevoMaximoSolicitado} huespedes) supera el limite de aforo establecido por el Administrador ({capacidadMaximaAdmin} huespedes).
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0 }}>
            Se notificara al Administrador para que apruebe o rechace la modificacion.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" fullWidth onClick={() => setShowWarningModal(false)}>Cancelar</Button>
            <Button variant="primary" fullWidth onClick={handleSolicitarAprobacion}>Solicitar aprobacion</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}