import { useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { zonaBanners } from '../../assets/icons/zonas';

const ESTADO_STYLES = {
  Confirmada: { color: '#16a34a', bg: '#dcfce7' },
  Pendiente: { color: '#ca8a04', bg: '#fef9c3' },
  Cancelada: { color: '#dc2626', bg: '#fee2e2' },
  Rechazada: { color: '#dc2626', bg: '#fee2e2' },
  Reservado: { color: '#2563eb', bg: '#dbeafe' },
  Aprobado: { color: '#16a34a', bg: '#dcfce7' },
  Disponible: { color: '#6b7280', bg: '#f3f4f6' },
  'No disponible': { color: '#dc2626', bg: '#fee2e2' },
};

const ESTADO_MAP = {
  Reservado: 'Confirmada',
  Aprobado: 'Aprobado',
  Pendiente: 'Pendiente',
  Rechazado: 'Rechazada',
  Cancelada: 'Cancelada',
  Disponible: 'Disponible',
  'No disponible': 'No disponible',
};

const TIPO_LABELS = {
  'Barbecue': 'Barbecue',
  'Swimming Pool': 'Swimming Pool',
  "Children's Park": "Children's Park",
  'Gym': 'Gym',
  'Coworking Space': 'Coworking Space',
  'Tennis Court': 'Tennis Court',
  'Game Room': 'Game Room',
  'Laundry Room': 'Laundry Room',
};

function parseHorario(horarioStr) {
  if (!horarioStr) return { fecha: '', horaInicio: '', horaFin: '' };
  const parts = horarioStr.match(/(\w+)\s+(\d+)\s*hs\s*a\s*(\d+[\d:]*)\s*hs/);
  if (parts) {
      const diasMap = { Domingo: 0, Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4, Viernes: 5, Sábado: 6, Sabado: 6 };
    const diaNum = diasMap[parts[1]];
    if (diaNum !== undefined) {
      const now = new Date();
      const diff = (diaNum + 7 - now.getDay()) % 7;
      const d = new Date(now);
      d.setDate(d.getDate() + diff);
      const fechaStr = d.toISOString().slice(0, 10);
      const ini = `${parts[2].padStart(2, '0')}:00`;
      const finParts = parts[3].split(':');
      const fin = finParts.length === 2 ? `${finParts[0].padStart(2, '0')}:${finParts[1].padStart(2, '0')}` : `${parts[3].padStart(2, '0')}:00`;
      return { fecha: fechaStr, horaInicio: ini, horaFin: fin };
    }
  }
  return { fecha: '', horaInicio: '', horaFin: '' };
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '';
  const d = new Date(fechaStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatHora(h) { return h ? h.slice(0, 5) : ''; }

export default function AdministradorGestionZonaReservasPage() {
  const { id: zonaId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    gestionZonas, reservas, residentesPropietario,
    agregarReserva, actualizarReserva, actualizarEstadoReserva, eliminarReserva, addToast,
  } = useApp();

  const zona = gestionZonas[zonaId];

  const [filtroFecha, setFiltroFecha] = useState('todas');
  const [sortAsc, setSortAsc] = useState(true);
  const [modalCrear, setModalCrear] = useState(searchParams.get('crear') === '1');
  const [modalEditar, setModalEditar] = useState(null);
  const [modalCancelar, setModalCancelar] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);

  const emptyForm = () => ({
    residenteNombre: '', residenteId: '', depto: '', fecha: '',
    horaInicio: '', horaFin: '', observaciones: '',
  });
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  const zonasReservas = useMemo(() => {
    return reservas.filter(r => r.zonaId === zonaId);
  }, [reservas, zonaId]);

  const parseReserva = (r) => {
    const fe = r.fecha || parseHorario(r.horario).fecha;
    const hi = r.horaInicio || parseHorario(r.horario).horaInicio;
    const hf = r.horaFin || parseHorario(r.horario).horaFin;
    const estado = ESTADO_MAP[r.estado] || r.estado || 'Pendiente';
    return { ...r, fecha: fe, horaInicio: hi, horaFin: hf, estado };
  };

  const reservasFiltradas = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let list = zonasReservas.map(parseReserva);
    if (filtroFecha === 'futuras') list = list.filter(r => r.fecha >= today);
    else if (filtroFecha === 'pasadas') list = list.filter(r => r.fecha < today);
    list.sort((a, b) => {
      const cmp = a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [zonasReservas, filtroFecha, sortAsc]);

  const handleStatusChange = (id, newEstado) => {
    actualizarEstadoReserva(id, newEstado);
    setModalCancelar(null);
    addToast('Estado de reserva actualizado');
  };

  const handleEliminar = () => {
    if (!modalEliminar) return;
    eliminarReserva(modalEliminar.id);
    setModalEliminar(null);
    addToast('Reserva eliminada');
  };

  const handleCrear = () => {
    const { residenteNombre, residenteId, depto, fecha, horaInicio, horaFin, observaciones } = form;
    if (!residenteNombre || !depto || !fecha || !horaInicio || !horaFin) {
      setFormError('Completa todos los campos obligatorios');
      return;
    }
    if (horaInicio >= horaFin) {
      setFormError('La hora de fin debe ser posterior a la de inicio');
      return;
    }
    const conflicto = reservas.some(r =>
      r.zonaId === zonaId && r.fecha === fecha &&
      ((r.horaInicio <= horaInicio && r.horaFin > horaInicio) ||
       (r.horaInicio < horaFin && r.horaFin >= horaFin) ||
       (r.horaInicio >= horaInicio && r.horaFin <= horaFin))
    );
    if (conflicto) {
      setFormError('Ya existe una reserva en ese horario');
      return;
    }
    const num = String(100000 + Math.floor(Math.random() * 900000));
    agregarReserva({
      zonaId, residenteNombre, residenteId, depto,
      fecha, horaInicio, horaFin, observaciones,
      estado: 'Pendiente', reservaNum: num,
    });
    setModalCrear(false);
    setForm(emptyForm());
    setFormError('');
    addToast('Reserva creada correctamente');
  };

  const handleEditar = () => {
    const { residenteNombre, depto, fecha, horaInicio, horaFin, observaciones } = form;
    if (!residenteNombre || !depto || !fecha || !horaInicio || !horaFin) {
      setFormError('Completa todos los campos obligatorios');
      return;
    }
    if (horaInicio >= horaFin) {
      setFormError('La hora de fin debe ser posterior a la de inicio');
      return;
    }
    actualizarReserva(modalEditar.id, { residenteNombre, depto, fecha, horaInicio, horaFin, observaciones });
    setModalEditar(null);
    setForm(emptyForm());
    setFormError('');
    addToast('Reserva actualizada');
  };

  const startCrear = () => {
    setModalCrear(true);
    setForm(emptyForm());
    setFormError('');
    setSearchParams({});
  };

  const startEditar = (r) => {
    setForm({
      residenteNombre: r.residenteNombre || '',
      residenteId: r.residenteId || '',
      depto: r.depto || '',
      fecha: r.fecha || '',
      horaInicio: r.horaInicio || '',
      horaFin: r.horaFin || '',
      observaciones: r.observaciones || '',
    });
    setFormError('');
    setModalEditar(r);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: `1.5px solid ${theme.colors.border}`,
    borderRadius: '12px',
    fontSize: theme.fonts.sizes.sm,
    fontFamily: theme.fonts.family,
    color: theme.colors.text,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 150ms',
  };

  if (!zona) {
    return (
      <AppShell>
        <PageHeader title="Reservas" onBack={() => navigate('/admin/gestion-zonas')} />
        <div style={{ padding: '40px 16px', textAlign: 'center', color: theme.colors.textSecondary }}>
          Zona no encontrada
        </div>
      </AppShell>
    );
  }

  const renderFormFields = (isEdit) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, marginBottom: '4px', display: 'block' }}>Residente *</label>
        <select
          value={form.residenteId}
          onChange={e => {
            const res = residentesPropietario.find(r => String(r.id) === e.target.value);
            setForm({ ...form, residenteId: e.target.value, residenteNombre: res ? res.nombre : '', depto: res ? form.depto : '' });
          }}
          style={inputStyle}
        >
          <option value="">Seleccionar residente</option>
          {residentesPropietario.map(r => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, marginBottom: '4px', display: 'block' }}>Nombre del residente *</label>
        <input value={form.residenteNombre} onChange={e => setForm({ ...form, residenteNombre: e.target.value })} style={inputStyle} placeholder="Nombre completo" />
      </div>
      <div>
        <label style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, marginBottom: '4px', display: 'block' }}>Apartamento / Unidad *</label>
        <input value={form.depto} onChange={e => setForm({ ...form, depto: e.target.value })} style={inputStyle} placeholder="Ej: 506 C" />
      </div>
      <div>
        <label style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, marginBottom: '4px', display: 'block' }}>Fecha *</label>
        <div style={{ width: '100%', overflow: 'hidden', borderRadius: '12px', border: `1.5px solid ${theme.colors.border}`, background: theme.colors.bgCard }}>
          <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
            style={{ ...inputStyle, border: 'none', display: 'block', width: '100%', maxWidth: '100%', minWidth: 0, background: 'transparent', cursor: 'pointer' }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, marginBottom: '4px', display: 'block' }}>Hora inicio *</label>
          <input type="time" value={form.horaInicio} onChange={e => setForm({ ...form, horaInicio: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, marginBottom: '4px', display: 'block' }}>Hora fin *</label>
          <input type="time" value={form.horaFin} onChange={e => setForm({ ...form, horaFin: e.target.value })} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text, marginBottom: '4px', display: 'block' }}>Observaciones</label>
        <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} placeholder="Opcional" rows={3} />
      </div>
      {formError && (
        <div style={{ color: '#dc2626', fontSize: theme.fonts.sizes.sm, textAlign: 'center' }}>{formError}</div>
      )}
    </div>
  );

  const renderDetalle = (r) => {
    const est = ESTADO_STYLES[r.estado] || { color: '#6b7280', bg: '#f3f4f6' };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>N° Reserva</span>
          <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{r.reservaNum || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Residente</span>
          <span style={{ fontWeight: theme.fonts.weights.medium, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{r.residenteNombre || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Apartamento</span>
          <span style={{ fontWeight: theme.fonts.weights.medium, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{r.depto || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Fecha</span>
          <span style={{ fontWeight: theme.fonts.weights.medium, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{r.fecha ? formatFecha(r.fecha) : '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Horario</span>
          <span style={{ fontWeight: theme.fonts.weights.medium, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            {r.horaInicio ? `${formatHora(r.horaInicio)} - ${formatHora(r.horaFin)}` : '—'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Estado</span>
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
            fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
            color: est.color, background: est.bg,
          }}>{r.estado}</span>
        </div>
        {r.observaciones && (
          <div>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, display: 'block', marginBottom: '4px' }}>Observaciones</span>
            <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, margin: 0, lineHeight: 1.4 }}>{r.observaciones}</p>
          </div>
        )}
      </div>
    );
  };

  const bannerSrc = zonaBanners[zona.id] || null;

  return (
    <AppShell>
      <PageHeader title={`Reservas - ${zona.nombre}`} onBack={() => navigate('/admin/gestion-zonas')} />

      {/* Zone Info Banner */}
      <div style={{
        width: '100%', height: '150px', background: 'linear-gradient(135deg, #D4C5A9 0%, #B8A98C 100%)',
        position: 'relative', overflow: 'hidden', marginBottom: '16px',
      }}>
        {bannerSrc ? (
          <img src={bannerSrc} alt={zona.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '48px', opacity: 0.5 }}>🏠</span>
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.5))',
          display: 'flex', alignItems: 'flex-end', padding: '12px 16px',
        }}>
          <h1 style={{ fontSize: theme.fonts.sizes.xl, fontWeight: theme.fonts.weights.bold, color: '#fff', margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
            {zona.nombre}
          </h1>
        </div>
      </div>

      {/* Zone Info */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px',
            borderRadius: '20px', background: theme.colors.bgSecondary,
            fontSize: theme.fonts.sizes.xs, color: theme.colors.text,
          }}>
            {TIPO_LABELS[zona.tipo] || zona.tipo}
          </span>
          <Badge status={zona.activa ? 'Activa' : 'Inactiva'} />
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px',
            borderRadius: '20px', background: theme.colors.bgSecondary,
            fontSize: theme.fonts.sizes.xs, color: theme.colors.text,
          }}>
            🕐 {zona.horarioApertura} - {zona.horarioCierre}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {['todas', 'futuras', 'pasadas'].map(f => (
            <button
              key={f}
              onClick={() => setFiltroFecha(f)}
              style={{
                padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.medium,
                background: filtroFecha === f ? theme.colors.primary : theme.colors.bgSecondary,
                color: filtroFecha === f ? theme.colors.text : theme.colors.textSecondary,
                transition: 'all 150ms',
              }}
            >
              {f === 'todas' ? 'Todas' : f === 'futuras' ? 'Futuras' : 'Pasadas'}
            </button>
          ))}
          <button
            onClick={() => setSortAsc(!sortAsc)}
            style={{
              marginLeft: 'auto', padding: '6px 10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: theme.fonts.sizes.xs, background: 'none', color: theme.colors.textSecondary,
            }}
          >
            {sortAsc ? '↑ Fecha' : '↓ Fecha'}
          </button>
        </div>
        <Button variant="primary" fullWidth onClick={startCrear}>+ Crear Reserva</Button>
      </div>

      {/* Reservation List */}
      <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {reservasFiltradas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base }}>
            No hay reservas{filtroFecha !== 'todas' ? ` ${filtroFecha === 'futuras' ? 'futuras' : 'pasadas'}` : ''} para esta zona.
          </div>
        ) : (
          reservasFiltradas.map(r => {
            const est = ESTADO_STYLES[r.estado] || { color: '#6b7280', bg: '#f3f4f6' };
            return (
              <div
                key={r.id}
                style={{
                  background: theme.colors.bgCard, borderRadius: theme.radius.xl,
                  boxShadow: theme.shadows.card, padding: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: '8px',
                  animation: 'fadeIn 250ms ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                      {r.residenteNombre || r.depto || 'Reserva'}
                    </div>
                    <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
                      {r.depto || ''} {r.reservaNum ? `· N° ${r.reservaNum}` : ''}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                    fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.semibold,
                    color: est.color, background: est.bg, whiteSpace: 'nowrap',
                  }}>{r.estado}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, flexWrap: 'wrap' }}>
                  <span>📅 {r.fecha ? formatFecha(r.fecha) : '—'}</span>
                  {r.horaInicio && <span>⏰ {formatHora(r.horaInicio)} - {formatHora(r.horaFin)}</span>}
                </div>
                {r.observaciones && (
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.4 }}>
                    💬 {r.observaciones}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setModalDetalle(r)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`,
                      background: 'transparent', cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                      color: theme.colors.textSecondary, flex: 1,
                    }}
                  >
                    Detalle
                  </button>
                  <button
                    onClick={() => startEditar(r)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.border}`,
                      background: 'transparent', cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                      color: theme.colors.textSecondary, flex: 1,
                    }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setModalCancelar(r)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: `1px solid ${theme.colors.danger}`,
                      background: 'transparent', cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                      color: theme.colors.danger, flex: 1,
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setModalEliminar(r)}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: 'none',
                      background: theme.colors.danger, cursor: 'pointer', fontSize: theme.fonts.sizes.xs,
                      color: '#fff', flex: 1,
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Crear Modal */}
      <Modal isOpen={modalCrear} onClose={() => { setModalCrear(false); setFormError(''); }} title="Nueva Reserva">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {renderFormFields(false)}
          <Button variant="primary" fullWidth onClick={handleCrear}>Crear Reserva</Button>
        </div>
      </Modal>

      {/* Editar Modal */}
      <Modal isOpen={!!modalEditar} onClose={() => { setModalEditar(null); setFormError(''); }} title="Editar Reserva">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {renderFormFields(true)}
          <Button variant="primary" fullWidth onClick={handleEditar}>Guardar Cambios</Button>
        </div>
      </Modal>

      {/* Detalle Modal */}
      <Modal isOpen={!!modalDetalle} onClose={() => setModalDetalle(null)} title="Detalle de Reserva">
        {modalDetalle && renderDetalle(modalDetalle)}
      </Modal>

      {/* Cancelar Modal */}
      <Modal isOpen={!!modalCancelar} onClose={() => setModalCancelar(null)} title="Cancelar Reserva">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            ¿Deseas cancelar esta reserva?
          </p>
          {modalCancelar && (
            <div style={{ background: theme.colors.bgSecondary, borderRadius: theme.radius.lg, padding: '12px', fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
              <div><strong>Residente:</strong> {modalCancelar.residenteNombre || modalCancelar.depto}</div>
              <div><strong>Fecha:</strong> {modalCancelar.fecha || parseHorario(modalCancelar.horario).fecha}</div>
              <div><strong>Horario:</strong> {modalCancelar.horaInicio || parseHorario(modalCancelar.horario).horaInicio} - {modalCancelar.horaFin || parseHorario(modalCancelar.horario).horaFin}</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" fullWidth onClick={() => setModalCancelar(null)}>Volver</Button>
            <Button variant="danger" fullWidth onClick={() => handleStatusChange(modalCancelar?.id, 'Cancelada')}>Cancelar Reserva</Button>
          </div>
        </div>
      </Modal>

      {/* Eliminar Modal */}
      <Modal isOpen={!!modalEliminar} onClose={() => setModalEliminar(null)} title="Eliminar Reserva">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
            ¿Deseas eliminar permanentemente esta reserva?
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center', margin: 0 }}>
            Esta acción no puede deshacerse.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="secondary" fullWidth onClick={() => setModalEliminar(null)}>Cancelar</Button>
            <Button variant="danger" fullWidth onClick={handleEliminar}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
