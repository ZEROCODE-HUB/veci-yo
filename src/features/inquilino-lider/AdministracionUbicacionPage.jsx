import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import SelectField from '../../components/ui/SelectField';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import ImageUploadCard from '../../components/ui/ImageUploadCard';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { distritosUbicacion, urbanizacionesUbicacion } from '../../data/mockData';
import bannerUbicacion from '../../assets/branding/banner-ubicacion.png';

const CAMPOS_VACIOS = { distrito: '', urbanizacion: '', condominio: '', correoAdm: '', imagen: null };

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

// Pantalla 4 del Inquilino Líder: lista de ubicaciones que administra,
// accesible tocando el nombre de ubicación en el header. El "+" abre el
// formulario para agregar una nueva.
export default function AdministracionUbicacionPage() {
  const { ubicaciones, agregarUbicacion, actualizarUbicacion, toggleFavoritoUbicacion, eliminarUbicacion, rolActivo } = useApp();

  const [showAgregar, setShowAgregar] = useState(false);
  const [deleteUbicacion, setDeleteUbicacion] = useState(null);
  const [editUbicacion, setEditUbicacion] = useState(null);
  const [form, setForm] = useState(CAMPOS_VACIOS);

  const setField = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const abrirAgregar = () => { setForm(CAMPOS_VACIOS); setShowAgregar(true); };
  const cerrarAgregar = () => setShowAgregar(false);

  const abrirEditar = (u) => {
    setForm({ distrito: u.distrito || '', urbanizacion: u.urbanizacion || '', condominio: u.alias || '', correoAdm: u.correoAdm || '', imagen: u.imagen || null });
    setEditUbicacion(u);
  };

  const confirmarAgregar = () => {
    const imagenUrl = form.imagen ? URL.createObjectURL(form.imagen) : null;
    agregarUbicacion({
      direccion: [form.distrito, form.urbanizacion].filter(Boolean).join(', '),
      alias: form.condominio,
      distrito: form.distrito,
      urbanizacion: form.urbanizacion,
      correoAdm: form.correoAdm,
      imagen: imagenUrl,
    });
    cerrarAgregar();
  };

  const confirmarEditar = () => {
    if (!editUbicacion) return;
    const imagenUrl = form.imagen instanceof File ? URL.createObjectURL(form.imagen) : form.imagen;
    actualizarUbicacion(editUbicacion.id, {
      direccion: [form.distrito, form.urbanizacion].filter(Boolean).join(', '),
      alias: form.condominio,
      distrito: form.distrito,
      urbanizacion: form.urbanizacion,
      correoAdm: form.correoAdm,
      imagen: imagenUrl,
    });
    setEditUbicacion(null);
  };

  const confirmarEliminar = () => { eliminarUbicacion(deleteUbicacion.id); setDeleteUbicacion(null); };

  return (
    <AppShell>
      <PageHeader
        title="Administración de ubicación"
        action={
          <button
            onClick={abrirAgregar}
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

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Ilustración */}
        <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
            En esta ventana verás las ubicaciones que cargues para utilizarlas de forma más fácil y ágil.
          </p>
          <img src={bannerUbicacion} alt="Administración de ubicación" style={{ width: '100%', maxWidth: '320px', objectFit: 'contain' }} />
        </div>

        {/* Lista de ubicaciones */}
        {ubicaciones.map(u => (
          <div key={u.id} style={{ ...cardStyle, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>🏠</span>
              <span style={{ flex: 1, fontSize: theme.fonts.sizes.base, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>
                {rolActivo === 'guardia' ? `Guardia de seguridad: ${u.alias || u.direccion}` : u.direccion}
              </span>
              <button
                type="button"
                onClick={() => toggleFavoritoUbicacion(u.id)}
                aria-label="Marcar como favorita"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: u.favorito ? theme.colors.primary : theme.colors.textMuted, padding: '2px', flexShrink: 0 }}
              >
                {u.favorito ? '★' : '☆'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px' }}>
              <span style={{ fontSize: '18px', flexShrink: 0 }}>🏷️</span>
              <span style={{ flex: 1, fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                {rolActivo === 'guardia' ? `Guardia de seguridad: ${u.alias || u.direccion}` : `Alias: ${u.alias}`}
              </span>
              <button
                type="button"
                onClick={() => abrirEditar(u)}
                aria-label="Editar ubicación"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: theme.colors.textMuted, padding: '2px', flexShrink: 0 }}
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => setDeleteUbicacion(u)}
                aria-label="Eliminar ubicación"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: theme.colors.textMuted, padding: '2px', flexShrink: 0 }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Agregar Ubicación */}
      <Modal isOpen={showAgregar} onClose={cerrarAgregar} title="Agregar Ubicación">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SelectField value={form.distrito} options={distritosUbicacion} onChange={setField('distrito')} placeholder="Seleccione distrito" />
          <SelectField value={form.urbanizacion} options={urbanizacionesUbicacion} onChange={setField('urbanizacion')} placeholder="Seleccione urbanización" />
          <InputField value={form.condominio} onChange={setField('condominio')} placeholder="Nombre del condominio" />
          <InputField value={form.correoAdm} onChange={setField('correoAdm')} placeholder="Correo ADM condominio" />
          <ImageUploadCard label="Imagen representativa" value={form.imagen} onChange={setField('imagen')} height="120px" placeholder="Subir imagen del edificio" />
          <Button variant="primary" fullWidth onClick={confirmarAgregar}>Agregar</Button>
        </div>
      </Modal>

      {/* Eliminar ubicación */}
      <Modal isOpen={!!deleteUbicacion} onClose={() => setDeleteUbicacion(null)} title="Eliminar ubicación">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, textAlign: 'center', color: theme.colors.text }}>
            ¿Seguro que deseas eliminar esta ubicación?
          </p>
          {deleteUbicacion && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md }}>
                {rolActivo === 'guardia' ? `Guardia de seguridad: ${deleteUbicacion.alias || deleteUbicacion.direccion}` : deleteUbicacion.direccion}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                {rolActivo === 'guardia' ? `Guardia de seguridad: ${deleteUbicacion.alias || deleteUbicacion.direccion}` : `Alias: ${deleteUbicacion.alias}`}
              </div>
            </div>
          )}
          <Button variant="danger" fullWidth onClick={confirmarEliminar}>Eliminar</Button>
        </div>
      </Modal>

      {/* Editar ubicación */}
      <Modal isOpen={!!editUbicacion} onClose={() => setEditUbicacion(null)} title="Editar Ubicación">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <SelectField value={form.distrito} options={distritosUbicacion} onChange={setField('distrito')} placeholder="Seleccione distrito" />
          <SelectField value={form.urbanizacion} options={urbanizacionesUbicacion} onChange={setField('urbanizacion')} placeholder="Seleccione urbanización" />
          <InputField value={form.condominio} onChange={setField('condominio')} placeholder="Nombre del condominio" />
          <InputField value={form.correoAdm} onChange={setField('correoAdm')} placeholder="Correo ADM condominio" />
          <ImageUploadCard label="Imagen representativa" value={form.imagen} onChange={setField('imagen')} height="120px" placeholder="Subir imagen del edificio" />
          <Button variant="primary" fullWidth onClick={confirmarEditar}>Guardar cambios</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
