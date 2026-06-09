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

const ROLES_OPCIONES = ['Residente Lider', 'Residente'];
const TIPO_DOC_OPCIONES = ['Cedula', 'Pasaporte', 'DNI'];
const DURACION_OPCIONES = ['6 meses', '12 meses', '18 meses', '24 meses', '36 meses'];
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

function DocButton({ label, onClick }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
      <div style={{ width: '64px', height: '64px', background: theme.colors.iconAmberBg, borderRadius: theme.radius.lg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={theme.colors.iconAmber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <path d="M12 18v-4"/><path d="M9.5 15.5a2.5 2.5 0 0 0 5 0"/>
        </svg>
      </div>
      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center' }}>{label}</span>
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
    contactoNombre: editData?.contactoNombre || '',
    contactoCodigo: editData?.contactoCodigo || '',
    contactoTelefono: editData?.contactoTelefono || '',
    fechaInicio: editData?.fechaInicio || '',
    duracion: editData?.duracion || '',
    montoAlquiler: editData?.montoAlquiler || '',
    monitoreoPago: editData?.monitoreoPago || false,
  });

  const [servicios, setServicios] = useState({ ...SERVICIOS_INIT, ...editData?.servicios });
  const [showServicios, setShowServicios] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showContrato, setShowContrato] = useState(false);

  const setField = (key) => (val) => setForm(p => ({ ...p, [key]: val }));
  const toggleServicio = (key) => setServicios(p => ({ ...p, [key]: !p[key] }));

  const handleSubmit = () => {
    if (!form.nombre.trim() || !form.rol) {
      addToast('Completa Nombre y Rol para continuar', 'error');
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
    if (!esEdicion) {
      setShowContrato(true);
    } else {
      navigate(-1);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Creación de Rol" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SelectField value={form.rol} options={ROLES_OPCIONES} onChange={setField('rol')} placeholder="Seleccione Rol:" />
        <InputField value={form.nombre} onChange={setField('nombre')} placeholder="Nombre y Apellido" showEditIcon />
        <InputField value={form.correo} onChange={setField('correo')} placeholder="Correo electrónico" type="email" showEditIcon />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <SelectField value={form.tipo} options={TIPO_DOC_OPCIONES} onChange={setField('tipo')} placeholder="Tipo" />
          <InputField value={form.ci} onChange={setField('ci')} placeholder="Identificación" showEditIcon />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <InputField value={form.codigoArea} onChange={setField('codigoArea')} placeholder="Código Area" showEditIcon />
          <InputField value={form.telefono} onChange={setField('telefono')} placeholder="Numero de telefono" showEditIcon />
        </div>

        <SeccionHeader label="Contacto de Emergencia" />
        <InputField value={form.contactoNombre} onChange={setField('contactoNombre')} placeholder="Nombre y Apellido" showEditIcon />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <InputField value={form.contactoCodigo} onChange={setField('contactoCodigo')} placeholder="Código Area" showEditIcon />
          <InputField value={form.contactoTelefono} onChange={setField('contactoTelefono')} placeholder="Numero de telefono" showEditIcon />
        </div>

        <SeccionHeader label="Contrato" />
        <InputField value={form.fechaInicio} onChange={setField('fechaInicio')} placeholder="Fecha de inicio" showEditIcon />
        <SelectField value={form.duracion} options={DURACION_OPCIONES} onChange={setField('duracion')} placeholder="Duración del contrato" />
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', padding: '4px 0' }}>
          <DocButton label="Adjuntar Contrato" />
          <DocButton label="Términos y condiciones" />
        </div>
        <InputField value={form.montoAlquiler} onChange={setField('montoAlquiler')} placeholder="Monto de alquiler:" showEditIcon />

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

      {/* Configurar servicios modal */}
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

      {/* Success modal */}
      <Modal isOpen={showSuccess} onClose={handleSuccessClose} title="Configuración">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
            Alquiler tradicional configurado con éxito!
          </p>
        </div>
      </Modal>

      {/* Contrato generado modal */}
      <Modal isOpen={showContrato} onClose={() => { setShowContrato(false); navigate(-1); }} title="Contrato">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '8px 0', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Contrato Generado con éxito!</p>
          <div style={{ width: '72px', height: '72px', background: theme.colors.iconAmberBg, borderRadius: theme.radius.lg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={theme.colors.iconAmber} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <path d="M12 18v-4"/><path d="M9.5 15.5a2.5 2.5 0 0 0 5 0"/>
            </svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Contrato N°: 16548
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
