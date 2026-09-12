import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import iconVivienda from '../../assets/icons/home/vivienda.png';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  padding: '16px',
  boxShadow: theme.shadows.card,
};

const sectionTitle = {
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  marginBottom: '12px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const labelStyle = {
  fontSize: theme.fonts.sizes.xs,
  color: theme.colors.textSecondary,
  fontWeight: theme.fonts.weights.semibold,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '4px',
};

const valueStyle = {
  fontSize: theme.fonts.sizes.base,
  color: theme.colors.text,
  fontWeight: theme.fonts.weights.medium,
  lineHeight: 1.5,
  wordBreak: 'break-word',
};

function CopyRow({ label, value, mono }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '10px 12px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={labelStyle}>{label}</div>
        <div style={{ ...valueStyle, fontFamily: mono ? 'monospace' : theme.fonts.family, fontSize: mono ? theme.fonts.sizes.base : theme.fonts.sizes.base }}>{value}</div>
      </div>
      <button
        onClick={handleCopy}
        style={{
          flexShrink: 0,
          padding: '8px 14px',
          borderRadius: theme.radius.full,
          border: `1.5px solid ${copied ? theme.colors.success : theme.colors.primary}`,
          background: copied ? theme.colors.success : theme.colors.primary,
          color: '#fff',
          fontSize: theme.fonts.sizes.xs,
          fontWeight: theme.fonts.weights.semibold,
          cursor: 'pointer',
          fontFamily: theme.fonts.family,
          transition: 'all 150ms',
        }}
      >
        {copied ? '✓ Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function InfoChip({ icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, padding: '8px 12px', border: `1px solid ${theme.colors.border}` }}>
      <span style={{ fontSize: '16px' }}>{icon}</span>
      <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>{label}:</span>
      <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>{value}</span>
    </div>
  );
}

