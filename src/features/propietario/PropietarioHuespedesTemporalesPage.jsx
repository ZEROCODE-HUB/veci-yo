import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';

export default function PropietarioHuespedesTemporalesPage() {
  const navigate = useNavigate();
  const {
    ubicacionActiva, suscripcionActiva, suscripciones, activarSuscripcion,
    configHuespedesTemporales, actualizarConfigHuespedTemporal, addToast,
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
  const [estacionamientos, setEstacionamientos] = useState(config?.estacionamientos ?? 0);
  const [integraciones, setIntegraciones] = useState(config?.integraciones ?? { airbnb: false, booking: false, lodgify: false });
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [nuevoMaximoSolicitado, setNuevoMaximoSolicitado] = useState(0);

  const capacidadMaximaAdmin = config?.capacidadMaximaAdmin ?? 6;

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
      estacionamientos,
      integraciones,
    });
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
    addToast('Solicitud enviada al Administrador para aprobación');
  };

  const toggleIntegracion = (key) => {
    setIntegraciones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <AppShell>
      <PageHeader title="Conf. Huéspedes Temporales" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Subscription status */}
        {!tieneSuscripcion && (
          <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '20px', boxShadow: theme.shadows.card, textAlign: 'center' }}>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, marginBottom: '12px' }}>
              Esta propiedad no tiene una suscripción activa para Huéspedes Temporales.
            </p>
            <Button variant="primary" fullWidth onClick={() => {
              if (ubicacionId) {
                activarSuscripcion(ubicacionId);
              }
            }}>
              Suscribirse
            </Button>
          </div>
        )}

        {tieneSuscripcion && (
          <>
            {/* 6.1 Stay & Capacity */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '20px', boxShadow: theme.shadows.card }}>
              <h3 style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '16px' }}>
                Parámetros de estancia y aforo
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Mínimo de días</div>
                    <input
                      type="number"
                      min="1"
                      value={minDias}
                      onChange={e => setMinDias(parseInt(e.target.value) || 1)}
                      style={{
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
                      }}
                    />
                  </div>
                  <div style={{ flex: '1 1 120px', minWidth: '100px' }}>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>
                      Capacidad máxima
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginLeft: '4px' }}>(límite admin: {capacidadMaximaAdmin})</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      max={capacidadMaximaAdmin}
                      value={maxHuespedes}
                      onChange={e => handleMaxHuespedesChange(e.target.value)}
                      style={{
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
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6.2 Coexistence rules */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '20px', boxShadow: theme.shadows.card }}>
              <h3 style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '16px' }}>
                Reglas de convivencia y preferencias
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Política de mascotas</span>
                  <div style={{ width: '140px' }}>
                    <SelectField
                      value={politicaMascotas}
                      options={['permitidas', 'no-permitidas']}
                      onChange={setPoliticaMascotas}
                      placeholder="Seleccione"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Apta para niños</span>
                  <Toggle value={aptoNinos} onChange={setAptoNinos} />
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, marginBottom: '6px' }}>Descripción del alojamiento</div>
                  <textarea
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="N° habitaciones, camas, info de aforo..."
                    rows={3}
                    style={{
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
                      resize: 'vertical',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 100px' }}>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Habitaciones</div>
                    <input
                      type="number"
                      min="1"
                      value={numHabitaciones}
                      onChange={e => setNumHabitaciones(parseInt(e.target.value) || 1)}
                      style={{
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
                      }}
                    />
                  </div>
                  <div style={{ flex: '1 1 100px' }}>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Camas</div>
                    <input
                      type="number"
                      min="1"
                      value={numCamas}
                      onChange={e => setNumCamas(parseInt(e.target.value) || 1)}
                      style={{
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
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 6.3 Parking */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '20px', boxShadow: theme.shadows.card }}>
              <h3 style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '16px' }}>
                Configuración de estacionamientos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="number"
                    min="0"
                    value={estacionamientos}
                    onChange={e => setEstacionamientos(parseInt(e.target.value) || 0)}
                    style={{
                      width: '80px',
                      background: theme.colors.bgMuted,
                      borderRadius: theme.radius.lg,
                      border: `1px solid ${theme.colors.border}`,
                      outline: 'none',
                      fontSize: theme.fonts.sizes.base,
                      fontFamily: theme.fonts.family,
                      color: theme.colors.text,
                      padding: '10px 14px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                    Estacionamientos disponibles para visitantes
                  </span>
                </div>
                <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, lineHeight: 1.5 }}>
                  Cuando se intente registrar una visita y no existan estacionamientos disponibles, se mostrará automáticamente una alerta indicando que no existe disponibilidad de parqueaderos para visitantes.
                </div>
              </div>
            </div>

            {/* 6.4 Integrations */}
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '20px', boxShadow: theme.shadows.card }}>
              <h3 style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '16px' }}>
                Integraciones
              </h3>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '12px', textAlign: 'center' }}>
                Prepara tu propiedad para futuras integraciones con plataformas de reservas.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { key: 'airbnb', label: 'Airbnb', icon: '🏠' },
                  { key: 'booking', label: 'Booking.com', icon: '📘' },
                  { key: 'lodgify', label: 'Lodgify', icon: '🔗' },
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
                Las integraciones técnicas estarán disponibles próximamente. Esta configuración prepara la interfaz para cuando el servicio esté habilitado.
              </div>
            </div>

            {/* Save button */}
            <Button variant="primary" fullWidth onClick={handleGuardar}>
              Guardar configuración
            </Button>
          </>
        )}

        <div style={{ height: '24px' }} />
      </div>

      {/* Warning modal for exceeding admin capacity */}
      <Modal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title="Límite de aforo excedido">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px' }}>⚠️</div>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
            La capacidad configurada ({nuevoMaximoSolicitado} huéspedes) supera el límite de aforo establecido por el Administrador ({capacidadMaximaAdmin} huéspedes).
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0 }}>
            Se notificará al Administrador para que apruebe o rechace la modificación.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Button variant="secondary" fullWidth onClick={() => setShowWarningModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" fullWidth onClick={handleSolicitarAprobacion}>
              Solicitar aprobación
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
