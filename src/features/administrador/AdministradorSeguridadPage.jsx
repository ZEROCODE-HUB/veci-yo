import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import SelectField from '../../components/ui/SelectField';
import InputField from '../../components/ui/InputField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import DotsMenuButton from './components/DotsMenuButton';
import { ciudadesCalendario, diasSemana, rangosHora, garitas } from '../../data/mockData';

const labelStyle = {
  display: 'block',
  fontSize: theme.fonts.sizes.sm,
  color: theme.colors.textSecondary,
  marginBottom: '6px',
  fontWeight: theme.fonts.weights.medium,
};

const cardStyle = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  boxShadow: theme.shadows.card,
};

const DIAS_SEMANA_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function estaDeTurno(guardia) {
  if (!guardia.turnos || guardia.turnos.length === 0) return false;
  const ahora = new Date();
  const diaActual = DIAS_SEMANA_ES[ahora.getDay()];
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
  return guardia.turnos.some(t => {
    if (t.dia !== diaActual) return false;
    const partes = t.hora.split(' a ');
    if (partes.length !== 2) return false;
    const [hInicio, mInicio] = partes[0].split(':').map(Number);
    const [hFin, mFin] = partes[1].split(':').map(Number);
    const inicio = hInicio * 60 + mInicio;
    const fin = hFin * 60 + mFin;
    return minutosActuales >= inicio && minutosActuales < fin;
  });
}

const TURNOS_TRABAJO = ['Mañana', 'Tarde', 'Noche'];
const turnoDeHora = (hora) => {
  const inicio = parseInt(hora, 10);
  if (inicio >= 6 && inicio < 12) return 'Mañana';
  if (inicio >= 12 && inicio < 18) return 'Tarde';
  return 'Noche';
};

const FORM_VACIO = {
  nombre: '', correo: '', cedula: '', diasCalendario: '',
  turnos: [{ dia: '', hora: '' }],
  garita: '',
  permisoChat: true,
  permisoLlamadas: true,
};

