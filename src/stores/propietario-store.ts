import { create } from 'zustand';
import { Residente } from '@/shared/types';

interface PropietarioState {
  residentes: Residente[];
  propietarioAnfitrionPrimario: boolean;
  propietarioAdministradorPrimario: boolean;
  residentesDeclarados: Record<string, boolean>;

  agregarResidente: (datos: Omit<Residente, 'id'> & { esAnfitrionPrimario?: boolean; esAdministradorPrimario?: boolean; datosVisibles?: boolean; contactableChat?: boolean; contactableWhatsapp?: boolean }) => void;
  actualizarResidente: (residente: Partial<Residente> & { id: number; esAnfitrionPrimario?: boolean; esAdministradorPrimario?: boolean }) => void;
  eliminarResidente: (id: number) => void;
  setAnfitrionPrimario: (id: number | 'propietario') => void;
  setAdministradorPrimario: (id: number | 'propietario') => void;
  togglePropietarioResidente: (email: string, value: boolean) => void;
  setResidentes: (residentes: Residente[]) => void;
  setResidentesDeclarados: (declarados: Record<string, boolean>) => void;
}

export const usePropietarioStore = create<PropietarioState>((set) => ({
  residentes: [
    { id: 1, nombre: 'Alberto Manual', rol: 'Inquilino Lider', ci: '1782753580', fecha: '14/05/2024', correo: '', tipo: '', codigoArea: '', telefono: '', contactoNombre: '', contactoCodigo: '', contactoTelefono: '', fechaInicio: '', duracion: '', montoAlquiler: '', monitoreoPago: false, servicios: {} },
    { id: 2, nombre: 'Sofia Martinez', rol: 'Residente', ci: '1759632584', fecha: '22/06/2024', correo: '', tipo: '', codigoArea: '', telefono: '', contactoNombre: '', contactoCodigo: '', contactoTelefono: '', fechaInicio: '', duracion: '', montoAlquiler: '', monitoreoPago: false, servicios: {} },
    { id: 3, nombre: 'Luis Torres', rol: 'Residente', ci: '1824507896', fecha: '30/07/2024', correo: '', tipo: '', codigoArea: '', telefono: '', contactoNombre: '', contactoCodigo: '', contactoTelefono: '', fechaInicio: '', duracion: '', montoAlquiler: '', monitoreoPago: false, servicios: {} },
  ],
  propietarioAnfitrionPrimario: true,
  propietarioAdministradorPrimario: true,
  residentesDeclarados: {},

  agregarResidente: (datos) =>
    set((state) => {
      let base = state.residentes;
      let anfitrion = state.propietarioAnfitrionPrimario;
      let administrador = state.propietarioAdministradorPrimario;

      if (datos.esAnfitrionPrimario) {
        base = base.map((r) => ({ ...r, esAnfitrionPrimario: false }));
        anfitrion = false;
      }
      if (datos.esAdministradorPrimario) {
        base = base.map((r) => ({ ...r, esAdministradorPrimario: false }));
        administrador = false;
      }

      const enriched = { datosVisibles: true, contactableChat: true, contactableWhatsapp: true, ...datos };
      return {
        residentes: [...base, { id: Date.now(), ...enriched }],
        propietarioAnfitrionPrimario: anfitrion,
        propietarioAdministradorPrimario: administrador,
      };
    }),

  actualizarResidente: (residente) =>
    set((state) => {
      if (residente.esAnfitrionPrimario) {
        return {
          residentes: state.residentes.map((r) =>
            r.id === residente.id ? { ...r, ...residente } : { ...r, esAnfitrionPrimario: false }
          ),
          propietarioAnfitrionPrimario: false,
        };
      }
      if (residente.esAdministradorPrimario) {
        return {
          residentes: state.residentes.map((r) =>
            r.id === residente.id ? { ...r, ...residente } : { ...r, esAdministradorPrimario: false }
          ),
          propietarioAdministradorPrimario: false,
        };
      }
      return {
        residentes: state.residentes.map((r) => (r.id === residente.id ? { ...r, ...residente } : r)),
      };
    }),

  eliminarResidente: (id) =>
    set((state) => ({
      residentes: state.residentes.filter((r) => r.id !== id),
    })),

  setAnfitrionPrimario: (id) =>
    set((state) => {
      if (id === 'propietario') {
        return {
          propietarioAnfitrionPrimario: true,
          residentes: state.residentes.map((r) => ({ ...r, esAnfitrionPrimario: false })),
        };
      }
      return {
        propietarioAnfitrionPrimario: false,
        residentes: state.residentes.map((r) => ({ ...r, esAnfitrionPrimario: r.id === id })),
      };
    }),

  setAdministradorPrimario: (id) =>
    set((state) => {
      if (id === 'propietario') {
        return {
          propietarioAdministradorPrimario: true,
          residentes: state.residentes.map((r) => ({ ...r, esAdministradorPrimario: false })),
        };
      }
      return {
        propietarioAdministradorPrimario: false,
        residentes: state.residentes.map((r) => ({ ...r, esAdministradorPrimario: r.id === id })),
      };
    }),

  togglePropietarioResidente: (email, value) =>
    set((state) => ({
      residentesDeclarados: { ...state.residentesDeclarados, [email]: value },
    })),

  setResidentes: (residentes) => set({ residentes }),
  setResidentesDeclarados: (residentesDeclarados) => set({ residentesDeclarados }),
}));
