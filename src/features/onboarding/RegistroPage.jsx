import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import fondoOnboarding from '../../assets/branding/fondo-onboarding.png';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Checkbox from '../../components/ui/Checkbox';
import Modal from '../../components/ui/Modal';
import OnboardingHeader from './components/OnboardingHeader';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_DOCUMENTO = ['Cédula', 'Pasaporte', 'DNI'];

const TERMINOS_DOCS = {
  terminos: {
    titulo: 'Términos y Condiciones',
    contenido: '1. Aceptación de los Términos\n\nAl registrarse en VeciYo, el usuario acepta cumplir con los presentes términos y condiciones de uso. Si no está de acuerdo con alguno de ellos, deberá abstenerse de utilizar la plataforma.\n\n2. Descripción del Servicio\n\nVeciYo es una plataforma de gestión comunitaria que facilita la comunicación entre residentes, administración y personal de seguridad de conjuntos residenciales.\n\n3. Responsabilidades del Usuario\n\nEl usuario se compromete a:\n- Proporcionar información veraz y actualizada\n- Hacer uso responsable de la plataforma\n- No compartir credenciales de acceso\n- Respetar las normas de convivencia',
  },
  privacidad: {
    titulo: 'Política de Privacidad',
    contenido: '1. Recopilación de Datos\n\nVeciYo recopila información personal necesaria para el funcionamiento de la plataforma, incluyendo nombre, identificación, correo electrónico y datos de contacto.\n\n2. Uso de la Información\n\nLos datos proporcionados serán utilizados exclusivamente para:\n- Gestionar el acceso a la comunidad\n- Facilitar la comunicación entre residentes\n- Administrar solicitudes y reclamos\n- Mejorar los servicios de la plataforma\n\n3. Protección de Datos\n\nVeciYo implementa medidas de seguridad técnicas y organizativas para proteger los datos personales contra acceso no autorizado.',
  },
  datos: {
    titulo: 'Ley de Protección de Datos',
    contenido: '1. Marco Legal\n\nEsta política se rige por la Ley de Protección de Datos Personales vigente, garantizando el derecho a la privacidad y autodeterminación informativa de los usuarios.\n\n2. Derechos del Usuario\n\nEl usuario tiene derecho a:\n- Acceder a sus datos personales\n- Solicitar la rectificación de datos inexactos\n- Solicitar la cancelación de sus datos\n- Oponerse al tratamiento de sus datos\n- Portabilidad de sus datos\n\n3. Consentimiento\n\nEl usuario otorga su consentimiento expreso para el tratamiento de sus datos personales conforme a los fines establecidos en esta política.',
  },
  reglamento: {
    titulo: 'Reglamento Interno',
    contenido: '1. Normas de Convivencia\n\nTodos los residentes se comprometen a:\n- Mantener un comportamiento respetuoso con vecinos y personal\n- Cumplir con los horarios establecidos para áreas comunes\n- Mantener limpias las áreas compartidas\n- Respetar las normas de estacionamiento\n\n2. Uso de Áreas Comunes\n\nLas áreas comunes deben ser utilizadas de acuerdo a su propósito designado, respetando los horarios y capacidad máxima permitida.\n\n3. Sanciones\n\nEl incumplimiento de las normas internas podrá resultar en sanciones según lo establecido por la administración del condominio.',
  },
};

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
  const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [terminosError, setTerminosError] = useState(false);
  const [modalDoc, setModalDoc] = useState(null);

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
    setTerminosError(!terminosAceptados);
    return Object.keys(e).length === 0 && terminosAceptados;
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
    <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: theme.colors.bgApp, fontFamily: theme.fonts.family }}>
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
            height: '215px',
            backgroundImage: `url(${fondoOnboarding})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
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

          <div style={{ padding: '8px 0' }}>
            <Checkbox
              checked={terminosAceptados}
              onChange={(val) => { setTerminosAceptados(val); setTerminosError(false); }}
              error={terminosError}
            />
            <label
              onClick={() => setTerminosAceptados(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                fontSize: theme.fonts.sizes.sm,
                color: theme.colors.text,
                lineHeight: theme.fonts.lineHeights.snug,
              }}
            >
              <div style={{ flex: 1 }}>
                Acepto los{' '}
                <span style={{ color: theme.colors.secondary, textDecoration: 'underline', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); setModalDoc('terminos'); }}>
                  Términos y Condiciones
                </span>
                ,{' '}
                <span style={{ color: theme.colors.secondary, textDecoration: 'underline', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); setModalDoc('privacidad'); }}>
                  Política de Privacidad
                </span>
                ,{' '}
                <span style={{ color: theme.colors.secondary, textDecoration: 'underline', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); setModalDoc('datos'); }}>
                  Ley de Protección de Datos
                </span>
                {' '}y{' '}
                <span style={{ color: theme.colors.secondary, textDecoration: 'underline', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); e.preventDefault(); setModalDoc('reglamento'); }}>
                  Reglamento interno (si aplica)
                </span>
                .
              </div>
            </label>
            {terminosError && (
              <span style={{ display: 'block', marginTop: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, fontWeight: theme.fonts.weights.medium }}>
                Debe aceptar los términos para continuar
              </span>
            )}
          </div>

          <Button type="submit" variant="primary" fullWidth style={{ marginTop: '4px' }} disabled={!terminosAceptados}>Registrarse</Button>
        </div>
      </form>

      <Modal isOpen={!!modalDoc} onClose={() => setModalDoc(null)} title={modalDoc ? TERMINOS_DOCS[modalDoc].titulo : ''}>
        <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed, whiteSpace: 'pre-line', maxHeight: '400px', overflowY: 'auto' }}>
          {modalDoc ? TERMINOS_DOCS[modalDoc].contenido : ''}
        </div>
      </Modal>
    </div>
  );
}
