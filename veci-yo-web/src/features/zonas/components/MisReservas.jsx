import { useState } from 'react';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import { zonasComunes } from '../../../data/mockData';
import zonaIcons from '../../../assets/icons/zonas';

const badgeStyle = {
  padding: '2px 8px',
  borderRadius: theme.radius.full,
  fontSize: theme.fonts.sizes['2xs'],
  fontWeight: theme.fonts.weights.semibold,
  whiteSpace: 'nowrap',
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

function parseFecha(f) {
  if (!f) return null;
  const [d, m, y] = f.split('/').map(Number);
  return new Date(y, m - 1, d);
}

function mismaFecha(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function etiquetaFecha(f) {
  const fecha = parseFecha(f);
  if (!fecha) return '';
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);
  if (mismaFecha(fecha, hoy)) return 'Hoy';
  if (mismaFecha(fecha, manana)) return 'Mañana';
  return f;
}

export default function MisReservas({ collapsible = false, hideIfEmpty = false }) {
  const { reservas, rolActivo, usuario } = useApp();
  const esGuardia = rolActivo === 'guardia';
  const esAdmin = rolActivo === 'administrador';
  if (esGuardia || esAdmin) return null;

  const esMia = (r) =>
    r.esMia ||
    (usuario?.nombre && r.nombre && r.nombre.toLowerCase().includes(String(usuario.nombre).toLowerCase()));

  const misReservas = (reservas || [])
    .filter((r) => esMia(r) && r.estado !== 'Cancelado' && r.estado !== 'Rechazado')
    .sort((a, b) => (parseFecha(a.fecha) || new Date(0)) - (parseFecha(b.fecha) || new Date(0)));

  if (misReservas.length === 0 && hideIfEmpty) return null;

  const [abierto, setAbierto] = useState(!collapsible);

  const estadoColor = (estado) =>
    estado === 'Aprobado'
      ? { bg: theme.colors.successLight, fg: theme.colors.success }
      : { bg: theme.colors.secondaryLight, fg: theme.colors.secondary };

  return (
    <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        type="button"
        onClick={collapsible ? () => setAbierto((o) => !o) : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: collapsible ? 'pointer' : 'default',
          fontFamily: theme.fonts.family,
          padding: 0,
        }}
      >
        <span style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
          Mis reservas
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ ...badgeStyle, background: theme.colors.primary, color: '#fff' }}>
            {misReservas.length}
          </span>
          {collapsible && (
            <span style={{ fontSize: '16px', color: theme.colors.textSecondary }}>{abierto ? '▲' : '▼'}</span>
          )}
        </span>
      </button>

      {abierto && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {misReservas.length === 0 ? (
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, paddingTop: '4px' }}>
              No tienes reservas activas.
            </span>
          ) : (
            misReservas.map((r) => {
              const zona = zonasComunes.find((z) => z.id === r.zonaId);
              const c = estadoColor(r.estado);
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 0',
                    borderTop: `1px solid ${theme.colors.borderLight}`,
                  }}
                >
                  <img
                    src={zonaIcons[r.zonaId]}
                    alt={zona?.nombre}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                      {zona?.nombre}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      {r.horario}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    <span style={{ ...badgeStyle, background: c.bg, color: c.fg }}>{r.estado}</span>
                    <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      {etiquetaFecha(r.fecha)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
