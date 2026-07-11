import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import ImageUploadCard from '../../components/ui/ImageUploadCard';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { tiposZona } from '../../data/mockData';
import zonaIcons from '../../assets/icons/zonas';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MONEDAS = ['COP', 'USD', 'EUR', 'ARS', 'MXN'];
const TIPOS_FECHA_ESPECIAL = [
  { value: 'cerrado', label: 'Cerrado por mantenimiento' },
  { value: 'evento_privado', label: 'Evento privado' },
  { value: 'feriado', label: 'Feriado' },
  { value: 'horario_especial', label: 'Horario especial' },
];

function formDataToPayload(form) {
  return {
    id: form.id,
    nombre: form.nombre,
    tipo: form.tipo,
    descripcion: form.descripcion,
    imagen: form.imagen,
    horarioApertura: form.horarioApertura,
    horarioCierre: form.horarioCierre,
    duracionMinima: Number(form.duracionMinima),
    duracionMaxima: Number(form.duracionMaxima),
    tiempoMinimoEntreReservas: Number(form.tiempoMinimoEntreReservas),
    diasHabilitados: form.diasHabilitados,
    fechasEspeciales: form.fechasEspeciales,
    montoGarantia: Number(form.montoGarantia),
    costoLimpieza: Number(form.costoLimpieza),
    costoReserva: Number(form.costoReserva),
    moneda: form.moneda,
    activa: form.activa,
  };
}

function validate(form) {
  const errors = [];
  if (!form.nombre.trim()) errors.push('El nombre de la zona es obligatorio.');
  if (!form.tipo) errors.push('Debes seleccionar un tipo de zona.');
  if (form.horarioApertura >= form.horarioCierre) errors.push('La hora de apertura debe ser anterior a la de cierre.');
  if (form.duracionMinima < 1) errors.push('La duración mínima debe ser al menos 1 minuto.');
  if (form.duracionMaxima < form.duracionMinima) errors.push('La duración máxima no puede ser menor que la mínima.');
  if (form.tiempoMinimoEntreReservas < 0) errors.push('El tiempo entre reservas no puede ser negativo.');
  if (form.montoGarantia < 0) errors.push('El monto de garantía no puede ser negativo.');
  if (form.costoLimpieza < 0) errors.push('El costo de limpieza no puede ser negativo.');
  if (form.costoReserva < 0) errors.push('El costo de reserva no puede ser negativo.');
  if (form.diasHabilitados.length === 0) errors.push('Debes habilitar al menos un día.');
  const fechasMap = {};
  form.fechasEspeciales.forEach((fe, i) => {
    if (!fe.fecha) { errors.push(`Fecha especial #${i + 1}: la fecha es obligatoria.`); return; }
    if (fechasMap[fe.fecha]) errors.push(`Fecha especial: "${fe.fecha}" está duplicada.`);
    fechasMap[fe.fecha] = true;
    if (!fe.motivo.trim()) errors.push(`Fecha especial "${fe.fecha}": el motivo es obligatorio.`);
    if (fe.tipo === 'horario_especial' && (!fe.horaApertura || !fe.horaCierre)) errors.push(`Fecha especial "${fe.fecha}": horario especial requiere hora de apertura y cierre.`);
    if (fe.tipo === 'horario_especial' && fe.horaApertura >= fe.horaCierre) errors.push(`Fecha especial "${fe.fecha}": la hora de apertura debe ser anterior a la de cierre.`);
  });
  return errors;
}

