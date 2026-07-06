import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
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
  const [numCamas, setNumCamas] = useState(config?.numCamas ?? 1);
  const [estacionamientosProp, setEstacionamientosProp] = useState(config?.estacionamientos ?? 0);
  const [integraciones, setIntegraciones] = useState(config?.integraciones ?? { airbnb: false, booking: false, lodgify: false });
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

  const [legal, setLegal] = useState(config?.legal ?? { rnt: '', tra: false, sire: false });
  const [staff, setStaff] = useState(config?.staff ?? []);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ nombre: '', rol: 'coanfitrion', telefono: '' });

  const handleGuardar = () => {
    if (!ubicacionId) return;
    actualizarConfigHuespedTemporal(ubicacionId, {
      minDias,
      maxHuespedes,
      politicaMascotas,
      aptoNinos,
      descripcion,
      numHabitaciones,
      numCamas,
      estacionamientos: estacionamientosProp,
      integraciones,
      legal,
      staff,
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

  const handleSolicitarAprobacion = () => {
    setShowWarningModal(false);
  };

  const toggleIntegracion = (key) => {
    setIntegraciones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const agregarStaff = () => {
    if (!staffForm.nombre) return;
    setStaff(prev => [...prev, { ...staffForm, id: Date.now() }]);
    setStaffForm({ nombre: '', rol: 'coanfitrion', telefono: '' });
    setShowStaffForm(false);
  };

  const eliminarStaff = (id) => {
    setStaff(prev => prev.filter(s => s.id !== id));
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  <InputField label="Minimo de dias" type="number" min="1" value={String(minDias)} onChange={v => setMinDias(parseInt(v) || 1)} />
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>
                      Capacidad maxima
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginLeft: '4px' }}>(limite: {capacidadMaximaAdmin} - {tipologiaUnidad?.nombre || 'Estandar'})</span>
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
                <InputField label="Descripcion del alojamiento" value={descripcion} onChange={setDescripcion} placeholder="N habitaciones, camas, info de aforo..." multiline rows={3} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px' }}>
                  <InputField label="Habitaciones" type="number" min="1" value={String(numHabitaciones)} onChange={v => setNumHabitaciones(parseInt(v) || 1)} />
                  <InputField label="Camas" type="number" min="1" value={String(numCamas)} onChange={v => setNumCamas(parseInt(v) || 1)} />
                </div>
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
              <h3 style={sectionTitle}>Integraciones</h3>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '12px', textAlign: 'center' }}>
                Prepara tu propiedad para futuras integraciones con plataformas de reservas.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'airbnb', label: 'Airbnb', icon: '\uD83C\uDFE0' },
                  { key: 'booking', label: 'Booking.com', icon: '\uD83D\uDCD8' },
                  { key: 'lodgify', label: 'Lodgify', icon: '\uD83D\uDD17' },
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{item.label}</span>
                    </div>
                    <Toggle value={integraciones[item.key]} onChange={() => toggleIntegracion(item.key)} />
                  </div>
                ))}
              </div>
              <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', marginTop: '12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5 }}>
                Las integraciones tecnicas estaran disponibles proximamente.
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Cumplimiento legal</h3>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '12px', textAlign: 'center' }}>
                Registra la informacion regulatoria correspondiente a tu pais. RNT y TRA son obligatorios para operar.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '12px', border: `1px solid ${theme.colors.secondary}20` }}>
                  <InputField label="RNT (Registro Nacional de Turismo)" value={legal.rnt} onChange={v => setLegal(p => ({ ...p, rnt: v }))} placeholder="Ej: RNT-12345" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg }}>
                  <div>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>Integracion con TRA</span>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px' }}>Tributacion de Alquileres</div>
                  </div>
                  <Toggle value={legal.tra} onChange={() => setLegal(p => ({ ...p, tra: !p.tra }))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg }}>
                  <div>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>Integracion con SIRE</span>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px' }}>Sistema de Registro de Inmuebles</div>
                  </div>
                  <Toggle value={legal.sire} onChange={() => setLegal(p => ({ ...p, sire: !p.sire }))} />
                </div>
              </div>
              <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', marginTop: '12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5 }}>
                RNT obligatorio. TRA y SIRE son integraciones opcionales que estaran disponibles proximamente.
              </div>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Gestion de personal</h3>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '12px', textAlign: 'center' }}>
                Registra coanfitriones, personal de limpieza y contactos de emergencia.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {staff.map(persona => (
                  <div key={persona.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: `1px solid ${theme.colors.borderLight}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text }}>
                        {persona.nombre}
                      </div>
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                        {persona.rol === 'coanfitrion' ? 'Coanfitrion' : persona.rol === 'limpieza' ? 'Personal de limpieza' : 'Contacto de emergencia'}
                        {persona.telefono ? `  -  ${persona.telefono}` : ''}
                      </div>
                    </div>
                    <button onClick={() => eliminarStaff(persona.id)} style={{ color: theme.colors.danger, fontSize: theme.fonts.sizes.sm, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, marginLeft: '12px' }}>
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="secondary" fullWidth onClick={() => setShowStaffForm(true)} style={{ marginTop: '12px' }}>
                + Agregar personal
              </Button>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Validacion documental</h3>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '12px', textAlign: 'center' }}>
                Revisa los documentos registrados por los huespedes y resultados de verificaciones.
              </p>
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Documentos pendientes</span>
                  <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.warning }}>2 pendientes</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Verificaciones exitosas</span>
                  <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.success }}>5 verificadas</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Huespedes rechazados</span>
                  <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.danger }}>1 rechazado</span>
                </div>
              </div>
              <Button variant="secondary" fullWidth onClick={undefined} style={{ marginTop: '12px' }}>
                Revisar documentos
              </Button>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Excepciones manuales</h3>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '8px', textAlign: 'center' }}>
                Cuando un huesped no pueda completar el proceso de validacion estandar, puedes crear una excepcion manual.
              </p>
              <div style={{ background: theme.colors.dangerLight, borderRadius: theme.radius.lg, padding: '12px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.text, lineHeight: 1.5, marginBottom: '12px' }}>
                Al marcar una excepcion manual, la responsabilidad legal es asumida por el propietario. La excepcion solo afecta a ese huesped especifico.
              </div>
              <Button variant="secondary" fullWidth onClick={undefined}>
                Gestionar excepciones
              </Button>
            </div>

            <div style={sectionCard}>
              <h3 style={sectionTitle}>Delegacion de funciones</h3>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '8px', textAlign: 'center' }}>
                Delega funciones operativas a otros roles (Inquilino Lider, Administrador de Propiedad).
              </p>
              <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Inquilino Lider</span>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>Gestion operativa diaria</div>
                  </div>
                  <Toggle value={false} onChange={undefined} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Administrador de Propiedad</span>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>Gestion completa</div>
                  </div>
                  <Toggle value={false} onChange={undefined} />
                </div>
              </div>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, marginTop: '10px', textAlign: 'center' }}>
                Las configuraciones criticas (documentos regulatorios, integraciones legales) no pueden delegarse.
              </p>
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

      <Modal isOpen={!!showStaffForm} onClose={() => setShowStaffForm(false)} title="Agregar personal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre" value={staffForm.nombre} onChange={v => setStaffForm(p => ({ ...p, nombre: v }))} placeholder="Nombre completo" />
          <div>
            <span style={{ display: 'block', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>Rol</span>
            <SelectField value={staffForm.rol} options={['coanfitrion', 'limpieza', 'emergencia']} onChange={v => setStaffForm(p => ({ ...p, rol: v }))} placeholder="Seleccionar rol" />
          </div>
          <InputField label="Telefono (opcional)" value={staffForm.telefono} onChange={v => setStaffForm(p => ({ ...p, telefono: v }))} placeholder="+593 999999999" />
          <Button variant="primary" fullWidth onClick={agregarStaff}>Agregar</Button>
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