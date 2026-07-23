import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import Calendar from '../../components/ui/Calendar';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import {
  categorias, estadosEncomienda, torres, pisos
} from '../../data/mockData';

const unidades = ['C 103','C 104','C 107','F 406','C 507','C 113','C 106','C 108','C 105','L 012','M 113','C 110','C 117','C 116','C 118','C 114','C 120','C 109','C 111','C 119','C 112','C 115'];

export default function CorrespondenciaAgregarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const informarItem = location.state?.informar || null;
  const { agregarCorrespondencia, rolActivo, esResidente } = useApp();
  const accesoBloqueado = rolActivo === 'propietario' && !esResidente;

  const [categoria, setCategoria] = useState('');
  const [logistica, setLogistica] = useState('');
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
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

  // Carga de fotos — galería / cámara
  const galeriaRef = useRef(null);
  const camaraRef = useRef(null);
  const [fotos, setFotos] = useState([]);
  const [fotoError, setFotoError] = useState('');
  const [fotoPreviews, setFotoPreviews] = useState([]);
  const [showFotoSheet, setShowFotoSheet] = useState(false);

  const categoriasOptions = rolActivo === 'guardia'
    ? ['Delivery/Comida', ...categorias.slice(1)]
    : categorias;

  useEffect(() => {
    const previews = fotos.map(f => ({ url: URL.createObjectURL(f), name: f.name }));
    setFotoPreviews(previews);
    return () => previews.forEach(p => URL.revokeObjectURL(p.url));
  }, [fotos]);

  const handleFotosChange = (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (!archivos.length) return;
    const validos = archivos.filter(f => f.type.startsWith('image/'));
    setFotoError(validos.length !== archivos.length ? 'Solo se permiten archivos de imagen (JPG, PNG).' : '');
    setFotos(prev => [...prev, ...validos]);
  };

  const quitarFoto = (idx) => setFotos(prev => prev.filter((_, i) => i !== idx));

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
    const base = {
      empresa: logistica || 'Desconocido',
      unidad: selectedUnidades[0] || '504 C',
      nombre: nombre || '',
      ci: identificacion || '',
      estado: informarItem ? 'En Portería' : 'No Recibido',
      categoria,
      logistica,
      descripcion,
      entregaEnPuerta,
      torre,
      piso,
      estadoEncomienda,
    };
    if (informarItem) {
      base.informarInfo = {
        descripcion: descripcion || 'Sin descripción',
        fotos: fotos.length > 0 ? fotos.map(f => URL.createObjectURL(f)) : [],
        fechaReporte: new Date().toLocaleString('es-AR'),
        usuarioReporte: 'Personal de Seguridad',
      };
    }
    agregarCorrespondencia(base);
    setShowSuccess(true);
  };

  const successItem = {
    empresa: logistica || '',
    unidad: selectedUnidades[0] || '',
    nombre: nombre || '',
    ci: identificacion || '',
    estado: 'En Portería',
    fecha: new Date().toLocaleDateString('es-AR'),
  };

  return (
    <AppShell>
      {accesoBloqueado ? (
        <div style={{ padding: '16px', textAlign: 'center', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.base, marginTop: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
          <p>No tienes acceso a Correspondencia. Solo los Residentes pueden usar esta función.</p>
        </div>
      ) : (<>
      <PageHeader title="Agregar Correspondencia" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!informarItem && (
          <>
            <SelectField label="Seleccione categoría:" value={categoria} options={categoriasOptions} onChange={setCategoria} />

            <div style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius['2xl'],
              padding: '13px 16px',
              border: `1px solid ${theme.colors.border}`,
              position: 'relative',
            }}>
              <input
                value={logistica}
                onChange={e => setLogistica(e.target.value)}
                placeholder="Logística (empresa)"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: theme.fonts.sizes.base,
                  fontFamily: theme.fonts.family,
                  color: theme.colors.text,
                }}
              />
            </div>

            <div style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius['2xl'],
              padding: '13px 16px',
              border: `1px solid ${theme.colors.border}`,
              position: 'relative',
            }}>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Destinatario (opcional)"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: theme.fonts.sizes.base,
                  fontFamily: theme.fonts.family,
                  color: theme.colors.text,
                }}
              />
            </div>

            <div style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius['2xl'],
              padding: '13px 16px',
              border: `1px solid ${theme.colors.border}`,
              position: 'relative',
            }}>
              <input
                value={identificacion}
                onChange={e => setIdentificacion(e.target.value)}
                placeholder="Identificación (opcional)"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: theme.fonts.sizes.base,
                  fontFamily: theme.fonts.family,
                  color: theme.colors.text,
                }}
              />
            </div>

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
          </>
        )}

        {/* Estado de encomienda */}
        <SelectField label="Estado de encomienda:" value={estadoEncomienda} options={estadosEncomienda} onChange={setEstadoEncomienda} />

        {/* Descripción */}
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

        {/* Subir fotos — botón que abre Galería / Cámara */}
        <div>
          <button
            type="button"
            onClick={() => setShowFotoSheet(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: theme.colors.bgCard,
              borderRadius: theme.radius['2xl'],
              padding: '13px 16px',
              border: `1.5px dashed ${theme.colors.border}`,
              cursor: 'pointer',
              fontFamily: theme.fonts.family,
              fontSize: theme.fonts.sizes.base,
              fontWeight: theme.fonts.weights.medium,
              color: theme.colors.text,
            }}
          >
            Sube una o varias fotos
          </button>
          <input ref={galeriaRef} type="file" accept="image/*" onChange={handleFotosChange} style={{ display: 'none' }} />
          <input ref={camaraRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFotosChange} style={{ display: 'none' }} />

          {fotoError && (
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, marginTop: '6px' }}>{fotoError}</div>
          )}

          {fotoPreviews.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
              {fotoPreviews.map((p, i) => (
                <div key={i} style={{ position: 'relative', width: '64px', height: '64px' }}>
                  <img
                    src={p.url}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.border}` }}
                  />
                  <button
                    type="button"
                    onClick={() => quitarFoto(i)}
                    aria-label="Quitar foto"
                    style={{
                      position: 'absolute', top: '-6px', right: '-6px', width: '20px', height: '20px', borderRadius: '50%',
                      background: theme.colors.text, color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', border: '2px solid #fff', cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'right', marginTop: '6px' }}>
              Ningún archivo seleccionado
            </div>
          )}
        </div>

        {!informarItem && (
          <>
            {/* Calendar */}
            <Calendar selected={selectedDate} onSelect={setSelectedDate} />

            {/* Unit selector */}
            <div>
              <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.text, margin: '6px 0 14px', lineHeight: 1.4 }}>
                Seleccione el departamento al cual va destinado la correspondencia recibida
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <Toggle value={selectAll} onChange={toggleSelectAll} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Seleccionar todo</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
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
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 8px',
                      whiteSpace: 'nowrap',
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

        {!informarItem && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <SelectField label="Torre:" value={torre} options={torres} onChange={setTorre} />
            </div>
            <div style={{ flex: 1 }}>
              <SelectField label="Piso:" value={piso} options={pisos} onChange={setPiso} />
            </div>
          </div>
        )}

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

      <BottomSheet isOpen={showFotoSheet} onClose={() => setShowFotoSheet(false)}>
        <BottomSheetOption
          label="Galería"
          onPress={() => { setShowFotoSheet(false); galeriaRef.current?.click(); }}
        />
        <BottomSheetOption
          label="Cámara"
          onPress={() => { setShowFotoSheet(false); camaraRef.current?.click(); }}
        />
      </BottomSheet>
      </>)}
    </AppShell>
  );
}
