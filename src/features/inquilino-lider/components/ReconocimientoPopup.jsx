import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';
import { cuadroHonorDepartamentos } from '../../../data/mockData';

export default function ReconocimientoPopup({ isOpen, onClose, destinatarioPreseleccionado }) {
  const { addToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(destinatarioPreseleccionado || '');

  const residentesUnicos = [...new Set(cuadroHonorDepartamentos.map(d => d.responsable))];
  const filtered = searchTerm
    ? residentesUnicos.filter(n => n.toLowerCase().includes(searchTerm.toLowerCase()))
    : residentesUnicos;

  const handleConfirm = () => {
    if (!selected) return;
    addToast(`Reconocimiento enviado a ${selected}!`, 'success');
    setSelected('');
    setSearchTerm('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { setSelected(''); setSearchTerm(''); onClose(); }} title="Dar reconocimiento">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '400px' }}>
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

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '320px' }}>
          {filtered.map(nombre => (
            <button
              key={nombre}
              type="button"
              onClick={() => setSelected(nombre)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: theme.radius.lg,
                border: `1.5px solid ${selected === nombre ? theme.colors.primary : 'transparent'}`,
                background: selected === nombre ? theme.colors.primaryLight : theme.colors.bgMuted,
                cursor: 'pointer',
                fontFamily: theme.fonts.family,
                width: '100%',
                textAlign: 'left',
                fontSize: theme.fonts.sizes.base,
                color: theme.colors.text,
                fontWeight: selected === nombre ? theme.fonts.weights.semibold : theme.fonts.weights.normal,
                transition: 'all 150ms',
              }}
            >
              <span style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: theme.colors.primaryLight, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                fontSize: '16px',
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

        <Button variant="primary" fullWidth onClick={handleConfirm} disabled={!selected}>
          Reconocer a {selected || '...'}
        </Button>
      </div>
    </Modal>
  );
}
