import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import { useApp } from '../../context/AppContext';

export default function PropietarioAgregarServicioPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();

  const [form, setForm] = useState({
    nombreServicio: '',
    nombreEmpresa: '',
    numeroCliente: '',
    numeroMedidor: '',
    primerAviso: '',
    segundoAviso: '',
    correoFactura: '',
    codigoArea: '',
    numeroTelefono: '',
  });

  const setField = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const handleAgregar = () => {
    if (!form.nombreServicio.trim()) {
      return;
    }
    navigate(-1);
  };

  return (
    <AppShell>
      <PageHeader title="Agregar servicio" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <InputField value={form.nombreServicio} onChange={setField('nombreServicio')} placeholder="Nombre del servicio" showEditIcon />
        <InputField value={form.nombreEmpresa} onChange={setField('nombreEmpresa')} placeholder="Nombre de la empresa del servicio" showEditIcon />
        <InputField value={form.numeroCliente} onChange={setField('numeroCliente')} placeholder="Numero de cliente" showEditIcon />
        <InputField value={form.numeroMedidor} onChange={setField('numeroMedidor')} placeholder="Numero de medidor" showEditIcon />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <InputField value={form.primerAviso} onChange={setField('primerAviso')} placeholder="Primer Aviso" showEditIcon />
          <InputField value={form.segundoAviso} onChange={setField('segundoAviso')} placeholder="Segundo Aviso" showEditIcon />
        </div>

        <InputField value={form.correoFactura} onChange={setField('correoFactura')} placeholder="Correo de copia de envió de factura" showEditIcon type="email" />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <InputField value={form.codigoArea} onChange={setField('codigoArea')} placeholder="Código Area" showEditIcon />
          <InputField value={form.numeroTelefono} onChange={setField('numeroTelefono')} placeholder="Numero de telefono" showEditIcon />
        </div>

        <div style={{ height: '12px' }} />

        <Button variant="primary" fullWidth onClick={handleAgregar}>
          Agregar servicio
        </Button>

        <div style={{ height: '24px' }} />
      </div>
    </AppShell>
  );
}
