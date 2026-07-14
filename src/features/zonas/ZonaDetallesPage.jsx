import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import Badge from '../../components/ui/Badge';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import SelectField from '../../components/ui/SelectField';
import { useApp } from '../../context/AppContext';
import { zonasComunes, cantidadPersonas } from '../../data/mockData';
import theme from '../../config/theme';
import zonaIcons, { zonaBanners } from '../../assets/icons/zonas';

const borderByEstadoGuardia = {
  Aprobado: theme.colors.warning,
  Pendiente: theme.colors.textMuted,
  Cancelado: theme.colors.danger,
};
const borderByEstado = {
  Reservado: theme.colors.primary,
  Aprobado: theme.colors.success,
  Pendiente: theme.colors.warning,
  Rechazado: theme.colors.danger,
  Disponible: theme.colors.secondary,
  'No disponible': 'transparent',
};

const estilosPersona = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderRadius: theme.radius.lg,
    background: theme.colors.bgMuted,
    border: `1px solid ${theme.colors.border}`,
  },
  botonLlego: (activo) => ({
    padding: '6px 14px',
    borderRadius: theme.radius.full,
    cursor: 'pointer',
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    fontFamily: theme.fonts.family,
    background: activo ? theme.colors.success : theme.colors.bgCard,
    color: activo ? '#fff' : theme.colors.textSecondary,
    border: activo ? 'none' : `1px solid ${theme.colors.border}`,
  }),
  botonNoLlego: (activo) => ({
    padding: '6px 14px',
    borderRadius: theme.radius.full,
    cursor: 'pointer',
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.semibold,
    fontFamily: theme.fonts.family,
    background: activo ? theme.colors.danger : theme.colors.bgCard,
    color: activo ? '#fff' : theme.colors.textSecondary,
    border: activo ? 'none' : `1px solid ${theme.colors.border}`,
  }),
};

