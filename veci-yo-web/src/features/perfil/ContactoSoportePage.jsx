import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import theme from '../../config/theme';
import { contactoSoporte } from '../../data/mockData';

const FILAS = [
  { label: 'Telefono:', value: contactoSoporte.telefono },
  { label: 'Email:', value: contactoSoporte.email },
  { label: 'Ubicación:', value: contactoSoporte.ubicacion },
  { label: 'Horarios:', value: contactoSoporte.horarios },
];

export default function ContactoSoportePage() {
  return (
    <AppShell>
      <PageHeader title="Contacto con VeciYo" />
      <div style={{ padding: '16px' }}>
        <div style={{
          background: theme.colors.bgCard,
          borderRadius: theme.radius.xl,
          border: `1.5px solid ${theme.colors.primary}`,
          overflow: 'hidden',
        }}>
          {FILAS.map((fila, i) => (
            <div
              key={fila.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '16px',
                borderBottom: i === FILAS.length - 1 ? 'none' : `1px solid ${theme.colors.borderLight}`,
              }}
            >
              <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, flexShrink: 0 }}>
                {fila.label}
              </span>
              <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, textAlign: 'right' }}>
                {fila.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
