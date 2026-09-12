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
  nombre: '',
  depto: '', penthouse: '', tipo: '', cocherasVisitas: '',
  cocherasPrivadas: '', almacenPrivados: '',
  entradasPeatonales: '', entradasVehiculares: '',
  pisos: '', sotanos: '',
  ubicacionParkingVisitas: '',
  nomenclaturaDesde: '',
  nomenclaturaHasta: '',
};

const CAMPOS_INFO = [
  ['depto', 'Depto. por torre', deptosPorTorre],
  ['penthouse', 'Penthouse', penthousesOpciones],
  ['tipo', 'Tipo', tiposNumeracion],
  ['pisos', 'Número de pisos', deptosPorTorre],
  ['sotanos', 'Número de sótanos', ['0', '1', '2', '3', '4']],
  ['cocherasVisitas', 'Cocheras de visitas', cocherasVisitasOpciones],
  ['cocherasPrivadas', 'Cocheras privadas', cocherasPrivadasOpciones],
  ['almacenPrivados', 'Almacen privados', almacenesPrivadosOpciones],
  ['entradasPeatonales', 'Entradas peatonales', entradasOpciones],
  ['entradasVehiculares', 'Entradas vehiculares', entradasOpciones],
];

function CampoTexto({ label, value, onChange, placeholder }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', background: theme.colors.bgMuted, borderRadius: theme.radius.lg,
          border: `1px solid ${theme.colors.border}`, outline: 'none', fontSize: theme.fonts.sizes.base,
          fontFamily: theme.fonts.family, color: theme.colors.text, padding: '10px 14px', boxSizing: 'border-box',
        }} />
    </div>
  );
}

const ESTADO_LABELS = {
  disponible: 'Sin propietario asignado',
  invitado: 'Invitacion enviada',
  aceptado: 'Invitacion aceptada',
  'config-pendiente': 'Configuracion pendiente',
  'config-completado': 'Configuracion completada',
};

const ESTADO_COLORS = {
  disponible: theme.colors.statusGrayText,
  invitado: theme.colors.warning,
  aceptado: theme.colors.statusBlue,
  'config-pendiente': theme.colors.statusOrange,
  'config-completado': theme.colors.success,
};

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
      <CampoTexto label="Ubicación estacionamientos de visita" value={form.ubicacionParkingVisitas} onChange={setField('ubicacionParkingVisitas')} placeholder="Ej: Sótano -2" />
    </div>
  );
}

