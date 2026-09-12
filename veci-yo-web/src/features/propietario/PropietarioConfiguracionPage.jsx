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
  'Propietario': { bg: '#F3E8FF', color: '#7C3AED' },
  'Inquilino Lider': { bg: '#FEF9C3', color: '#854D0E' },
  'Residente': { bg: '#E0F2FE', color: '#0369A1' },
  'Corresidente': { bg: '#E0F2FE', color: '#0369A1' },
  'Coadministrador': { bg: '#FCE7F3', color: '#BE185D' },
  'Familiar': { bg: '#F0FDF4', color: '#166534' },
};

const GRUPOS_JERARQUIA = [
  { titulo: 'Residente Inquilino Lider', roles: ['Inquilino Lider'], indent: false },
  { titulo: 'Residente', roles: ['Residente', 'Corresidente'], indent: true },
  { titulo: 'Coadministrador', roles: ['Coadministrador'], indent: false },
];

const CATEGORIAS = ['Mantenimiento', 'Seguridad', 'Administración', 'Comunidad', 'Servicios'];
const DESTINATARIOS = ['Todos los residentes', 'Residentes activos', 'Administración', 'Propietarios'];

function IconoDocumento() {
  return <img src={iconAdjuntarDocumento} alt="Adjuntar Documento" style={{ width: '60px', height: '60px', borderRadius: theme.radius.lg, objectFit: 'cover', cursor: 'pointer' }} />;
}

function IconoImagen() {
  return <img src={iconAdjuntarImagen} alt="Adjuntar Imagen" style={{ width: '60px', height: '60px', borderRadius: theme.radius.lg, objectFit: 'cover', cursor: 'pointer' }} />;
}

function mensajeResidencia(esResidente) {
  if (esResidente) {
    return {
      titulo: 'Declaración de residencia',
      icono: '🏠',
      parrafos: [
        'Al configurarte como residente, tendrás acceso al contenido detallado de las funcionalidades: Visitas, Correspondencia y Zonas comunes.',
        'Los demás co-residentes de la propiedad podrán saber que estas visualizando esta información.',
        'Si tienes inquilinos y no vives en esta propiedad, recomendamos configurarte como NO residente, para mantener la privacidad de los residentes, sin embargo tu como propietario seguirás teniendo acceso a la información de tu propiedad, y funcionalidades como: notificaciones y encuestas, cuadro de honor, reglamentos, chats de propietarios y encuestas para propietarios.',
      ],
    };
  }
  return {
    titulo: 'Declaración de no residencia',
    icono: '🚫',
    parrafos: [
      'Al configurarte como NO residente, dejaras de acceder al contenido de las funcionalidades: visitas, correspondencia y zonas comunes, sin embargo, tu como propietario seguirás teniendo acceso a la información de tu propiedad, y funcionalidades como: notificaciones y encuestas, cuadro de honor, reglamentos, chats de propietarios y encuestas para propietarios.',
      'Solo quienes sean residentes, por ejemplo tus inquilinos, tendrán acceso al contenido de visitas, correspondencia y zonas comunes.',
      'Quienes configures como residentes sabrán si te has configurado o no como residente.',
    ],
  };
}

