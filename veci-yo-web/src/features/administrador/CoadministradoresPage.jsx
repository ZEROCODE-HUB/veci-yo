import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import Toggle from '../../components/ui/Toggle';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import DotsMenuButton from './components/DotsMenuButton';

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
  padding: '16px',
};

const PERMISOS_CONFIG = [
  { key: 'actualizarResidentes', label: 'Gestionar residentes', desc: 'Alta, edición y baja de residentes, inquilinos y propietarios del padrón' },
  { key: 'contestarChat', label: 'Responder chats', desc: 'Responder y gestionar los chats de residentes y de portería' },
  { key: 'modificarSeguridad', label: 'Gestionar seguridad', desc: 'Crear y editar guardias, porterías, turnos y personal de vigilancia' },
  { key: 'modificarCuadroHonor', label: 'Administrar cuadro de honor', desc: 'Editar ranking, medallas, logros y reconocimientos por departamento' },
  { key: 'visualizarVisitas', label: 'Consultar visitas', desc: 'Acceso de solo lectura a todas las visitas (familiares, profesionales, huéspedes temporales)' },
  { key: 'visualizarCorrespondencia', label: 'Consultar correspondencia', desc: 'Ver toda la paquetería y encomiendas registradas en el edificio' },
  { key: 'visualizarZonasComunes', label: 'Consultar zonas comunes', desc: 'Ver reservas, disponibilidad y ocupación de amenidades (piscina, gimnasio, BBQ, etc.)' },
  { key: 'visualizarEncuestas', label: 'Consultar encuestas', desc: 'Ver encuestas activas, historial y resultados de participación' },
];

const PERMISOS_DEF = Object.fromEntries(PERMISOS_CONFIG.map(p => [p.key, true]));

const FORM_VACIO = { nombre: '', apellido: '', correo: '', celular: '', permisos: { ...PERMISOS_DEF } };

