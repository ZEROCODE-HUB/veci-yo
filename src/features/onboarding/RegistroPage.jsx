import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import OnboardingHeader from './components/OnboardingHeader';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_DOCUMENTO = ['Cédula', 'Pasaporte', 'DNI'];

const labelStyle = {
  display: 'block',
  fontSize: theme.fonts.sizes.sm,
  color: theme.colors.textSecondary,
  marginBottom: '6px',
  fontWeight: theme.fonts.weights.medium,
};

const errorTextStyle = {
  display: 'block',
  marginTop: '6px',
  fontSize: theme.fonts.sizes.xs,
  color: theme.colors.danger,
  fontWeight: theme.fonts.weights.medium,
};

const FIELDS_VACIOS = {
  nombre: '', apellido: '', correo: '',
  codArea: '', telefono: '',
  tipoDocumento: '', identificacion: '',
  contrasena: '', repetirContrasena: '',
};

export default function RegistroPage() {
  const navigate = useNavigate();
  const { registrarUsuario } = useApp();

  const [form, setForm] = useState(FIELDS_VACIOS);
  const [errors, setErrors] = useState({});

  const setField = (key) => (value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => (prev[key] ? { ...prev, [key]: '' } : prev));
  };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Ingresa tu nombre';
    if (!form.apellido.trim()) e.apellido = 'Ingresa tu apellido';
    if (!form.correo.trim()) e.correo = 'Ingresa tu correo';
    else if (!EMAIL_RE.test(form.correo.trim())) e.correo = 'Ingresa un correo válido';
    if (!form.codArea.trim()) e.codArea = 'Requerido';
    if (!form.telefono.trim()) e.telefono = 'Ingresa tu número';
    if (!form.tipoDocumento) e.tipoDocumento = 'Selecciona un tipo';
    if (!form.identificacion.trim()) e.identificacion = 'Ingresa tu identificación';
    if (!form.contrasena) e.contrasena = 'Crea una contraseña';
    else if (form.contrasena.length < 6) e.contrasena = 'Mínimo 6 caracteres';
    if (!form.repetirContrasena) e.repetirContrasena = 'Repite tu contraseña';
    else if (form.repetirContrasena !== form.contrasena) e.repetirContrasena = 'Las contraseñas no coinciden';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validar()) return;

    registrarUsuario({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      correo: form.correo.trim(),
      telefono: `${form.codArea.trim()} ${form.telefono.trim()}`,
      tipoDocumento: form.tipoDocumento,
      identificacion: form.identificacion.trim(),
    });
    navigate('/', { replace: true });
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: theme.colors.bgApp, fontFamily: theme.fonts.family }}>
      <OnboardingHeader />

      <form onSubmit={handleSubmit} style={{ flex: 1, padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: theme.colors.text,
            fontFamily: theme.fonts.family,
            fontSize: theme.fonts.sizes.sm,
            fontWeight: theme.fonts.weights.medium,
            padding: '6px 0',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver
        </button>

        {/* Hero card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, overflow: 'hidden', boxShadow: theme.shadows.card }}>
          <div style={{
            height: '120px',
            background: `linear-gradient(135deg, ${theme.colors.primaryLight}, #E8E4DC)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
          }}>
            📝
          </div>
          <p style={{
            textAlign: 'center',
            padding: '16px',
            fontSize: theme.fonts.sizes.base,
            fontWeight: theme.fonts.weights.semibold,
            color: theme.colors.text,
          }}>
            Ingrese los datos para obtener su cuenta
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField label="Nombre/s" value={form.nombre} onChange={setField('nombre')} placeholder="Ej: María José" error={errors.nombre} showEditIcon={false} />
          <InputField label="Apellido/s" value={form.apellido} onChange={setField('apellido')} placeholder="Ej: Rodríguez Paz" error={errors.apellido} showEditIcon={false} />
          <InputField label="Correo" value={form.correo} onChange={setField('correo')} placeholder="tu@correo.com" type="email" error={errors.correo} showEditIcon={false} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
            <InputField label="Cód. Área" value={form.codArea} onChange={setField('codArea')} placeholder="+593" error={errors.codArea} showEditIcon={false} />
            <InputField label="Número de teléfono" value={form.telefono} onChange={setField('telefono')} placeholder="987 654 321" type="tel" error={errors.telefono} showEditIcon={false} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '10px', alignItems: 'start' }}>
            <div>
              <span style={labelStyle}>Tipo</span>
              <SelectField value={form.tipoDocumento} options={TIPOS_DOCUMENTO} onChange={setField('tipoDocumento')} placeholder="Seleccionar" />
              {errors.tipoDocumento && <span style={errorTextStyle}>{errors.tipoDocumento}</span>}
            </div>
            <InputField label="Identificación" value={form.identificacion} onChange={setField('identificacion')} placeholder="N° de documento" error={errors.identificacion} showEditIcon={false} />
          </div>

          <InputField label="Contraseña" value={form.contrasena} onChange={setField('contrasena')} placeholder="Mínimo 6 caracteres" type="password" error={errors.contrasena} showEditIcon={false} />
          <InputField label="Repetir contraseña" value={form.repetirContrasena} onChange={setField('repetirContrasena')} placeholder="Repite tu contraseña" type="password" error={errors.repetirContrasena} showEditIcon={false} />

          <Button type="submit" variant="primary" fullWidth style={{ marginTop: '4px' }}>Registrarse</Button>
        </div>
      </form>
    </div>
  );
}
