import Tabs from './Tabs';

/**
 * StatusTabs — filtros de estado (Correspondencia, Visitas, Reglas, etc.).
 * Conserva su API original pero delega en el componente `Tabs` estandarizado,
 * de modo que todos los filtros tipo tabs de la app comparten el mismo
 * comportamiento móvil: una sola fila, scroll horizontal, altura uniforme,
 * sin saltos de línea y auto-scroll al tab activo.
 */
export default function StatusTabs({ tabs, active, onChange, centered = false, statusColors = {} }) {
  return (
    <Tabs
      tabs={tabs}
      active={active}
      onChange={onChange}
      variant="status"
      statusColors={statusColors}
      centered={centered}
    />
  );
}