function CampoRow({ label, value }) {
  return (
    <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
      {label}: <span style={{ color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>{value || '-'}</span>
    </div>
  );
}

function EstadoBadge({ estado }) {
  const label = ESTADO_LABELS[estado] || estado;
  const color = ESTADO_COLORS[estado] || theme.colors.textSecondary;
  return (
    <span style={{
      fontSize: theme.fonts.sizes.xs, padding: '2px 8px', borderRadius: theme.radius.full,
      background: color + '20', color, fontWeight: theme.fonts.weights.medium,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

// ─── CONDOMINIO TAB ─────────────────────────────────────────────────────

function CondominioTab() {
  const { edificioActivo } = useApp();

  const [form, setForm] = useState({
    nombre: edificioActivo || '',
    direccion: '',
    ruc: '',
    foto: null,
    numTorres: '3',
    sotanosCompartidos: 'Si',
    porteriaCompartida: 'Si',
    ingresosVehiculares: '',
    ingresosPeatonales: '',
  });

  const [adminTeam, setAdminTeam] = useState([
    { id: 1, nombre: '', cargo: 'Administrador', telefono: '', correo: '' },
  ]);

  const [seguridadEmpresa, setSeguridadEmpresa] = useState({ nombre: '', telefono: '', correo: '' });
  const [limpiezaEmpresa, setLimpiezaEmpresa] = useState({ nombre: '', telefono: '', correo: '' });

  const setField = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const addAdminMember = () => {
    setAdminTeam(prev => [...prev, { id: Date.now(), nombre: '', cargo: '', telefono: '', correo: '' }]);
  };

  const updateAdminMember = (id, field, value) => {
    setAdminTeam(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const removeAdminMember = (id) => {
    setAdminTeam(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Información del Condominio */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>Información del Condominio</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <CampoTexto label="Nombre del condominio" value={form.nombre} onChange={setField('nombre')} placeholder="Ej: Las Barranqueras" />
          <CampoTexto label="Dirección" value={form.direccion} onChange={setField('direccion')} placeholder="Ej: Av. Principal 123" />
          <CampoTexto label="RUC" value={form.ruc} onChange={setField('ruc')} placeholder="Ej: 1234567890001" />
          <div>
            <span style={labelStyle}>Foto del condominio</span>
            <div style={{
              width: '100%', height: '120px', borderRadius: theme.radius.lg,
              border: `2px dashed ${theme.colors.border}`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              background: theme.colors.bgMuted,
            }}>
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                {form.foto ? '📷 Foto seleccionada' : '📷 Tocar para agregar foto'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Estructura General */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>Estructura General</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <CampoTexto label="Número de torres" value={form.numTorres} onChange={setField('numTorres')} placeholder="3" />
          <div style={grid2}>
            <div>
              <span style={labelStyle}>Sótanos compartidos</span>
              <SelectField value={form.sotanosCompartidos} options={['Si', 'No']} onChange={setField('sotanosCompartidos')} />
            </div>
            <div>
              <span style={labelStyle}>Portería compartida</span>
              <SelectField value={form.porteriaCompartida} options={['Si', 'No', 'Ambas']} onChange={setField('porteriaCompartida')} />
            </div>
          </div>
          <CampoTexto label="Ingresos vehiculares (ubicación)" value={form.ingresosVehiculares} onChange={setField('ingresosVehiculares')} placeholder="Ej: Norte, Sur" />
          <CampoTexto label="Ingresos peatonales (ubicación)" value={form.ingresosPeatonales} onChange={setField('ingresosPeatonales')} placeholder="Ej: Principal, Lateral" />
        </div>
      </div>

      {/* Equipo Administrativo */}
      <div style={sectionCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Equipo Administrativo</h3>
          <button onClick={addAdminMember} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: theme.colors.primary, fontSize: theme.fonts.sizes.sm,
            fontFamily: theme.fonts.family, fontWeight: theme.fonts.weights.semibold,
          }}>+ Agregar</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {adminTeam.map((member, idx) => (
            <div key={member.id} style={{
              padding: '12px', borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.border}`, background: theme.colors.bgMuted,
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                  Miembro {idx + 1}
                </span>
                {adminTeam.length > 1 && (
                  <button onClick={() => removeAdminMember(member.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: theme.colors.danger, fontSize: theme.fonts.sizes.xs,
                  }}>Eliminar</button>
                )}
              </div>
              <input value={member.nombre} onChange={e => updateAdminMember(member.id, 'nombre', e.target.value)} placeholder="Nombre completo" style={inputStyle} />
              <select value={member.cargo} onChange={e => updateAdminMember(member.id, 'cargo', e.target.value)} style={inputStyle}>
                <option value="">Seleccionar cargo</option>
                <option value="Administrador">Administrador</option>
                <option value="Co-Administrador">Co-Administrador</option>
                <option value="Secretaria">Secretaria</option>
                <option value="Presidente Junta">Presidente Junta de Propietarios</option>
                <option value="Miembro Consejo">Miembro del Consejo</option>
                <option value="Otro">Otro</option>
              </select>
              <div style={grid2}>
                <input value={member.telefono} onChange={e => updateAdminMember(member.id, 'telefono', e.target.value)} placeholder="Teléfono" style={inputStyle} />
                <input value={member.correo} onChange={e => updateAdminMember(member.id, 'correo', e.target.value)} placeholder="Correo" style={inputStyle} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empresa de Seguridad */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>Empresa de Seguridad</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <CampoTexto label="Nombre de la empresa" value={seguridadEmpresa.nombre} onChange={v => setSeguridadEmpresa(p => ({ ...p, nombre: v }))} placeholder="Ej: Seguridad Total S.A." />
          <div style={grid2}>
            <CampoTexto label="Teléfono" value={seguridadEmpresa.telefono} onChange={v => setSeguridadEmpresa(p => ({ ...p, telefono: v }))} placeholder="+593 999999999" />
            <CampoTexto label="Correo" value={seguridadEmpresa.correo} onChange={v => setSeguridadEmpresa(p => ({ ...p, correo: v }))} placeholder="correo@empresa.com" />
          </div>
        </div>
      </div>

      {/* Empresa de Limpieza */}
      <div style={sectionCard}>
        <h3 style={sectionTitle}>Empresa de Limpieza</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <CampoTexto label="Nombre de la empresa" value={limpiezaEmpresa.nombre} onChange={v => setLimpiezaEmpresa(p => ({ ...p, nombre: v }))} placeholder="Ej: LimpiezaPro" />
          <div style={grid2}>
            <CampoTexto label="Teléfono" value={limpiezaEmpresa.telefono} onChange={v => setLimpiezaEmpresa(p => ({ ...p, telefono: v }))} placeholder="+593 999999999" />
            <CampoTexto label="Correo" value={limpiezaEmpresa.correo} onChange={v => setLimpiezaEmpresa(p => ({ ...p, correo: v }))} placeholder="correo@empresa.com" />
          </div>
        </div>
      </div>

      <Button variant="primary" fullWidth onClick={() => {}}>Guardar información</Button>
      <div style={{ height: '16px' }} />
    </div>
  );
}

// ─── TOWER LIST TAB ───────────────────────────────────────────────────────

function TorresTab({ onSelectTorre }) {
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

  const generarUnidades = (torreForm) => {
    const desde = parseInt(torreForm.nomenclaturaDesde) || 101;
    const hasta = parseInt(torreForm.nomenclaturaHasta) || 105;
    const unidades = [];
    for (let i = desde; i <= hasta; i++) {
      unidades.push({
        id: Date.now() + i,
        codigo: String(i),
        torreNumero: torreForm.numero || torres.length + 1,
        piso: Math.floor(i / 100),
        tipologiaId: 1,
        estacionamientos: 0,
        ubicacionParking: '',
        estado: 'disponible',
        propietarioAsignado: null,
        propietarioEmail: null,
        configuracionId: null,
      });
    }
    return unidades;
  };

  const confirmarNueva = () => {
    const nuevaTorre = { ...form, numero: torres.length ? Math.max(...torres.map(t => t.numero)) + 1 : 1 };
    agregarTorre(nuevaTorre);
    cerrarNueva();
  };

  const confirmarEditar = () => { actualizarTorre({ ...editTorre, ...form }); cerrarEditar(); };
  const confirmarEliminar = () => { eliminarTorre(deleteTorre); setDeleteTorre(null); };

  const nomenclaturaPreview = () => {
    const desde = parseInt(form.nomenclaturaDesde);
    const hasta = parseInt(form.nomenclaturaHasta);
    if (!desde || !hasta || hasta < desde) return null;
    const count = hasta - desde + 1;
    return `Se generaran ${count} unidades: ${desde} a ${hasta}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={abrirNueva}>+ Nueva torre</Button>
      </div>

      {torres.map(torre => (
        <div key={torre.id} style={{
          background: theme.colors.bgCard, borderRadius: theme.radius.xl,
          border: `1.5px solid ${theme.colors.success}`, boxShadow: theme.shadows.card, overflow: 'hidden',
          cursor: 'pointer',
        }} onClick={() => onSelectTorre(torre)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto' }}>
            <div style={{ padding: '12px 14px', borderRight: `1px solid ${theme.colors.borderLight}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <CampoRow label="Nombre" value={torre.nombre || `Torre N${torre.numero}`} />
              <CampoRow label="Depto" value={torre.depto} />
              <CampoRow label="Penthouse" value={torre.penthouse} />
              <CampoRow label="Pisos" value={torre.pisos} />
              <CampoRow label="Sótanos" value={torre.sotanos} />
            </div>
            <div style={{ padding: '12px 14px', borderRight: `1px solid ${theme.colors.borderLight}`, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
              <CampoRow label="Cocheras V." value={torre.cocherasVisitas} />
              <CampoRow label="Coch. priv." value={torre.cocherasPrivadas} />
              <CampoRow label="Almacen" value={torre.almacenPrivados} />
              <CampoRow label="Ent. veh." value={torre.entradasVehiculares} />
              <CampoRow label="Ent. peat." value={torre.entradasPeatonales} />
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minWidth: '72px' }}>
              <span style={{ fontSize: theme.fonts.sizes.xs, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, textAlign: 'center', whiteSpace: 'nowrap' }}>
                Torre{'\n'}N{torre.numero}
              </span>
              <div onClick={e => { e.stopPropagation(); setMenuTorre(torre); }}>
                <DotsMenuButton />
              </div>
            </div>
          </div>
        </div>
      ))}

      <BottomSheet isOpen={!!menuTorre} onClose={() => setMenuTorre(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuTorre)} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteTorre(menuTorre); setMenuTorre(null); }} />
      </BottomSheet>

      <Modal isOpen={showNueva} onClose={cerrarNueva} title="Nueva Torre">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
            Torre N: {torres.length ? Math.max(...torres.map(t => t.numero)) + 1 : 1}
          </p>
          <CampoTexto label="Nombre de la torre" value={form.nombre} onChange={setField('nombre')} placeholder="Ej: Torre A" />
          <CampoTexto label="Tipo de nomenclatura" value={form.tipo} onChange={setField('tipo')} placeholder="Ej: 101, 102, 103..." />
          <div style={grid2}>
            <CampoTexto label="Desde (número)" value={form.nomenclaturaDesde} onChange={setField('nomenclaturaDesde')} placeholder="101" />
            <CampoTexto label="Hasta (número)" value={form.nomenclaturaHasta} onChange={setField('nomenclaturaHasta')} placeholder="105" />
          </div>
          {nomenclaturaPreview() && (
            <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5 }}>
              {nomenclaturaPreview()}
            </div>
          )}
          <CamposArquitectura form={form} setField={setField} />
          <Button variant="primary" fullWidth onClick={confirmarNueva}>Crear torre</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editTorre} onClose={cerrarEditar} title="Editar Torre">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
            Torre N: {editTorre?.numero}
          </p>
          <CampoTexto label="Nombre de la torre" value={form.nombre} onChange={setField('nombre')} placeholder="Ej: Torre A" />
          <CamposArquitectura form={form} setField={setField} />
          <Button variant="primary" fullWidth onClick={confirmarEditar}>Guardar cambios</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTorre} onClose={() => setDeleteTorre(null)} title="Eliminar torre">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, textAlign: 'center', color: theme.colors.text }}>
            ¿Seguro que deseas eliminar esta torre?
          </p>
          {deleteTorre && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md }}>
                {deleteTorre.nombre || `Torre N${deleteTorre.numero}`}
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

// ─── TOWER DETAIL VIEW ────────────────────────────────────────────────────

const TORRE_TABS = [
  { value: 'departamentos', label: 'Departamentos' },
  { value: 'estacionamientos', label: 'Estacionamientos' },
  { value: 'depositos', label: 'Depósitos' },
];

function TorreDetailView({ torre, onBack }) {
  const {
    unidades, tipologias, agregarUnidad, actualizarUnidad, eliminarUnidad,
    asignarPropietarioUnidad, propietariosInvited, configHuespedesTemporales,
    vehiculosPrivados, residentesPropietario, propietarioAnfitrionPrimario,
    depositos, agregarDeposito, actualizarDeposito, eliminarDeposito,
    actualizarTorre, addToast,
  } = useApp();

  const unidadesTorre = unidades.filter(u => u.torreNumero === torre.numero);
  const totalEstacionamientos = parseInt(torre.cocherasPrivadas) || 0;

  const [activeTab, setActiveTab] = useState('departamentos');
  const [showCrear, setShowCrear] = useState(false);
  const [editUnidad, setEditUnidad] = useState(null);
  const [deleteUnidad, setDeleteUnidad] = useState(null);
  const [menuUnidad, setMenuUnidad] = useState(null);
  const [showUnidadDetalle, setShowUnidadDetalle] = useState(null);
  const [form, setForm] = useState({ codigo: '', piso: '1', tipologiaId: '', estacionamientos: '0', ubicacionParking: '', asignarNombre: '', asignarEmail: '', spotAsignado: '' });
  const [showAddEstacionamiento, setShowAddEstacionamiento] = useState(false);
  const [formEstacionamiento, setFormEstacionamiento] = useState({ codigo: '', ubicacion: 'Sótano -2', unidadId: '' });

  const resetForm = () => setForm({ codigo: '', piso: '1', tipologiaId: '', estacionamientos: '0', ubicacionParking: '', asignarNombre: '', asignarEmail: '', spotAsignado: '' });

  const abrirCrear = () => { resetForm(); setShowCrear(true); };
  const abrirEditar = (u) => {
    setMenuUnidad(null);
    setForm({ codigo: u.codigo, piso: String(u.piso), tipologiaId: String(u.tipologiaId), estacionamientos: String(u.estacionamientos ?? 0), ubicacionParking: u.ubicacionParking || '', asignarNombre: '', asignarEmail: '', spotAsignado: u.spotAsignado || '' });
    setEditUnidad(u);
  };

  const getTipologiaNombre = (id) => tipologias.find(t => t.id === id)?.nombre || '-';

  const guardarCrear = () => {
    if (!form.codigo || !form.tipologiaId) return;
    agregarUnidad({
      codigo: form.codigo, torreNumero: torre.numero, piso: parseInt(form.piso) || 1,
      bloqueId: null, tipologiaId: parseInt(form.tipologiaId), estacionamientos: parseInt(form.estacionamientos) || 0,
      ubicacionParking: form.ubicacionParking, spotAsignado: form.spotAsignado || null,
      propietarioAsignado: null, propietarioEmail: null, estado: 'disponible', configuracionId: null,
    });
    if (form.asignarNombre && form.asignarEmail) {
      const newId = Date.now() + 1;
      setTimeout(() => asignarPropietarioUnidad(newId, { nombre: form.asignarNombre, email: form.asignarEmail }), 50);
    }
    setShowCrear(false);
  };

  const guardarEditar = () => {
    if (!form.codigo || !form.tipologiaId) return;
    actualizarUnidad({
      ...editUnidad, codigo: form.codigo, piso: parseInt(form.piso) || 1,
      tipologiaId: parseInt(form.tipologiaId), estacionamientos: parseInt(form.estacionamientos) || 0,
      ubicacionParking: form.ubicacionParking, spotAsignado: form.spotAsignado || null,
    });
    if (form.asignarNombre && form.asignarEmail && !editUnidad.propietarioAsignado) {
      asignarPropietarioUnidad(editUnidad.id, { nombre: form.asignarNombre, email: form.asignarEmail });
    }
    setEditUnidad(null);
  };

  // Build parking spot list for this tower
  const parkingSpots = [];
  for (let i = 1; i <= totalEstacionamientos; i++) {
    const spotId = `T${torre.numero}-P${String(i).padStart(3, '0')}`;
    let asignadoA = null;
    let unidadAsignada = null;
    for (const u of unidadesTorre) {
      if (u.spotAsignado === spotId) {
        asignadoA = u.codigo;
        unidadAsignada = u;
        break;
      }
    }
    if (!asignadoA) {
      let accumulated = 0;
      for (const u of unidadesTorre) {
        const count = u.estacionamientos || 0;
        if (count > 0) {
          const spotStart = accumulated + 1;
          const spotEnd = accumulated + count;
          if (i >= spotStart && i <= spotEnd) {
            asignadoA = u.codigo;
            unidadAsignada = u;
            break;
          }
          accumulated = spotEnd;
        }
      }
    }
    parkingSpots.push({ id: spotId, numero: i, asignadoA, unidadAsignada });
  }

  // Available spots for the current form (exclude spots assigned to other units)
  const spotsDisponiblesParaForm = parkingSpots.filter(s => {
    if (!s.asignadoA) return true;
    // If editing, include the current unit's spot
    if (editUnidad && s.asignadoA === editUnidad.codigo) return true;
    return false;
  });
  const spotOptions = spotsDisponiblesParaForm.map(s => ({ value: s.id, label: `${s.id}${s.asignadoA ? ` (${s.asignadoA})` : ' (Libre)'}` }));

  const spotsOcupados = parkingSpots.filter(s => s.asignadoA).length;
  const spotsLibres = totalEstacionamientos - spotsOcupados;

  const getDepositoInfo = (unidad) => {
    const anfitrion = residentesPropietario.find(r => r.esAnfitrionPrimario);
    const anfitrionNombre = propietarioAnfitrionPrimario ? 'Propietario (anfitrión primario)' : (anfitrion?.nombre || '—');
    return { propietario: unidad.propietarioAsignado || 'Sin propietario', anfitrion: anfitrionNombre };
  };

  const depositosTorre = depositos.filter(d => d.torreNumero === torre.numero);
  const getDepositoDepto = (dep) => {
    const u = unidades.find(x => x.id === dep.unidadId || x.codigo === dep.departamentoCodigo);
    if (!u) return { depto: dep.departamentoCodigo || '—', propietario: '—', anfitrion: getDepositoInfo({ propietarioAsignado: null }).anfitrion };
    const info = getDepositoInfo(u);
    return { depto: u.codigo, propietario: info.propietario, anfitrion: info.anfitrion, unidad: u };
  };

  const renderDepartamentos = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={abrirCrear}>+ Agregar departamento</Button>
      </div>

      {unidadesTorre.map(unidad => {
        const invitacion = propietariosInvited.find(i => i.unidadId === unidad.id);
        return (
          <div key={unidad.id} style={{
            ...sectionCard, cursor: 'pointer', padding: '14px 16px',
          }} onClick={() => setShowUnidadDetalle(unidad)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md, color: theme.colors.text }}>
                    {unidad.codigo}
                  </span>
                  <EstadoBadge estado={unidad.estado} />
                </div>
                <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '4px' }}>
                  Piso {unidad.piso} &middot; {getTipologiaNombre(unidad.tipologiaId)}
                  {unidad.estacionamientos !== undefined && <> &middot; {unidad.estacionamientos} estac.</>}
                  {unidad.propietarioAsignado && <> &middot; {unidad.propietarioAsignado}</>}
                </div>
                {invitacion?.estado === 'pendiente' && (
                  <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.warning, marginTop: '2px' }}>
                    Invitacion pendiente de aceptacion
                  </div>
                )}
              </div>
              <div onClick={e => { e.stopPropagation(); setMenuUnidad(unidad); }}>
                <DotsMenuButton />
              </div>
            </div>
          </div>
        );
      })}

      {unidadesTorre.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>
          No hay departamentos en esta torre. Agrega el primero.
        </div>
      )}
    </>
  );

  const renderEstacionamientos = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
        <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
          Total: {totalEstacionamientos} &middot; Ocupados: {spotsOcupados} &middot; Libres: {spotsLibres}
        </span>
        <Button variant="primary" onClick={() => { const nextId = `T${torre.numero}-P${String(totalEstacionamientos + 1).padStart(3, '0')}`; setFormEstacionamiento({ codigo: nextId, ubicacion: 'Sótano -2', unidadId: '' }); setShowAddEstacionamiento(true); }}>+ Agregar estacionamiento</Button>
      </div>

      {parkingSpots.map(spot => {
        const info = spot.unidadAsignada ? getDepositoInfo(spot.unidadAsignada) : null;
        return (
        <div key={spot.id} style={{
          ...sectionCard, padding: '14px 16px',
          border: `1.5px solid ${spot.asignadoA ? theme.colors.success : theme.colors.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md, color: theme.colors.text }}>
                {spot.id}
              </div>
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px', lineHeight: 1.6 }}>
                {spot.asignadoA ? (
                  <>Estacionamiento → Depto <strong>{spot.asignadoA}</strong> → Propietario: <strong>{info?.propietario || '—'}</strong> · Anfitrión: <strong>{info?.anfitrion || '—'}</strong></>
                ) : (
                  <span style={{ color: theme.colors.textMuted }}>Sin asignar</span>
                )}
              </div>
            </div>
            <span style={{
              fontSize: theme.fonts.sizes.xs, padding: '2px 8px', borderRadius: theme.radius.full,
              background: spot.asignadoA ? (theme.colors.success + '20') : (theme.colors.statusGray + '20'),
              color: spot.asignadoA ? theme.colors.success : theme.colors.textSecondary,
              fontWeight: theme.fonts.weights.medium, whiteSpace: 'nowrap',
            }}>
              {spot.asignadoA ? 'Ocupado' : 'Libre'}
            </span>
          </div>
        </div>
      );})}

      {totalEstacionamientos === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>
          No hay estacionamientos configurados para esta torre.
        </div>
      )}

      <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.5, marginTop: '4px' }}>
        Los estacionamientos se asignan automáticamente según la cantidad configurada en cada departamento. Para modificar, edita la cantidad de estacionamientos del departamento.
      </div>

      <Modal isOpen={showAddEstacionamiento} onClose={() => setShowAddEstacionamiento(false)} title="Nuevo estacionamiento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField label="Código" value={formEstacionamiento.codigo} onChange={v => setFormEstacionamiento(p => ({ ...p, codigo: v }))} placeholder={`T${torre.numero}-P${String(totalEstacionamientos + 1).padStart(3, '0')}`} />
          <InputField label="Ubicación" value={formEstacionamiento.ubicacion} onChange={v => setFormEstacionamiento(p => ({ ...p, ubicacion: v }))} placeholder="Sótano -2" />
          <div>
            <span style={labelStyle}>Departamento asociado (opcional)</span>
            <SelectField value={formEstacionamiento.unidadId} options={unidadesTorre.map(u => ({ value: String(u.id), label: `${u.codigo} - ${u.propietarioAsignado || 'Sin propietario'}` }))} onChange={v => setFormEstacionamiento(p => ({ ...p, unidadId: v }))} placeholder="Sin asignar (queda libre)" />
          </div>
          <Button variant="primary" fullWidth onClick={() => {
            const codigo = formEstacionamiento.codigo?.trim() || `T${torre.numero}-P${String(totalEstacionamientos + 1).padStart(3, '0')}`;
            const nuevoTotal = totalEstacionamientos + 1;
            actualizarTorre({ ...torre, cocherasPrivadas: String(nuevoTotal) });
            if (formEstacionamiento.unidadId) {
              const unidad = unidades.find(u => String(u.id) === String(formEstacionamiento.unidadId));
              if (unidad) {
                actualizarUnidad({ ...unidad, estacionamientos: (unidad.estacionamientos || 0) + 1, spotAsignado: codigo, ubicacionParking: formEstacionamiento.ubicacion });
              }
            }
            addToast && addToast(`Estacionamiento ${codigo} creado`, 'success');
            setShowAddEstacionamiento(false);
          }}>Crear estacionamiento</Button>
        </div>
      </Modal>
    </>
  );

  const [showDepositoForm, setShowDepositoForm] = useState(false);
  const [editDeposito, setEditDeposito] = useState(null);
  const [formDeposito, setFormDeposito] = useState({ codigo: '', ubicacion: 'Sótano -2', unidadId: '' });

  const renderDepositos = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={() => { setFormDeposito({ codigo: '', ubicacion: 'Sótano -2', unidadId: '' }); setShowDepositoForm(true); }}>+ Agregar depósito</Button>
      </div>
      {depositosTorre.map(dep => {
        const { depto, propietario, anfitrion } = getDepositoDepto(dep);
        return (
        <div key={dep.id} style={{ ...sectionCard, padding: '14px 16px', border: `1.5px solid ${theme.colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md, color: theme.colors.text }}>{dep.codigo}</div>
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '2px' }}>{dep.ubicacion}</div>
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginTop: '4px', lineHeight: 1.6 }}>
                Depósito → Depto <strong>{depto}</strong> → Propietario: <strong>{propietario}</strong> · Anfitrión: <strong>{anfitrion}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => { setEditDeposito(dep); setFormDeposito({ codigo: dep.codigo, ubicacion: dep.ubicacion, unidadId: String(dep.unidadId || '') }); setShowDepositoForm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.primary, fontSize: theme.fonts.sizes.xs }}>Editar</button>
              <button onClick={() => eliminarDeposito(dep.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.danger, fontSize: theme.fonts.sizes.xs }}>Eliminar</button>
            </div>
          </div>
        </div>
        );
      })}
      {depositosTorre.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>No hay depósitos en esta torre.</div>
      )}
      <Modal isOpen={showDepositoForm} onClose={() => { setShowDepositoForm(false); setEditDeposito(null); }} title={editDeposito ? 'Editar depósito' : 'Nuevo depósito'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <InputField label="Código" value={formDeposito.codigo} onChange={v => setFormDeposito(p => ({ ...p, codigo: v }))} placeholder="Ej: DEP-010" />
          <InputField label="Ubicación" value={formDeposito.ubicacion} onChange={v => setFormDeposito(p => ({ ...p, ubicacion: v }))} placeholder="Sótano -2" />
          <div>
            <span style={labelStyle}>Departamento asociado</span>
            <SelectField value={formDeposito.unidadId} options={unidadesTorre.map(u => ({ value: String(u.id), label: `${u.codigo} - ${u.propietarioAsignado || 'Sin propietario'}` }))} onChange={v => setFormDeposito(p => ({ ...p, unidadId: v }))} placeholder="Seleccionar depto" />
          </div>
          <Button variant="primary" fullWidth onClick={() => {
            const unidad = unidades.find(u => String(u.id) === String(formDeposito.unidadId));
            const datos = { codigo: formDeposito.codigo, ubicacion: formDeposito.ubicacion, torreNumero: torre.numero, unidadId: unidad ? unidad.id : null, departamentoCodigo: unidad ? unidad.codigo : '' };
            if (editDeposito) { actualizarDeposito({ ...editDeposito, ...datos }); } else { agregarDeposito(datos); }
            setShowDepositoForm(false); setEditDeposito(null);
          }}>{editDeposito ? 'Guardar' : 'Crear'}</Button>
        </div>
      </Modal>
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px',
          color: theme.colors.text, padding: '4px',
        }}>{'\u2190'}</button>
        <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
          {torre.nombre || `Torre N${torre.numero}`} — {unidadesTorre.length} depto(s)
        </span>
      </div>

      <Tabs tabs={TORRE_TABS} active={activeTab} onChange={setActiveTab} variant="chip" />

      {activeTab === 'departamentos' ? renderDepartamentos() : activeTab === 'estacionamientos' ? renderEstacionamientos() : renderDepositos()}

      <BottomSheet isOpen={!!menuUnidad} onClose={() => setMenuUnidad(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuUnidad)} />
        {menuUnidad?.estado === 'disponible' && (
          <BottomSheetOption label="Asignar propietario" onPress={() => {
            setMenuUnidad(null);
            setForm({ codigo: menuUnidad.codigo, piso: String(menuUnidad.piso), tipologiaId: String(menuUnidad.tipologiaId), asignarNombre: '', asignarEmail: '' });
            setEditUnidad(menuUnidad);
          }} />
        )}
        <BottomSheetOption label="Ver detalle" onPress={() => { setShowUnidadDetalle(menuUnidad); setMenuUnidad(null); }} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteUnidad(menuUnidad); setMenuUnidad(null); }} />
      </BottomSheet>

      {/* CREAR UNIDAD */}
      <Modal isOpen={showCrear} onClose={() => setShowCrear(false)} title="Agregar departamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
          <InputField label="Codigo / Numero" value={form.codigo} onChange={v => setForm(p => ({ ...p, codigo: v }))} placeholder="Ej: 401" />
          <InputField label="Piso" value={form.piso} onChange={v => setForm(p => ({ ...p, piso: v }))} placeholder="1" type="number" />
          <div>
            <span style={labelStyle}>Tipologia</span>
            <SelectField value={form.tipologiaId} options={tipologias.map(t => ({ value: String(t.id), label: `${t.nombre} (cap. ${t.capacidadMaxima})` }))} onChange={v => setForm(p => ({ ...p, tipologiaId: v }))} placeholder="Seleccionar" />
          </div>
          <InputField label="Cantidad de estacionamientos" value={form.estacionamientos} onChange={v => setForm(p => ({ ...p, estacionamientos: v }))} placeholder="0" type="number" />
          <InputField label="Ubicación estacionamientos (piso/sótano)" value={form.ubicacionParking} onChange={v => setForm(p => ({ ...p, ubicacionParking: v }))} placeholder="Ej: Sótano -2" />
          {spotOptions.length > 0 && (
            <div>
              <span style={labelStyle}>Estacionamiento(s) a asignar</span>
              <SelectField value={form.spotAsignado} options={spotOptions} onChange={v => setForm(p => ({ ...p, spotAsignado: v }))} placeholder="Seleccionar estacionamiento" />
            </div>
          )}
          <div style={{ borderTop: `1px solid ${theme.colors.borderLight}`, paddingTop: '12px', marginTop: '4px' }}>
            <p style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '8px' }}>
              Asignar propietario (opcional)
            </p>
            <InputField label="Nombre del propietario" value={form.asignarNombre} onChange={v => setForm(p => ({ ...p, asignarNombre: v }))} placeholder="Ej: Carlos Mendoza" />
            <InputField label="Correo electronico" value={form.asignarEmail} onChange={v => setForm(p => ({ ...p, asignarEmail: v }))} placeholder="correo@ejemplo.com" type="email" />
            <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.lg, padding: '10px 14px', fontSize: theme.fonts.sizes.xs, color: theme.colors.secondary, lineHeight: 1.5, marginTop: '8px' }}>
              Se enviara una invitacion al correo indicado. Si no se asigna ahora, podra asignarse despues.
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={guardarCrear}>Crear departamento</Button>
        </div>
      </Modal>

      {/* EDITAR UNIDAD */}
      <Modal isOpen={!!editUnidad} onClose={() => setEditUnidad(null)} title="Editar departamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
          <InputField label="Codigo / Numero" value={form.codigo} onChange={v => setForm(p => ({ ...p, codigo: v }))} placeholder="Ej: 401" />
          <InputField label="Piso" value={form.piso} onChange={v => setForm(p => ({ ...p, piso: v }))} placeholder="1" type="number" />
          <div>
            <span style={labelStyle}>Tipologia</span>
            <SelectField value={form.tipologiaId} options={tipologias.map(t => ({ value: String(t.id), label: `${t.nombre} (cap. ${t.capacidadMaxima})` }))} onChange={v => setForm(p => ({ ...p, tipologiaId: v }))} placeholder="Seleccionar" />
          </div>
          <InputField label="Cantidad de estacionamientos" value={form.estacionamientos} onChange={v => setForm(p => ({ ...p, estacionamientos: v }))} placeholder="0" type="number" />
          <InputField label="Ubicación estacionamientos (piso/sótano)" value={form.ubicacionParking} onChange={v => setForm(p => ({ ...p, ubicacionParking: v }))} placeholder="Ej: Sótano -2" />
          {spotOptions.length > 0 && (
            <div>
              <span style={labelStyle}>Estacionamiento(s) a asignar</span>
              <SelectField value={form.spotAsignado} options={spotOptions} onChange={v => setForm(p => ({ ...p, spotAsignado: v }))} placeholder="Seleccionar estacionamiento" />
            </div>
          )}
          {!editUnidad?.propietarioAsignado && (
            <div style={{ borderTop: `1px solid ${theme.colors.borderLight}`, paddingTop: '12px', marginTop: '4px' }}>
              <p style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '8px' }}>
                Asignar propietario
              </p>
              <InputField label="Nombre del propietario" value={form.asignarNombre} onChange={v => setForm(p => ({ ...p, asignarNombre: v }))} placeholder="Ej: Carlos Mendoza" />
              <InputField label="Correo electronico" value={form.asignarEmail} onChange={v => setForm(p => ({ ...p, asignarEmail: v }))} placeholder="correo@ejemplo.com" type="email" />
            </div>
          )}
          <Button variant="primary" fullWidth onClick={guardarEditar}>Guardar cambios</Button>
        </div>
      </Modal>

      {/* ELIMINAR UNIDAD */}
      <Modal isOpen={!!deleteUnidad} onClose={() => setDeleteUnidad(null)} title="Eliminar departamento">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            ¿Eliminar el departamento <strong>"{deleteUnidad?.codigo}"</strong>?
          </p>
          <Button variant="danger" fullWidth onClick={() => { eliminarUnidad(deleteUnidad.id); setDeleteUnidad(null); }}>Eliminar</Button>
        </div>
      </Modal>

      {/* DETALLE DE UNIDAD */}
      <UnidadDetalleModal
        unidad={showUnidadDetalle}
        onClose={() => setShowUnidadDetalle(null)}
      />
    </div>
  );
}

// ─── UNIT DETAIL MODAL ─────────────────────────────────────────────────

function UnidadDetalleModal({ unidad, onClose }) {
  const { tipologias, configHuespedesTemporales, propietariosInvited } = useApp();

  if (!unidad) return null;

  const tipologia = tipologias.find(t => t.id === unidad.tipologiaId);
  const invitacion = propietariosInvited.find(i => i.unidadId === unidad.id && i.estado === 'aceptada');
  const configData = configHuespedesTemporales[unidad.id];
  const estadoLabel = ESTADO_LABELS[unidad.estado] || unidad.estado;
  const estadoColor = ESTADO_COLORS[unidad.estado] || theme.colors.textSecondary;

  return (
    <Modal isOpen={!!unidad} onClose={onClose} title={`Departamento ${unidad.codigo}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '70vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
            Estado:
          </span>
          <EstadoBadge estado={unidad.estado} />
        </div>

        <div style={sectionCard}>
          <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Informacion general</h4>
          <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 2 }}>
            <div>Torre: <strong>N{unidad.torreNumero}</strong></div>
            <div>Piso: <strong>{unidad.piso}</strong></div>
            <div>Tipologia: <strong>{tipologia?.nombre || '-'} ({tipologia?.capacidadMaxima || '-'} huespedes)</strong></div>
          </div>
        </div>

        <div style={sectionCard}>
          <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Propietario</h4>
          {unidad.propietarioAsignado ? (
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 2 }}>
              <div>Nombre: <strong>{unidad.propietarioAsignado}</strong></div>
              <div>Email: <strong>{unidad.propietarioEmail}</strong></div>
              {invitacion && (
                <div>Invitacion aceptada: <strong style={{ color: theme.colors.success }}>{invitacion.fechaInvitacion}</strong></div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted, textAlign: 'center', padding: '12px' }}>
              Sin propietario asignado
            </div>
          )}
        </div>

        {configData && (
          <div style={sectionCard}>
            <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>
              Configuracion del propietario
            </h4>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.8 }}>
              <div>Minimo dias: <strong>{configData.minDias}</strong></div>
              <div>Capacidad maxima: <strong>{configData.maxHuespedes}</strong></div>
              <div>Politica mascotas: <strong>{configData.politicaMascotas === 'permitidas' ? 'Permitidas' : 'No permitidas'}</strong></div>
              <div>Apto ninos: <strong>{configData.aptoNinos ? 'Si' : 'No'}</strong></div>
              <div>Descripcion: <strong>{configData.descripcion || '-'}</strong></div>
              <div>Habitaciones: <strong>{configData.numHabitaciones}</strong></div>
              <div>Camas: <strong>{configData.numCamas}</strong></div>
              <div>Estacionamientos: <strong>{configData.estacionamientos ?? 0}</strong></div>
            </div>
          </div>
        )}

        {configData?.integraciones && (
          <div style={sectionCard}>
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
        )}

        {configData?.legal && (
          <div style={sectionCard}>
            <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Legal</h4>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.8 }}>
              <div>RNT: <strong>{configData.legal.rnt || '-'}</strong></div>
              <div>TRA: <strong>{configData.legal.tra ? 'Activado' : 'Desactivado'}</strong></div>
              <div>SIRE: <strong>{configData.legal.sire ? 'Activado' : 'Desactivado'}</strong></div>
            </div>
          </div>
        )}

        {configData?.staff && (
          <div style={sectionCard}>
            <h4 style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '8px' }}>Personal registrado</h4>
            {configData.staff.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, lineHeight: 1.8 }}>
                {configData.staff.map(s => (
                  <li key={s.id}>{s.nombre} - {s.rol === 'coanfitrion' ? 'Coanfitrion' : s.rol === 'limpieza' ? 'Limpieza' : 'Emergencia'}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted }}>Sin personal registrado</div>
            )}
          </div>
        )}

        {!configData && unidad.estado !== 'disponible' && unidad.estado !== 'invitado' && (
          <div style={{ textAlign: 'center', padding: '16px', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm }}>
            El propietario aun no ha completado la configuracion.
          </div>
        )}

        <Button variant="primary" fullWidth onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
}

// ─── ALMACENES / DEPÓSITOS TAB ───────────────────────────────────────────

function AlmacenesTab() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [form, setForm] = useState({ nombre: '', identificador: '', ubicacion: '' });

  const resetForm = () => setForm({ nombre: '', identificador: '', ubicacion: '' });

  const abrirNuevo = () => { resetForm(); setShowForm(true); };
  const abrirEditar = (item) => { setEditItem(item); setForm({ nombre: item.nombre, identificador: item.identificador, ubicacion: item.ubicacion }); };
  const guardarNuevo = () => {
    if (!form.nombre || !form.identificador) return;
    setItems(prev => [...prev, { id: Date.now(), ...form }]);
    setShowForm(false);
  };
  const guardarEditar = () => {
    if (!form.nombre || !form.identificador) return;
    setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form } : i));
    setEditItem(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <Button variant="primary" onClick={abrirNuevo}>+ Nuevo almacén</Button>
      </div>
      {items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: theme.colors.textMuted, fontSize: theme.fonts.sizes.sm }}>
          No hay almacenes o depósitos registrados.
        </div>
      )}
      {items.map(item => (
        <div key={item.id} style={{ ...sectionCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px' }}>
          <div>
            <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
              {item.nombre}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginTop: '2px' }}>
              {item.identificador} &middot; {item.ubicacion}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => abrirEditar(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.primary, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family }}>Editar</button>
            <button onClick={() => setDeleteItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.danger, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family }}>Eliminar</button>
          </div>
        </div>
      ))}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nuevo almacén / depósito">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre / identificador *" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Depósito A" />
          <InputField label="Código" value={form.identificador} onChange={v => setForm(p => ({ ...p, identificador: v }))} placeholder="Ej: DEP-001" />
          <div>
            <span style={labelStyle}>Ubicación (piso / sótano)</span>
            <SelectField value={form.ubicacion} options={['Sótano -2', 'Sótano -1', 'Planta baja', 'Piso 1', 'Piso 2', 'Piso 3', 'Azotea']} onChange={v => setForm(p => ({ ...p, ubicacion: v }))} placeholder="Seleccionar" />
          </div>
          <Button variant="primary" fullWidth onClick={guardarNuevo}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar almacén / depósito">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre / identificador *" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Depósito A" />
          <InputField label="Código" value={form.identificador} onChange={v => setForm(p => ({ ...p, identificador: v }))} placeholder="Ej: DEP-001" />
          <div>
            <span style={labelStyle}>Ubicación (piso / sótano)</span>
            <SelectField value={form.ubicacion} options={['Sótano -2', 'Sótano -1', 'Planta baja', 'Piso 1', 'Piso 2', 'Piso 3', 'Azotea']} onChange={v => setForm(p => ({ ...p, ubicacion: v }))} placeholder="Seleccionar" />
          </div>
          <Button variant="primary" fullWidth onClick={guardarEditar}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar almacén">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            ¿Eliminar <strong>"{deleteItem?.nombre}"</strong>?
          </p>
          <Button variant="danger" fullWidth onClick={() => { setItems(prev => prev.filter(i => i.id !== deleteItem.id)); setDeleteItem(null); }}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── OTHER TABS ──────────────────────────────────────────────────────────

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
        <Button variant="primary" onClick={abrirNueva}>+ Nueva tipologia</Button>
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
                Capacidad maxima: <strong>{item.capacidadMaxima}</strong> huespedes
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

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva tipologia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre de la tipologia" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Estandar, Premium, Suite" />
          <InputField label="Capacidad maxima de ocupacion" value={form.capacidadMaxima} onChange={v => setForm(p => ({ ...p, capacidadMaxima: v }))} placeholder="Ej: 4" type="number" />
          <Button variant="primary" fullWidth onClick={guardarNueva}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar tipologia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre de la tipologia" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Estandar, Premium, Suite" />
          <InputField label="Capacidad maxima de ocupacion" value={form.capacidadMaxima} onChange={v => setForm(p => ({ ...p, capacidadMaxima: v }))} placeholder="Ej: 4" type="number" />
          <Button variant="primary" fullWidth onClick={guardarEditar}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar tipologia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            ?Eliminar la tipologia <strong>"{deleteItem?.nombre}"</strong>?
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
            Esta accion no puede deshacerse.
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
        <Button variant="primary" onClick={abrirNueva}>+ Nueva porteria</Button>
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

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Nueva porteria">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Principal" />
          <InputField label="Ubicacion" value={form.ubicacion} onChange={v => setForm(p => ({ ...p, ubicacion: v }))} placeholder="Ej: Entrada principal" />
          <InputField label="Telefono (opcional)" value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="+593 999999999" />
          <Button variant="primary" fullWidth onClick={() => { guardar(agregarPorteria); setShowForm(false); }}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar porteria">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InputField label="Nombre" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Ej: Principal" />
          <InputField label="Ubicacion" value={form.ubicacion} onChange={v => setForm(p => ({ ...p, ubicacion: v }))} placeholder="Ej: Entrada principal" />
          <InputField label="Telefono (opcional)" value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="+593 999999999" />
          <Button variant="primary" fullWidth onClick={() => { guardar(d => actualizarPorteria({ ...editItem, ...d })); setEditItem(null); }}>Guardar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar porteria">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
            ?Eliminar la porteria <strong>"{deleteItem?.nombre}"</strong>?
          </p>
          <Button variant="danger" fullWidth onClick={() => { eliminarPorteria(deleteItem.id); setDeleteItem(null); }}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}



const TABS = [
  { value: 'condominio', label: 'Condominio' },
  { value: 'torres', label: 'Torres' },
  { value: 'porterias', label: 'Porterías' },
];

export default function AdministradorArquitecturaPage() {
  const [activeTab, setActiveTab] = useState('condominio');
  const [torreDetail, setTorreDetail] = useState(null);

  const renderContent = () => {
    if (torreDetail) {
      return (
        <TorreDetailView
          torre={torreDetail}
          onBack={() => setTorreDetail(null)}
        />
      );
    }
    switch (activeTab) {
      case 'condominio': return <CondominioTab />;
      case 'torres': return <TorresTab onSelectTorre={setTorreDetail} />;
      case 'porterias': return <PorteriasTab />;
      default: return null;
    }
  };

  return (
    <AppShell>
      <PageHeader title="Arquitectura" />
      {!torreDetail && (
        <div style={{ padding: '0 16px', marginTop: '12px' }}>
          <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} variant="chip" />
        </div>
      )}
      <div style={{ padding: '16px', paddingTop: '12px' }}>
        {renderContent()}
      </div>
    </AppShell>
  );
}