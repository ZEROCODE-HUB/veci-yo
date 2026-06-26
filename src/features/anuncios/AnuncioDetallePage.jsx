import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Toggle from '../../components/ui/Toggle';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { anuncios } from '../../data/mockData';

const TODOS_DEPARTAMENTOS = ['A100', 'A101', 'A102', 'A103', 'A138', 'A158', 'A177', 'B100', 'B101', 'B102', 'B120', 'B143', 'B991', 'C100', 'C101', 'C102', 'C103', 'C108', 'C183'];

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
  padding: '16px',
};

const labelStyle = {
  fontSize: theme.fonts.sizes.sm,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  textDecoration: 'underline',
  marginBottom: '6px',
};

const pillStyle = {
  background: theme.colors.bgMuted,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.full,
  padding: '6px 4px',
  fontSize: theme.fonts.sizes['2xs'],
  fontWeight: theme.fonts.weights.semibold,
  color: theme.colors.text,
  textAlign: 'center',
};

const pillStyleSi = {
  ...pillStyle,
  background: theme.colors.successLight,
  borderColor: theme.colors.success,
  color: theme.colors.success,
};

const pillStyleNo = {
  ...pillStyle,
  background: theme.colors.dangerLight,
  borderColor: theme.colors.danger,
  color: theme.colors.danger,
};

const pillStyleNeutro = {
  ...pillStyle,
  background: theme.colors.bgMuted,
  borderColor: theme.colors.border,
  color: theme.colors.textMuted,
};

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(+year, +month - 1, +day);
}

export default function AnuncioDetallePage() {
  const { id } = useParams();
  const { addToast } = useApp();
  const anuncio = anuncios.find(a => String(a.id) === id);

  const votacionCerrada = useMemo(() => {
    if (!anuncio?.votacion || !anuncio?.fechaFinalizacion) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return parseDate(anuncio.fechaFinalizacion) < hoy;
  }, [anuncio]);

  const deptosNoVotaron = useMemo(() => {
    if (!anuncio?.votacion || !votacionCerrada) return [];
    const votaron = new Set([...(anuncio.votosSi || []), ...(anuncio.votosNo || [])]);
    return TODOS_DEPARTAMENTOS.filter(d => !votaron.has(d));
  }, [anuncio, votacionCerrada]);

  if (!anuncio) {
    return (
      <AppShell>
        <PageHeader title="Anuncio" />
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary }}>
          No se encontró el anuncio.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={`Anuncio N°: ${anuncio.id}`}
        action={
          <button
            type="button"
            onClick={() => addToast('Funcionalidad en desarrollo')}
            aria-label="Enviar por correo"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: theme.colors.bgMuted,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.text,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </button>
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Fecha publicada</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{anuncio.fechaPublicada}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Fecha Finalización</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{anuncio.fechaFinalizacion}</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={labelStyle}>Titulo:</div>
            <p style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
              {anuncio.titulo}
            </p>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <div style={labelStyle}>Descripción:</div>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, margin: 0 }}>
              {anuncio.descripcion}
            </p>
          </div>

          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{anuncio.categoria}</span>
        </div>

        {anuncio.votacion && !votacionCerrada && (
          <div style={cardStyle}>
            <h3 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginTop: 0, marginBottom: '12px' }}>
              Encuesta en curso
            </h3>

            {/* Barra de progreso */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                <span>Progreso</span>
                <span>{anuncio.progreso || 0}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                <div style={{ width: `${anuncio.progreso || 0}%`, height: '100%', background: theme.colors.secondary, borderRadius: theme.radius.full, transition: 'width 300ms' }} />
              </div>
            </div>

            {/* Opciones de votación */}
            {anuncio.opcionesVotacion?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                {anuncio.opcionesVotacion.map((opcion, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => addToast(`Voto registrado: ${opcion}`)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: theme.radius.lg,
                      border: `1.5px solid ${theme.colors.border}`,
                      background: theme.colors.bgCard,
                      cursor: 'pointer',
                      fontFamily: theme.fonts.family,
                      fontSize: theme.fonts.sizes.base,
                      color: theme.colors.text,
                      textAlign: 'center',
                    }}
                  >
                    {opcion}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <Button variant="primary" fullWidth onClick={() => addToast('Voto "Sí" registrado')} style={{ background: theme.colors.success, color: '#fff' }}>
                  Sí
                </Button>
                <Button variant="danger" fullWidth onClick={() => addToast('Voto "No" registrado')}>
                  No
                </Button>
              </div>
            )}

            {anuncio.ocultarResultados ? (
              <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, textAlign: 'center', marginTop: '8px' }}>
                Los resultados se mostrarán al cierre de la encuesta.
              </p>
            ) : (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                  <span>Sí: {anuncio.votosSi?.length || 0} votos</span>
                  <span>No: {anuncio.votosNo?.length || 0} votos</span>
                </div>
              </div>
            )}
          </div>
        )}

        {anuncio.votacion && votacionCerrada && (
          <div style={cardStyle}>
            <h2 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', marginTop: 0, marginBottom: '14px' }}>
              Resultados finales
            </h2>

            {/* Barra de progreso final */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>
                <span>Participación</span>
                <span>{anuncio.progreso || 100}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: theme.colors.bgMuted, borderRadius: theme.radius.full, overflow: 'hidden' }}>
                <div style={{ width: `${anuncio.progreso || 100}%`, height: '100%', background: theme.colors.secondary, borderRadius: theme.radius.full }} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.success, margin: '0 0 8px 0' }}>
                Votaron Sí ({anuncio.votosSi?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {anuncio.votosSi?.map((apto, i) => (
                  <span key={`si-${apto}-${i}`} style={pillStyleSi}>{apto}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.danger, margin: '0 0 8px 0' }}>
                Votaron No ({anuncio.votosNo?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {anuncio.votosNo?.map((apto, i) => (
                  <span key={`no-${apto}-${i}`} style={pillStyleNo}>{apto}</span>
                ))}
              </div>
            </div>

            {deptosNoVotaron.length > 0 && (
              <div>
                <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.textMuted, margin: '0 0 8px 0' }}>
                  No votaron ({deptosNoVotaron.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {deptosNoVotaron.map((apto, i) => (
                    <span key={`no-voto-${apto}-${i}`} style={pillStyleNeutro}>{apto}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ height: '24px' }} />
      </div>
    </AppShell>
  );
}
