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
  ['ninos', 'Acepta ninos', opcionesSiNo],
  ['cocherasPrivadas', 'Cocheras privadas', cocherasPrivadasOpciones],
  ['almacenPrivados', 'Almacen privados', almacenesPrivadosOpciones],
  ['entradasPeatonales', 'Entradas peatonales', entradasOpciones],
  ['entradasVehiculares', 'Entradas vehiculares', entradasOpciones],
];

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

function CheckRow({ label, value }) {
  const isSi = value === 'Si' || value === 'Si' || value === 'si';
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
          cursor: 'pointer',
        }} onClick={() => onSelectTorre(torre)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto' }}>
            <div style={{ padding: '12px 14px', borderRight: `1px solid ${theme.colors.borderLight}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <CampoRow label="Depto" value={torre.depto} />
              <CampoRow label="Penthouse" value={torre.penthouse} />
              <CampoRow label="Cocheras V." value={torre.cocherasVisitas} />
              <CampoRow label="Coch. priv." value={torre.cocherasPrivadas} />
              <CampoRow label="Almacen" value={torre.almacenPrivados} />
              <CampoRow label="Ent. veh." value={torre.entradasVehiculares} />
            </div>
            <div style={{ padding: '12px 14px', borderRight: `1px solid ${theme.colors.borderLight}`, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
              <CampoRow label="Ent. peat." value={torre.entradasPeatonales} />
              <CheckRow label="Ninos" value={torre.ninos} />
              <CheckRow label="Mascotas" value={torre.mascotas} />
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

      <Modal isOpen={showNueva} onClose={cerrarNueva} title="Nueva Arquitectura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
            Numero de Torre N: {torres.length ? Math.max(...torres.map(t => t.numero)) + 1 : 1}
          </p>
          <CamposArquitectura form={form} setField={setField} />
          <Button variant="primary" fullWidth onClick={confirmarNueva}>Aceptar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!editTorre} onClose={cerrarEditar} title="Editar Arquitectura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontWeight: theme.fonts.weights.medium }}>
            Torre N: {editTorre?.numero}
          </p>
          <CamposArquitectura form={form} setField={setField} />
          <Button variant="primary" fullWidth onClick={confirmarEditar}>Aceptar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTorre} onClose={() => setDeleteTorre(null)} title="Eliminar arquitectura">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, textAlign: 'center', color: theme.colors.text }}>
            ?Seguro que deseas eliminar esta arquitectura?
          </p>
          {deleteTorre && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md }}>
                Torre N {deleteTorre.numero}
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

function TorreDetailView({ torre, onBack }) {
  const {
    unidades, tipologias, agregarUnidad, actualizarUnidad, eliminarUnidad,
    asignarPropietarioUnidad, propietariosInvited, configHuespedesTemporales,
  } = useApp();

  const unidadesTorre = unidades.filter(u => u.torreNumero === torre.numero);

  const [showCrear, setShowCrear] = useState(false);
  const [editUnidad, setEditUnidad] = useState(null);
  const [deleteUnidad, setDeleteUnidad] = useState(null);
  const [menuUnidad, setMenuUnidad] = useState(null);
  const [showUnidadDetalle, setShowUnidadDetalle] = useState(null);
  const [form, setForm] = useState({ codigo: '', piso: '1', tipologiaId: '', estacionamientos: '0', asignarNombre: '', asignarEmail: '' });

  const resetForm = () => setForm({ codigo: '', piso: '1', tipologiaId: '', estacionamientos: '0', asignarNombre: '', asignarEmail: '' });

  const abrirCrear = () => { resetForm(); setShowCrear(true); };
  const abrirEditar = (u) => {
    setMenuUnidad(null);
    setForm({ codigo: u.codigo, piso: String(u.piso), tipologiaId: String(u.tipologiaId), estacionamientos: String(u.estacionamientos ?? 0), asignarNombre: '', asignarEmail: '' });
    setEditUnidad(u);
  };

  const getTipologiaNombre = (id) => tipologias.find(t => t.id === id)?.nombre || '-';

  const guardarCrear = () => {
    if (!form.codigo || !form.tipologiaId) return;
    agregarUnidad({
      codigo: form.codigo, torreNumero: torre.numero, piso: parseInt(form.piso) || 1,
      bloqueId: null, tipologiaId: parseInt(form.tipologiaId), estacionamientos: parseInt(form.estacionamientos) || 0,
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
    });
    if (form.asignarNombre && form.asignarEmail && !editUnidad.propietarioAsignado) {
      asignarPropietarioUnidad(editUnidad.id, { nombre: form.asignarNombre, email: form.asignarEmail });
    }
    setEditUnidad(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px',
          color: theme.colors.text, padding: '4px',
        }}>{'\u2190'}</button>
        <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
          Torre N{torre.numero} — {unidadesTorre.length} departamento(s)
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
            ?Eliminar el departamento <strong>"{deleteUnidad?.codigo}"</strong>?
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

// ─── OTHER TABS (unchanged from original) ────────────────────────────────

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
  { key: 'torres', label: 'Torres' },
  { key: 'tipologias', label: 'Tipologias' },
  { key: 'porterias', label: 'Porterias' },
];

export default function AdministradorArquitecturaPage() {
  const [activeTab, setActiveTab] = useState('torres');
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
      case 'torres': return <TorresTab onSelectTorre={setTorreDetail} />;
      case 'tipologias': return <TipologiasTab />;
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