import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Tabs from '../../components/ui/Tabs';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { categoriasReclamo } from '../../data/mockData';
import iconAdjuntarDocumento from '../../assets/icons/shared/adjuntar-documento.png';
import iconAdjuntarImagen from '../../assets/icons/shared/adjuntar-imagen.png';

const CAMPOS_VACIOS = { titulo: '', descripcion: '', modelo: '', categoria: '' };

export default function ReclamoNuevoPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { agregarReclamo, addToast } = useApp();
  const preseleccion = location.state || {};
  const [form, setForm] = useState({
    ...CAMPOS_VACIOS,
    categoria: preseleccion.categoriaPreseleccionada || '',
    titulo: preseleccion.titulo || '',
    descripcion: preseleccion.descripcion || '',
  });
  const [errors, setErrors] = useState({});
  const [creado, setCreado] = useState(null);

  const setField = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleEnviar = () => {
    const nextErrors = {};
    if (!form.titulo) nextErrors.titulo = 'Campo requerido';
    if (!form.descripcion) nextErrors.descripcion = 'Campo requerido';
    if (!form.modelo) nextErrors.modelo = 'Campo requerido';
    if (!form.categoria) nextErrors.categoria = 'Selecciona una categoría';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const nuevo = agregarReclamo(form);
    setCreado(nuevo);
  };

  const cerrarExito = () => {
    setCreado(null);
    navigate('/perfil/soporte/reclamos', { replace: true });
  };

  return (
    <AppShell>
      <PageHeader title="Crear PQRSI" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <InputField
          label="Titulo*"
          value={form.titulo}
          onChange={setField('titulo')}
          placeholder="Describe brevemente el motivo"
          multiline
          rows={2}
          error={errors.titulo}
        />
        <InputField
          label="Descripción*"
          value={form.descripcion}
          onChange={setField('descripcion')}
          placeholder="Describe el problema con el mayor detalle posible"
          multiline
          rows={3}
          error={errors.descripcion}
        />
        <InputField
          label="Modelo del dipositivo*"
          value={form.modelo}
          onChange={setField('modelo')}
          placeholder="Ej. iPhone 16 pro max"
          showEditIcon={false}
          error={errors.modelo}
        />

        <div>
          <label style={{
            display: 'block',
            fontSize: theme.fonts.sizes.sm,
            color: theme.colors.textSecondary,
            marginBottom: '6px',
            fontWeight: theme.fonts.weights.medium,
          }}>
            Categoria*
          </label>
          <Tabs
            tabs={categoriasReclamo}
            active={form.categoria}
            onChange={cat => setField('categoria')(cat || '')}
            variant="chip"
            allowDeselect={false}
          />
          {errors.categoria && (
            <span style={{ display: 'block', marginTop: '6px', fontSize: theme.fonts.sizes.xs, color: theme.colors.danger, fontWeight: theme.fonts.weights.medium }}>
              {errors.categoria}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginTop: '4px' }}>
          {[
            { key: 'documento', label: 'Adjuntar Documento', icon: iconAdjuntarDocumento },
            { key: 'imagen', label: 'Adjuntar Imagen', icon: iconAdjuntarImagen },
          ].map(adj => (
            <button
              key={adj.key}
              onClick={() => addToast('Funcionalidad en desarrollo')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
              }}
            >
              <img src={adj.icon} alt={adj.label} style={{ width: '64px', height: '64px', borderRadius: theme.radius.lg, objectFit: 'cover' }} />
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, textAlign: 'center' }}>
                {adj.label}
              </span>
            </button>
          ))}
        </div>

        <Button variant="primary" fullWidth onClick={handleEnviar}>Enviar</Button>
      </div>

      <Modal isOpen={!!creado} onClose={cerrarExito} title="Se creo su reclamo con exito">
        {creado && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', textAlign: 'center' }}>
            <h3 style={{ fontSize: theme.fonts.sizes.lg, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, margin: 0 }}>
              N°:{creado.numero}
            </h3>
            <span style={{
              padding: '4px 18px',
              borderRadius: theme.radius.full,
              background: theme.colors.success,
              color: '#fff',
              fontSize: theme.fonts.sizes.sm,
              fontWeight: theme.fonts.weights.semibold,
            }}>
              {creado.categoria}
            </span>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
              Podrá ver su estado en todo momento con la ultima fecha de revisión del mismo, le llegara un correo con el detalle del mismo.
            </p>
            <Button variant="primary" fullWidth onClick={cerrarExito}>Aceptar</Button>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