export default function ZonaDetallesPage() {
  const { zonaId } = useParams();
  const navigate = useNavigate();
  const { reservas, actualizarEstadoReserva, eliminarReserva, addToast, rolActivo } = useApp();

  const zona = zonasComunes.find(z => z.id === zonaId) || { nombre: zonaId, emoji: '🏢' };
  const zonasReservas = reservas.filter(r => r.zonaId === zonaId);

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(null);
  const [filtrosAbierto, setFiltrosAbierto] = useState(true);
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [editPersonasOpen, setEditPersonasOpen] = useState(false);
  const [editPersonasItem, setEditPersonasItem] = useState(null);
  const [editPersonasList, setEditPersonasList] = useState([]);
  const [editPersonasCount, setEditPersonasCount] = useState(0);
  const [incidenciaOpen, setIncidenciaOpen] = useState(false);
  const [incidenciaItem, setIncidenciaItem] = useState(null);
  const [incidenciaTexto, setIncidenciaTexto] = useState('');
  const [liberarOpen, setLiberarOpen] = useState(false);
  const [liberarItem, setLiberarItem] = useState(null);
  const [liberarCuposInput, setLiberarCuposInput] = useState(0);

  const esGuardia = rolActivo === 'guardia';

  const filtered = zonasReservas.filter(r => {
    const matchSearch = !search || r.depto.toLowerCase().includes(search.toLowerCase());
    const matchTab = !activeTab || r.estado === activeTab;
    return matchSearch && matchTab;
  });

  const handleEstado = (estado) => {
    actualizarEstadoReserva(menuItem.id, estado);
    setMenuItem(null);
  };

  const handleEliminar = () => {
    eliminarReserva(deleteItem.id);
    setDeleteItem(null);
  };

  const abrirEditarPersonas = (item) => {
    setEditPersonasItem(item);
    setEditPersonasList(item.personas ? item.personas.map(p => ({ ...p })) : []);
    setEditPersonasCount(item.personas ? item.personas.length : 0);
    setMenuItem(null);
    setEditPersonasOpen(true);
  };

  const setPersonaLlego = (idx, valor) => {
    setEditPersonasList(prev => prev.map((p, i) =>
      i === idx ? { ...p, llego: valor } : p
    ));
  };

  const guardarPersonas = () => {
    addToast('Asistencia registrada correctamente');
    setEditPersonasOpen(false);
    setEditPersonasItem(null);
  };

  const statusColorsGuardia = {
    Todos: { bg: theme.colors.success, color: '#fff' },
    Aprobado: { bg: theme.colors.secondary, color: '#fff' },
    Pendiente: { bg: theme.colors.textMuted, color: '#fff' },
    Cancelado: { bg: theme.colors.danger, color: '#fff' },
  };

  return (
    <AppShell>
      <PageHeader
        title={zona.nombre}
        action={
          <button
            onClick={() => navigate(`/zonas-comunes/${zonaId}/reservar`)}
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
        }
      />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Zone banner */}
        <div
          style={{
            width: '100%',
            height: '180px',
            borderRadius: theme.radius.xl,
            overflow: 'hidden',
            position: 'relative',
            background: 'linear-gradient(135deg, #D4C5A9 0%, #B8A98C 100%)',
          }}
        >
          {zonaBanners[zona.id] ? (
            <img
              src={zonaBanners[zona.id]}
              alt={zona.nombre}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : zonaIcons[zona.id] ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={zonaIcons[zona.id]} alt={zona.nombre} style={{ width: '80px', height: '80px', objectFit: 'contain', opacity: 0.7 }} />
            </div>
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '48px' }}>{zona.emoji}</span>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', background: 'linear-gradient(transparent, rgba(0,0,0,0.6))' }}>
            <span style={{ color: '#fff', fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.lg, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{zona.nombre}</span>
          </div>
        </div>

        {/* Filter card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, flex: 1 }}>
              Reservas
            </span>
            <button
              onClick={() => setFiltrosAbierto(o => !o)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textMuted,
                fontSize: '16px',
                padding: '4px 8px',
                transition: 'transform 200ms',
                transform: filtrosAbierto ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            >
              ▾
            </button>
          </div>
          {filtrosAbierto && (
            <>
              <SearchBar value={search} onChange={setSearch} />
              <div style={{ marginTop: '10px' }}>
                <StatusTabs
                  tabs={esGuardia ? ['Todos', 'Aprobado', 'Pendiente', 'Cancelado'] : ['Todos', 'Reservado', 'Aprobado', 'Pendiente', 'No disponible', 'Disponible']}
                  active={activeTab || 'Todos'}
                  onChange={tab => setActiveTab(tab && tab !== 'Todos' ? tab : null)}
                  centered
                  statusColors={esGuardia ? statusColorsGuardia : undefined}
                />
              </div>
            </>
          )}
        </div>

        {/* Reservation list */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: theme.colors.textMuted, padding: '32px 0', fontSize: theme.fonts.sizes.base }}>
            No hay reservas para esta zona
          </div>
        )}

        {filtered.map(item => (
          <div
            key={item.id}
            style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              border: `2px solid ${esGuardia ? (borderByEstadoGuardia[item.estado] || 'transparent') : (borderByEstado[item.estado] || 'transparent')}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, marginBottom: '8px' }}>
                  {item.depto}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {zonaIcons[zona.id] ? (
                    <img
                      src={zonaIcons[zona.id]}
                      alt={zona.nombre}
                      style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '20px' }}>{zona.emoji}</span>
                  )}
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
                    {item.nombre}
                    {item.acompanantes !== undefined && item.acompanantes > 0 && (
                      <span style={{ color: theme.colors.primary, marginLeft: '6px' }}>+{item.acompanantes}</span>
                    )}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                    <span style={{ fontSize: '14px', color: theme.colors.success }}>✔✔</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', color: theme.colors.textSecondary }}>🪪</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{item.reservaNum}.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', color: theme.colors.textSecondary }}>🕐</span>
                  <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{item.horario}</span>
                </div>
              </div>
              <button
                onClick={() => setMenuItem(item)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: theme.colors.bgMuted,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: theme.colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ⋮
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom sheet */}
      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        {esGuardia ? (
          <>
            <BottomSheetOption label="Editar personas en la reserva" onPress={() => abrirEditarPersonas(menuItem)} />
            <BottomSheetOption label="Registrar comentarios o incidencias" onPress={() => { setIncidenciaItem(menuItem); setIncidenciaTexto(''); setMenuItem(null); setIncidenciaOpen(true); }} />
            <BottomSheetOption label="Liberar cupos" onPress={() => { setLiberarItem(menuItem); setLiberarCuposInput(0); setMenuItem(null); setLiberarOpen(true); }} />
          </>
        ) : (
          <>
            {rolActivo === 'administrador' && menuItem?.estado === 'Pendiente' && (
              <>
                <BottomSheetOption label="Aprobar reserva" onPress={() => handleEstado('Aprobado')} />
                <BottomSheetOption label="Rechazar reserva" variant="danger" onPress={() => handleEstado('Rechazado')} />
              </>
            )}
            {rolActivo === 'administrador' && (
              <>
                <BottomSheetOption label="Estado: Reservado" onPress={() => handleEstado('Reservado')} />
                <BottomSheetOption label="Estado: Disponible" onPress={() => handleEstado('Disponible')} />
                <BottomSheetOption label="Estado: No disponible" onPress={() => handleEstado('No disponible')} />
              </>
            )}
            <BottomSheetOption
              label="Eliminar"
              variant="danger"
              onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }}
            />
          </>
        )}
      </BottomSheet>

      {/* Editar personas modal */}
      <Modal isOpen={editPersonasOpen} onClose={() => { setEditPersonasOpen(false); setEditPersonasItem(null); }} title="Editar personas en la reserva">
        {editPersonasItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Reservation info */}
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{editPersonasItem.nombre || editPersonasItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{editPersonasItem.reservaNum} · {editPersonasItem.horario}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Total personas: {editPersonasItem.personas?.length || 0}</div>
            </div>

            {/* Person count selector */}
            <SelectField label="Modificar cantidad de personas:" value={String(editPersonasCount)} options={cantidadPersonas} onChange={v => setEditPersonasCount(Number(v.split(' ')[0]))} />

            {/* Person list with check-in */}
            <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Registro de asistentes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {editPersonasList.map((p, idx) => (
                <div key={idx} style={{
                  ...estilosPersona.container,
                  background: p.llego ? theme.colors.successLight : (p.llego === false && idx > 0 ? theme.colors.dangerLight : theme.colors.bgMuted),
                }}>
                  <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, flex: 1 }}>
                    {idx === 0 ? '👤 ' : '👥 '}{p.nombre}
                    {idx === 0 && <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginLeft: '6px' }}>(Titular)</span>}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setPersonaLlego(idx, true)}
                      style={estilosPersona.botonLlego(p.llego === true)}
                    >
                      Llegó
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersonaLlego(idx, false)}
                      style={estilosPersona.botonNoLlego(p.llego === false)}
                    >
                      No llegó
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="primary" fullWidth onClick={guardarPersonas}>Guardar</Button>
          </div>
        )}
      </Modal>

      {/* Incidencia modal */}
      <Modal isOpen={incidenciaOpen} onClose={() => { setIncidenciaOpen(false); setIncidenciaItem(null); }} title="Registrar comentario o incidencia">
        {incidenciaItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{incidenciaItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{incidenciaItem.reservaNum} · {incidenciaItem.horario}</div>
            </div>
            <textarea
              value={incidenciaTexto}
              onChange={e => setIncidenciaTexto(e.target.value)}
              placeholder="Describa el comentario o incidencia..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`,
                fontSize: theme.fonts.sizes.base,
                fontFamily: theme.fonts.family,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <Button
              variant="primary"
              fullWidth
              disabled={!incidenciaTexto.trim()}
              onClick={() => {
                addToast('Incidencia enviada a PQRs');
                setIncidenciaOpen(false);
                setIncidenciaItem(null);
              }}
            >
              Enviar a PQRs
            </Button>
          </div>
        )}
      </Modal>

      {/* Liberar cupos modal */}
      <Modal isOpen={liberarOpen} onClose={() => { setLiberarOpen(false); setLiberarItem(null); }} title="Liberar cupos">
        {liberarItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{liberarItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Reserva N°:{liberarItem.reservaNum} · {liberarItem.horario}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Total personas: {liberarItem.personas?.length || 0}</div>
            </div>
            <SelectField
              label="Cupos a liberar:"
              value={String(liberarCuposInput)}
              options={cantidadPersonas}
              onChange={v => setLiberarCuposInput(Number(v.split(' ')[0]))}
            />
            <Button
              variant="primary"
              fullWidth
              disabled={liberarCuposInput === 0}
              onClick={() => {
                addToast(`${liberarCuposInput} cupo(s) liberado(s)`);
                setLiberarOpen(false);
                setLiberarItem(null);
              }}
            >
              Liberar cupos
            </Button>
          </div>
        )}
      </Modal>

      {/* Delete modal */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar Reserva">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg }}>¿ Seguro que desea eliminar ?</p>
          {deleteItem && (
            <div style={{
              border: `1.5px solid ${theme.colors.primary}`,
              borderRadius: theme.radius.xl,
              padding: '14px',
              textAlign: 'left',
            }}>
              <div style={{ fontWeight: theme.fonts.weights.bold }}>{deleteItem.depto}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '4px' }}>
                Reserva N°:{deleteItem.reservaNum}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                {deleteItem.horario}
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleEliminar}>Eliminar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
