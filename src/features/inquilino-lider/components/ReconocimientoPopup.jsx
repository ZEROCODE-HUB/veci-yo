import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import { cuadroHonorDepartamentos, reputacionInsigniasVecino } from '../../../data/mockData';
const RECONOCIMIENTOS = reputacionInsigniasVecino.map(ins => ({
  key: ins.key,
  label: ins.label,
  icono: ins.icono,
}));

export default function ReconocimientoPopup({ isOpen, onClose, destinatarioPreseleccionado }) {
  const { addToast } = useApp();
  const tieneDestinatario = !!destinatarioPreseleccionado;
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(destinatarioPreseleccionado || '');
  const [medallaElegida, setMedallaElegida] = useState('');

  const residentesUnicos = [...new Set(cuadroHonorDepartamentos.map(d => d.responsable))];
  const filtered = searchTerm
    ? residentesUnicos.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase()))
    : residentesUnicos;

  const handleConfirm = () => {
    if (!selected || !medallaElegida) return;
    addToast(`Reconocimiento "${medallaElegida}" enviado a ${selected}!`, 'success');
    setSelected('');
    setSearchTerm('');
    setMedallaElegida('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { setSelected(''); setSearchTerm(''); setMedallaElegida(''); onClose(); }} title="Dar reconocimiento">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Search — solo cuando no hay destinatario preseleccionado */}
        {!tieneDestinatario && (
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar residente..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: theme.radius.full,
              border: `1.5px solid ${theme.colors.border}`,
              fontSize: theme.fonts.sizes.base,
              fontFamily: theme.fonts.family,
              color: theme.colors.text,
              background: theme.colors.bgCard,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        )}

        {/* Resident list — solo cuando no hay destinatario preseleccionado */}
        {!tieneDestinatario && (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px' }}>
            {filtered.map(nombre => (
              <button
                key={nombre}
                type="button"
                onClick={() => setSelected(nombre)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: theme.radius.lg,
                  border: `1.5px solid ${selected === nombre ? theme.colors.primary : 'transparent'}`,
                  background: selected === nombre ? theme.colors.primaryLight : theme.colors.bgMuted,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  width: '100%',
                  textAlign: 'left',
                  fontSize: theme.fonts.sizes.sm,
                  color: theme.colors.text,
                  fontWeight: selected === nombre ? theme.fonts.weights.semibold : theme.fonts.weights.normal,
                }}
              >
                <span style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: theme.colors.primaryLight, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  fontSize: '14px',
                }}>
                  👤
                </span>
                {nombre}
                {selected === nombre && <span style={{ marginLeft: 'auto', color: theme.colors.primary }}>✓</span>}
              </button>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: theme.colors.textMuted }}>
                No se encontraron residentes
              </div>
            )}
          </div>
        )}

        {/* Destinatario ya preseleccionado */}
        {tieneDestinatario && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <span style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text }}>
              Reconocer a: {destinatarioPreseleccionado}
            </span>
          </div>
        )}

        {/* Medal selection */}
        <div>
          <div style={{ fontSize: theme.fonts.sizes.sm, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, marginBottom: '8px', textAlign: 'center' }}>
            Elige un reconocimiento:
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {RECONOCIMIENTOS.map(m => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMedallaElegida(m.label)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 8px',
                  borderRadius: theme.radius.xl,
                  border: `2px solid ${medallaElegida === m.label ? theme.colors.primary : theme.colors.border}`,
                  background: medallaElegida === m.label ? theme.colors.primaryLight : theme.colors.bgCard,
                  cursor: 'pointer',
                  fontFamily: theme.fonts.family,
                  flex: 1,
                  minWidth: '60px',
                  transition: 'all 150ms',
                }}
              >
                <span style={{ fontSize: '28px' }}>{m.icono}</span>
                <span style={{ fontSize: theme.fonts.sizes['2xs'], color: theme.colors.text, textAlign: 'center' }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <Button variant="primary" fullWidth onClick={handleConfirm} disabled={!selected || !medallaElegida}>
          {selected && medallaElegida ? `Reconocer a ${selected}` : 'Selecciona un destinatario y reconocimiento'}
        </Button>
      </div>
    </Modal>
  );
}
