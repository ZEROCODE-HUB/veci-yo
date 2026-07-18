import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import DotsMenuButton from '../administrador/components/DotsMenuButton';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import iconAdjuntarDocumento from '../../assets/icons/shared/adjuntar-documento.png';
import iconAdjuntarImagen from '../../assets/icons/shared/adjuntar-imagen.png';

const ROL_COLORES = {
  'Residente Lider': { bg: '#FEF9C3', color: '#854D0E' },
  'Residente': { bg: '#E0F2FE', color: '#0369A1' },
  'Familiar': { bg: '#F0FDF4', color: '#166534' },
};

const CATEGORIAS = ['Mantenimiento', 'Seguridad', 'Administración', 'Comunidad', 'Servicios'];
const DESTINATARIOS = ['Todos los residentes', 'Residentes activos', 'Administración', 'Propietarios'];

function IconoDocumento() {
  return <img src={iconAdjuntarDocumento} alt="Adjuntar Documento" style={{ width: '60px', height: '60px', borderRadius: theme.radius.lg, objectFit: 'cover', cursor: 'pointer' }} />;
}

function IconoImagen() {
  return <img src={iconAdjuntarImagen} alt="Adjuntar Imagen" style={{ width: '60px', height: '60px', borderRadius: theme.radius.lg, objectFit: 'cover', cursor: 'pointer' }} />;
}

