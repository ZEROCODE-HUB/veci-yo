import { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import SelectField from '../../../components/ui/SelectField';
import theme from '../../../config/theme';
import { useApp } from '../../../context/AppContext';

const REGALOS_DISPONIBLES = [
  { id: 'cafe', emoji: '☕', label: 'Café' },
  { id: 'huesito', emoji: '🦴', label: 'Huesito' },
  { id: 'planta', emoji: '🪴', label: 'Planta' },
];

export default function GratitudPopup({ isOpen, onClose, destinatarioPreseleccionado }) {
  const {
    gratitudUsada, setGratitudUsada,
    residentesPropietario, addToast,
    usuario, residentesDeclarados, rolActivo,
  } = useApp();

  const emailUser = usuario?.correo || 'guillermo@veciyo.com';
  const yaUsoGratitud = gratitudUsada[emailUser]?.usado;
  const proximaFecha = gratitudUsada[emailUser]?.proximaFecha || '';

  const [selectedGift, setSelectedGift] = useState(null);
  const [selectedRecipient, setSelectedRecipient] = useState(destinatarioPreseleccionado || '');

  // Solo residentes aparecen como destinatarios posibles
  const residentesVisibles = residentesPropietario.filter(r =>
    r.rol === 'Residente' || r.rol === 'Residente Lider' || r.rol === 'Inquilino Lider' || r.rol === 'Corresidente'
  );

  const handleConfirm = () => {
    if (!selectedGift || !selectedRecipient) return;
    const hoy = new Date();
    const prox = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
    setGratitudUsada(prev => ({
      ...prev,
      [emailUser]: { usado: true, proximaFecha: prox.toLocaleDateString('es-AR') },
    }));
    addToast(`¡Regalo enviado a ${selectedRecipient}!`, 'success');
    setSelectedGift(null);
    setSelectedRecipient('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gratitud — Regalo del mes">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
        {yaUsoGratitud ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <span style={{ fontSize: '48px' }}>✅</span>
            <p style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, marginTop: '12px' }}>
              Ya usaste tu regalo de este mes.
            </p>
            <p style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
              Próximo regalo disponible a partir del {proximaFecha}.
            </p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: theme.fonts.sizes.base, fontWeight: theme.fonts.weights.semibold, color: theme.colors.text, textAlign: 'center' }}>
              Elige un regalo para dar a un vecino
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              {REGALOS_DISPONIBLES.map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGift(g.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '16px',
                    borderRadius: theme.radius.xl,
                    border: `2px solid ${selectedGift === g.id ? theme.colors.primary : theme.colors.border}`,
                    background: selectedGift === g.id ? theme.colors.primaryLight : theme.colors.bgCard,
                    cursor: 'pointer',
                    fontFamily: theme.fonts.family,
                    flex: 1,
                    transition: 'all 200ms',
                  }}
                >
                  <span style={{ fontSize: '36px' }}>{g.emoji}</span>
                  <span style={{ fontSize: theme.fonts.sizes.xs, color: theme.colors.text, fontWeight: selectedGift === g.id ? theme.fonts.weights.bold : theme.fonts.weights.normal }}>
                    {g.label}
                  </span>
                </button>
              ))}
            </div>

            <SelectField
              label="Elige a quién dárselo"
              value={selectedRecipient}
              options={residentesVisibles.map(r => r.nombre)}
              onChange={setSelectedRecipient}
              placeholder="Seleccionar vecino"
            />

            <Button
              variant="primary"
              fullWidth
              onClick={handleConfirm}
              disabled={!selectedGift || !selectedRecipient}
            >
              Enviar regalo
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
