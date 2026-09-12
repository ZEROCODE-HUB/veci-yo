import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Badge from '../../components/ui/Badge';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Toggle from '../../components/ui/Toggle';
import SelectField from '../../components/ui/SelectField';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { categorias } from '../../data/mockData';

// Filtros de estado con sus colores (checkbox multi-selección)
const FILTROS_ESTADO = [
  { value: 'No Recibido', label: 'No recibido', color: '#111827' }, // negro
  { value: 'En Portería', label: 'En portería', color: '#CA8A04' },  // amarillo
  { value: 'Entregado', label: 'Entregado', color: '#6B7280' },      // gris
];
const COLOR_TODOS = theme.colors.primary; // azul

// Texto de un paso del progreso de entrega
const textoPaso = (tipo, datos) => {
  if (!datos || !datos.fecha) {
    if (tipo === 'registro') return 'Registro: Pendiente';
    if (tipo === 'recibido') return 'Recibido: Pendiente';
    return 'Entregado: Pendiente';
  }
  if (tipo === 'registro') return `Registrado ${datos.fecha} hora ${datos.hora} por ${datos.por}`;
  if (tipo === 'recibido') return `Recibido ${datos.fecha} hora ${datos.hora} por ${datos.por}`;
  return `Entregado ${datos.fecha} hora ${datos.hora} a ${datos.a || datos.por}`;
};