export default function CoadministradoresPage() {
  const { coadministradores, agregarCoadministrador, actualizarCoadministrador, eliminarCoadministrador, addToast } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [modoForm, setModoForm] = useState('agregar');
  const [form, setForm] = useState(FORM_VACIO);
  const [editItem, setEditItem] = useState(null);
  const [menuCoadmin, setMenuCoadmin] = useState(null);
  const [deleteCoadmin, setDeleteCoadmin] = useState(null);

  const abrirAgregar = () => {
    setModoForm('agregar');
    setForm(FORM_VACIO);
    setEditItem(null);
    setShowForm(true);
  };

  const abrirEditar = (item) => {
    setMenuCoadmin(null);
    setModoForm('editar');
    setForm({
      nombre: item.nombre || '',
      apellido: item.apellido || '',
      correo: item.correo || '',
      celular: item.celular || '',
      permisos: { ...PERMISOS_DEF, ...(item.permisos || {}) },
    });
    setEditItem(item);
    setShowForm(true);
  };

  const cerrarForm = () => { setShowForm(false); setEditItem(null); };

  const guardar = () => {
    if (!form.nombre.trim() || !form.correo.trim()) {
      addToast('Nombre y correo son obligatorios', 'error');
      return;
    }
    if (modoForm === 'agregar') {
      agregarCoadministrador({ ...form });
      addToast('Coadministrador agregado correctamente', 'success');
    } else {
      actualizarCoadministrador({ ...editItem, ...form });
      addToast('Coadministrador actualizado', 'success');
    }
    cerrarForm();
  };

  const handleEliminar = () => {
    eliminarCoadministrador(deleteCoadmin.id);
    setDeleteCoadmin(null);
    addToast('Coadministrador eliminado', 'success');
  };

  return (
    <AppShell>
      <PageHeader title="Coadministradores" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Header info */}
        <div style={{ ...cardStyle, padding: '14px 16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0, lineHeight: 1.5 }}>
            Define qué puede hacer cada coadministrador. Activa solo los permisos necesarios para su rol; los permisos de solo lectura no permiten editar.
          </p>
        </div>

        {/* Add button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={abrirAgregar}>+ Agregar</Button>
        </div>

        {/* List */}
        {coadministradores.length === 0 ? (
          <div style={{ ...cardStyle, padding: '32px 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>👤</span>
            <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0 }}>
              No hay coadministradores registrados.
            </p>
          </div>
        ) : (
          coadministradores.map(item => (
            <div key={item.id} style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {/* Avatar */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: theme.colors.primaryLight || '#EFF6FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '18px', fontWeight: theme.fonts.weights.bold,
                color: theme.colors.primary,
              }}>
                {item.nombre?.[0]}{item.apellido?.[0]}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                  {item.nombre} {item.apellido}
                </div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px', lineHeight: 1.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ opacity: 0.6 }}>📧</span>
                    <span>{item.correo}</span>
                  </div>
                  {item.celular && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ opacity: 0.6 }}>📱</span>
                      <span>{item.celular}</span>
                    </div>
                  )}
                </div>
                {/* Permisos resumen */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                  {(item.permisos ? PERMISOS_CONFIG.filter(p => item.permisos[p.key]) : PERMISOS_CONFIG).slice(0, 4).map(p => (
                    <span key={p.key} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: theme.radius.full, background: theme.colors.bgMuted, color: theme.colors.textSecondary, border: `1px solid ${theme.colors.border}` }}>{p.label}</span>
                  ))}
                  {item.permisos && Object.values(item.permisos).filter(Boolean).length > 4 && (
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: theme.radius.full, background: theme.colors.primaryLight, color: theme.colors.primary }}>+{Object.values(item.permisos).filter(Boolean).length - 4} más</span>
                  )}
                  {!item.permisos && <span style={{ fontSize: '10px', color: theme.colors.textMuted }}>Todos los permisos (heredado)</span>}
                </div>
              </div>
              {/* Menu */}
              <div onClick={() => setMenuCoadmin(item)}>
                <DotsMenuButton />
              </div>
            </div>
          ))
        )}

        <div style={{ height: '8px' }} />
      </div>

      {/* Bottom Sheet menu */}
      <BottomSheet isOpen={!!menuCoadmin} onClose={() => setMenuCoadmin(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuCoadmin)} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteCoadmin(menuCoadmin); setMenuCoadmin(null); }} />
      </BottomSheet>

      {/* Add / Edit Form Modal */}
      <Modal isOpen={showForm} onClose={cerrarForm} title={modoForm === 'agregar' ? 'Agregar coadministrador' : 'Editar coadministrador'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
          <InputField label="Nombre *" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Nombre" />
          <InputField label="Apellido" value={form.apellido} onChange={v => setForm(p => ({ ...p, apellido: v }))} placeholder="Apellido" />
          <InputField label="Correo electrónico *" value={form.correo} onChange={v => setForm(p => ({ ...p, correo: v }))} placeholder="correo@ejemplo.com" type="email" />
          <InputField label="Celular" value={form.celular} onChange={v => setForm(p => ({ ...p, celular: v }))} placeholder="+593 999999999" />

          <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', border: `1px solid ${theme.colors.border}` }}>
            <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>Permisos</div>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.4, marginTop: '-4px' }}>
              Activa o desactiva cada acceso. Los de visualización son solo lectura; los de gestión permiten crear y editar.
            </div>
            {PERMISOS_CONFIG.map(p => (
              <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', padding: '8px 0', borderTop: `1px solid ${theme.colors.borderLight}`, cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>{p.label}</div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.4, marginTop: '2px' }}>{p.desc}</div>
                </div>
                <Toggle value={!!form.permisos?.[p.key]} onChange={v => setForm(prev => ({ ...prev, permisos: { ...prev.permisos, [p.key]: v } }))} />
              </label>
            ))}
          </div>

          <Button variant="primary" fullWidth onClick={guardar}>
            {modoForm === 'agregar' ? 'Agregar coadministrador' : 'Guardar cambios'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteCoadmin} onClose={() => setDeleteCoadmin(null)} title="Eliminar coadministrador">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            ¿Eliminar a <strong>{deleteCoadmin?.nombre} {deleteCoadmin?.apellido}</strong>?
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '-8px' }}>
            Perderá todos los privilegios de administración.
          </p>
          <Button variant="danger" fullWidth onClick={handleEliminar}>Eliminar</Button>
          <Button variant="ghost" fullWidth onClick={() => setDeleteCoadmin(null)}>Cancelar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
