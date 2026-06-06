import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Calendar from '../../components/ui/Calendar';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import {
  categorias, logisticas, estadosEncomienda, torres, pisos
} from '../../data/mockData';

const unidades = ['C 103','C 104','C 107','F 406','C 507','C 113','C 106','C 108','C 105','L 012','M 113','C 110','C 117','C 116','C 118','C 114','C 120','C 109','C 111','C 119','C 112','C 115'];

export default function CorrespondenciaAgregarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const informarItem = location.state?.informar || null;
  const { agregarCorrespondencia } = useApp();

  const [categoria, setCategoria] = useState('');
  const [logistica, setLogistica] = useState('');
  const [instrucciones, setInstrucciones] = useState('');
  const [entregaEnPuerta, setEntregaEnPuerta] = useState(false);
  const [torre, setTorre] = useState('');
  const [piso, setPiso] = useState('');
  const [estadoEncomienda, setEstadoEncomienda] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUnidades, setSelectedUnidades] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const toggleUnidad = (u) => {
    setSelectedUnidades(prev =>
      prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]
    );
  };

  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
    setSelectedUnidades(!selectAll ? [...unidades] : []);
  };

  const handleAgregar = () => {
    if (!categoria) return;
    agregarCorrespondencia({
      empresa: logistica || 'Desconocido',
      unidad: selectedUnidades[0] || '504 C',
      nombre: 'Destinatario',
      ci: '0000000000',
      estado: informarItem ? 'En Portería' : 'No Recibido',
      categoria,
      logistica,
      descripcion,
      entregaEnPuerta,
      torre,
      piso,
      estadoEncomienda,
    });
    setShowSuccess(true);
  };

  const successItem = {
    empresa: logistica || 'Expreso el pajaro',
    unidad: '504 C',
    nombre: 'Anuel Flores',
    ci: '1785643581',
    estado: 'En Portería',
    fecha: new Date().toLocaleDateString('es-AR'),
  };

  return (
    <AppShell>
      <PageHeader title="Agregar Correspondencia" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!informarItem && (
          <>
            <SelectField label="Seleccione categoría:" value={categoria} options={categorias} onChange={setCategoria} />
            <SelectField label="Seleccione logística:" value={logistica} options={logisticas} onChange={setLogistica} />

            <div style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius['2xl'],
              padding: '13px 16px',
              border: `1px solid ${theme.colors.border}`,
              position: 'relative',
            }}>
              <textarea
                value={instrucciones}
                onChange={e => setInstrucciones(e.target.value)}
                placeholder="Instrucciones adicionales"
                rows={3}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: theme.fonts.sizes.base,
                  fontFamily: theme.fonts.family,
                  color: theme.colors.text,
                  resize: 'none',
                }}
              />
              <span style={{ position: 'absolute', right: '14px', top: '14px', color: theme.colors.textMuted }}>✏️</span>
            </div>

            <Toggle value={entregaEnPuerta} onChange={setEntregaEnPuerta} labelRight="Entrega en puerta" />

            {/* Torre / Piso */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: theme.fonts.weights.semibold }}>Torre:</span>
                <select
                  value={torre}
                  onChange={e => setTorre(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: theme.radius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.bgCard,
                    fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.sm,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-</option>
                  {torres.map(t => <option key={t} value={t}>{t.replace('Torre ', '')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: theme.fonts.weights.semibold }}>Piso:</span>
                <select
                  value={piso}
                  onChange={e => setPiso(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: theme.radius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.bgCard,
                    fontFamily: theme.fonts.family,
                    fontSize: theme.fonts.sizes.sm,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">-</option>
                  {pisos.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Calendar */}
            <Calendar selected={selectedDate} onSelect={setSelectedDate} />

            {/* Unit selector */}
            <div>
              <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, marginBottom: '10px', lineHeight: 1.4 }}>
                Seleccione el departamento al cual va destinado la correspondencia recibida
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Toggle value={selectAll} onChange={toggleSelectAll} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Seleccionar todo</span>
              </div>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                background: theme.colors.bgCard,
                borderRadius: theme.radius.xl,
                padding: '12px',
                border: `1px solid ${theme.colors.border}`,
              }}>
                {unidades.map(u => (
                  <button
                    key={u}
                    onClick={() => toggleUnidad(u)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: theme.radius.full,
                      border: `1.5px solid ${selectedUnidades.includes(u) ? theme.colors.primary : theme.colors.border}`,
                      background: selectedUnidades.includes(u) ? theme.colors.primaryLight : 'transparent',
                      fontSize: theme.fonts.sizes.xs,
                      fontFamily: theme.fonts.family,
                      cursor: 'pointer',
                      color: theme.colors.text,
                      fontWeight: selectedUnidades.includes(u) ? theme.fonts.weights.semibold : theme.fonts.weights.normal,
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Estado de encomienda (always shown) */}
        <SelectField label="Estado de encomienda:" value={estadoEncomienda} options={estadosEncomienda} onChange={setEstadoEncomienda} />

        <div style={{
          background: theme.colors.bgCard,
          borderRadius: theme.radius['2xl'],
          padding: '13px 16px',
          border: `1px solid ${theme.colors.border}`,
          position: 'relative',
        }}>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            placeholder="Descripción de la encomienda"
            rows={3}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: theme.fonts.sizes.base,
              fontFamily: theme.fonts.family,
              color: theme.colors.text,
              resize: 'none',
            }}
          />
          <span style={{ position: 'absolute', right: '14px', top: '14px', color: theme.colors.textMuted }}>✏️</span>
        </div>

        {/* Photo upload */}
        <div>
          <p style={{ textAlign: 'center', fontWeight: theme.fonts.weights.semibold, marginBottom: '8px' }}>Sube una o varias fotos</p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.colors.bgCard,
            borderRadius: theme.radius['2xl'],
            padding: '13px 16px',
            border: `1px solid ${theme.colors.border}`,
          }}>
            <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.medium }}>Elegir Archivo</span>
            <span style={{ fontSize: '20px' }}>📷</span>
          </div>
          <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'right', marginTop: '4px' }}>
            Se adjuntaron img_235, img_859.
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={handleAgregar}>Agregar</Button>
        <div style={{ height: '16px' }} />
      </div>

      {/* Success modal */}
      <Modal isOpen={showSuccess} onClose={() => { setShowSuccess(false); navigate('/correspondencia'); }} title="Correspondencia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.semibold }}>
            ¡Correspondencia cargada con exito!
          </p>
          <div style={{
            border: `1.5px solid ${theme.colors.primary}`,
            borderRadius: theme.radius.xl,
            padding: '14px 16px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <div style={{ fontWeight: theme.fonts.weights.semibold }}>{successItem.empresa}: {successItem.unidad}</div>
            <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md }}>{successItem.nombre}</div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI: {successItem.ci}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <Badge status="En Portería" />
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{successItem.fecha}</span>
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
