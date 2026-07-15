import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import SelectField from '../../components/ui/SelectField';
import Badge from '../../components/ui/Badge';
import theme from '../../config/theme';
import { useApp } from '../../context/AppContext';
import { estadosReclamo, CATEGORIAS_PQRS } from '../../data/mockData';

const TABS = ['Todos', ...estadosReclamo];

export default function ReclamosPage() {
  const navigate = useNavigate();
  const { reclamos, rolActivo } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('');
  const [subcategoriaFilter, setSubcategoriaFilter] = useState('');

  const categoriaSel = CATEGORIAS_PQRS.find(c => c.id === categoriaFilter);
  const subcategoriasDisponibles = categoriaSel?.subcategorias || [];
  const tieneSubcategorias = subcategoriasDisponibles.length > 0;

  const filtered = reclamos.filter(r => {
    const matchSearch = !search
      || r.titulo.toLowerCase().includes(search.toLowerCase())
      || r.nombre.toLowerCase().includes(search.toLowerCase())
      || r.numero.includes(search);
    const matchTab = activeTab === 'Todos' || r.estado === activeTab;
    const matchCategoria = !categoriaFilter || r.categoria === categoriaFilter;
    const matchSubcategoria = !subcategoriaFilter || r.subcategoria === subcategoriaFilter;
    return matchSearch && matchTab && matchCategoria && matchSubcategoria;
  });

  const dateInputStyle = {
    width: '100%',
    minWidth: 0,
    padding: '10px 12px',
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    fontSize: theme.fonts.sizes.sm,
    fontFamily: theme.fonts.family,
    background: theme.colors.bgCard,
    cursor: 'pointer',
    boxSizing: 'border-box',
  };

  return (
    <AppShell>
      <PageHeader
        title="Centro de Atención"
        action={
          rolActivo !== 'administrador' ? (
            <button
              onClick={() => navigate('/perfil/soporte/reclamos/nuevo')}
              style={{
                width: '36px', height: '36px', borderRadius: theme.radius.md,
                background: theme.colors.primary, color: '#fff', fontSize: '22px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer', fontWeight: 'bold',
              }}
            >
              +
            </button>
          ) : undefined
        }
      />

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <SearchBar value={search} onChange={setSearch} />
          <div style={{ marginTop: '10px' }}>
            <StatusTabs tabs={TABS} active={activeTab} onChange={tab => setActiveTab(tab || 'Todos')} centered />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              onClick={() => setFilterOpen(o => !o)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.colors.textSecondary,
                fontSize: '16px',
                transform: filterOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 200ms',
              }}
            >
              ▾
            </button>
          </div>

          {filterOpen && (
            <div style={{ animation: 'slideDown 200ms ease', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha desde</div>
                  <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} style={dateInputStyle} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha hasta</div>
                  <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} style={dateInputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <SelectField label="Categoría" value={categoriaFilter} options={['Todas', ...CATEGORIAS_PQRS.map(c => c.id)]} onChange={v => { setCategoriaFilter(v === 'Todas' ? '' : v); setSubcategoriaFilter(''); }} />
                {tieneSubcategorias && (
                  <SelectField label="Subcategoría" value={subcategoriaFilter} options={['Todas', ...subcategoriasDisponibles]} onChange={v => setSubcategoriaFilter(v === 'Todas' ? '' : v)} />
                )}
                {!tieneSubcategorias && categoriaFilter && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: theme.fonts.sizes.sm, color: theme.colors.textMuted }}>
                    Sin subcategorías
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {filtered.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(`/perfil/soporte/reclamos/${item.id}`)}
            style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: theme.fonts.family,
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontSize: '16px' }}>📋</span>
              <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                PQRS #{item.numero}
              </span>
            </div>
            <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
              {item.nombre}
            </div>
            <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
              CI: {item.ci}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <Badge status={item.estado} />
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{item.fechaCreacion}</span>
            </div>
          </button>
        ))}
      </div>
    </AppShell>
  );
}
