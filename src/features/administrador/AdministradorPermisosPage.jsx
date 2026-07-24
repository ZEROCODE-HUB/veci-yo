import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import SelectField from '../../components/ui/SelectField';
import Toggle from '../../components/ui/Toggle';
import Button from '../../components/ui/Button';
import InfoButton from '../../components/ui/InfoButton';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { opcionesSiNo, estanciasMinimas, horariosCheckin } from '../../data/mockData';

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

const sectionTitleStyle = {
  fontSize: theme.fonts.sizes.md,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
};

const ESTANCIA_BOOLEANOS = ['permiteVisitas', 'permiteCorrespondencia', 'permiteHuespedNinos', 'permiteMascotas', 'permiteCocherasVisit'];

function EstanciaCampos({ valores, onChange, incluirMaxima, estanciaMaxima }) {
  const setField = (key) => (val) => onChange(key, val);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' }}>
      {ESTANCIA_BOOLEANOS.map(key => (
        <div key={key}>
          <span style={labelStyle}>{{
            permiteVisitas: 'Permite visitas',
            permiteCorrespondencia: 'Permite correspondencia',
            permiteHuespedNinos: 'Permite huésped niños',
            permiteMascotas: 'Permite mascotas',
            permiteCocherasVisit: 'Permite cocheras de visit.',
          }[key]}</span>
          <Toggle value={valores[key] === 'Sí'} onChange={v => setField(key)(v ? 'Sí' : 'No')} />
        </div>
      ))}
      <div>
        <span style={labelStyle}>Estancia mínima (días)</span>
        <input type="number" min="1" value={parseInt(valores.estanciaMinima) || 1} onChange={e => setField('estanciaMinima')(e.target.value + ' días')}
          style={{ width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
      </div>
      {incluirMaxima && (
        <div>
          <span style={labelStyle}>Estancia máxima (días)</span>
          <input type="number" min="1" value={parseInt(estanciaMaxima) || 3} onChange={e => setField('estanciaMaxima')(e.target.value + ' días')}
            style={{ width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}
      <div>
        <span style={labelStyle}>Horario checkin</span>
        <SelectField value={valores.horarioCheckin} options={horariosCheckin} onChange={setField('horarioCheckin')} placeholder="Seleccionar" />
      </div>
    </div>
  );
}

export default function AdministradorPermisosPage() {
  const { permisos, actualizarPermisos } = useApp();
  const [form, setForm] = useState({
    ...permisos,
    diferenciaEstancia: permisos.diferenciaEstancia ?? false,
    estanciaCorta: {
      ...permisos.estanciaCorta,
      estanciaMaxima: permisos.estanciaCorta?.estanciaMaxima || '3 días',
    },
  });
  const [showExito, setShowExito] = useState(false);

  const diferenciaEstancia = form.diferenciaEstancia;

  const setFlag = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const setEstanciaCorta = (key, value) => {
    setForm(prev => {
      const updated = { ...prev, estanciaCorta: { ...prev.estanciaCorta, [key]: value } };
      if (key === 'estanciaMaxima') {
        updated.estanciaLarga = { ...updated.estanciaLarga, estanciaMinima: value };
      }
      return updated;
    });
  };

  const setEstanciaLarga = (key, value) => {
    setForm(prev => ({ ...prev, estanciaLarga: { ...prev.estanciaLarga, [key]: value } }));
  };

  const handleGuardar = () => {
    actualizarPermisos(form);
    setShowExito(true);
  };

  const campoLargaMinima = diferenciaEstancia ? form.estanciaCorta.estanciaMaxima || '3 días' : form.estanciaLarga.estanciaMinima;

  return (
    <AppShell>
      <PageHeader title="Editar permisos viviendas" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Correspondencia */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={sectionTitleStyle}>Correspondencia</h3>
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Permitir entrega directa en vivienda</span>
              <InfoButton
                titulo="Entrega directa en vivienda"
                descripcion="Si está activo, el repartidor puede subir directamente al departamento a entregar. Si está desactivado, el residente debe bajar a portería a recibir."
                variant="info"
                size={16}
              />
            </div>
            <Toggle value={form.entregaDirecta} onChange={setFlag('entregaDirecta')} />
          </div>
        </div>

        {/* Huéspedes Temporales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={sectionTitleStyle}>Huéspedes Temporales</h3>
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>Habilitar funcionalidad de renta corta</span>
            <Toggle value={form.huespedesTemporales} onChange={setFlag('huespedesTemporales')} />
          </div>
        </div>

        {/* Diferenciación estancia corta / larga */}
        <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
              ¿Su edificio diferencia estancia corta de estancia larga?
            </span>
            <Toggle value={diferenciaEstancia} onChange={v => setForm(prev => ({ ...prev, diferenciaEstancia: v }))} />
          </div>
          <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textMuted, margin: 0, lineHeight: 1.4 }}>
            Si está desactivado, se usará una única configuración de estancia sin diferenciar corta/larga.
          </p>
        </div>

        {!diferenciaEstancia && (
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={sectionTitleStyle}>Configuración de estancia</h3>
            <EstanciaCampos valores={form.estanciaCorta} onChange={setEstanciaCorta} />
          </div>
        )}

        {diferenciaEstancia && (
          <>
            <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={sectionTitleStyle}>Estancia corta</h3>
              <EstanciaCampos valores={form.estanciaCorta} onChange={setEstanciaCorta} incluirMaxima estanciaMaxima={form.estanciaCorta.estanciaMaxima} />
            </div>
            <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <h3 style={sectionTitleStyle}>Estancia larga</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 10px' }}>
                {ESTANCIA_BOOLEANOS.map(key => (
                  <div key={key}>
                    <span style={labelStyle}>{{
                      permiteVisitas: 'Permite visitas',
                      permiteCorrespondencia: 'Permite correspondencia',
                      permiteHuespedNinos: 'Permite huésped niños',
                      permiteMascotas: 'Permite mascotas',
                      permiteCocherasVisit: 'Permite cocheras de visit.',
                    }[key]}</span>
                    <Toggle value={form.estanciaLarga[key] === 'Sí'} onChange={v => setEstanciaLarga(key, v ? 'Sí' : 'No')} />
                  </div>
                ))}
                <div>
                  <span style={labelStyle}>Estancia mínima (días)</span>
                  <input type="number" min="1" value={parseInt(campoLargaMinima) || 1} onChange={v => setEstanciaLarga('estanciaMinima', v.target.value + ' días')}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: theme.radius.lg, border: `1.5px solid ${theme.colors.border}`, fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, background: theme.colors.bgCard, outline: 'none', boxSizing: 'border-box' }} />
                  <p style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.textMuted, marginTop: '2px' }}>
                    Se toma del valor de "Estancia máxima" de Estancia corta
                  </p>
                </div>
                <div>
                  <span style={labelStyle}>Horario checkin</span>
                  <SelectField value={form.estanciaLarga.horarioCheckin} options={horariosCheckin} onChange={v => setEstanciaLarga('horarioCheckin', v)} placeholder="Seleccionar" />
                </div>
              </div>
            </div>
          </>
        )}

        <Button variant="primary" fullWidth onClick={handleGuardar} style={{ marginTop: '4px' }}>
          Guardar
        </Button>
      </div>

      <Modal isOpen={showExito} onClose={() => setShowExito(false)} title="Editar Permisos">
        <p style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
          Sus permisos se guardaron con éxito
        </p>
      </Modal>
    </AppShell>
  );
}
