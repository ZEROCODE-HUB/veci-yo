import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Toggle from '../../components/ui/Toggle';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';

export default function PropietarioAceptacionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ubicacionId, unidadId } = location.state || {};
  const { unidades, configHuespedesTemporales, actualizarConfigHuespedTemporal, marcarUnidadConfigurada, addToast, usuario } = useApp();

  const unidad = unidades.find(u => u.id === unidadId) || null;
  const config = ubicacionId ? configHuespedesTemporales[ubicacionId] : null;
  const estacionamientos = unidad?.estacionamientos ?? config?.estacionamientos ?? 0;

  const [permiteRentaCorta, setPermiteRentaCorta] = useState(config?.permiteRentaCorta ?? false);
  const [permiteMascotas, setPermiteMascotas] = useState((config?.politicaMascotas ?? 'no-permitidas') === 'permitidas');
  const [aptoNinos, setAptoNinos] = useState(config?.aptoNinos ?? false);

  const handleFinalizar = () => {
    if (ubicacionId) {
      actualizarConfigHuespedTemporal(ubicacionId, {
        permiteRentaCorta,
        politicaMascotas: permiteMascotas ? 'permitidas' : 'no-permitidas',
        aptoNinos,
      });
    }
    const unidadPend = unidad || unidades.find(u => u.propietarioEmail === usuario?.correo && u.estado === 'config-pendiente');
    if (unidadPend) marcarUnidadConfigurada(unidadPend.id);
    addToast('Propiedad aceptada y configurada con éxito', 'success');
    navigate(-1);
  };

  const filaToggle = (label, value, onChange) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
      <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>{label}</span>
      <Toggle value={value} onChange={onChange} />
    </div>
  );

  return (
    <AppShell>
      <PageHeader title="Aceptar propiedad" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {unidad && (
          <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card }}>
            <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, margin: 0 }}>Propiedad</p>
            <p style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, margin: '4px 0 0' }}>
              Torre {unidad.torreNumero} · {unidad.codigo}
            </p>
          </div>
        )}

        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '4px 16px 8px', boxShadow: theme.shadows.card }}>
          {filaToggle('Permite renta corta', permiteRentaCorta, setPermiteRentaCorta)}
          {filaToggle('Permite mascotas', permiteMascotas, setPermiteMascotas)}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
            <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>Apto para niños</span>
            <Toggle value={aptoNinos} onChange={setAptoNinos} />
          </div>
        </div>

        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '16px', boxShadow: theme.shadows.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, margin: 0 }}>Estacionamientos</p>
            <p style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, margin: '4px 0 0' }}>Asignados por el Administrador</p>
          </div>
          <span style={{ fontSize: theme.fonts.sizes.md, fontWeight: theme.fonts.weights.semibold, color: theme.colors.textSecondary }}>{estacionamientos}</span>
        </div>

        <div style={{ height: '8px' }} />
        <Button variant="primary" fullWidth onClick={handleFinalizar}>Finalizar</Button>
        <div style={{ height: '16px' }} />
      </div>
    </AppShell>
  );
}
