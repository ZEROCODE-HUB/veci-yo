import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import SelectField from '../../components/ui/SelectField';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import DotsMenuButton from './components/DotsMenuButton';
import {
  deptosPorTorre, penthousesOpciones, tiposNumeracion, cocherasVisitasOpciones,
  cocherasPrivadasOpciones, almacenesPrivadosOpciones, entradasOpciones, opcionesSiNo,
} from '../../data/mockData';

const labelStyle = {
  display: 'block',
  fontSize: theme.fonts.sizes.sm,
  color: theme.colors.textSecondary,
  marginBottom: '6px',
  fontWeight: theme.fonts.weights.medium,
};

const sectionCard = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  padding: '20px',
  boxShadow: theme.shadows.card,
};

const sectionTitle = {
  textAlign: 'center',
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  marginBottom: '16px',
};

const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };

const inputStyle = {
  width: '100%',
  background: theme.colors.bgMuted,
  borderRadius: theme.radius.lg,
  border: `1px solid ${theme.colors.border}`,
  outline: 'none',
  fontSize: theme.fonts.sizes.base,
  fontFamily: theme.fonts.family,
  color: theme.colors.text,
  padding: '10px 14px',
  boxSizing: 'border-box',
};

const CAMPOS_VACIOS = {
  depto: '', penthouse: '', tipo: '', cocherasVisitas: '',
  mascotas: '', ninos: '', cocherasPrivadas: '', almacenPrivados: '',
  entradasPeatonales: '', entradasVehiculares: '',
};

const CAMPOS_INFO = [
  ['depto', 'Depto. por torre', deptosPorTorre],
  ['penthouse', 'Penthouse', penthousesOpciones],
  ['tipo', 'Tipo', tiposNumeracion],
  ['cocherasVisitas', 'Cocheras de visitas', cocherasVisitasOpciones],
  ['mascotas', 'Acepta mascotas', opcionesSiNo],
  ['ninos', 'Acepta niños', opcionesSiNo],
  ['cocherasPrivadas', 'Cocheras privadas', cocherasPrivadasOpciones],
  ['almacenPrivados', 'Almacén privados', almacenesPrivadosOpciones],
  ['entradasPeatonales', 'Entradas peatonales', entradasOpciones],
  ['entradasVehiculares', 'Entradas vehiculares', entradasOpciones],
];