function FechaEspecialForm({ value, onChange, onRemove }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: theme.colors.bgMuted, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="date"
          value={value.fecha}
          onChange={e => onChange({ ...value, fecha: e.target.value })}
          style={{
            flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: theme.radius.md,
            border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
            fontFamily: theme.fonts.family, background: theme.colors.bgCard,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: theme.colors.danger, cursor: 'pointer', fontSize: '18px', padding: '4px', flexShrink: 0 }}>✕</button>
      </div>
      <SelectField value={value.tipo} options={TIPOS_FECHA_ESPECIAL.map(t => t.label)} onChange={v => onChange({ ...value, tipo: TIPOS_FECHA_ESPECIAL.find(t => t.label === v)?.value || 'cerrado' })} placeholder="Tipo de excepción" />
      <input
        type="text"
        value={value.motivo}
        onChange={e => onChange({ ...value, motivo: e.target.value })}
        placeholder="Motivo (ej: Mantenimiento anual)"
        style={{
          width: '100%', padding: '8px 10px', borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm,
          fontFamily: theme.fonts.family, background: theme.colors.bgCard,
          outline: 'none', boxSizing: 'border-box',
        }}
      />
      {value.tipo === 'horario_especial' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Apertura</div>
            <input type="time" value={value.horaApertura || ''} onChange={e => onChange({ ...value, horaApertura: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, marginBottom: '4px' }}>Cierre</div>
            <input type="time" value={value.horaCierre || ''} onChange={e => onChange({ ...value, horaCierre: e.target.value })}
              style={{ width: '100%', padding: '8px', borderRadius: theme.radius.md, border: `1px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, boxShadow: theme.shadows.card, padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h2 style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

export default function AdministradorGestionZonaFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { gestionZonas, agregarGestionZona, actualizarGestionZona, addToast } = useApp();

  const esNuevo = id === 'nuevo';
  const existing = !esNuevo ? gestionZonas[id] : null;

  const [form, setForm] = useState(() => ({
    id: existing?.id || '',
    nombre: existing?.nombre || '',
    tipo: existing?.tipo || '',
    descripcion: existing?.descripcion || '',
    imagen: existing?.imagen || null,
    horarioApertura: existing?.horarioApertura || '08:00',
    horarioCierre: existing?.horarioCierre || '22:00',
    duracionMinima: existing?.duracionMinima || 60,
    duracionMaxima: existing?.duracionMaxima || 240,
    tiempoMinimoEntreReservas: existing?.tiempoMinimoEntreReservas || 30,
    diasHabilitados: existing?.diasHabilitados || [...DIAS],
    fechasEspeciales: existing?.fechasEspeciales || [],
    montoGarantia: existing?.montoGarantia || 0,
    costoLimpieza: existing?.costoLimpieza || 0,
    costoReserva: existing?.costoReserva || 0,
    moneda: existing?.moneda || 'COP',
    activa: existing?.activa !== undefined ? existing.activa : true,
  }));

  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const setField = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleDia = (dia) => {
    setForm(prev => ({
      ...prev,
      diasHabilitados: prev.diasHabilitados.includes(dia)
        ? prev.diasHabilitados.filter(d => d !== dia)
        : [...prev.diasHabilitados, dia],
    }));
  };

  const agregarFechaEspecial = () => {
    setForm(prev => ({ ...prev, fechasEspeciales: [...prev.fechasEspeciales, { fecha: '', tipo: 'cerrado', motivo: '', horaApertura: '', horaCierre: '' }] }));
  };

  const actualizarFechaEspecial = (index, data) => {
    setForm(prev => {
      const updated = [...prev.fechasEspeciales];
      updated[index] = data;
      return { ...prev, fechasEspeciales: updated };
    });
  };

  const eliminarFechaEspecial = (index) => {
    setForm(prev => ({
      ...prev,
      fechasEspeciales: prev.fechasEspeciales.filter((_, i) => i !== index),
    }));
  };

  const defaultImgSrc = zonaIcons[existing?.id] || zonaIcons[Object.keys(gestionZonas).find(k => gestionZonas[k].nombre === form.nombre)] || null;

  const handleGuardar = () => {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (validationErrors.length > 0) {
      addToast('Corrige los errores antes de guardar.', 'error');
      return;
    }
    setSaving(true);
    const payload = formDataToPayload(form);
    setTimeout(() => {
      if (esNuevo) {
        const newId = payload.id || `zona-${Date.now()}`;
        agregarGestionZona({ ...payload, id: newId });
      } else {
        actualizarGestionZona(id, payload);
      }
      setSaving(false);
      setShowSuccess(true);
    }, 400);
  };

  return (
    <AppShell>
      <PageHeader title={esNuevo ? 'Crear Zona Común' : 'Editar Zona Común'} onBack={() => navigate(-1)} />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 250ms ease' }}>
        {/* Información General */}
        <SectionCard title="Información General">
          <InputField label="Nombre de la zona" value={form.nombre} onChange={setField('nombre')} placeholder="Ej: BBQ Principal" />
          <SelectField label="Tipo de zona" value={form.tipo} options={tiposZona} onChange={setField('tipo')} placeholder="Selecciona un tipo" />
          <InputField label="Descripción (opcional)" value={form.descripcion} onChange={setField('descripcion')} placeholder="Describe la zona común" multiline rows={3} />
          <ImageUploadCard
            label="Imagen / Banner"
            value={form.imagen}
            onChange={setField('imagen')}
            placeholder="Subir imagen personalizada"
            height="140px"
            helperText={defaultImgSrc && !form.imagen ? 'Se usará la imagen predeterminada del tipo de zona' : ''}
          />
        </SectionCard>

        {/* Configuración de horarios */}
        <SectionCard title="Configuración de horarios">
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>Hora de apertura</div>
              <input type="time" value={form.horarioApertura} onChange={e => setField('horarioApertura')(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.base, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>Hora de cierre</div>
              <input type="time" value={form.horarioCierre} onChange={e => setField('horarioCierre')(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.base, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>Duración mínima (min)</div>
              <input type="number" min="1" value={form.duracionMinima} onChange={e => setField('duracionMinima')(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.base, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>Duración máxima (min)</div>
              <input type="number" min="1" value={form.duracionMaxima} onChange={e => setField('duracionMaxima')(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.base, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '6px', fontWeight: theme.fonts.weights.medium }}>Tiempo mínimo entre reservas (min)</div>
            <input type="number" min="0" value={form.tiempoMinimoEntreReservas} onChange={e => setField('tiempoMinimoEntreReservas')(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: theme.radius['2xl'], border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.base, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '8px', fontWeight: theme.fonts.weights.medium }}>Días habilitados</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {DIAS.map(dia => {
                const activo = form.diasHabilitados.includes(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    onClick={() => toggleDia(dia)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: theme.radius.full,
                      border: `1.5px solid ${activo ? theme.colors.primary : theme.colors.border}`,
                      background: activo ? theme.colors.primaryLight : 'transparent',
                      color: theme.colors.text,
                      fontSize: theme.fonts.sizes.xs,
                      fontFamily: theme.fonts.family,
                      fontWeight: activo ? theme.fonts.weights.semibold : theme.fonts.weights.normal,
                      cursor: 'pointer',
                      transition: `all ${theme.transitions.fast}`,
                    }}
                  >
                    {dia}{activo ? ' ✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* Fechas especiales */}
        <SectionCard title="Fechas especiales">
          <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, margin: 0, lineHeight: 1.4 }}>
            Administra excepciones como mantenimiento, eventos privados o feriados.
          </p>
          {form.fechasEspeciales.map((fe, i) => (
            <FechaEspecialForm
              key={i}
              value={fe}
              onChange={(data) => actualizarFechaEspecial(i, data)}
              onRemove={() => eliminarFechaEspecial(i)}
            />
          ))}
          <Button variant="ghost" fullWidth onClick={agregarFechaEspecial} style={{ color: theme.colors.secondary, fontSize: theme.fonts.sizes.sm }}>
            + Agregar fecha especial
          </Button>
        </SectionCard>

        {/* Configuración económica */}
        <SectionCard title="Configuración económica">
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <InputField label="Monto de garantía" value={form.montoGarantia} onChange={setField('montoGarantia')} type="number" placeholder="0" />
            </div>
            <div style={{ flex: 1 }}>
              <InputField label="Costo de limpieza" value={form.costoLimpieza} onChange={setField('costoLimpieza')} type="number" placeholder="0" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <InputField label="Costo de reserva" value={form.costoReserva} onChange={setField('costoReserva')} type="number" placeholder="0" />
            </div>
            <div style={{ flex: 1 }}>
              <SelectField label="Moneda" value={form.moneda} options={MONEDAS} onChange={setField('moneda')} />
            </div>
          </div>
        </SectionCard>

        {/* Estado */}
        <SectionCard title="Estado">
          <Toggle value={form.activa} onChange={setField('activa')} labelRight={form.activa ? 'Activa' : 'Inactiva'} />
          <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, margin: 0 }}>
            {form.activa
              ? 'La zona estará disponible para reservas de los residentes.'
              : 'Al estar inactiva, no aparecerá para reservas de los residentes.'}
          </p>
        </SectionCard>

        {/* Errores de validación */}
        {errors.length > 0 && (
          <div style={{ background: theme.colors.dangerLight, borderRadius: theme.radius.lg, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {errors.map((err, i) => (
              <p key={i} style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, margin: 0, lineHeight: 1.4 }}>⚠ {err}</p>
            ))}
          </div>
        )}

        <Button variant="primary" fullWidth onClick={handleGuardar} disabled={saving}>
          {saving ? 'Guardando...' : esNuevo ? 'Crear Zona Común' : 'Guardar Cambios'}
        </Button>
        <div style={{ height: '16px' }} />
      </div>

      {/* Success modal */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: showSuccess ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.5)', animation: 'fadeIn 200ms ease' }}>
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius['2xl'], padding: '32px 24px', maxWidth: '320px', width: '90%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center', boxShadow: theme.shadows.modal, animation: 'scaleIn 250ms ease' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: theme.colors.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>✓</div>
          <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, margin: 0 }}>
            {esNuevo ? 'Zona común creada con éxito' : 'Zona común actualizada con éxito'}
          </p>
          <Button variant="primary" fullWidth onClick={() => { setShowSuccess(false); navigate('/admin/gestion-zonas'); }}>
            Ir a Gestión de Zonas
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
