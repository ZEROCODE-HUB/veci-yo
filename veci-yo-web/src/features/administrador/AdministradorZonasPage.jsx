import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import zonaIcons from '../../assets/icons/zonas';

const sectionTitle = {
  textAlign: 'center',
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  marginBottom: '16px',
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  padding: '20px',
  boxShadow: theme.shadows.card,
};

export default function AdministradorZonasPage() {
  const { zonasComunesConfig, actualizarZonaComun, agregarZonaComun, eliminarZonaComun, addToast } = useApp();

  const [editZonaId, setEditZonaId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: '', nombre: '', descripcion: '', horariosDisponibles: '',
    duracionPermitida: '2', reglas: '', capacidadMaxima: '10', requiereAprobacion: false,
    emoji: '',
  });
  const [deleteZonaId, setDeleteZonaId] = useState(null);

  const zonasArray = Object.values(zonasComunesConfig);

  const openAddForm = () => {
    setForm({ id: '', nombre: '', descripcion: '', horariosDisponibles: '', duracionPermitida: '2', reglas: '', capacidadMaxima: '10', requiereAprobacion: false, emoji: '' });
    setEditZonaId(null);
    setShowForm(true);
  };

  const openEditForm = (zona) => {
    setForm({
      id: zona.id,
      nombre: zona.nombre,
      descripcion: zona.descripcion || '',
      horariosDisponibles: (zona.horariosDisponibles || []).join(', '),
      duracionPermitida: String(zona.duracionPermitida || '2'),
      reglas: zona.reglas || '',
      capacidadMaxima: String(zona.capacidadMaxima || '10'),
      requiereAprobacion: zona.requiereAprobacion || false,
      emoji: zona.emoji || '',
    });
    setEditZonaId(zona.id);
    setShowForm(true);
  };

  const handleGuardar = () => {
    if (!form.nombre) {
      addToast('El nombre del area es obligatorio', 'error');
      return;
    }
    const horariosArray = form.horariosDisponibles.split(',').map(h => h.trim()).filter(Boolean);
    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      horariosDisponibles: horariosArray.length > 0 ? horariosArray : ['08:00 - 10:00', '10:00 - 12:00', '12:00 - 14:00', '14:00 - 16:00'],
      duracionPermitida: parseInt(form.duracionPermitida) || 2,
      reglas: form.reglas,
      capacidadMaxima: parseInt(form.capacidadMaxima) || 10,
      requiereAprobacion: form.requiereAprobacion,
      emoji: form.emoji || '\uD83C\uDFE0',
    };
    if (editZonaId) {
      actualizarZonaComun(editZonaId, payload);
      addToast('Area actualizada exitosamente', 'success');
    } else {
      agregarZonaComun({
        ...payload,
        id: form.id || `zona-${Date.now()}`,
      });
      addToast('Area creada exitosamente', 'success');
    }
    setShowForm(false);
  };

  const handleEliminar = () => {
    if (deleteZonaId) {
      eliminarZonaComun(deleteZonaId);
      setDeleteZonaId(null);
      addToast('Area eliminada', 'success');
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Gestion de Zonas"
        action={
          <button
            onClick={openAddForm}
            style={{
              width: '36px', height: '36px', borderRadius: theme.radius.md,
              background: theme.colors.primary, color: '#fff', fontSize: '22px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', fontWeight: 'bold',
            }}
          >
            +
          </button>
        }
      />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {zonasArray.map(zona => (
          <div key={zona.id} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ fontSize: '32px', width: '48px', textAlign: 'center', flexShrink: 0 }}>
                {zonaIcons[zona.id] ? (
                  <img src={zonaIcons[zona.id]} alt={zona.nombre} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span>{zona.emoji}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base }}>{zona.nombre}</div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '4px' }}>{zona.descripcion}</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <span style={{ fontSize: theme.fonts.sizes.xs, background: theme.colors.bgMuted, borderRadius: theme.radius.full, padding: '4px 10px' }}>
                    Cap: {zona.capacidadMaxima}
                  </span>
                  <span style={{ fontSize: theme.fonts.sizes.xs, background: theme.colors.bgMuted, borderRadius: theme.radius.full, padding: '4px 10px' }}>
                    Duracion: {zona.duracionPermitida}h
                  </span>
                  <span style={{
                    fontSize: theme.fonts.sizes.xs, borderRadius: theme.radius.full, padding: '4px 10px',
                    background: zona.requiereAprobacion ? theme.colors.warningLight : theme.colors.successLight,
                    color: zona.requiereAprobacion ? theme.colors.warning : theme.colors.success,
                  }}>
                    {zona.requiereAprobacion ? 'Requiere aprobacion' : 'Aprobacion automatica'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDeleteZonaId(zona.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.danger, fontSize: '16px', flexShrink: 0, padding: '4px' }}
              >
                ✕
              </button>
            </div>
            <button
              onClick={() => openEditForm(zona)}
              style={{
                width: '100%', marginTop: '12px', padding: '8px', borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`, background: theme.colors.bgMuted,
                cursor: 'pointer', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary,
                fontFamily: theme.fonts.family,
              }}
            >
              Editar configuracion
            </button>
          </div>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editZonaId ? 'Editar Area' : 'Nueva Area Comun'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField label="Nombre del area" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Piscina" />
          <div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>ID unico (solo para nueva area)</div>
            <input
              type="text" value={form.id} onChange={e => setForm(p => ({ ...p, id: e.target.value }))}
              placeholder="Ej: nueva-piscina" disabled={!!editZonaId}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.border}`, background: editZonaId ? theme.colors.bgMuted : theme.colors.bgMuted,
                fontSize: theme.fonts.sizes.base, fontFamily: theme.fonts.family, color: theme.colors.text,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <InputField label="Descripcion" value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Descripcion del area" multiline rows={2} />
          <InputField label="Horarios disponibles (separados por coma)" value={form.horariosDisponibles} onChange={v => setForm(p => ({ ...p, horariosDisponibles: v }))} placeholder="08:00 - 10:00, 10:00 - 12:00" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <InputField label="Duracion permitida (horas)" type="number" min="1" value={form.duracionPermitida} onChange={v => setForm(p => ({ ...p, duracionPermitida: v }))} />
            <InputField label="Capacidad maxima" type="number" min="1" value={form.capacidadMaxima} onChange={v => setForm(p => ({ ...p, capacidadMaxima: v }))} />
          </div>
          <InputField label="Reglas / Restricciones" value={form.reglas} onChange={v => setForm(p => ({ ...p, reglas: v }))} placeholder="Reglas del area" multiline rows={2} />
          <InputField label="Emoji" value={form.emoji} onChange={v => setForm(p => ({ ...p, emoji: v }))} placeholder="🏊" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Requiere aprobacion manual</span>
            <Toggle value={form.requiereAprobacion} onChange={v => setForm(p => ({ ...p, requiereAprobacion: v }))} />
          </div>
          <Button variant="primary" fullWidth onClick={handleGuardar}>
            {editZonaId ? 'Guardar cambios' : 'Crear area'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteZonaId} onClose={() => setDeleteZonaId(null)} title="Eliminar Area">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>¿Seguro que desea eliminar esta area comun?</p>
          <Button variant="primary" fullWidth onClick={handleEliminar}>Eliminar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