export default function PropietarioConfiguracionPage({ basePath = '/propietario/configuracion' } = {}) {
  const navigate = useNavigate();
  const { residentesPropietario, eliminarResidente, agregarResidente, actualizarResidente, addToast, rolActivo, unidades, propietariosInvited, aceptarInvitacion, agregarUbicacion, usuario, tipologias, esResidente, togglePropietarioResidente, ubicacionActiva, vehiculosPrivados, agregarVehiculo, eliminarVehiculo, setAnfitrionPrimario, setAdministradorPrimario, propietarioAnfitrionPrimario, propietarioAdministradorPrimario } = useApp();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuResidente, setMenuResidente] = useState(null);
  const [deleteResidente, setDeleteResidente] = useState(null);

  const [showFamiliar, setShowFamiliar] = useState(false);
  const [showResidentePopup, setShowResidentePopup] = useState(false);
  const [pendienteResidenteValue, setPendienteResidenteValue] = useState(true);
  const [familiar, setFamiliar] = useState({ nombre: '', correo: '', identificacion: '', mayor18: false, telefono: '', rol: 'Residente' });
  const setFamiliarField = (key) => (v) => setFamiliar(p => ({ ...p, [key]: v }));

  const [showVotacion, setShowVotacion] = useState(false);
  const [votacion, setVotacion] = useState({ titulo: '', descripcion: '', categoria: '', destinatario: '', urlVideo: '', esVotacion: false, umbral: '', tiempoMaximo: '' });
  const setVotacionField = (key) => (v) => setVotacion(p => ({ ...p, [key]: v }));

  const [showAgregarVehiculo, setShowAgregarVehiculo] = useState(false);
  const [formVehiculo, setFormVehiculo] = useState({ placa: '', tipo: 'Automóvil' });

  const unidadActual = ubicacionActiva ? unidades.find(u => u.id === ubicacionActiva.id) : null;
  const maxVehiculos = unidadActual?.estacionamientos ?? 0;
  const vehiculosUsuario = ubicacionActiva ? (vehiculosPrivados[ubicacionActiva.id] || []) : [];
  const puedeAgregarVehiculos = maxVehiculos > 0;

  const handleAgregarVehiculo = () => {
    if (!formVehiculo.placa.trim()) {
      addToast('Ingresa la placa del vehículo', 'error');
      return;
    }
    if (vehiculosUsuario.length >= maxVehiculos) {
      addToast(`Máximo ${maxVehiculos} vehículo(s) para este departamento`, 'error');
      return;
    }
    agregarVehiculo(ubicacionActiva.id, { placa: formVehiculo.placa.toUpperCase().trim(), tipo: formVehiculo.tipo });
    setFormVehiculo({ placa: '', tipo: 'Automóvil' });
    setShowAgregarVehiculo(false);
    addToast('Vehículo registrado correctamente', 'success');
  };

  const handleEliminar = () => {
    addToast(`${deleteResidente?.nombre} ha sido retirad${deleteResidente?.rol === 'Corresidente' ? 'a' : 'o'} como residente de esta propiedad y dejó de tener acceso a esta información.`, 'success');
    eliminarResidente(deleteResidente.id);
    setDeleteResidente(null);
  };

