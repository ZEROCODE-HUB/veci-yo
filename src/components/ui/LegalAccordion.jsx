import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import theme from '../../config/theme';

const LEGAL_DOCS = [
  {
    id: 'terminos',
    titulo: 'Términos y Condiciones de la App y Web',
    contenido: '1. Aceptación de los Términos\n\nAl registrarse en VeciYo, el usuario acepta cumplir con los presentes términos y condiciones de uso. Si no está de acuerdo con alguno de ellos, deberá abstenerse de utilizar la plataforma.\n\n2. Descripción del Servicio\n\nVeciYo es una plataforma de gestión comunitaria que facilita la comunicación entre residentes, administración y personal de seguridad de conjuntos residenciales.\n\n3. Responsabilidades del Usuario\n\nEl usuario se compromete a:\n- Proporcionar información veraz y actualizada\n- Hacer uso responsable de la plataforma\n- No compartir credenciales de acceso\n- Respetar las normas de convivencia',
  },
  {
    id: 'datos',
    titulo: 'Tratamiento de Datos Personales',
    contenido: '1. Marco Legal\n\nEsta política se rige por la Ley de Protección de Datos Personales vigente, garantizando el derecho a la privacidad y autodeterminación informativa de los usuarios.\n\n2. Derechos del Usuario\n\nEl usuario tiene derecho a:\n- Acceder a sus datos personales\n- Solicitar la rectificación de datos inexactos\n- Solicitar la cancelación de sus datos\n- Oponerse al tratamiento de sus datos\n- Portabilidad de sus datos\n\n3. Consentimiento\n\nEl usuario otorga su consentimiento expreso para el tratamiento de sus datos personales conforme a los fines establecidos en esta política.',
  },
  {
    id: 'privacidad',
    titulo: 'Política de Privacidad',
    contenido: '1. Recopilación de Datos\n\nVeciYo recopila información personal necesaria para el funcionamiento de la plataforma, incluyendo nombre, identificación, correo electrónico y datos de contacto.\n\n2. Uso de la Información\n\nLos datos proporcionados serán utilizados exclusivamente para:\n- Gestionar el acceso a la comunidad\n- Facilitar la comunicación entre residentes\n- Administrar solicitudes y PQRS\n- Mejorar los servicios de la plataforma\n\n3. Protección de Datos\n\nVeciYo implementa medidas de seguridad técnicas y organizativas para proteger los datos personales contra acceso no autorizado.',
  },
  {
    id: 'condominio',
    titulo: 'Términos y Condiciones del Condominio',
    contenido: '1. Normas de Convivencia\n\nTodos los residentes se comprometen a:\n- Mantener un comportamiento respetuoso con vecinos y personal\n- Cumplir con los horarios establecidos para áreas comunes\n- Mantener limpias las áreas compartidas\n- Respetar las normas de estacionamiento\n\n2. Uso de Áreas Comunes\n\nLas áreas comunes deben ser utilizadas de acuerdo a su propósito designado, respetando los horarios y capacidad máxima permitida.\n\n3. Sanciones\n\nEl incumplimiento de las normas internas podrá resultar en sanciones según lo establecido por la administración del condominio.',
  },
];

const accordionStyle = {
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.md,
  overflow: 'hidden',
  background: theme.colors.bgCard,
};

const headerStyle = (isOpen) => ({
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  background: isOpen ? theme.colors.primaryLight : theme.colors.bgCard,
  border: 'none',
  cursor: 'pointer',
  fontFamily: theme.fonts.family,
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.semibold,
  color: theme.colors.text,
  textAlign: 'left',
  gap: '12px',
  transition: `background ${theme.transitions.fast}`,
});

const iconStyle = (isOpen) => ({
  flexShrink: 0,
  color: theme.colors.textSecondary,
  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: `transform ${theme.transitions.base}`,
});

const bodyStyle = {
  padding: '0 16px 16px',
  fontSize: theme.fonts.sizes.sm,
  color: theme.colors.text,
  lineHeight: theme.fonts.lineHeights.relaxed,
  whiteSpace: 'pre-line',
};

export default function LegalAccordion({ docs = LEGAL_DOCS }) {
  const [openId, setOpenId] = useState(null);

  const toggle = (id) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {docs.map(doc => {
        const isOpen = openId === doc.id;
        return (
          <div key={doc.id} style={accordionStyle}>
            <button
              type="button"
              onClick={() => toggle(doc.id)}
              style={headerStyle(isOpen)}
              aria-expanded={isOpen}
            >
              <span style={{ flex: 1 }}>{doc.titulo}</span>
              <ChevronDown size={20} style={iconStyle(isOpen)} />
            </button>
            {isOpen && (
              <div style={bodyStyle}>
                {doc.contenido}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