export default function MiAlojamientoPage() {
  const { ubicacionActiva, configHuespedesTemporales, unidades, tipologias } = useApp();

  const config = ubicacionActiva ? configHuespedesTemporales[ubicacionActiva.id] : null;
  const guestbook = config?.guestbook || null;
  const hasGuestbook = guestbook && (guestbook.wifiName || guestbook.wifiPassword || guestbook.doorPassword || guestbook.instructions || guestbook.notes);

  const unidad = unidades.find(u => u.id === ubicacionActiva?.id || (ubicacionActiva?.alias && u.codigo === ubicacionActiva.alias) || u.torreNumero === ubicacionActiva?.torreNumero);
  const tipologia = unidad ? tipologias.find(t => t.id === unidad.tipologiaId) : null;

  const descripcion = config?.descripcion || '';
  const numHabitaciones = config?.numHabitaciones;
  const maxHuespedes = config?.maxHuespedes;
  const estacionamientos = config?.estacionamientos;
  const politicaMascotas = config?.politicaMascotas;
  const aptoNinos = config?.aptoNinos;

  return (
    <AppShell>
      <PageHeader title="Mi alojamiento" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}>

        {/* Hero - cálido y profesional */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.colors.primary} 0%, #FFD54F 55%, ${theme.colors.primaryLight} 100%)`,
          borderRadius: theme.radius.xl,
          padding: '20px 16px',
          boxShadow: theme.shadows.card,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -10, width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'relative', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #fff', flexShrink: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={ubicacionActiva?.imagen || iconVivienda} alt="Alojamiento" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: '#111827', lineHeight: 1.2 }}>
                Bienvenido a {ubicacionActiva?.alias || 'tu alojamiento'} ✨
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: '#4B5563', marginTop: '4px', lineHeight: 1.4 }}>
                {ubicacionActiva?.direccion || 'Tu hogar temporal, preparado con dedicación por el propietario'}
              </div>
              {ubicacionActiva?.alias && (
                <div style={{ display: 'inline-flex', marginTop: '8px', background: '#fff', borderRadius: theme.radius.full, padding: '4px 10px', fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                  🏠 {ubicacionActiva.alias} {unidad ? `· Torre ${unidad.torreNumero} · Piso ${unidad.piso}` : ''}
                </div>
              )}
            </div>
          </div>
          {descripcion && (
            <div style={{ position: 'relative', marginTop: '14px', background: 'rgba(255,255,255,0.92)', borderRadius: theme.radius.lg, padding: '10px 12px', fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 1.5 }}>
              {descripcion}
            </div>
          )}
        </div>

        {/* Chips rápidos */}
        {(numHabitaciones || maxHuespedes || tipologia || politicaMascotas || typeof aptoNinos === 'boolean') && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {numHabitaciones && <InfoChip icon="🛏️" label="Habitaciones" value={numHabitaciones} />}
            {maxHuespedes && <InfoChip icon="👥" label="Huéspedes" value={`Hasta ${maxHuespedes}`} />}
            {tipologia && <InfoChip icon="🏷️" label="Tipología" value={tipologia.nombre} />}
            {politicaMascotas && <InfoChip icon={politicaMascotas === 'permitidas' ? '🐾' : '🚫🐾'} label="Mascotas" value={politicaMascotas === 'permitidas' ? 'Permitidas' : 'No permitidas'} />}
            {typeof aptoNinos === 'boolean' && <InfoChip icon="👶" label="Niños" value={aptoNinos ? 'Apto' : 'No apto'} />}
            {typeof estacionamientos === 'number' && <InfoChip icon="🅿️" label="Estacionamientos" value={estacionamientos} />}
          </div>
        )}

        {!hasGuestbook ? (
          <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📖</div>
            <div style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Tu Guestbook aún está vacío</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '8px', lineHeight: 1.6, maxWidth: '320px', marginInline: 'auto' }}>
              El propietario aún no ha cargado la información del alojamiento. Cuando lo haga, aquí encontrarás el Wi-Fi, códigos de acceso, instrucciones y recomendaciones para que tu estadía sea perfecta.
            </div>
            <div style={{ marginTop: '14px', display: 'inline-flex', background: theme.colors.bgMuted, borderRadius: theme.radius.full, padding: '6px 12px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
              💡 Consejo: contacta al anfitrión si necesitas la información con urgencia
            </div>
          </div>
        ) : (
          <>
            {/* WiFi */}
            <div style={cardStyle}>
              <div style={sectionTitle}><span>📶</span> Conexión Wi-Fi</div>
              {!guestbook.wifiName && !guestbook.wifiPassword ? (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', textAlign: 'center' }}>
                  Información de Wi-Fi no disponible por el momento
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {guestbook.wifiName && <CopyRow label="Nombre de la red" value={guestbook.wifiName} />}
                  {guestbook.wifiPassword && <CopyRow label="Contraseña" value={guestbook.wifiPassword} mono />}
                  {!guestbook.wifiPassword && guestbook.wifiName && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, background: theme.colors.bgMuted, borderRadius: theme.radius.md, padding: '8px 10px', textAlign: 'center' }}>
                      Red abierta — no requiere contraseña
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Acceso */}
            <div style={cardStyle}>
              <div style={sectionTitle}><span>🔑</span> Acceso al alojamiento</div>
              {!guestbook.doorPassword ? (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', textAlign: 'center' }}>
                  El código de acceso será compartido directamente por el propietario
                </div>
              ) : (
                <CopyRow label="Código / contraseña de la puerta" value={guestbook.doorPassword} mono />
              )}
              <div style={{ marginTop: '10px', background: '#EFF6FF', borderRadius: theme.radius.lg, padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
                <span style={{ fontSize: theme.fonts.sizes.xs, color: '#1E40AF', lineHeight: 1.5 }}>
                  Guarda este código en un lugar seguro. Si tienes dificultades, contacta al anfitrión primario del departamento.
                </span>
              </div>
            </div>

            {/* Instrucciones */}
            <div style={cardStyle}>
              <div style={sectionTitle}><span>📋</span> Instrucciones del anfitrión</div>
              {!guestbook.instructions ? (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', textAlign: 'center' }}>
                  Sin instrucciones adicionales
                </div>
              ) : (
                <div style={{
                  background: theme.colors.bgMuted,
                  borderRadius: theme.radius.lg,
                  padding: '14px',
                  fontSize: theme.fonts.sizes.sm,
                  color: theme.colors.text,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  border: `1px solid ${theme.colors.border}`,
                }}>
                  {guestbook.instructions}
                </div>
              )}
            </div>

            {/* Notas / Recomendaciones */}
            <div style={cardStyle}>
              <div style={sectionTitle}><span>💛</span> Notas y recomendaciones</div>
              {!guestbook.notes ? (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', textAlign: 'center' }}>
                  Sin notas adicionales
                </div>
              ) : (
                <div style={{
                  background: '#FFFBEB',
                  borderRadius: theme.radius.lg,
                  padding: '14px',
                  fontSize: theme.fonts.sizes.sm,
                  color: '#92400E',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  border: '1px solid #FDE68A',
                }}>
                  {guestbook.notes}
                </div>
              )}
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>
                <span>🏡</span> Esperamos que disfrutes tu estadía — ¡haz de este espacio tu hogar!
              </div>
            </div>

            {/* Ayuda rápida */}
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '18px' }}>🆘</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>¿Necesitas ayuda durante tu estadía?</div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px', lineHeight: 1.5 }}>
                  Contacta al anfitrión primario desde el directorio o usa el chat de la vivienda. Estamos aquí para que todo sea cálido y sencillo.
                </div>
              </div>
            </div>
          </>
        )}

        <div style={{ height: '12px' }} />
      </div>
    </AppShell>
  );
}