export default function PropietarioConfiguracionPage({ basePath = '/propietario/configuracion' } = {}) {
  const navigate = useNavigate();
  const { residentesPropietario, eliminarResidente, agregarResidente, addToast, rolActivo, unidades, propietariosInvited, aceptarInvitacion, agregarUbicacion, usuario, tipologias, actualizarConfigHuespedTemporal, marcarUnidadConfigurada, configHuespedesTemporales } = useApp();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuResidente, setMenuResidente] = useState(null);
  const [deleteResidente, setDeleteResidente] = useState(null);

  const [showPropertyWizard, setShowPropertyWizard] = useState(false);
  const [configStep, setConfigStep] = useState(0);
  const [acceptedUbicacionId, setAcceptedUbicacionId] = useState(null);
  const [completedConfigSteps, setCompletedConfigSteps] = useState({});
  const config = acceptedUbicacionId ? configHuespedesTemporales[acceptedUbicacionId] : null;

  const [minDias, setMinDias] = useState(config?.minDias ?? 2);
  const [maxHuespedes, setMaxHuespedes] = useState(config?.maxHuespedes ?? 2);
  const [politicaMascotas, setPoliticaMascotas] = useState(config?.politicaMascotas ?? 'no-permitidas');
  const [aptoNinos, setAptoNinos] = useState(config?.aptoNinos ?? false);
  const [descripcion, setDescripcion] = useState(config?.descripcion ?? '');
  const [numHabitaciones, setNumHabitaciones] = useState(config?.numHabitaciones ?? 1);
  const [numCamas, setNumCamas] = useState(config?.numCamas ?? 1);
  const [estacionamientosProp, setEstacionamientosProp] = useState(config?.estacionamientos ?? 0);
  const [integraciones, setIntegraciones] = useState(config?.integraciones ?? { airbnb: false, booking: false, lodgify: false });
  const [staff, setStaff] = useState(config?.staff ?? []);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ nombre: '', rol: 'coanfitrion', telefono: '' });

  const handleGuardarWizard = () => {
    if (!acceptedUbicacionId) return;
    actualizarConfigHuespedTemporal(acceptedUbicacionId, {
      minDias, maxHuespedes, politicaMascotas, aptoNinos, descripcion,
      numHabitaciones, estacionamientos: estacionamientosProp,
      staff,
    });
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

  const wizardConfigSteps = [
    { key: 'parametros', label: 'Parametros de estancia' },
    { key: 'reglas', label: 'Reglas y preferencias' },
    { key: 'estacionamientos', label: 'Estacionamientos' },
    { key: 'integraciones', label: 'Integraciones' },
    { key: 'legal', label: 'Cumplimiento legal' },
    { key: 'staff', label: 'Personal' },
  ];

  const handleFinalizarWizard = () => {
    handleGuardarWizard();
    const unidad = unidades.find(u => u.propietarioEmail === usuario?.correo && u.estado === 'config-pendiente');
    if (unidad) marcarUnidadConfigurada(unidad.id);
    setShowPropertyWizard(false);
    setConfigStep(0);
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

  const [showFamiliar, setShowFamiliar] = useState(false);
  const [familiar, setFamiliar] = useState({ nombre: '', correo: '', identificacion: '', mayor18: false, telefono: '' });
  const setFamiliarField = (key) => (v) => setFamiliar(p => ({ ...p, [key]: v }));

  const [showVotacion, setShowVotacion] = useState(false);
  const [votacion, setVotacion] = useState({ titulo: '', descripcion: '', categoria: '', destinatario: '', urlVideo: '', esVotacion: false, umbral: '', tiempoMaximo: '' });
  const setVotacionField = (key) => (v) => setVotacion(p => ({ ...p, [key]: v }));

  const handleEliminar = () => {
    eliminarResidente(deleteResidente.id);
    setDeleteResidente(null);
  };

  const handleAgregarFamiliar = () => {
    if (!familiar.nombre.trim()) return;
    agregarResidente({
      nombre: familiar.nombre,
      rol: 'Familiar',
      ci: familiar.identificacion,
      correo: familiar.correo,
      telefono: familiar.telefono,
      fecha: new Date().toLocaleDateString('es-AR'),
    });
    setShowFamiliar(false);
    setFamiliar({ nombre: '', correo: '', identificacion: '', mayor18: false, telefono: '' });
  };

  const handlePublicar = () => {
    setShowVotacion(false);
    setVotacion({ titulo: '', descripcion: '', categoria: '', destinatario: '', urlVideo: '', esVotacion: false, umbral: '', tiempoMaximo: '' });
  };

  return (
    <AppShell>
      <PageHeader
        title="Configuración"
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => navigate(`${basePath}/historial-contrato`)}
              style={{ width: '36px', height: '36px', borderRadius: theme.radius.md, background: theme.colors.primary, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </button>
            <button
              onClick={() => navigate(`${basePath}/crear-rol`)}
              style={{ width: '36px', height: '36px', borderRadius: theme.radius.md, background: theme.colors.primary, color: theme.colors.text, fontSize: '22px', fontWeight: 'bold', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fonts.family }}
            >
              +
            </button>
          </div>
        }
      />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <p style={{ flex: 1, fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
            Empresa o persona que te ayuda con la gestión de tu propiedad, ej: realizando pagos. Podrá administrar tu propiedad en esta aplicación con tus mismas funcionalidades.
          </p>
          <span style={{ fontSize: '22px', flexShrink: 0, cursor: 'pointer' }}>▶️</span>
        </div>

        {propietariosInvited
          .filter(inv => inv.email === usuario?.correo && inv.estado === 'pendiente')
          .map(invitacion => {
            const unidad = unidades.find(u => u.id === invitacion.unidadId);
            const tipologia = unidad ? tipologias.find(t => t.id === unidad.tipologiaId) : null;
            if (!unidad) return null;
            return (
              <div key={invitacion.id} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card, border: `2px solid ${theme.colors.primary}` }}>
                <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.semibold, marginBottom: '8px' }}>
                  Tienes una propiedad asignada: {unidad.codigo} {tipologia ? `(${tipologia.nombre})` : ''}
                </p>
                <Button variant="primary" fullWidth onClick={() => {
                  aceptarInvitacion(invitacion.id);
                  const newUbId = agregarUbicacion({ direccion: `Torre ${unidad.torreNumero} - ${unidad.codigo}`, alias: `${unidad.codigo}`, favorito: true });
                  setAcceptedUbicacionId(newUbId);
                  setShowPropertyWizard(true);
                  setConfigStep(1);
                }}>
                  Aceptar invitación
                </Button>
              </div>
            );
          })}

        {showPropertyWizard && configStep > 0 && (
          <>
            {/* Progress steps */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>Configura tu propiedad</h3>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '12px' }}>
                {wizardConfigSteps.map((step, i) => (
                  <div key={step.key} style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: i < configStep - 1 ? theme.colors.success : i === configStep - 1 ? theme.colors.primary : theme.colors.border,
                    transition: 'background 200ms',
                  }} />
                ))}
              </div>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
                Paso {configStep} de {wizardConfigSteps.length}
              </p>
              {wizardConfigSteps.filter((_, i) => i < configStep || i === configStep - 1).map((step, i) => {
                const stepIndex = wizardConfigSteps.indexOf(step);
                const isCompleted = completedConfigSteps[step.key];
                const isCurrent = stepIndex === configStep - 1;
                return (
                  <div key={step.key} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 0', borderBottom: stepIndex < wizardConfigSteps.length - 1 ? `1px solid ${theme.colors.borderLight}` : 'none',
                    opacity: isCurrent || isCompleted ? 1 : 0.4,
                  }}>
                    <span style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      background: isCompleted ? theme.colors.success : isCurrent ? theme.colors.primary : theme.colors.border,
                      color: '#fff', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isCompleted ? '\u2713' : String(stepIndex + 1)}
                    </span>
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, flex: 1 }}>{step.label}</span>
                    {isCompleted && <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.success }}>Completado</span>}
                  </div>
                );
              })}
            </div>

            {/* Current step content */}
            <div style={sectionCard}>
              {configStep === 1 && (
                <>
                  <h3 style={sectionTitle}>Parametros de estancia y aforo</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Minimo de dias</div>
                    <input type="number" min="1" value={minDias} onChange={e => setMinDias(parseInt(e.target.value) || 1)} style={inputStyle} />
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Capacidad maxima</div>
                    <input type="number" min="1" value={maxHuespedes} onChange={e => setMaxHuespedes(parseInt(e.target.value) || 1)} style={inputStyle} />
                  </div>
                </>
              )}
              {configStep === 2 && (
                <>
                  <h3 style={sectionTitle}>Reglas de convivencia y preferencias</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Politica de mascotas</span>
                      <div style={{ width: '140px' }}>
                        <SelectField value={politicaMascotas} options={['permitidas', 'no-permitidas']} onChange={setPoliticaMascotas} placeholder="Seleccione" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Apta para ninos</span>
                      <Toggle value={aptoNinos} onChange={setAptoNinos} />
                    </div>
                    <div>
                      <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, marginBottom: '6px' }}>Descripcion del alojamiento</div>
                      <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="N habitaciones, camas, info de aforo..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Habitaciones</div>
                        <input type="number" min="1" value={numHabitaciones} onChange={e => setNumHabitaciones(parseInt(e.target.value) || 1)} style={inputStyle} />
                      </div>
                      <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px' }}>Camas</div>
                        <input type="number" min="1" value={numCamas} onChange={e => setNumCamas(parseInt(e.target.value) || 1)} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                </>
              )}
              {configStep === 3 && (
                <>
                  <h3 style={sectionTitle}>Estacionamientos</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="number" min="0" value={estacionamientosProp} onChange={e => setEstacionamientosProp(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '80px' }} />
                    <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Estacionamientos disponibles para visitantes</span>
                  </div>
                </>
              )}
              {configStep === 4 && (
                <>
                  <h3 style={sectionTitle}>Integraciones</h3>
                  <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '12px' }}>
                    Prepara tu propiedad para futuras integraciones con plataformas de reservas.
                  </p>
                  {[
                    { key: 'airbnb', label: 'Airbnb' },
                    { key: 'booking', label: 'Booking.com' },
                    { key: 'lodgify', label: 'Lodgify' },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                      <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{item.label}</span>
                      <Toggle value={integraciones[item.key]} onChange={() => toggleIntegracion(item.key)} />
                    </div>
                  ))}
                </>
              )}
              {configStep === 5 && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
                    La configuración legal (RNT, TRA, SIRE) se realiza desde la pantalla de configuración de Huéspedes Temporales.
                  </p>
                </div>
              )}
              {configStep === 6 && (
                <>
                  <h3 style={sectionTitle}>Personal</h3>
                  <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginBottom: '12px' }}>
                    Registra coanfitriones, personal de limpieza y contactos de emergencia.
                  </p>
                  {staff.map(persona => (
                    <div key={persona.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
                      <div>
                        <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text }}>{persona.nombre}</div>
                        <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                          {persona.rol === 'coanfitrion' ? 'Coanfitrion' : persona.rol === 'limpieza' ? 'Limpieza' : 'Emergencia'}
                        </div>
                      </div>
                      <button onClick={() => eliminarStaff(persona.id)} style={{ color: theme.colors.danger, fontSize: theme.fonts.sizes.sm, background: 'none', border: 'none', cursor: 'pointer' }}>Eliminar</button>
                    </div>
                  ))}
                  <Button variant="secondary" fullWidth onClick={() => setShowStaffForm(true)}>+ Agregar personal</Button>
                </>
              )}
              {configStep === 7 && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>{'\u2705'}</div>
                  <h3 style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>
                    !Todo listo!
                  </h3>
                  <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: 1.5, marginBottom: '20px' }}>
                    Has completado todos los pasos de configuracion para tu propiedad. Al finalizar, la propiedad quedara activa y podras administrarla.
                  </p>
                  <Button variant="primary" fullWidth onClick={handleFinalizarWizard}>
                    Finalizar configuracion
                  </Button>
                </div>
              )}
              {configStep < 7 && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  {configStep > 1 && (
                    <Button variant="secondary" fullWidth onClick={() => setConfigStep(p => p - 1)}>Anterior</Button>
                  )}
                  <Button variant="primary" fullWidth onClick={() => {
                    handleGuardarWizard();
                    const key = wizardConfigSteps[configStep - 1]?.key;
                    if (key) setCompletedConfigSteps(prev => ({ ...prev, [key]: true }));
                    setConfigStep(p => p + 1);
                  }}>
                    {configStep < 6 ? 'Siguiente' : 'Finalizar'}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        {residentesPropietario.map(r => {
          const col = ROL_COLORES[r.rol] || { bg: '#F3F4F6', color: '#374151' };
          return (
            <div key={r.id} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '4px' }}>
                    {r.nombre}
                  </p>
                  <span style={{ display: 'inline-block', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: col.color, background: col.bg, borderRadius: theme.radius.full, padding: '2px 10px', marginBottom: '8px' }}>
                    {r.rol}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                    <span>Ci:{r.ci}</span>
                    <span>{r.fecha}</span>
                  </div>
                </div>
                <DotsMenuButton onClick={() => setMenuResidente(r)} />
              </div>
            </div>
          );
        })}

        <div style={{ height: '16px' }} />
      </div>

      {/* Botón visible tanto para Propietario como para Inquilino Líder */}
      <div style={{ padding: '12px 16px 16px', background: theme.colors.bgApp, borderTop: `1px solid ${theme.colors.borderLight}` }}>
          <button
            type="button"
            onClick={() => navigate(`${basePath}/huespedes-temporales`)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: theme.radius['2xl'],
              background: theme.colors.primary,
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              fontWeight: theme.fonts.weights.semibold,
              fontSize: theme.fonts.sizes.sm,
              color: theme.colors.text,
              lineHeight: theme.fonts.lineHeights.snug,
              textAlign: 'center',
              wordWrap: 'break-word',
              whiteSpace: 'normal',
              overflowWrap: 'break-word',
              hyphens: 'auto',
            }}
          >
            Configuración de funcionalidad:<br/>Huéspedes Temporales
          </button>
        </div>

      {/* Menú + */}
      <BottomSheet isOpen={showAddMenu} onClose={() => setShowAddMenu(false)}>
        <BottomSheetOption label="Agregar residente / lider" onPress={() => { setShowAddMenu(false); navigate(`${basePath}/crear-rol`); }} />
        <BottomSheetOption label="Agregar familiar" onPress={() => { setShowAddMenu(false); setShowFamiliar(true); }} />
        <BottomSheetOption label="Agregar servicio" onPress={() => { setShowAddMenu(false); navigate(`${basePath}/agregar-servicio`); }} />
        <BottomSheetOption label="Crear votación" onPress={() => { setShowAddMenu(false); setShowVotacion(true); }} />
      </BottomSheet>

      {/* Menú ⋮ */}
      <BottomSheet isOpen={!!menuResidente} onClose={() => setMenuResidente(null)}>
        <BottomSheetOption label="Editar" onPress={() => { const r = menuResidente; setMenuResidente(null); navigate(`${basePath}/crear-rol`, { state: { editar: r } }); }} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteResidente(menuResidente); setMenuResidente(null); }} />
        <BottomSheetOption label="Denunciar / Reportar" variant="primary" onPress={() => { const r = menuResidente; setMenuResidente(null); navigate('/perfil/soporte/reclamos/nuevo', { state: { categoriaPreseleccionada: 'Denuncia entre departamentos', titulo: `Denuncia: ${r?.nombre || ''}`, descripcion: `Reporte desde Configuración contra: ${r?.nombre || ''} (CI: ${r?.ci || ''})` } }); }} />
      </BottomSheet>

      {/* Eliminar */}
      <Modal isOpen={!!deleteResidente} onClose={() => setDeleteResidente(null)} title="Eliminar residente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, textAlign: 'center', color: theme.colors.text }}>
            ¿Seguro que deseas eliminar a <strong>{deleteResidente?.nombre}</strong>?
          </p>
          <Button variant="danger" fullWidth onClick={handleEliminar}>Eliminar</Button>
          <Button variant="ghost" fullWidth onClick={() => setDeleteResidente(null)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Agregar Familiar */}
      <Modal isOpen={showFamiliar} onClose={() => setShowFamiliar(false)} title="Agregar Familiar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, textAlign: 'center', color: theme.colors.text, lineHeight: theme.fonts.lineHeights.snug }}>
            Completar los datos solicitados para agregar al familiar
          </p>
          <div style={{ background: theme.colors.bgApp, borderRadius: theme.radius.xl, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textDecoration: 'underline', marginBottom: '2px' }}>
              Nuevo Familiar
            </p>
            <InputField label="Nombre y Apellido" value={familiar.nombre} onChange={setFamiliarField('nombre')} placeholder="Nombre completo" />
            <InputField label="Correo electronico" value={familiar.correo} onChange={setFamiliarField('correo')} placeholder="correo@mail.com" type="email" />
            <InputField label="Identificación:" value={familiar.identificacion} onChange={setFamiliarField('identificacion')} placeholder="Número de identificación" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Mayor de 18 años</span>
              <Toggle value={familiar.mayor18} onChange={setFamiliarField('mayor18')} />
            </div>
            <InputField label="Teléfono" value={familiar.telefono} onChange={setFamiliarField('telefono')} placeholder="+5965165136546" />
          </div>
          <Button variant="primary" fullWidth onClick={handleAgregarFamiliar}>+</Button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: theme.fonts.sizes.sm, color: theme.colors.text, textDecoration: 'underline', fontFamily: theme.fonts.family, textAlign: 'center' }}>
            Importante:
          </button>
        </div>
      </Modal>

      {/* Crear Votación */}
      <Modal isOpen={showVotacion} onClose={() => setShowVotacion(false)} title="Crear Votación">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textDecoration: 'underline', marginBottom: '6px' }}>Título*</p>
            <InputField value={votacion.titulo} onChange={setVotacionField('titulo')} placeholder="Título de la votación" multiline rows={2} />
          </div>
          <div>
            <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textDecoration: 'underline', marginBottom: '6px' }}>Descripción*</p>
            <InputField value={votacion.descripcion} onChange={setVotacionField('descripcion')} placeholder="Descripción" multiline rows={2} />
          </div>
          <SelectField value={votacion.categoria} options={CATEGORIAS} onChange={setVotacionField('categoria')} placeholder="Categoria" />
          <SelectField value={votacion.destinatario} options={DESTINATARIOS} onChange={setVotacionField('destinatario')} placeholder="Destinatario" />
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <IconoDocumento />
              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Adjuntar Documento</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <IconoImagen />
              <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Adjuntar Imagen</span>
            </div>
          </div>
          <InputField value={votacion.urlVideo} onChange={setVotacionField('urlVideo')} placeholder="Url video youtube" showEditIcon={false} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle value={votacion.esVotacion} onChange={setVotacionField('esVotacion')} />
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Votación</span>
          </div>
          {votacion.esVotacion && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <InputField value={votacion.umbral} onChange={setVotacionField('umbral')} placeholder="Umbral" />
              <InputField value={votacion.tiempoMaximo} onChange={setVotacionField('tiempoMaximo')} placeholder="Tiempo Máximo" />
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handlePublicar}>Publicar</Button>
        </div>
      </Modal>

      {/* Agregar Personal (desde wizard) */}
      <Modal isOpen={showStaffForm} onClose={() => setShowStaffForm(false)} title="Agregar personal">
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
    </AppShell>
  );
}