function CamposArquitectura({ form, setField }) {
  const filas = [];
  for (let i = 0; i < CAMPOS_INFO.length; i += 2) filas.push(CAMPOS_INFO.slice(i, i + 2));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {filas.map((fila, i) => (
        <div key={i} style={grid2}>
          {fila.map(([key, label, options]) => (
            <div key={key}>
              <span style={labelStyle}>{label}</span>
              <SelectField value={form[key]} options={options} onChange={setField(key)} placeholder="Seleccionar" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function CampoRow({ label, value }) {
  return (
    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
      {label}: <span style={{ color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{value || '\u2014'}</span>
    </div>
  );
}

function CheckRow({ label, value }) {
  const isSi = value === 'S\u00ed' || value === 'Si' || value === 's\u00ed';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
      <span style={{
        width: '16px', height: '16px', borderRadius: '50%',
        background: isSi ? theme.colors.success : theme.colors.danger,
        color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontWeight: theme.fonts.weights.bold,
      }}>
        {isSi ? '\u2713' : '\u2717'}
      </span>
      {label}
    </div>
  );
}

function TorresTab() {
  const { torres, agregarTorre, actualizarTorre, eliminarTorre } = useApp();

  const [showNueva, setShowNueva] = useState(false);
  const [editTorre, setEditTorre] = useState(null);
  const [deleteTorre, setDeleteTorre] = useState(null);
  const [menuTorre, setMenuTorre] = useState(null);
  const [form, setForm] = useState(CAMPOS_VACIOS);

  const setField = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const abrirNueva = () => { setForm(CAMPOS_VACIOS); setShowNueva(true); };
  const cerrarNueva = () => setShowNueva(false);

  const abrirEditar = (torre) => {
    setMenuTorre(null);
    setForm({ ...CAMPOS_VACIOS, ...torre });
    setEditTorre(torre);
  };
  const cerrarEditar = () => setEditTorre(null);

  const confirmarNueva = () => { agregarTorre(form); cerrarNueva(); };
  const confirmarEditar = () => { actualizarTorre({ ...editTorre, ...form }); cerrarEditar(); };
  const confirmarEliminar = () => { eliminarTorre(deleteTorre); setDeleteTorre(null); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={abrirNueva}>+ Nueva torre</Button>
      </div>

      {torres.map(torre => (
        <div key={torre.id} style={{
          background: theme.colors.bgCard, borderRadius: theme.radius.xl,
          border: `1.5px solid ${theme.colors.success}`, boxShadow: theme.shadows.card, overflow: 'hidden',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto' }}>
            <div style={{ padding: '12px 14px', borderRight: `1px solid ${theme.colors.borderLight}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <CampoRow label="Depto" value={torre.depto} />
              <CampoRow label="Penthouse" value={torre.penthouse} />
              <CampoRow label="Cocheras V." value={torre.cocherasVisitas} />
              <CampoRow label="Coch. priv." value={torre.cocherasPrivadas} />
              <CampoRow label="Almac\u00e9n" value={torre.almacenPrivados} />
              <CampoRow label="Ent. veh." value={torre.entradasVehiculares} />
            </div>
            <div style={{ padding: '12px 14px', borderRight: `1px solid ${theme.colors.borderLight}`, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
              <CampoRow label="Ent. peat." value={torre.entradasPeatonales} />
              <CheckRow label="Ni\u00f1os" value={torre.ninos} />
              <CheckRow label="Mascotas" value={torre.mascotas} />
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minWidth: '72px' }}>
              <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', whiteSpace: 'nowrap' }}>
                Torre{'\n'}N\u00b0{torre.numero}
              </span>
              <DotsMenuButton onClick={() => setMenuTorre(torre)} />
            </div>
          </div>
        </div>
      ))}

      <BottomSheet isOpen={!!menuTorre} onClose={() => setMenuTorre(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuTorre)} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteTorre(menuTorre); setMenuTorre(null); }} />
      </BottomSheet>

      <Modal isOpen={showNueva} onClose={cerrarNueva} title="Nueva Arquitectura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
            N\u00famero de Torre N\u00b0: {torres.length ? Math.max(...torres.map(t => t.numero)) + 1 : 1}
          </p>
          <CamposArquitectura form={form} setField={setField} />
          <Button variant="primary" fullWidth onClick={confirmarNueva}>Aceptar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editTorre} onClose={cerrarEditar} title="Editar Arquitectura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
            Torre N\u00b0: {editTorre?.numero}
          </p>
          <CamposArquitectura form={form} setField={setField} />
          <Button variant="primary" fullWidth onClick={confirmarEditar}>Aceptar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTorre} onClose={() => setDeleteTorre(null)} title="Eliminar arquitectura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, textAlign: 'center', color: theme.colors.text }}>
            \u00bfSeguro que deseas eliminar esta arquitectura?
          </p>
          {deleteTorre && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md }}>
                Torre N\u00b0 {deleteTorre.numero}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                Depto. por torre: {deleteTorre.depto} &middot; Penthouse: {deleteTorre.penthouse}
              </div>
            </div>
          )}
          <Button variant="danger" fullWidth onClick={confirmarEliminar}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}

function TipologiasTab() {
  const { tipologias, agregarTipologia, actualizarTipologia, eliminarTipologia } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [menuItem, setMenuItem] = useState(null);
  const [form, setForm] = useState({ nombre: '', capacidadMaxima: '' });

  const resetForm = () => setForm({ nombre: '', capacidadMaxima: '' });

  const abrirNueva = () => { resetForm(); setShowForm(true); };
  const abrirEditar = (item) => {
    setMenuItem(null);
    setForm({ nombre: item.nombre, capacidadMaxima: String(item.capacidadMaxima) });
    setEditItem(item);
  };

  const guardarNueva = () => {
    if (!form.nombre || !form.capacidadMaxima) return;
    agregarTipologia({ nombre: form.nombre, capacidadMaxima: parseInt(form.capacidadMaxima) || 0 });
    setShowForm(false);
  };

  const guardarEditar = () => {
    if (!form.nombre || !form.capacidadMaxima) return;
    actualizarTipologia({ ...editItem, nombre: form.nombre, capacidadMaxima: parseInt(form.capacidadMaxima) || 0 });
    setEditItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={abrirNueva}>+ Nueva tipolog\u00eda</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tipologias.map(item => (
          <div key={item.id} style={{
            ...sectionCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px',
          }}>
            <div>
              <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                {item.nombre}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
                Capacidad m\u00e1xima: <strong>{item.capacidadMaxima}</strong> hu\u00e9spedes
              </div>
            </div>
            <DotsMenuButton onClick={() => setMenuItem(item)} />
          </div>
        ))}
      </div>

      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuItem)} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
      </BottomSheet>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva tipolog\u00eda">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre de la tipolog\u00eda" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Est\u00e1ndar, Premium, Suite" />
          <InputField label="Capacidad m\u00e1xima de ocupaci\u00f3n" value={form.capacidadMaxima} onChange={v => setForm(p => ({ ...p, capacidadMaxima: v }))} placeholder="Ej: 4" type="number" />
          <Button variant="primary" fullWidth onClick={guardarNueva}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar tipolog\u00eda">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre de la tipolog\u00eda" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Est\u00e1ndar, Premium, Suite" />
          <InputField label="Capacidad m\u00e1xima de ocupaci\u00f3n" value={form.capacidadMaxima} onChange={v => setForm(p => ({ ...p, capacidadMaxima: v }))} placeholder="Ej: 4" type="number" />
          <Button variant="primary" fullWidth onClick={guardarEditar}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar tipolog\u00eda">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            \u00bfEliminar la tipolog\u00eda <strong>"{deleteItem?.nombre}"</strong>?
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
            Esta acci\u00f3n no puede deshacerse.
          </p>
          <Button variant="danger" fullWidth onClick={() => { eliminarTipologia(deleteItem.id); setDeleteItem(null); }}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}

function PorteriasTab() {
  const { porterias, agregarPorteria, actualizarPorteria, eliminarPorteria } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [menuItem, setMenuItem] = useState(null);
  const [form, setForm] = useState({ nombre: '', ubicacion: '', telefono: '' });

  const resetForm = () => setForm({ nombre: '', ubicacion: '', telefono: '' });

  const abrirNueva = () => { resetForm(); setShowForm(true); };
  const abrirEditar = (item) => {
    setMenuItem(null);
    setForm({ nombre: item.nombre, ubicacion: item.ubicacion, telefono: item.telefono || '' });
    setEditItem(item);
  };

  const guardar = (cb) => {
    if (!form.nombre) return;
    cb({ ...form });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={abrirNueva}>+ Nueva porter\u00eda</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {porterias.map(item => (
          <div key={item.id} style={{
            ...sectionCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px',
          }}>
            <div>
              <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                {item.nombre}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
                {item.ubicacion}
              </div>
              {item.telefono && (
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, marginTop: '2px' }}>
                  {item.telefono}
                </div>
              )}
            </div>
            <DotsMenuButton onClick={() => setMenuItem(item)} />
          </div>
        ))}
      </div>

      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuItem)} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
      </BottomSheet>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva porter\u00eda">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Principal" />
          <InputField label="Ubicaci\u00f3n" value={form.ubicacion} onChange={v => setForm(p => ({ ...p, ubicacion: v }))} placeholder="Ej: Entrada principal" />
          <InputField label="Tel\u00e9fono (opcional)" value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="+593 999999999" />
          <Button variant="primary" fullWidth onClick={() => { guardar(agregarPorteria); setShowForm(false); }}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar porter\u00eda">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Principal" />
          <InputField label="Ubicaci\u00f3n" value={form.ubicacion} onChange={v => setForm(p => ({ ...p, ubicacion: v }))} placeholder="Ej: Entrada principal" />
          <InputField label="Tel\u00e9fono (opcional)" value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="+593 999999999" />
          <Button variant="primary" fullWidth onClick={() => { guardar(d => actualizarPorteria({ ...editItem, ...d })); setEditItem(null); }}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar porter\u00eda">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            \u00bfEliminar la porter\u00eda <strong>"{deleteItem?.nombre}"</strong>?
          </p>
          <Button variant="danger" fullWidth onClick={() => { eliminarPorteria(deleteItem.id); setDeleteItem(null); }}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}

function EstacionamientosTab() {
  const { estacionamientosVisitantes, actualizarEstacionamientosVisitantes } = useApp();

  const [total, setTotal] = useState(estacionamientosVisitantes?.total ?? 20);
  const [reglas, setReglas] = useState(estacionamientosVisitantes?.reglas ?? '');

  const guardar = () => {
    actualizarEstacionamientosVisitantes({ total: parseInt(total) || 0, reglas });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={sectionCard}>
        <h3 style={sectionTitle}>Estacionamientos para visitantes</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <span style={labelStyle}>Cantidad total de estacionamientos</span>
            <input
              type="number" min="0"
              value={total}
              onChange={e => setTotal(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <span style={labelStyle}>Reglas y restricciones</span>
            <textarea
              value={reglas}
              onChange={e => setReglas(e.target.value)}
              placeholder="Ej: M\u00e1ximo 2 horas. Registro obligatorio en porter\u00eda."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {estacionamientosVisitantes?.ocupados !== undefined && (
            <div style={{
              background: theme.colors.bgMuted, borderRadius: theme.radius.lg,
              padding: '12px 14px', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary,
            }}>
              Actualmente <strong>{estacionamientosVisitantes.ocupados}</strong> de <strong>{estacionamientosVisitantes.total}</strong> estacionamientos est\u00e1n ocupados.
              {estacionamientosVisitantes.total - estacionamientosVisitantes.ocupados <= 2 && (
                <span style={{ color: theme.colors.danger, display: 'block', marginTop: '4px' }}>
                  \u26a0 Quedan pocos estacionamientos disponibles. Se generar\u00e1n alertas autom\u00e1ticas cuando no haya cupo.
                </span>
              )}
            </div>
          )}

          <Button variant="primary" fullWidth onClick={guardar}>Guardar configuraci\u00f3n</Button>
        </div>
      </div>
    </div>
  );
}

function BloquesTab() {
  const { bloques, agregarBloque, actualizarBloque, eliminarBloque } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '' });
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const abrirNueva = () => { setForm({ nombre: '', descripcion: '' }); setShowForm(true); };
  const abrirEditar = (item) => {
    setMenuItem(null);
    setForm({ nombre: item.nombre, descripcion: item.descripcion || '' });
    setEditItem(item);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={abrirNueva}>+ Nuevo bloque</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {bloques.map(item => (
          <div key={item.id} style={{ ...sectionCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
            <div>
              <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                Bloque {item.nombre}
              </div>
              {item.descripcion && (
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
                  {item.descripcion}
                </div>
              )}
            </div>
            <DotsMenuButton onClick={() => setMenuItem(item)} />
          </div>
        ))}
      </div>

      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuItem)} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
      </BottomSheet>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo bloque">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre del bloque" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: A, B, C" />
          <InputField label="Descripci\u00f3n (opcional)" value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Ej: Bloque A - Torres 1 a 3" />
          <Button variant="primary" fullWidth onClick={() => { agregarBloque(form); setShowForm(false); }}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar bloque">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre del bloque" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: A, B, C" />
          <InputField label="Descripci\u00f3n (opcional)" value={form.descripcion} onChange={v => setForm(p => ({ ...p, descripcion: v }))} placeholder="Ej: Bloque A - Torres 1 a 3" />
          <Button variant="primary" fullWidth onClick={() => { actualizarBloque({ ...editItem, ...form }); setEditItem(null); }}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar bloque">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            \u00bfEliminar el bloque <strong>"{deleteItem?.nombre}"</strong>?
          </p>
          <Button variant="danger" fullWidth onClick={() => { eliminarBloque(deleteItem.id); setDeleteItem(null); }}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}

function UnidadesTab() {
  const { torres, tipologias, unidades, asignarPropietarioUnidad, propietariosInvited, addToast, configHuespedesTemporales } = useApp();

  const [filterTorre, setFilterTorre] = useState('Todas');
  const [showAsignar, setShowAsignar] = useState(null);
  const [asignarForm, setAsignarForm] = useState({ nombre: '', email: '' });
  const [showConfigModal, setShowConfigModal] = useState(null);
  const [unidadConfigSeleccionada, setUnidadConfigSeleccionada] = useState(null);

  const torresOptions = ['Todas', ...torres.map(t => String(t.numero))];

  const filtered = filterTorre === 'Todas'
    ? unidades
    : unidades.filter(u => u.torreNumero === parseInt(filterTorre));

  const getTipologiaNombre = (id) => tipologias.find(t => t.id === id)?.nombre || '\u2014';
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'disponible': return theme.colors.statusGrayText;
      case 'asignado': return theme.colors.statusBlue;
      case 'configurado': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };
  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'disponible': return 'Disponible';
      case 'asignado': return 'Asignado';
      case 'configurado': return 'Configurado';
      default: return estado;
    }
  };

  const confirmarAsignacion = () => {
    if (!asignarForm.nombre || !asignarForm.email) return;
    asignarPropietarioUnidad(showAsignar.id, asignarForm);
    setShowAsignar(null);
    setAsignarForm({ nombre: '', email: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <span style={labelStyle}>Filtrar por torre</span>
        <SelectField
          value={filterTorre}
          options={torresOptions}
          onChange={setFilterTorre}
          placeholder="Seleccionar torre"
        />
      </div>

      {filtered.map(unidad => {
        const invitacion = propietariosInvited.find(i => i.unidadId === unidad.id);
        return (
          <div key={unidad.id} style={sectionCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md, color: theme.colors.text }}>
                    {unidad.codigo}
                  </span>
                  <span style={{
                    fontSize: theme.fonts.sizes.xs, padding: '2px 8px', borderRadius: theme.radius.full,
                    background: getEstadoColor(unidad.estado) + '20',
                    color: getEstadoColor(unidad.estado),
                    fontWeight: theme.fonts.weights.medium,
                  }}>
                    {getEstadoLabel(unidad.estado)}
                  </span>
                </div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '4px' }}>
                  Torre N\u00b0{unidad.torreNumero} &middot; Piso {unidad.piso} &middot; {getTipologiaNombre(unidad.tipologiaId)}
                  {unidad.bloqueId && <> &middot; Bloque {unidad.bloqueId}</>}
                </div>
              </div>

              {!unidad.propietarioAsignado ? (
                <Button variant="primary" onClick={() => { setShowAsignar(unidad); setAsignarForm({ nombre: '', email: '' }); }}>
                  Asignar
                </Button>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.medium, color: theme.colors.text }}>
                    {unidad.propietarioAsignado}
                  </div>
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>
                    {unidad.propietarioEmail}
                  </div>
                  {invitacion?.estado === 'pendiente' && (
                    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.warning, marginTop: '2px' }}>
                      Invitaci\u00f3n pendiente
                    </div>
                  )}
                  {unidad.estado === 'asignado' && invitacion?.estado === 'aceptada' && (
                    <div style={{
                      fontSize: theme.fonts.sizes.xs, color: theme.colors.statusOrange, marginTop: '2px',
                    }}>
                      Pendiente de configuraci\u00f3n por el anfitri\u00f3n
                    </div>
                  )}
                  {unidad.estado === 'configurado' && (
                    <div style={{
                      fontSize: theme.fonts.sizes.xs, color: theme.colors.success, marginTop: '2px', cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                      onClick={() => { setUnidadConfigSeleccionada(unidad); setShowConfigModal(true); }}
                    >
                      Ver configuraci\u00f3n
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>
          No hay unidades para esta torre.
        </div>
      )}

      <Modal isOpen={!!showAsignar} onClose={() => setShowAsignar(null)} title="Asignar propietario">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center' }}>
            Asignar propietario para la unidad <strong>{showAsignar?.codigo}</strong>
          </p>
          <InputField
            label="Nombre del propietario"
            value={asignarForm.nombre}
            onChange={v => setAsignarForm(p => ({ ...p, nombre: v }))}
            placeholder="Ej: Carlos Mendoza"
          />
          <InputField
            label="Correo electr\u00f3nico"
            value={asignarForm.email}
            onChange={v => setAsignarForm(p => ({ ...p, email: v }))}
            placeholder="correo@ejemplo.com"
            type="email"
          />
          <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5 }}>
            Se enviar\u00e1 una invitaci\u00f3n al correo indicado. El propietario deber\u00e1 aceptarla para administrar la unidad.
          </div>
          <Button variant="primary" fullWidth onClick={confirmarAsignacion}>Enviar invitaci\u00f3n</Button>
        </div>
      </Modal>

      <Modal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} title={`Configuraci\u00f3n de ${unidadConfigSeleccionada?.codigo || ''}`}>
        {unidadConfigSeleccionada && (() => {
          const configData = configHuespedesTemporales[unidadConfigSeleccionada.id];
          if (!configData) {
            return <p style={{ textAlign: 'center', color: theme.colors.textSecondary }}>No hay configuraci\u00f3n guardada para esta unidad.</p>;
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div>
                <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Par\u00e1metros</h4>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.8 }}>
                  <div>M\u00ednimo d\u00edas: <strong>{configData.minDias}</strong></div>
                  <div>Capacidad m\u00e1xima: <strong>{configData.maxHuespedes}</strong></div>
                  <div>Pol\u00edtica mascotas: <strong>{configData.politicaMascotas === 'permitidas' ? 'Permitidas' : 'No permitidas'}</strong></div>
                  <div>Apto ni\u00f1os: <strong>{configData.aptoNinos ? 'S\u00ed' : 'No'}</strong></div>
                  <div>Descripci\u00f3n: <strong>{configData.descripcion || '\u2014'}</strong></div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Estacionamientos</h4>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                  {configData.estacionamientos ?? 0} estacionamiento(s) disponible(s)
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Integraciones</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {['airbnb', 'booking', 'lodgify'].map(key => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary }}>
                      <span style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: configData.integraciones?.[key] ? theme.colors.success : theme.colors.danger,
                        color: '#fff', fontSize: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {configData.integraciones?.[key] ? '\u2713' : '\u2717'}
                      </span>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Legal</h4>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.8 }}>
                  <div>RNT: <strong>{configData.legal?.rnt || '\u2014'}</strong></div>
                  <div>TRA: <strong>{configData.legal?.tra ? 'Activado' : 'Desactivado'}</strong></div>
                  <div>SIRE: <strong>{configData.legal?.sire ? 'Activado' : 'Desactivado'}</strong></div>
                </div>
              </div>
              <div>
                <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Personal registrado</h4>
                {configData.staff?.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.8 }}>
                    {configData.staff.map(s => (
                      <li key={s.id}>{s.nombre} - {s.rol}</li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>Sin personal registrado</div>
                )}
              </div>
              <Button variant="primary" fullWidth onClick={() => setShowConfigModal(false)}>Cerrar</Button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

const TABS = [
  { key: 'torres', label: 'Torres' },
  { key: 'bloques', label: 'Bloques' },
  { key: 'tipologias', label: 'Tipolog\u00edas' },
  { key: 'unidades', label: 'Unidades' },
  { key: 'porterias', label: 'Porter\u00edas' },
  { key: 'estacionamientos', label: 'Estacionamientos' },
];

export default function AdministradorArquitecturaPage() {
  const [activeTab, setActiveTab] = useState('torres');

  const renderTab = () => {
    switch (activeTab) {
      case 'torres': return <TorresTab />;
      case 'bloques': return <BloquesTab />;
      case 'tipologias': return <TipologiasTab />;
      case 'unidades': return <UnidadesTab />;
      case 'porterias': return <PorteriasTab />;
      case 'estacionamientos': return <EstacionamientosTab />;
      default: return null;
    }
  };

  return (
    <AppShell>
      <PageHeader title="Arquitectura" />
      <div style={{ padding: '0 16px', marginTop: '12px' }}>
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} variant="chip" />
      </div>
      <div style={{ padding: '16px', paddingTop: '12px' }}>
        {renderTab()}
      </div>
    </AppShell>
  );
}