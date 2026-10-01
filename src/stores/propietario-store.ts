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
  /*
    Aquí vivían **tres personas inventadas** —'Alberto Manual' (con la errata),
    'Sofia Martinez' y 'Luis Torres', con cédulas ficticias— y la pantalla de
    Configuración del propietario las pintaba como si fueran los residentes de
    la vivienda. Quien vive en una vivienda sale ahora de `membresia_unidad`,
    por `residentes.repo.ts`.

    Lo que queda de este store es lo que todavía no tiene dónde vivir:
    `PropietarioCrearRol` pide fecha de inicio, duración, monto de alquiler,
    monitoreo de pago y servicios incluidos —un contrato de arrendamiento— y
    **no hay ninguna tabla para eso**. Es un hueco de producto, no un descuido
    de esta migración: hasta que se decida dónde vive un contrato, ese
    formulario no puede escribir en ningún sitio, y con la lista vacía al menos
    no enseña datos que no existen.
  */
  residentes: [],
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