// Progreso de entrega: Registrado → Recibido → Entregado
const ProgresoEntrega = ({ item }) => {
  const registro = item.fechaRegistro ? { fecha: item.fechaRegistro, hora: item.horaRegistro, por: item.registradoPor } : null;
  const recibido = item.fechaRecibido ? { fecha: item.fechaRecibido, hora: item.horaRecibido, por: item.recibidoPor } : null;
  const entregado = item.fechaEntregado ? { fecha: item.fechaEntregado, hora: item.horaEntregado, a: item.entregadoA } : null;
  const pasos = [
    { tipo: 'registro', datos: registro },
    { tipo: 'recibido', datos: recibido },
    { tipo: 'entregado', datos: entregado },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {pasos.map((p, i) => {
        const pendiente = !p.datos || !p.datos.fecha;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: theme.fonts.sizes.xs, color: pendiente ? theme.colors.textMuted : theme.colors.text }}>
            <span style={{ fontSize: '15px', flexShrink: 0 }}>{pendiente ? '⏳' : '✅'}</span>
            <span>{textoPaso(p.tipo, p.datos)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function CorrespondenciaPage() {
  const navigate = useNavigate();
  const { correspondencia, actualizarEstadoCorrespondencia, eliminarCorrespondencia, rolActivo, esResidente, usuario } = useApp();
  const [search, setSearch] = useState('');
  const [estadoSeleccionados, setEstadoSeleccionados] = useState([]); // vacío = Todos
  const [filterOpen, setFilterOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('2025-05-14');
  const [fechaHasta, setFechaHasta] = useState('2025-07-30');
  const [catFilter, setCatFilter] = useState('');
  const [entregaFilter, setEntregaFilter] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [entregaPuertaItem, setEntregaPuertaItem] = useState(null);
  const [entregaPuertaNombre, setEntregaPuertaNombre] = useState('');
  const [entregaPuertaHora, setEntregaPuertaHora] = useState(() => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));

  const puedeModificarEstado = rolActivo === 'administrador' || rolActivo === 'guardia';
  const puedeCrear = rolActivo === 'administrador' || rolActivo === 'guardia';

  const toggleEstado = (value) => {
    setEstadoSeleccionados(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };
  const toggleTodos = () => {
    setEstadoSeleccionados(prev => (prev.length === 0 || prev.length === FILTROS_ESTADO.length ? [] : FILTROS_ESTADO.map(f => f.value)));
  };
  const todosActivo = estadoSeleccionados.length === 0 || estadoSeleccionados.length === FILTROS_ESTADO.length;

  const filtered = correspondencia.filter(c => {
    const matchSearch = !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.empresa.toLowerCase().includes(c.empresa.toLowerCase());
    const matchTab = estadoSeleccionados.length === 0 || estadoSeleccionados.includes(c.estado);
    const matchCat = !catFilter || c.categoria === catFilter;
    const matchGuest = rolActivo !== 'huesped-temporal' || (usuario?.nombre && c.nombre?.toLowerCase().includes(usuario.nombre.toLowerCase().split(' ')[0]));
    return matchSearch && matchTab && matchCat && matchGuest;
  });

  const handleEstado = (estado) => {
    if (estado === 'Entregado' && menuItem?.entregaEnPuerta) {
      setEntregaPuertaItem(menuItem);
      setEntregaPuertaNombre('');
      setEntregaPuertaHora(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
      setMenuItem(null);
      return;
    }
    actualizarEstadoCorrespondencia(menuItem.id, estado);
    setMenuItem(null);
  };

  const confirmarEntregaPuerta = () => {
    if (!entregaPuertaItem) return;
    const now = new Date();
    const fecha = now.toLocaleDateString('es-AR');
    actualizarEstadoCorrespondencia(entregaPuertaItem.id, 'Entregado', {
      fechaEntregado: fecha,
      horaEntregado: entregaPuertaHora,
      entregadoA: entregaPuertaNombre,
    });
    setEntregaPuertaItem(null);
  };

  const handleEliminar = () => {
    eliminarCorrespondencia(deleteItem.id);
    setDeleteItem(null);
    setShowDeleteSuccess(true);
    setTimeout(() => setShowDeleteSuccess(false), 2000);
  };

  const getIcon = (empresa) => {
    if (empresa.toLowerCase().includes('rappi')) return '🛵';
    if (empresa.toLowerCase().includes('dhl')) return '📦';
    return '📬';
  };

  const inputWrapperStyle = {
    width: '100%',
    overflow: 'hidden',
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.bgCard,
  };

  const dateInputStyle = {
    display: 'block',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    padding: '10px 12px',
    border: 'none',
    fontSize: theme.fonts.sizes.sm,
    fontFamily: theme.fonts.family,
    background: 'transparent',
    color: theme.colors.text,
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const accesoBloqueado = rolActivo === 'propietario' && !esResidente;

  return (
    <AppShell>
      {accesoBloqueado ? (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base, marginTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <p>No tienes acceso a Correspondencia. Solo los Residentes pueden usar esta función.</p>
        </div>
      ) : (<>
      <PageHeader
        title="Correspondencia"
        action={
          <ModuloHeaderInfo
            helpKey="correspondencia"
            action={puedeCrear ? (
              <button
                onClick={() => navigate('/correspondencia/agregar')}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: theme.radius.md,
                  background: theme.colors.primary,
                  color: '#fff',
                  fontSize: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                +
              </button>
            ) : null}
          />
        }
      />

      <ModuloGate helpKey="correspondencia">
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Filters card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <SearchBar value={search} onChange={setSearch} />
          <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {FILTROS_ESTADO.map(f => {
              const sel = estadoSeleccionados.includes(f.value);
              return (
                <button
                  key={f.value}
                  onClick={() => toggleEstado(f.value)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '7px 12px', borderRadius: theme.radius.full,
                    border: `1.5px solid ${f.color}`,
                    background: sel ? f.color : 'transparent',
                    color: sel ? '#fff' : f.color,
                    fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{
                    width: '14px', height: '14px', borderRadius: '4px',
                    border: `1.5px solid ${sel ? '#fff' : f.color}`,
                    background: sel ? '#fff' : 'transparent',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: f.color, lineHeight: 1,
                  }}>{sel ? '✓' : ''}</span>
                  {f.label}
                </button>
              );
            })}
            <button
              onClick={toggleTodos}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 12px', borderRadius: theme.radius.full,
                border: `1.5px solid ${COLOR_TODOS}`,
                background: todosActivo ? COLOR_TODOS : 'transparent',
                color: todosActivo ? '#fff' : COLOR_TODOS,
                fontFamily: theme.fonts.family, fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                cursor: 'pointer',
              }}
            >
              <span style={{
                width: '14px', height: '14px', borderRadius: '4px',
                border: `1.5px solid ${todosActivo ? '#fff' : COLOR_TODOS}`,
                background: todosActivo ? '#fff' : 'transparent',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: COLOR_TODOS, lineHeight: 1,
              }}>{todosActivo ? '✓' : ''}</span>
              Todos
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '28px',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms',
                lineHeight: 1,
              }}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha desde</div>
                  <div style={inputWrapperStyle}>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={e => setFechaDesde(e.target.value)}
                      style={dateInputStyle}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha hasta</div>
                  <div style={inputWrapperStyle}>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={e => setFechaHasta(e.target.value)}
                      style={dateInputStyle}
                    />
                  </div>
                </div>
              </div>
              <SelectField label="Categoría" value={catFilter} options={['Todas', ...categorias]} onChange={v => setCatFilter(v === 'Todas' ? '' : v)} />
              <Toggle value={entregaFilter} onChange={setEntregaFilter} labelRight="Entrega en puerta" />
            </div>
          )}
        </div>

        {/* List */}
        {filtered.map(item => (
          <div
            key={item.id}
            style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              position: 'relative',
              cursor: 'pointer',
            }}
            onClick={() => setDetailItem(item)}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '16px' }}>{getIcon(item.empresa)}</span>
                  <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                    {item.empresa}: {item.unidad}
                  </span>
                </div>
                {item.nombre && (
                  <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                    {item.nombre}
                  </div>
                )}
                {item.ci && (
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                    CI: {item.ci}
                  </div>
                )}
              </div>
              {puedeModificarEstado ? (
                <button
                  onClick={e => { e.stopPropagation(); setMenuItem(item); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '20px', padding: '4px', flexShrink: 0 }}
                >
                  ⋮
                </button>
              ) : (
                <span style={{ color: theme.colors.textMuted, fontSize: '14px', padding: '4px', flexShrink: 0 }}>›</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Badge status={item.estado} />
                {item.entregaEnPuerta && (
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, background: theme.colors.secondaryLight, padding: '2px 8px', borderRadius: theme.radius.full, fontWeight: theme.fonts.weights.medium }}>
                    🚪 Puerta
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{item.fecha}</span>
                <span style={{ fontSize: '14px', color: theme.colors.textMuted, opacity: 0.5 }}>›</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      </ModuloGate>

      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        {puedeModificarEstado && (
          <>
            <BottomSheetOption label="Estado: Portería" onPress={() => handleEstado('En Portería')} />
            <BottomSheetOption label="Estado: Entregado" onPress={() => handleEstado('Entregado')} />
          </>
        )}
        {puedeModificarEstado && (
          <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
        )}
        {puedeCrear && (
          <BottomSheetOption label="Informar" onPress={() => { setMenuItem(null); navigate('/correspondencia/agregar', { state: { informar: menuItem } }); }} />
        )}
      </BottomSheet>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar Correspondencia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, textAlign: 'center', color: theme.colors.text }}>
            ¿ Seguro que desea eliminar ?
          </p>
          {deleteItem && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold }}>{deleteItem.empresa}: {deleteItem.unidad}</div>
              {deleteItem.nombre && (
                <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md }}>{deleteItem.nombre}</div>
              )}
              {deleteItem.ci && (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI: {deleteItem.ci}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <Badge status={deleteItem.estado} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{deleteItem.fecha}</span>
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleEliminar}>Eliminar</Button>
        </div>
      </Modal>

      {/* Entrega en puerta modal */}
      <Modal isOpen={!!entregaPuertaItem} onClose={() => setEntregaPuertaItem(null)} title="Entrega en Puerta">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center' }}>
            Indique quién recibió la encomienda y a qué hora se entregó.
          </p>
          <div style={{
            background: theme.colors.bgCard,
            borderRadius: theme.radius['2xl'],
            padding: '13px 16px',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <input
              value={entregaPuertaNombre}
              onChange={e => setEntregaPuertaNombre(e.target.value)}
              placeholder="Nombre de quien recibe"
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: theme.fonts.sizes.base,
                fontFamily: theme.fonts.family,
                color: theme.colors.text,
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Hora de entrega</div>
            <div style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius['2xl'],
              padding: '13px 16px',
              border: `1px solid ${theme.colors.border}`,
            }}>
              <input
                type="time"
                value={entregaPuertaHora}
                onChange={e => setEntregaPuertaHora(e.target.value)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                outline: 'none',
                fontSize: theme.fonts.sizes.base,
                fontFamily: theme.fonts.family,
                color: theme.colors.text,
              }}
            />
          </div>
          </div>
          <Button variant="primary" fullWidth onClick={confirmarEntregaPuerta}>Confirmar Entrega</Button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal isOpen={!!detailItem} onClose={() => setDetailItem(null)} title="Detalle de Correspondencia">
        {detailItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '20px' }}>{getIcon(detailItem.empresa)}</span>
                <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{detailItem.empresa}</span>
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Unidad: {detailItem.unidad}</div>
              {detailItem.nombre && (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Destinatario: {detailItem.nombre}</div>
              )}
              {detailItem.ci && (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI: {detailItem.ci}</div>
              )}
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Categoría: {detailItem.categoria}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Logística: {detailItem.logistica}</div>
              {detailItem.descripcion && (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Descripción: {detailItem.descripcion}</div>
              )}
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Torre: {detailItem.torre || '-'}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Piso: {detailItem.piso || '-'}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Estado encomienda: {detailItem.estadoEncomienda || '-'}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Entrega en puerta: {detailItem.entregaEnPuerta ? 'Sí' : 'No'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <Badge status={detailItem.estado} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{detailItem.fecha}</span>
              </div>
            </div>

            {/* Progreso de entrega */}
            <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.sm, color: theme.colors.text, marginBottom: '2px' }}>Progreso de entrega</div>
              <ProgresoEntrega item={detailItem} />
            </div>

            {detailItem.informarInfo && (
              <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.sm, color: theme.colors.secondary }}>Informe de recepción</div>
                {detailItem.informarInfo.descripcion && (
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 1.5 }}>{detailItem.informarInfo.descripcion}</div>
                )}
                {detailItem.informarInfo.fotos && detailItem.informarInfo.fotos.length > 0 && (
                  <div>
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '6px' }}>Fotografías adjuntas:</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {detailItem.informarInfo.fotos.map((foto, i) => (
                        <div key={i} style={{ width: '64px', height: '64px', borderRadius: theme.radius.lg, background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={foto} alt={`Foto ${i+1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailItem.informarInfo.fechaReporte && (
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                    Fecha del reporte: {detailItem.informarInfo.fechaReporte}
                  </div>
                )}
                {detailItem.informarInfo.usuarioReporte && (
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                    Registrado por: {detailItem.informarInfo.usuarioReporte}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
      </>)}
    </AppShell>
  );
}
