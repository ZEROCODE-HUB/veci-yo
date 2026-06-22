import { useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Tabs from '../../components/ui/Tabs';
import theme from '../../config/theme';
import { faqItems } from '../../data/mockData';

const CATEGORIA_COLORS = {
  Seguridad: { bg: theme.colors.primary, color: theme.colors.text },
  Comunidad: { bg: theme.colors.statusGray, color: theme.colors.textSecondary },
  Puntos: { bg: theme.colors.secondary, color: '#fff' },
};

const CATEGORIAS = ['Seguridad', 'Comunidad', 'Puntos'];

export default function PreguntasFrecuentesPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = faqItems.filter(f => {
    const matchSearch = !search || f.pregunta.toLowerCase().includes(search.toLowerCase());
    const matchCat = !catFilter || f.categoria === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <AppShell>
      <PageHeader title="Preguntas frecuentes" />

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SearchBar value={search} onChange={setSearch} />

        <Tabs
          tabs={CATEGORIAS}
          active={catFilter}
          onChange={cat => setCatFilter(cat || '')}
          variant="status"
          statusColors={CATEGORIA_COLORS}
          centered
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(item => {
            const isOpen = expandedId === item.id;
            return (
              <div
                key={item.id}
                style={{
                  background: theme.colors.bgCard,
                  borderRadius: isOpen ? theme.radius.xl : theme.radius.full,
                  boxShadow: theme.shadows.card,
                  overflow: 'hidden',
                  transition: 'border-radius 150ms',
                }}
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '14px 18px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: theme.fonts.family,
                  }}
                >
                  <span style={{ fontSize: theme.fonts.sizes.base, color: theme.colors.text, fontWeight: theme.fonts.weights.medium }}>
                    · {item.pregunta}
                  </span>
                  <span style={{
                    fontSize: '14px',
                    color: theme.colors.text,
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 150ms',
                  }}>
                    ▾
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, lineHeight: theme.fonts.lineHeights.relaxed }}>
                    {item.respuesta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
