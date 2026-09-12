import { usePropietarioStore } from "@/stores/propietario-store";

export function usePropietarioConfiguracion() {
  const state = usePropietarioStore();
  return {
    residentes: state.residentes,
    propietarioAnfitrionPrimario: state.propietarioAnfitrionPrimario,
    propietarioAdministradorPrimario: state.propietarioAdministradorPrimario,
    residentesDeclarados: state.residentesDeclarados,
    agregarResidente: state.agregarResidente,
    eliminarResidente: state.eliminarResidente,
    setAnfitrionPrimario: state.setAnfitrionPrimario,
    setAdministradorPrimario: state.setAdministradorPrimario,
    togglePropietarioResidente: state.togglePropietarioResidente,
  };
}
