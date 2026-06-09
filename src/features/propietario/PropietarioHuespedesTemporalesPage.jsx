import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import InputField from '../../components/ui/InputField';
import SelectField from '../../components/ui/SelectField';
import theme from '../../config/theme';

const TIPOS_ACOMODACION = ['Apartamento', 'Casa', 'Estudio', 'Suite', 'Habitación'];

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function CampoEditable({ label, value, onChange }) {
  const [editando, setEditando] = useState(false);
  return (
    <div style={{ paddingBottom: '12px', borderBottom: `1px solid ${theme.colors.borderLight}` }}>
      {editando ? (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={() => setEditando(false)}
            style={{ flex: 1, border: `1.5px solid ${theme.colors.borderFocus}`, borderRadius: theme.radius.md, padding: '6px 10px', fontSize: theme.fonts.sizes.sm, fontFamily: theme.fonts.family, outline: 'none' }}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
            {label}: <span style={{ fontWeight: theme.fonts.weights.normal, color: theme.colors.textSecondary }}>{value}</span>
          </span>
          <button onClick={() => setEditando(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
            <PencilIcon />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PropietarioHuespedesTemporalesPage() {
  const [identificacion, setIdentificacion] = useState('1235678567354');
  const [pdf, setPdf] = useState('archivo.pdf');
  const [tipoAcomodacion, setTipoAcomodacion] = useState('Apartamento');

  const [showTRA, setShowTRA] = useState(false);
  const [showTRASuccess, setShowTRASuccess] = useState(false);
  const [tra, setTra] = useState({ fechaInicio: '01/09/2025', fechaEgreso: '08/09/2025', precioTotal: '$90 USD' });

  const setTraField = (key) => (v) => setTra(p => ({ ...p, [key]: v }));

  const handleEnviarTRA = () => {
    setShowTRA(false);
    setShowTRASuccess(true);
  };

  return (
    <AppShell>
      <PageHeader title="Conf. Huéspedes Temporales" />

      <div className="scrollable" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* RNT info */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '20px', boxShadow: theme.shadows.card }}>
          <h3 style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '16px' }}>
            Información RNT
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CampoEditable label="Identificación" value={identificacion} onChange={setIdentificacion} />
            <CampoEditable label="PDF" value={pdf} onChange={setPdf} />
          </div>
        </div>

        {/* Alquiler info */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '20px', boxShadow: theme.shadows.card }}>
          <h3 style={{ textAlign: 'center', fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.bold, color: theme.colors.text, marginBottom: '16px' }}>
            Información Alquiler
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text }}>
              Tipo de acomodación: <span style={{ color: theme.colors.textSecondary }}>{tipoAcomodacion}</span>
            </span>
            <div style={{ width: '120px' }}>
              <SelectField value={tipoAcomodacion} options={TIPOS_ACOMODACION} onChange={setTipoAcomodacion} placeholder="Tipo" />
            </div>
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={() => setShowTRA(true)}>
          Declarar TRA
        </Button>

        <div style={{ height: '24px' }} />
      </div>

      {/* Declarar TRA modal */}
      <Modal isOpen={showTRA} onClose={() => setShowTRA(false)} title="Declarar TRA">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
            La informacion para declarar el TRA sera la aceptada por el anfitrion que subieron los huespedes temporales.
          </p>
          <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>Guillermo Sarpeito y acompañantes</p>
          <InputField label="Fecha Inicio" value={tra.fechaInicio} onChange={setTraField('fechaInicio')} placeholder="dd/mm/aaaa" showEditIcon />
          <InputField label="Fecha Egreso" value={tra.fechaEgreso} onChange={setTraField('fechaEgreso')} placeholder="dd/mm/aaaa" showEditIcon />
          <InputField label="Precio Total" value={tra.precioTotal} onChange={setTraField('precioTotal')} placeholder="$0 USD" showEditIcon />
          <Button variant="primary" fullWidth onClick={handleEnviarTRA}>Enviar</Button>
        </div>
      </Modal>

      {/* TRA success modal */}
      <Modal isOpen={showTRASuccess} onClose={() => setShowTRASuccess(false)} title="Envió TRA">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, lineHeight: theme.fonts.lineHeights.relaxed }}>
            La información para declarar el TRA fue enviada con éxito!
          </p>
        </div>
      </Modal>
    </AppShell>
  );
}