const handleAgregarFamiliar = () => {
    if (!familiar.nombre.trim()) return;
    agregarResidente({
      nombre: familiar.nombre,
      rol: familiar.rol || 'Residente',
      ci: familiar.identificacion,
      correo: familiar.correo,
      telefono: familiar.telefono,
      fecha: new Date().toLocaleDateString('es-AR'),
    });
    addToast(`${familiar.nombre} ha sido agregad${familiar.rol === 'Corresidente' ? 'a' : 'o'} como ${familiar.rol.toLowerCase()} de esta propiedad y tendrá acceso a esta información.`, 'success');
    setShowFamiliar(false);
    setFamiliar({ nombre: '', correo: '', identificacion: '', rol: 'Residente', mayor18: false, telefono: '' });
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '10px 14px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Tu rol en esta propiedad</span>
                    <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: ROL_COLORES['Propietario'].bg, color: ROL_COLORES['Propietario'].color, borderRadius: theme.radius.full, padding: '2px 10px', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold }}>Propietario</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>¿Eres también Residente?</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontFamily: theme.fonts.family, userSelect: 'none' }}>
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>No</span>
                      <div onClick={() => {
                        const newVal = !pendienteResidenteValue;
                        setPendienteResidenteValue(newVal);
                        setShowResidentePopup(true);
                      }} style={{
                        width: '40px', height: '22px', borderRadius: '11px',
                        background: pendienteResidenteValue ? theme.colors.primary : theme.colors.bgMuted,
                        border: `1.5px solid ${pendienteResidenteValue ? theme.colors.primary : theme.colors.border}`,
                        position: 'relative', cursor: 'pointer', transition: 'all 200ms', flexShrink: 0,
                      }}>
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%',
                          background: '#fff', position: 'absolute', top: '2px',
                          left: pendienteResidenteValue ? '21px' : '2px',
                          transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Sí</span>
                    </label>
                  </div>
                </div>
                <Button variant="primary" fullWidth onClick={() => {
                  togglePropietarioResidente(usuario?.correo, pendienteResidenteValue);
                  aceptarInvitacion(invitacion.id);
                  const newUbId = agregarUbicacion({ direccion: `Torre ${unidad.torreNumero} - ${unidad.codigo}`, alias: `${unidad.codigo}`, favorito: true });
                  navigate(`${basePath}/aceptar`, { state: { ubicacionId: newUbId, unidadId: unidad.id } });
                }}>
                  Aceptar invitación
                </Button>
              </div>
            );
          })}

        {/* Propietario — siempre visible con su estado de residencia editable */}
        {rolActivo === 'propietario' && usuario && (
          <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginTop: '4px' }}>
            Propietario
          </div>
        )}
        {rolActivo === 'propietario' && usuario && (
          <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '4px' }}>
                  {usuario.nombre} {usuario.apellido || ''} {propietarioAnfitrionPrimario && <span style={{ fontSize: theme.fonts.sizes.xs, background: theme.colors.primaryLight, color: theme.colors.primary, padding: '2px 6px', borderRadius: theme.radius.full, fontWeight: 700 }}>Anfitrión primario</span>} {propietarioAdministradorPrimario && <span style={{ fontSize: theme.fonts.sizes.xs, background: '#FCE7F3', color: '#BE185D', padding: '2px 6px', borderRadius: theme.radius.full, fontWeight: 700 }}>Admin primario</span>}
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ display: 'inline-block', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: ROL_COLORES['Propietario'].color, background: ROL_COLORES['Propietario'].bg, borderRadius: theme.radius.full, padding: '2px 10px' }}>
                    Propietario
                  </span>
                  <span style={{ display: 'inline-block', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: ROL_COLORES[esResidente ? 'Residente' : 'Corresidente'].color, background: ROL_COLORES[esResidente ? 'Residente' : 'Corresidente'].bg, borderRadius: theme.radius.full, padding: '2px 10px' }}>
                    {esResidente ? 'Residente' : 'No residente'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Residente:</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontFamily: theme.fonts.family }}>
                    <div onClick={() => {
                      const newVal = !esResidente;
                      if (!newVal) {
                        setPendienteResidenteValue(false);
                        setShowResidentePopup(true);
                      } else {
                        setPendienteResidenteValue(true);
                        setShowResidentePopup(true);
                      }
                    }} style={{
                      width: '36px', height: '20px', borderRadius: '10px',
                      background: esResidente ? theme.colors.primary : theme.colors.bgMuted,
                      border: `1.5px solid ${esResidente ? theme.colors.primary : theme.colors.border}`,
                      position: 'relative', cursor: 'pointer', transition: 'all 200ms', flexShrink: 0,
                    }}>
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: '#fff', position: 'absolute', top: '2px',
                        left: esResidente ? '19px' : '2px',
                        transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${theme.colors.borderLight}`, paddingTop: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={propietarioAnfitrionPrimario} onChange={() => setAnfitrionPrimario('propietario')} style={{ width: '16px', height: '16px', accentColor: theme.colors.primary }} />
                <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.text }}>Anfitrión primario</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={propietarioAdministradorPrimario} onChange={() => setAdministradorPrimario('propietario')} style={{ width: '16px', height: '16px', accentColor: theme.colors.primary }} />
                <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.text }}>Administrador primario</span>
              </label>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, margin: 0 }}>Por defecto el propietario es anfitrión y administrador primario. Puedes reasignarlo.</p>
            </div>
          </div>
        )}

        {/* Lista completa de residentes actuales agrupada por jerarquía */}
        <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginTop: '8px' }}>
          Residentes actuales ({residentesPropietario.length})
        </div>
        <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0 }}>
          El Residente Inquilino Lider o el Propietario son quienes pueden agregar o editar los residentes de la propiedad.
        </p>

        {GRUPOS_JERARQUIA.map(grupo => {
          const items = residentesPropietario.filter(r => grupo.roles.includes(r.rol));
          if (items.length === 0) return null;
          return (
            <div key={grupo.titulo} style={{ display: 'flex', flexDirection: 'column', gap: '10px', ...(grupo.indent ? { paddingLeft: '14px', borderLeft: `2px solid ${theme.colors.borderLight}` } : {}) }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                {grupo.titulo}
              </div>
              {items.map(r => (
                <div key={r.id} style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '4px' }}>
                        {r.nombre} {r.esAnfitrionPrimario && <span style={{ fontSize: theme.fonts.sizes.xs, background: theme.colors.primaryLight, color: theme.colors.primary, padding: '2px 6px', borderRadius: theme.radius.full, fontWeight: theme.fonts.weights.bold }}>Anfitrión primario</span>} {r.esAdministradorPrimario && <span style={{ fontSize: theme.fonts.sizes.xs, background: '#FCE7F3', color: '#BE185D', padding: '2px 6px', borderRadius: theme.radius.full, fontWeight: theme.fonts.weights.bold }}>Admin primario</span>}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                        <span>Ci:{r.ci}</span>
                        <span>{r.fecha}</span>
                      </div>
                      <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{r.datosVisibles === false ? '🔒 Datos ocultos' : '👁️ Datos visibles'}</span>
                        <span>{r.contactableChat ? '💬 Chat' : '💬✕'}</span>
                        <span>{r.contactableWhatsapp ? '📱 WhatsApp' : '📱✕'}</span>
                      </div>
                      {(r.rol === 'Residente' || r.rol === 'Corresidente' || r.rol === 'Inquilino Lider' || r.rol === 'Propietario') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!r.esAnfitrionPrimario} onChange={() => { if (!r.esAnfitrionPrimario) setAnfitrionPrimario(r.id); }} style={{ width: '16px', height: '16px', accentColor: theme.colors.primary }} />
                          <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Anfitrión primario</span>
                        </label>
                      )}
                      {(r.rol === 'Coadministrador' || r.rol === 'Propietario') && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', cursor: 'pointer' }}>
                          <input type="checkbox" checked={!!r.esAdministradorPrimario} onChange={() => { if (!r.esAdministradorPrimario) setAdministradorPrimario(r.id); }} style={{ width: '16px', height: '16px', accentColor: theme.colors.primary }} />
                          <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>Administrador primario</span>
                        </label>
                      )}
                    </div>
                    <DotsMenuButton onClick={() => setMenuResidente(r)} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* Mis Vehículos */}
        {puedeAgregarVehiculos && (
          <>
            <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginTop: '8px' }}>
              Mis Vehículos
            </div>
            <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card }}>
              <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: '12px' }}>
                {vehiculosUsuario.length} de {maxVehiculos} estacionamiento(s) asignado(s)
              </p>

              {vehiculosUsuario.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {vehiculosUsuario.map(v => (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: theme.colors.bgMuted, borderRadius: theme.radius.md }}>
                      <div>
                        <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{v.placa}</div>
                        <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>{v.tipo}</div>
                      </div>
                      <button onClick={() => { eliminarVehiculo(ubicacionActiva.id, v.id); addToast('Vehículo eliminado', 'success'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.danger, fontSize: theme.fonts.sizes.xs, fontFamily: theme.fonts.family }}>Eliminar</button>
                    </div>
                  ))}
                </div>
              )}

              {vehiculosUsuario.length < maxVehiculos && (
                <Button variant="primary" fullWidth onClick={() => setShowAgregarVehiculo(true)}>+ Agregar vehículo</Button>
              )}
            </div>
          </>
        )}

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
        <BottomSheetOption label="Agregar Residente Inquilino Lider" onPress={() => { setShowAddMenu(false); navigate(`${basePath}/crear-rol`, { state: { rolPreseleccionado: 'Inquilino Lider' } }); }} />
        <BottomSheetOption label="Agregar Coadministrador" onPress={() => { setShowAddMenu(false); navigate(`${basePath}/crear-rol`, { state: { rolPreseleccionado: 'Coadministrador' } }); }} />
        <BottomSheetOption label="Agregar Residente / Corresidente" onPress={() => { setShowAddMenu(false); navigate(`${basePath}/crear-rol`, { state: { rolPreseleccionado: 'Residente' } }); }} />
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

      {/* Declaración de residencia / no residencia (toggle Propietario) */}
      <Modal isOpen={showResidentePopup} onClose={() => setShowResidentePopup(false)} title={mensajeResidencia(pendienteResidenteValue).titulo}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center', padding: '8px 0' }}>
          <span style={{ fontSize: '48px' }}>{mensajeResidencia(pendienteResidenteValue).icono}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
            {mensajeResidencia(pendienteResidenteValue).parrafos.map((p, i) => (
              <p key={i} style={{ fontSize: theme.fonts.sizes.sm, color: i === 0 ? theme.colors.text : theme.colors.textSecondary, fontWeight: i === 0 ? theme.fonts.weights.semibold : theme.fonts.weights.normal, lineHeight: 1.6, margin: 0 }}>
                {p}
              </p>
            ))}
          </div>
          <Button variant="primary" fullWidth onClick={() => {
            togglePropietarioResidente(usuario?.correo, pendienteResidenteValue);
            setShowResidentePopup(false);
          }}>Confirmar</Button>
        </div>
      </Modal>

      {/* Agregar Familiar */}
      <Modal isOpen={showFamiliar} onClose={() => setShowFamiliar(false)} title="Agregar Residente / Corresidente">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, textAlign: 'center', color: theme.colors.text, lineHeight: theme.fonts.lineHeights.snug }}>
            Completar los datos solicitados para agregar al residente
          </p>
          <div style={{ background: theme.colors.bgApp, borderRadius: theme.radius.xl, padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textDecoration: 'underline', marginBottom: '2px' }}>
              Nuevo Residente / Corresidente
            </p>
            <InputField label="Nombre y Apellido" value={familiar.nombre} onChange={setFamiliarField('nombre')} placeholder="Nombre completo" />
            <InputField label="Correo electronico" value={familiar.correo} onChange={setFamiliarField('correo')} placeholder="correo@mail.com" type="email" />
            <InputField label="Identificación:" value={familiar.identificacion} onChange={setFamiliarField('identificacion')} placeholder="Número de identificación" />
            <SelectField label="Rol" value={familiar.rol} options={['Residente', 'Corresidente']} onChange={setFamiliarField('rol')} placeholder="Seleccionar rol" />
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

      {/* Agregar vehículo */}
      <Modal isOpen={showAgregarVehiculo} onClose={() => setShowAgregarVehiculo(false)} title="Agregar vehículo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Placa del vehículo" value={formVehiculo.placa} onChange={v => setFormVehiculo(p => ({ ...p, placa: v }))} placeholder="Ej: ABC-1234" />
          <div>
            <span style={{ display: 'block', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>Tipo de vehículo</span>
            <SelectField value={formVehiculo.tipo} options={['Automóvil', 'Camioneta', 'Motocicleta', 'Bicicleta', 'Otro']} onChange={v => setFormVehiculo(p => ({ ...p, tipo: v }))} />
          </div>
          <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5 }}>
            Puedes registrar hasta {maxVehiculos} vehículo(s). Ya tienes {vehiculosUsuario.length} registrado(s).
          </div>
          <Button variant="primary" fullWidth onClick={handleAgregarVehiculo}>Registrar vehículo</Button>
          <Button variant="ghost" fullWidth onClick={() => setShowAgregarVehiculo(false)}>Cancelar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
