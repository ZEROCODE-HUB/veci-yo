import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import Button from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';

const sectionCard = {
  background: theme.colors.bgCard,
  borderRadius: theme.radius.xl,
  padding: '20px',
  boxShadow: theme.shadows.card,
};

const sectionTitle = {
  fontSize: theme.fonts.sizes.base,
  fontWeight: theme.fonts.weights.bold,
  color: theme.colors.text,
  marginBottom: '16px',
  textAlign: 'center',
};

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

const labelStyle = {
  display: 'block',
  fontSize: theme.fonts.sizes.sm,
  color: theme.colors.textSecondary,
  marginBottom: '6px',
  fontWeight: theme.fonts.weights.medium,
};

export default function AdministradorUbicacionPage() {
  const { addToast } = useApp();

  const [form, setForm] = useState({
    nombre: 'Condominio Las Barranqueras',
    direccion: 'Av. Las Barranqueras 246',
    ciudad: 'Lima',
    pais: 'Peru',
    ruc: '20123456789',
    telefono: '+593 999999000',
    email: 'admin@barranqueras.com',
  });

  const setField = (key) => (v) => setForm(p => ({ ...p, [key]: v }));

  const guardar = () => {
    addToast('Configuracion del condominio guardada con exito');
  };

  return (
    <AppShell>
      <PageHeader title="Administracion ubicacion" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={sectionCard}>
          <h2 style={sectionTitle}>Informacion del condominio</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <InputField
              label="Nombre del condominio"
              value={form.nombre}
              onChange={setField('nombre')}
              placeholder="Ej: Condominio Las Barranqueras"
            />

            <InputField
              label="Direccion"
              value={form.direccion}
              onChange={setField('direccion')}
              placeholder="Ej: Av. Principal 123"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <InputField
                label="Ciudad"
                value={form.ciudad}
                onChange={setField('ciudad')}
                placeholder="Ej: Lima"
              />
              <InputField
                label="Pais"
                value={form.pais}
                onChange={setField('pais')}
                placeholder="Ej: Peru"
              />
            </div>

            <InputField
              label="RUC / Identificacion fiscal"
              value={form.ruc}
              onChange={setField('ruc')}
              placeholder="Ej: 20123456789"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <InputField
                label="Telefono"
                value={form.telefono}
                onChange={setField('telefono')}
                placeholder="+593 999999000"
              />
              <InputField
                label="Correo electronico"
                value={form.email}
                onChange={setField('email')}
                placeholder="admin@condominio.com"
                type="email"
              />
            </div>

            <Button variant="primary" fullWidth onClick={guardar}>
              Guardar configuracion
            </Button>
          </div>
        </div>

        <div style={{
          ...sectionCard,
          background: theme.colors.primaryLight,
          border: `1px solid ${theme.colors.primary}`,
        }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: 1.6, textAlign: 'center' }}>
            Una vez configurado el condominio, ve a la seccion <strong>Arquitectura</strong> para registrar torres, bloques, pisos, unidades y asignar propietarios.
          </p>
        </div>
      </div>
    </AppShell>
  );
}