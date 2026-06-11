import AppShell from '../../components/layout/AppShell';
import ViviendaResumen from './components/ViviendaResumen';
import CommsFab from './components/CommsFab';

// Pantalla 2 del Inquilino Líder (tab "Viviendas"): el mismo resumen de
// vivienda que el resto de roles ve en su Home ("/").
export default function ViviendaPage() {
  return (
    <AppShell>
      <ViviendaResumen />
      <CommsFab />
    </AppShell>
  );
}
