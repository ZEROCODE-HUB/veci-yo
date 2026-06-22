import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import PageHeader from '../../components/layout/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import StatusTabs from '../../components/ui/StatusTabs';
import Badge from '../../components/ui/Badge';
import BottomSheet, { BottomSheetOption } from '../../components/ui/BottomSheet';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Toggle from '../../components/ui/Toggle';
import SelectField from '../../components/ui/SelectField';
import { ModuloGate, ModuloHeaderInfo } from '../../components/ui/ModuloEstado';
import { useApp } from '../../context/AppContext';
import theme from '../../config/theme';
import { categorias } from '../../data/mockData';

const TABS = ['Todos', 'No Recibido', 'En Portería', 'Entregado'];

export default function CorrespondenciaPage() {
  const navigate = useNavigate();
  const { correspondencia, actualizarEstadoCorrespondencia, eliminarCorrespondencia } = useApp();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');
  const [filterOpen, setFilterOpen] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('2025-05-14');
  const [fechaHasta, setFechaHasta] = useState('2025-07-30');
  const [catFilter, setCatFilter] = useState('');
  const [entregaFilter, setEntregaFilter] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  const filtered = correspondencia.filter(c => {
    const matchSearch = !search || c.nombre.toLowerCase().includes(search.toLowerCase()) || c.empresa.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'Todos' || c.estado === activeTab;
    const matchCat = !catFilter || c.categoria === catFilter;
    return matchSearch && matchTab && matchCat;
  });

  const handleEstado = (estado) => {
    actualizarEstadoCorrespondencia(menuItem.id, estado);
    setMenuItem(null);
  };

  const handleEliminar = () => {
    eliminarCorrespondencia(deleteItem.id);
    setDeleteItem(null);
    setShowDeleteSuccess(true);
    setTimeout(() => setShowDeleteSuccess(false), 2000);
  };

  const getIcon = (empresa) => {
    if (empresa.toLowerCase().includes('rappi')) return '🛵';
    if (empresa.toLowerCase().includes('dhl')) return '📦';
    return '📬';
  };

  const dateInputStyle = {
    width: '100%',
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
        title="Correspondencia"
        action={
          <ModuloHeaderInfo
            helpKey="correspondencia"
            action={
              <button
                onClick={() => navigate('/correspondencia/agregar')}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: theme.radius.md,
                  background: theme.colors.primary,
                  color: '#fff',
                  fontSize: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                +
              </button>
            }
          />
        }
      />

      <ModuloGate helpKey="correspondencia">
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Filters card */}
        <div style={{ background: theme.colors.bgCard, borderRadius: theme.radius.xl, padding: '12px', boxShadow: theme.shadows.card }}>
          <SearchBar value={search} onChange={setSearch} />
          <div style={{ marginTop: '10px' }}>
            <StatusTabs
              tabs={TABS}
              active={activeTab}
              onChange={tab => setActiveTab(tab || 'Todos')}
              centered
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha desde</div>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={e => setFechaDesde(e.target.value)}
                    style={dateInputStyle}
                  />
                </div>
                <div>
                  <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, marginBottom: '4px' }}>Fecha hasta</div>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={e => setFechaHasta(e.target.value)}
                    style={dateInputStyle}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <SelectField label="Categoría" value={catFilter} options={['Todas', ...categorias]} onChange={v => setCatFilter(v === 'Todas' ? '' : v)} />
                </div>
                <Toggle value={entregaFilter} onChange={setEntregaFilter} labelRight="Entrega en puerta" />
              </div>
            </div>
          )}
        </div>

        {/* List */}
        {filtered.map(item => (
          <div
            key={item.id}
            style={{
              background: theme.colors.bgCard,
              borderRadius: theme.radius.xl,
              padding: '14px 16px',
              boxShadow: theme.shadows.card,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '16px' }}>{getIcon(item.empresa)}</span>
                  <span style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                    {item.empresa}: {item.unidad}
                  </span>
                </div>
                <div style={{ fontWeight: theme.fonts.weights.semibold, fontSize: theme.fonts.sizes.base, color: theme.colors.text }}>
                  {item.nombre}
                </div>
                <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>
                  CI: {item.ci}
                </div>
              </div>
              <button
                onClick={() => setMenuItem(item)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.colors.textSecondary, fontSize: '20px', padding: '4px', flexShrink: 0 }}
              >
                ⋮
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <Badge status={item.estado} />
              <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{item.fecha}</span>
            </div>
          </div>
        ))}
      </div>
      </ModuloGate>

      <BottomSheet isOpen={!!menuItem} onClose={() => setMenuItem(null)}>
        <BottomSheetOption label="Estado: Portería" onPress={() => handleEstado('En Portería')} />
        <BottomSheetOption label="Estado: Entregado" onPress={() => handleEstado('Entregado')} />
        <BottomSheetOption label="Eliminar" variant="danger" onPress={() => { setDeleteItem(menuItem); setMenuItem(null); }} />
        <BottomSheetOption label="Informar" onPress={() => { setMenuItem(null); navigate('/correspondencia/agregar', { state: { informar: menuItem } }); }} />
      </BottomSheet>

      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Eliminar Correspondencia">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: theme.fonts.sizes.lg, textAlign: 'center', color: theme.colors.text }}>
            ¿ Seguro que desea eliminar ?
          </p>
          {deleteItem && (
            <div style={{ border: `1.5px solid ${theme.colors.primary}`, borderRadius: theme.radius.xl, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontWeight: theme.fonts.weights.semibold }}>{deleteItem.empresa}: {deleteItem.unidad}</div>
              <div style={{ fontWeight: theme.fonts.weights.bold, fontSize: theme.fonts.sizes.md }}>{deleteItem.nombre}</div>
              <div style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>CI: {deleteItem.ci}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <Badge status={deleteItem.estado} />
                <span style={{ fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary }}>{deleteItem.fecha}</span>
              </div>
            </div>
          )}
          <Button variant="primary" fullWidth onClick={handleEliminar}>Eliminar</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
