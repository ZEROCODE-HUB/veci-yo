import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Share, Upload, Download, Phone } from 'lucide-react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { reglasContenido, contactosDepartamento } from '../../data/mockData';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
  padding: '16px',
};

const iconButtonStyle = {
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
  flexShrink: 0,
};

export default function ReglaDetallePage() {
  const { tipo } = useParams();
  const { addToast } = useApp();
  const contenido = reglasContenido[tipo];
  const contactos = contactosDepartamento;

  const [cargaOpen, setCargaOpen] = useState(false);
  const [exitoOpen, setExitoOpen] = useState(false);
  const [descargaOpen, setDescargaOpen] = useState(false);
  const [archivo, setArchivo] = useState('');
  const [solicitudOpen, setSolicitudOpen] = useState(false);
  const [accionesOpen, setAccionesOpen] = useState(false);

  if (!contenido) {
    return (
      <AppShell>
        <PageHeader title="Reglamentos" />
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary }}>
          No se encontró el reglamento.
        </div>
      </AppShell>
    );
  }

  const confirmarCarga = () => {
    setCargaOpen(false);
    setExitoOpen(true);
  };

  const cerrarExito = () => {
    setExitoOpen(false);
    setArchivo('');
  };

  return (
    <AppShell>
      <PageHeader title={contenido.titulo} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '8px' }}>
            <button type="button" onClick={() => setCargaOpen(true)} aria-label="Cargar reglamento" style={iconButtonStyle}>
              <Share size={16} />
            </button>
            {contenido.mostrarDescarga && (
              <button type="button" onClick={() => setDescargaOpen(true)} aria-label="Descargar reglamento" style={iconButtonStyle}>
                <Download size={16} />
              </button>
            )}
            <button type="button" onClick={() => setAccionesOpen(true)} aria-label="Más acciones" style={iconButtonStyle}>
              <span style={{ fontSize: '18px', lineHeight: 1 }}>⋮</span>
            </button>
          </div>

          <h2 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', textDecoration: 'underline', marginTop: 0, marginBottom: '16px' }}>
            {contenido.encabezado}
          </h2>

          {contenido.secciones.map((sec, i) => (
            <div key={i} style={{ marginBottom: i === contenido.secciones.length - 1 ? 0 : '14px' }}>
              {sec.titulo && (
                <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: '0 0 6px' }}>
                  {sec.titulo}
                </p>
              )}
              <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sec.items.map((item, j) => (
                  <li key={j} style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '12px' }}>
            Información del departamento
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
              <span style={{ fontWeight: theme.fonts.weights.semibold }}>Administrador del departamento:</span> {contactos.administrador.nombre}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
              <span style={{ fontWeight: theme.fonts.weights.semibold }}>Anfitrión del departamento:</span> {contactos.anfitrion.nombre}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
              <span style={{ fontWeight: theme.fonts.weights.semibold }}>Propietario:</span> {contactos.propietario.nombre}
            </div>
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={() => setSolicitudOpen(true)}>
          Solicitar documentos antiguos
        </Button>

        <div style={{ height: '24px' }} />
      </div>

      {/* Menú de acciones */}
      <Modal isOpen={accionesOpen} onClose={() => setAccionesOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={() => { setAccionesOpen(false); window.location.href = `tel:${contactos.anfitrion.telefono}`; }}
            style={{
              background: theme.colors.bgMuted,
              border: 'none',
              borderRadius: theme.radius.full,
              padding: '14px 18px',
              fontSize: theme.fonts.sizes.base,
              fontWeight: theme.fonts.weights.medium,
              color: theme.colors.text,
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Phone size={16} /> Llamar al anfitrión
          </button>
          <button
            type="button"
            onClick={() => { setAccionesOpen(false); window.location.href = `tel:${contactos.administrador.telefono}`; }}
            style={{
              background: theme.colors.bgMuted,
              border: 'none',
              borderRadius: theme.radius.full,
              padding: '14px 18px',
              fontSize: theme.fonts.sizes.base,
              fontWeight: theme.fonts.weights.medium,
              color: theme.colors.text,
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Phone size={16} /> Llamar al administrador
          </button>
          <button
            type="button"
            onClick={() => { setAccionesOpen(false); window.location.href = `tel:${contactos.propietario.telefono}`; }}
            style={{
              background: theme.colors.bgMuted,
              border: 'none',
              borderRadius: theme.radius.full,
              padding: '14px 18px',
              fontSize: theme.fonts.sizes.base,
              fontWeight: theme.fonts.weights.medium,
              color: theme.colors.text,
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              textAlign: 'center',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Phone size={16} /> Llamar al propietario
          </button>
        </div>
      </Modal>

      {/* Carga de reglamento */}
      <Modal isOpen={cargaOpen} onClose={() => setCargaOpen(false)} title="Carga de reglamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <h3 style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, margin: 0 }}>
            Residentes Temporales
          </h3>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0 }}>
            Sube un PDF/Docx.
          </p>
          <button
            type="button"
            onClick={() => setArchivo('ResidentesTemporales.pdf')}
            style={{
              width: '100%',
              padding: '13px 16px',
              borderRadius: theme.radius['2xl'],
              border: `1.5px solid ${theme.colors.border}`,
              background: theme.colors.bgCard,
              color: theme.colors.text,
              fontSize: theme.fonts.sizes.base,
              fontFamily: theme.fonts.family,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivo || 'Elegir Archivo'}</span>
            <Upload size={16} style={{ flexShrink: 0, color: theme.colors.textSecondary }} />
          </button>
          <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, margin: 0 }}>
            Documento antiguo no vigente
          </p>
          <Button variant="primary" fullWidth onClick={confirmarCarga} disabled={!archivo}>Aceptar</Button>
        </div>
      </Modal>

      {/* Éxito de carga */}
      <Modal isOpen={exitoOpen} onClose={cerrarExito} title="Carga de reglamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, margin: 0 }}>
            ¡Documento subido<br />Con éxito!
          </p>
          <span style={{ width: '64px', height: '64px', borderRadius: '50%', background: theme.colors.iconAmberBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
            🏠
          </span>
          <Button variant="primary" fullWidth onClick={cerrarExito}>Aceptar</Button>
        </div>
      </Modal>

      {/* Solicitar documentos antiguos */}
      <Modal isOpen={solicitudOpen} onClose={() => setSolicitudOpen(false)} title="Solicitar documentos antiguos">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, margin: 0 }}>
            ¿Deseas solicitar los documentos antiguos no vigentes?
          </p>
          <Button variant="primary" fullWidth onClick={() => { setSolicitudOpen(false); }}>Aceptar</Button>
          <Button variant="ghost" fullWidth onClick={() => setSolicitudOpen(false)}>Cancelar</Button>
        </div>
      </Modal>

      {/* Descarga de reglamento */}
      <Modal isOpen={descargaOpen} onClose={() => setDescargaOpen(false)} title="Descarga de reglamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, margin: 0 }}>
            {contenido.archivo}
          </p>
          <Button variant="primary" fullWidth onClick={() => { setDescargaOpen(false); }}>Aceptar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
