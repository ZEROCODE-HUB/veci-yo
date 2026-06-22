import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import SelectField from '../../components/ui/SelectField';
import InputField from '../../components/ui/InputField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { anuncios, anunciosCategorias, anunciosDestinatarios } from '../../data/mockData';
import iconAnuncios from '../../assets/icons/home/anuncios.png';
import iconAdjuntarDocumento from '../../assets/icons/shared/adjuntar-documento.png';
import iconAdjuntarImagen from '../../assets/icons/shared/adjuntar-imagen.png';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

const dateInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: theme.radius.lg,
  border: `1px solid ${theme.colors.border}`,
  fontSize: theme.fonts.sizes.sm,
  fontFamily: theme.fonts.family,
  background: theme.colors.bgCard,
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const FORM_VACIO = { titulo: '', descripcion: '', categoria: '', destinatario: '', urlVideo: '', votacion: false, umbral: '', tiempoMaximo: '' };

// Pantalla "2-Anuncios": listado de comunicados del condominio con filtros
// (búsqueda, fechas, categoría, encuesta), creación de nuevos anuncios
// (con votación opcional) y acceso al detalle de cada uno (/anuncios/:id).
export default function AnunciosPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [encuestaActiva, setEncuestaActiva] = useState(false);

  const [crearOpen, setCrearOpen] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [exitoOpen, setExitoOpen] = useState(false);

  const setField = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const filtered = anuncios.filter(a => {
    const matchSearch = !search
      || a.titulo.toLowerCase().includes(search.toLowerCase())
      || a.categoria.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = !categoriaFiltro || a.categoria === categoriaFiltro;
    const matchEncuesta = !encuestaActiva || a.votacion;
    return matchSearch && matchCategoria && matchEncuesta;
  });

  const handlePublicar = () => {
    setCrearOpen(false);
    setExitoOpen(true);
  };

  const cerrarExito = () => {
    setExitoOpen(false);
    setForm(FORM_VACIO);
  };

  return (
    <AppShell>
      <PageHeader
        title="Anuncios"
        action={
          <ModuloHeaderInfo
            helpKey="anuncios"
            action={
              <button
                type="button"
                onClick={() => setCrearOpen(true)}
                aria-label="Crear anuncio"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: theme.colors.primary,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  fontWeight: theme.fonts.weights.bold,
                  color: theme.colors.text,
                  lineHeight: 1,
                }}
              >
                +
              </button>
            }
          />
        }
      />

      <ModuloGate helpKey="anuncios">
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ ...cardStyle, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SearchBar value={search} onChange={setSearch} />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '16px',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms',
              }}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha desde</div>
                  <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={dateInputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha hasta</div>
                  <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={dateInputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignItems: 'center' }}>
                <SelectField label="Categoria" value={categoriaFiltro} options={['Todas', ...anunciosCategorias]} onChange={v => setCategoriaFiltro(v === 'Todas' ? '' : v)} placeholder="Todas" />
                <Toggle value={encuestaActiva} onChange={setEncuestaActiva} labelRight="Encuesta" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setFilterOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '16px' }}
                >
                  ▴
                </button>
              </div>
            </div>
          )}
        </div>

        {filtered.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(`/anuncios/${item.id}`)}
            style={{
              ...cardStyle,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: theme.fonts.family,
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: theme.colors.iconAmberBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={iconAnuncios} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <span style={{ flex: 1, fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                {item.categoria}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); addToast('Funcionalidad en desarrollo'); }}
                aria-label="Más acciones"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: theme.colors.bgMuted,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: theme.colors.text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ⋮
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.textSecondary }}>
                Titulo: {item.titulo}
              </span>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.secondary, fontWeight: theme.fonts.weights.semibold }}>
                {item.fechaCorta}
              </span>
            </div>
          </button>
        ))}

        <div style={{ height: '24px' }} />
      </div>
      </ModuloGate>

      {/* Crear anuncio */}
      <Modal isOpen={crearOpen} onClose={() => setCrearOpen(false)} title="Crear anuncio">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField label="Titulo*" value={form.titulo} onChange={setField('titulo')} placeholder="Título del anuncio" multiline rows={2} />
          <InputField label="Descripción*" value={form.descripcion} onChange={setField('descripcion')} placeholder="Describa el anuncio con el mayor detalle posible" multiline rows={3} />
          <SelectField value={form.categoria} options={anunciosCategorias} onChange={setField('categoria')} placeholder="Categoria" />
          <SelectField value={form.destinatario} options={anunciosDestinatarios} onChange={setField('destinatario')} placeholder="Destinatario" />

          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '4px' }}>
            {[
              { key: 'documento', label: 'Adjuntar Documento', icon: iconAdjuntarDocumento },
              { key: 'imagen', label: 'Adjuntar Imagen', icon: iconAdjuntarImagen },
            ].map(adj => (
              <button
                key={adj.key}
                type="button"
                onClick={() => addToast('Funcionalidad en desarrollo')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: theme.fonts.family }}
              >
                <img src={adj.icon} alt={adj.label} style={{ width: '64px', height: '64px', borderRadius: theme.radius.lg, objectFit: 'cover' }} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, textAlign: 'center' }}>{adj.label}</span>
              </button>
            ))}
          </div>

          <InputField value={form.urlVideo} onChange={setField('urlVideo')} placeholder="Url video youtube" showEditIcon={false} />

          <Toggle value={form.votacion} onChange={setField('votacion')} labelRight="Votación" />

          {form.votacion && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <InputField value={form.umbral} onChange={setField('umbral')} placeholder="Umbral" />
              <InputField value={form.tiempoMaximo} onChange={setField('tiempoMaximo')} placeholder="Tiempo Máximo" />
            </div>
          )}

          <Button variant="primary" fullWidth onClick={handlePublicar}>Publicar</Button>
        </div>
      </Modal>

      {/* Éxito */}
      <Modal isOpen={exitoOpen} onClose={cerrarExito} title="Crear anuncio">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, margin: 0 }}>
            ¡Su anuncio se publicó con éxito!
          </p>
          <Button variant="primary" fullWidth onClick={cerrarExito}>Aceptar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
