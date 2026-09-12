import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { tiposDocumentoPorPais } from '../../data/mockData';

const ROLES_OPCIONES = ['Residente Inquilino Lider', 'Coadministrador', 'Residente', 'Propietario'];
const TIPO_DOC_OPCIONES = tiposDocumentoPorPais?.default || ['Cedula', 'Pasaporte', 'DNI'];
const SERVICIOS_INIT = { luz: false, agua: false, gas: false, internet: false, mantenimiento: false, alquiler: false };

function SeccionHeader({ label }) {
  return (
    <div style={{ textAlign: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textDecoration: 'underline' }}>
        {label}
      </span>
    </div>
  );
}

export default function PropietarioCrearRolPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { agregarResidente, actualizarResidente, addToast } = useApp();
  const editData = location.state?.editar;
  const esEdicion = !!editData;

  const [form, setForm] = useState({
    rol: editData?.rol || '',
    nombre: editData?.nombre || '',
    correo: editData?.correo || '',
    tipo: editData?.tipo || '',
    ci: editData?.ci || '',
    codigoArea: editData?.codigoArea || '',
    telefono: editData?.telefono || '',
    menorEdad: editData?.menorEdad || false,
    contactoNombre: editData?.contactoNombre || '',
    contactoCodigo: editData?.contactoCodigo || '',
    contactoTelefono: editData?.contactoTelefono || '',
    fechaInicio: editData?.fechaInicio || '',
    duracion: editData?.duracion || '',
    montoAlquiler: editData?.montoAlquiler || '',
    monitoreoPago: editData?.monitoreoPago || false,
    esAnfitrionPrimario: editData?.esAnfitrionPrimario || false,
    esAdministradorPrimario: editData?.esAdministradorPrimario || false,
    datosVisibles: editData?.datosVisibles ?? true,
    contactableChat: editData?.contactableChat ?? true,
    contactableWhatsapp: editData?.contactableWhatsapp ?? true,
  });

  const [servicios, setServicios] = useState({ ...SERVICIOS_INIT, ...editData?.servicios });
  const [showServicios, setShowServicios] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const setField = (key) => (val) => setForm(p => ({ ...p, [key]: val }));
  const toggleServicio = (key) => setServicios(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.rol) {
      return;
    }
    const datos = { ...form, servicios, fecha: editData?.fecha || new Date().toLocaleDateString('es-AR') };
    if (esEdicion) {
      actualizarResidente({ ...editData, ...datos });
    } else {
      agregarResidente(datos);
    }
    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate(-1);
  };

  return (
    <AppShell>
      <PageHeader title="Gestión de usuarios" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SelectField value={form.rol} options={ROLES_OPCIONES} onChange={setField('rol')} placeholder="Seleccione Rol:" />
        {(form.rol === 'Residente' || form.rol === 'Inquilino Lider' || form.rol === 'Propietario') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 0' }}>
            <input type="checkbox" checked={!!form.esAnfitrionPrimario} onChange={e => setField('esAnfitrionPrimario')(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: theme.colors.primary }} />
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>Anfitrión primario</span>
          </label>
        )}
        {(form.rol === 'Coadministrador' || form.rol === 'Propietario') && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px 0' }}>
            <input type="checkbox" checked={!!form.esAdministradorPrimario} onChange={e => setField('esAdministradorPrimario')(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: theme.colors.primary }} />
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>Administrador primario</span>
          </label>
        )}
        <InputField value={form.nombre} onChange={setField('nombre')} placeholder="Nombre y Apellido" showEditIcon />
        <InputField value={form.correo} onChange={setField('correo')} placeholder="Correo electrónico" type="email" showEditIcon />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <SelectField value={form.tipo} options={TIPO_DOC_OPCIONES} onChange={setField('tipo')} placeholder="Tipo" />
          <InputField value={form.ci} onChange={setField('ci')} placeholder="Identificación" showEditIcon />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <InputField value={form.codigoArea} onChange={setField('codigoArea')} placeholder="Código Area" showEditIcon />
          <InputField value={form.telefono} onChange={setField('telefono')} placeholder="Numero de telefono" showEditIcon />
        </div>

        {form.rol === 'Residente' && (
          <div
            onClick={() => setField('menorEdad')(!form.menorEdad)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div style={{
              width: '22px', height: '22px',
              borderRadius: theme.radius.sm,
              border: `1.5px solid ${form.menorEdad ? theme.colors.text : theme.colors.border}`,
              background: form.menorEdad ? theme.colors.text : theme.colors.bgCard,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              transition: `background ${theme.transitions.fast}, border-color ${theme.transitions.fast}`,
            }}>
              {form.menorEdad && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>¿Es menor de edad?</span>
          </div>
        )}

        <SeccionHeader label="Contacto de Emergencia" />
        <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed, margin: 0, textAlign: 'center' }}>
          Registrar un contacto alternativo es importante: permite ubicar a un familiar o allegado de confianza ante cualquier emergencia cuando no sea posible comunicarse con el residente.
        </p>
        <InputField value={form.contactoNombre} onChange={setField('contactoNombre')} placeholder="Nombre y Apellido" showEditIcon />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <InputField value={form.contactoCodigo} onChange={setField('contactoCodigo')} placeholder="Código Area" showEditIcon />
          <InputField value={form.contactoTelefono} onChange={setField('contactoTelefono')} placeholder="Numero de telefono" showEditIcon />
        </div>

        <InputField value={form.montoAlquiler} onChange={setField('montoAlquiler')} placeholder="Monto de alquiler:" showEditIcon />

        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '14px', boxShadow: theme.shadows.card, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Visibilidad y contacto</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Datos visibles</span>
            <Toggle value={form.datosVisibles} onChange={setField('datosVisibles')} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Contactable por chat app</span>
            <Toggle value={form.contactableChat} onChange={setField('contactableChat')} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Contactable por WhatsApp</span>
            <Toggle value={form.contactableWhatsapp} onChange={setField('contactableWhatsapp')} />
          </div>
          <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, margin: 0 }}>Si desactivas visibilidad, el contacto aparecerá como (oculto) y no será contactable.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowServicios(true)}
          style={{
            width: '100%', padding: '14px 16px',
            background: theme.colors.primary,
            borderRadius: theme.radius['2xl'],
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: theme.fonts.sizes.base,
            fontWeight: theme.fonts.weights.semibold,
            color: theme.colors.text,
            fontFamily: theme.fonts.family,
          }}
        >
          Configuración de servicios
          <span style={{ fontSize: '20px', fontWeight: 'bold' }}>+</span>
        </button>

        <div
          onClick={() => setField('monitoreoPago')(!form.monitoreoPago)}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '20px', height: '20px',
            borderRadius: '4px',
            border: `2px solid ${form.monitoreoPago ? theme.colors.primary : theme.colors.border}`,
            background: form.monitoreoPago ? theme.colors.primary : '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {form.monitoreoPago && <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✓</span>}
          </div>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Monitorear pago de servicios</span>
        </div>

        <Button variant="primary" fullWidth onClick={handleSubmit}>
          {esEdicion ? 'Guardar cambios' : 'Aceptar'}
        </Button>

        <div style={{ height: '24px' }} />
      </div>

      {/* Configurar servicios */}
      <Modal isOpen={showServicios} onClose={() => setShowServicios(false)} title="Configurar servicios del inquilino">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
            Elija que paga el inquilino del departamento
          </p>
          <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 16px', background: theme.colors.bgMuted, borderBottom: `1px solid ${theme.colors.border}` }}>
              <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Servicios</span>
              <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Estado</span>
            </div>
            {Object.entries(servicios).map(([key, val], i, arr) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', padding: '12px 16px', borderBottom: i < arr.length - 1 ? `1px solid ${theme.colors.borderLight}` : 'none' }}>
                <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, textTransform: 'capitalize' }}>{key}</span>
                <Toggle value={val} onChange={() => toggleServicio(key)} />
              </div>
            ))}
          </div>
          <Button variant="primary" fullWidth onClick={() => setShowServicios(false)}>Aceptar</Button>
        </div>
      </Modal>

      {/* Success — navega directo sin segundo popup */}
      <Modal isOpen={showSuccess} onClose={handleSuccessClose} title="Configuración">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
            Alquiler tradicional configurado con éxito!
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}