export default function AdministradorSeguridadPage() {
  const { guardias, agregarGuardia, actualizarGuardia, eliminarGuardia, addToast } = useApp();

  const [vista, setVista] = useState('lista');
  const [modoForm, setModoForm] = useState('agregar');
  const [guardiaActivo, setGuardiaActivo] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);

  const [menuGuardia, setMenuGuardia] = useState(null);
  const [deleteGuardia, setDeleteGuardia] = useState(null);
  const [showSuccessGuardia, setShowSuccessGuardia] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showTurnosModal, setShowTurnosModal] = useState(false);
  const [turnosGuardiaActivo, setTurnosGuardiaActivo] = useState(null);
  const [turnoRecurrente, setTurnoRecurrente] = useState(false);
  const [recurrenciaForm, setRecurrenciaForm] = useState({ diasSemana: [], horaInicio: '', horaFin: '' });
  const [rotacionActiva, setRotacionActiva] = useState(false);
  const [tipoRotacion, setTipoRotacion] = useState('semanal');
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ fecha: '', horaInicio: '', horaFin: '' });

  const [filterOpen, setFilterOpen] = useState(false);
  const [filtroHorario, setFiltroHorario] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroDia, setFiltroDia] = useState('');

  const guardiasFiltrados = guardias.filter(g => {
    if (filtroHorario && !g.turnos.some(t => t.hora === filtroHorario)) return false;
    if (filtroTurno && !g.turnos.some(t => turnoDeHora(t.hora) === filtroTurno)) return false;
    if (filtroDia && !g.turnos.some(t => t.dia === filtroDia)) return false;
    return true;
  });

  const setField = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const setTurno = (idx, key) => (value) => setForm(prev => ({
    ...prev,
    turnos: prev.turnos.map((t, i) => i === idx ? { ...t, [key]: value } : t),
  }));
  const addTurno = () => setForm(prev => ({ ...prev, turnos: [...prev.turnos, { dia: '', hora: '' }] }));
  const removeTurno = (idx) => setForm(prev => ({ ...prev, turnos: prev.turnos.filter((_, i) => i !== idx) }));

  const abrirAgregar = () => {
    setModoForm('agregar');
    setGuardiaActivo(null);
    setForm(FORM_VACIO);
    setErrorMsg('');
    setVista('form');
  };

  const abrirEditar = (guardia) => {
    setMenuGuardia(null);
    setModoForm('editar');
    setGuardiaActivo(guardia);
    setForm({ ...FORM_VACIO, ...guardia, turnos: guardia.turnos.map(t => ({ ...t })) });
    setErrorMsg('');
    setVista('form');
  };

  const volverALista = () => { setVista('lista'); setGuardiaActivo(null); };

  const handleSubmitForm = () => {
    // Validación requerida
    if (!form.nombre.trim()) { setErrorMsg('El nombre es obligatorio'); return; }
    if (!form.correo.trim()) { setErrorMsg('El correo es obligatorio'); return; }
    if (!form.turnos.some(t => t.hora)) { setErrorMsg('Debe ingresar al menos un horario'); return; }
    setErrorMsg('');

    if (modoForm === 'agregar') {
      agregarGuardia(form);
      setShowSuccessGuardia(true);
    } else {
      setVista('confirmacion');
    }
  };

  const confirmarEdicion = () => {
    actualizarGuardia({ ...guardiaActivo, ...form });
    volverALista();
  };

  const confirmarEliminar = () => { eliminarGuardia(deleteGuardia); setDeleteGuardia(null); };

  // ── Vista: formulario Agregar / Editar ──────────────────────────────────
  if (vista === 'form') {
    return (
      <AppShell>
        <PageHeader title={modoForm === 'agregar' ? 'Agregar seguridad' : 'Editar seguridad'} onBack={volverALista} />
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <InputField label="Nombre completo *" value={form.nombre} onChange={setField('nombre')} placeholder="Ej: Roberto Hornado" showEditIcon={false} />
            <InputField label="Correo *" value={form.correo} onChange={setField('correo')} placeholder="correo@ejemplo.com" type="email" showEditIcon={false} />
            <InputField label="Cédula" value={form.cedula} onChange={setField('cedula')} placeholder="N° de identificación" showEditIcon={false} />
            <div>
              <span style={labelStyle}>Días del calendario</span>
              <SelectField value={form.diasCalendario} options={ciudadesCalendario} onChange={setField('diasCalendario')} placeholder="Seleccionar" />
            </div>
          </div>

          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
                Día/hora de la semana *
              </span>
              <button
                onClick={addTurno}
                aria-label="Agregar día y hora"
                style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: theme.colors.primary,
                  color: '#fff', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                +
              </button>
            </div>

            {form.turnos.map((turno, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <span style={labelStyle}>Día</span>
                  <SelectField value={turno.dia} options={diasSemana} onChange={setTurno(idx, 'dia')} placeholder="Seleccionar" />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={labelStyle}>Hora</span>
                  <SelectField value={turno.hora} options={rangosHora} onChange={setTurno(idx, 'hora')} placeholder="Seleccionar" />
                </div>
                {form.turnos.length > 1 && (
                  <button
                    onClick={() => removeTurno(idx)}
                    aria-label="Quitar día y hora"
                    style={{
                      width: '50px', height: '50px', borderRadius: theme.radius['2xl'], background: 'none',
                      border: `1.5px solid ${theme.colors.border}`, color: theme.colors.danger, fontSize: '18px',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ ...cardStyle, padding: '16px' }}>
            <span style={labelStyle}>Garita o entrada</span>
            <SelectField value={form.garita} options={garitas} onChange={setField('garita')} placeholder="Seleccionar" />
          </div>

          {/* Permisos de comunicación */}
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
              Permisos de comunicación
            </span>
            <Toggle value={form.permisoChat} onChange={setField('permisoChat')} labelRight="Acceso a Chat" />
            <Toggle value={form.permisoLlamadas} onChange={setField('permisoLlamadas')} labelRight="Acceso a Llamadas" />
          </div>

          {errorMsg && (
            <div style={{ background: theme.colors.dangerLight, border: `1px solid ${theme.colors.danger}`, borderRadius: theme.radius.md, padding: '10px 14px', fontSize: theme.fonts.sizes.sm, color: theme.colors.danger }}>
              {errorMsg}
            </div>
          )}

          <Button variant="primary" fullWidth onClick={handleSubmitForm}>Guardar</Button>
        </div>

        {/* Success popup al agregar */}
        <Modal isOpen={showSuccessGuardia} onClose={() => { setShowSuccessGuardia(false); volverALista(); }} title="Creación de guardia">
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👮</div>
            <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '4px' }}>
              Guardia creado con éxito
            </p>
            <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
              {form.nombre}
            </p>
          </div>
        </Modal>
      </AppShell>
    );
  }

  // ── Vista: confirmación de edición ───────────────────────────────────────
  if (vista === 'confirmacion') {
    return (
      <AppShell>
        <PageHeader title="Confirmar edición" onBack={() => setVista('form')} />
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, textAlign: 'center', color: theme.colors.text }}>
            Revisa los datos del guardia antes de confirmar
          </p>
          <div style={{ ...cardStyle, border: `1.5px solid ${theme.colors.primary}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md, color: theme.colors.text }}>{form.nombre}</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Correo: {form.correo}</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Cédula: {form.cedula}</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Días del calendario: {form.diasCalendario}</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Garita o entrada: {form.garita}</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
              Turnos: {form.turnos.map(t => `${t.dia} ${t.hora}`).join(' · ')}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
              Permisos: {form.permisoChat ? 'Chat ✓' : 'Chat ✗'} · {form.permisoLlamadas ? 'Llamadas ✓' : 'Llamadas ✗'}
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={confirmarEdicion}>Aceptar</Button>
        </div>
      </AppShell>
    );
  }

  // ── Vista: lista ─────────────────────────────────────────────────────────
  return (
    <AppShell>
      <PageHeader
        title="Seguridad del condominio"
        action={
          <button
            onClick={abrirAgregar}
            aria-label="Agregar seguridad"
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
        {/* Filtros */}
        <div style={{ ...cardStyle, padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <span style={labelStyle}>Horarios</span>
              <SelectField value={filtroHorario} options={rangosHora} onChange={setFiltroHorario} placeholder="Todos" />
            </div>
            <div>
              <span style={labelStyle}>Turnos</span>
              <SelectField value={filtroTurno} options={TURNOS_TRABAJO} onChange={setFiltroTurno} placeholder="Todos" />
            </div>
          </div>
          {filterOpen && (
            <div style={{ marginTop: '10px', animation: 'slideDown 200ms ease' }}>
              <span style={labelStyle}>Días</span>
              <SelectField value={filtroDia} options={diasSemana} onChange={setFiltroDia} placeholder="Todos" />
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              aria-label={filterOpen ? 'Contraer filtros' : 'Expandir filtros'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary,
                fontSize: '16px', transform: filterOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms',
              }}
            >
              ▾
            </button>
          </div>
        </div>

        {/* Lista de guardias */}
        {guardiasFiltrados.map(guardia => {
          const deTurno = estaDeTurno(guardia);
          return (
          <div key={guardia.id} style={{
            ...cardStyle,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            border: deTurno ? `2px solid ${theme.colors.success}` : `1px solid ${theme.colors.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                  👤 {guardia.nombre}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                  🪪 {guardia.cedula}
                </span>
              </div>
              <DotsMenuButton onClick={() => setMenuGuardia(guardia)} />
            </div>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted }}>
              {guardia.turnos[0]?.hora} hs
            </span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span style={{
                fontSize: theme.fonts.sizes['2xs'], padding: '2px 6px', borderRadius: theme.radius.full,
                background: guardia.permisoChat !== false ? theme.colors.successLight : theme.colors.dangerLight,
                color: guardia.permisoChat !== false ? theme.colors.success : theme.colors.danger,
              }}>
                Chat {guardia.permisoChat !== false ? '✓' : '✗'}
              </span>
              <span style={{
                fontSize: theme.fonts.sizes['2xs'], padding: '2px 6px', borderRadius: theme.radius.full,
                background: guardia.permisoLlamadas !== false ? theme.colors.successLight : theme.colors.dangerLight,
                color: guardia.permisoLlamadas !== false ? theme.colors.success : theme.colors.danger,
              }}>
                Llamadas {guardia.permisoLlamadas !== false ? '✓' : '✗'}
              </span>
            </div>
          </div>
          );
        })}
      </div>

      {/* Menú "..." */}
      <BottomSheet isOpen={!!menuGuardia} onClose={() => setMenuGuardia(null)}>
        <BottomSheetOption label="Editar" onPress={() => abrirEditar(menuGuardia)} />
        <BottomSheetOption label="Gestionar turnos" onPress={() => { setTurnosGuardiaActivo(menuGuardia); setTurnoRecurrente(false); setRecurrenciaForm({ diasSemana: [], horaInicio: '', horaFin: '' }); setRotacionActiva(false); setShowTurnosModal(true); setMenuGuardia(null); }} />
        <BottomSheetOption
          label="Eliminar"
          variant="danger"
          onPress={() => { setDeleteGuardia(menuGuardia); setMenuGuardia(null); }}
        />
      </BottomSheet>

      {/* Turnos management modal */}
      <Modal isOpen={showTurnosModal} onClose={() => setShowTurnosModal(false)} title={`Turnos: ${turnosGuardiaActivo?.nombre || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Turnos actuales */}
          <div style={{ background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px' }}>
            <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '8px' }}>
              Turnos actuales
            </div>
            {turnosGuardiaActivo?.turnos?.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: i < (turnosGuardiaActivo?.turnos?.length || 0) - 1 ? `1px solid ${theme.colors.borderLight}` : 'none' }}>
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>{t.dia} — {t.hora}</span>
              </div>
            ))}
          </div>

          {/* Horario recurrente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle value={turnoRecurrente} onChange={setTurnoRecurrente} />
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Configurar horario recurrente</span>
          </div>

          {turnoRecurrente && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px' }}>
              <SelectField
                label="Días de la semana"
                value={recurrenciaForm.diasSemana}
                options={diasSemana}
                onChange={v => setRecurrenciaForm(p => ({ ...p, diasSemana: Array.isArray(v) ? v : [v] }))}
                placeholder="Seleccionar días"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <span style={labelStyle}>Hora inicio</span>
                  <SelectField value={recurrenciaForm.horaInicio} options={rangosHora} onChange={v => setRecurrenciaForm(p => ({ ...p, horaInicio: v }))} placeholder="Inicio" />
                </div>
                <div>
                  <span style={labelStyle}>Hora fin</span>
                  <SelectField value={recurrenciaForm.horaFin} options={rangosHora} onChange={v => setRecurrenciaForm(p => ({ ...p, horaFin: v }))} placeholder="Fin" />
                </div>
              </div>
              <Button variant="primary" fullWidth onClick={() => {
                addToast(`Horario recurrente configurado para ${turnosGuardiaActivo?.nombre}`, 'success');
                setTurnoRecurrente(false);
              }}>
                Guardar horario recurrente
              </Button>
            </div>
          )}

          {/* Rotación */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Toggle value={rotacionActiva} onChange={setRotacionActiva} />
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>Programar rotación de turnos</span>
          </div>

          {rotacionActiva && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, padding: '12px' }}>
              <SelectField label="Tipo de rotación" value={tipoRotacion} options={['semanal', 'quincenal', 'mensual']} onChange={setTipoRotacion} placeholder="Seleccionar" />
              <Button variant="primary" fullWidth onClick={() => {
                addToast(`Rotación ${tipoRotacion} programada para ${turnosGuardiaActivo?.nombre}`, 'success');
                setRotacionActiva(false);
              }}>
                Programar rotación
              </Button>
            </div>
          )}

          {/* Override manual */}
          <Button variant="secondary" fullWidth onClick={() => setShowOverrideForm(true)}>
            Modificar turno puntual
          </Button>

          <Button variant="ghost" fullWidth onClick={() => setShowTurnosModal(false)}>Cerrar</Button>
        </div>
      </Modal>

      {/* Override puntual */}
      <Modal isOpen={showOverrideForm} onClose={() => setShowOverrideForm(false)} title="Modificar turno puntual">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, textAlign: 'center' }}>
            Modifica manualmente un turno específico (ej. extender turno si no llegó el reemplazo)
          </p>
          <div>
            <span style={labelStyle}>Fecha</span>
            <input
              type="date"
              value={overrideForm.fecha}
              onChange={e => setOverrideForm(p => ({ ...p, fecha: e.target.value }))}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg,
                border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
                fontFamily: theme.fonts.family, color: theme.colors.text,
                background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <span style={labelStyle}>Hora inicio</span>
              <input
                type="time"
                value={overrideForm.horaInicio}
                onChange={e => setOverrideForm(p => ({ ...p, horaInicio: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg,
                  border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
                  fontFamily: theme.fonts.family, color: theme.colors.text,
                  background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <span style={labelStyle}>Hora fin</span>
              <input
                type="time"
                value={overrideForm.horaFin}
                onChange={e => setOverrideForm(p => ({ ...p, horaFin: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg,
                  border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
                  fontFamily: theme.fonts.family, color: theme.colors.text,
                  background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <Button variant="primary" fullWidth onClick={() => {
            addToast(`Turno puntual modificado para ${turnosGuardiaActivo?.nombre}`, 'success');
            setShowOverrideForm(false);
            setOverrideForm({ fecha: '', horaInicio: '', horaFin: '' });
          }}>
            Guardar modificación
          </Button>
        </div>
      </Modal>

      {/* Eliminar guardia — diseño con card de datos */}
      <Modal isOpen={!!deleteGuardia} onClose={() => setDeleteGuardia(null)} title="Eliminar guardia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, textAlign: 'center', color: theme.colors.text }}>
            ¿Seguro que deseas eliminar este guardia?
          </p>
          {deleteGuardia && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: theme.colors.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  👤
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text }}>
                    {deleteGuardia.nombre}
                  </div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                    🪪 {deleteGuardia.cedula}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, paddingLeft: '4px' }}>
                Horario: {deleteGuardia.turnos?.map(t => `${t.dia} ${t.hora}`).join(' · ')}
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={confirmarEliminar}>Aceptar</Button>
          <Button variant="ghost" fullWidth onClick={() => setDeleteGuardia(null)}>Cancelar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
