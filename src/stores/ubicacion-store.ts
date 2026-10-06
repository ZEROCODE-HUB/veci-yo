import { create } from 'zustand';
import { Ubicacion } from '@/shared/types';

/*
  Aqui vivian dos casas inventadas --«Casa Amorcito» en Miraflores y «Casa Mama»
  en Cusco-- y eran **el estado inicial de la aplicacion para todo el mundo**,
  no solo para las pantallas de demostracion que las usaban.

  O sea que al abrir la aplicacion se veia, durante un parpadeo, una vivienda
  que no es de nadie; y si la carga fallaba, se quedaba ahi. El cliente lo dijo
  claro el 06/10/2026: «sobre esos estados iniciales no debe pasar».

  Ahora arranca **vacio y sin cargar**, que es la verdad: todavia no se sabe.
  Esos tres estados --sin cargar, cargando, cargado-- son distintos y no se
  pueden confundir: una lista vacia porque no hay nada y una lista vacia porque
  no ha llegado se ven igual en la pantalla y significan lo contrario.
*/

interface UbicacionState {
  ubicaciones: Ubicacion[];
  /**
   * Si las viviendas de verdad ya llegaron.
   *
   * Lo pone `setUbicaciones`, que es lo unico que las trae de la sesion. Hasta
   * entonces la lista esta vacia **porque no se sabe**, no porque no haya.
   */
  cargadas: boolean;

  agregarUbicacion: (datos: Omit<Ubicacion, 'id' | 'favorito'>) => number;
  toggleFavoritoUbicacion: (id: number) => void;
  setUbicaciones: (ubicaciones: Ubicacion[]) => void;
}

export const useUbicacionStore = create<UbicacionState>((set) => ({
  ubicaciones: [],
  cargadas: false,

  agregarUbicacion: (datos) => {
    const id = Date.now();
    set((state) => ({
      ubicaciones: [...state.ubicaciones, { id, favorito: false, ...datos }],
    }));
    return id;
  },

  toggleFavoritoUbicacion: (id) =>
    set((state) => ({
      ubicaciones: state.ubicaciones.map((u) => ({
        ...u,
        favorito: u.id === id,
      })),
    })),

  /*
    Marca `cargadas` tambien cuando llega una lista vacia: alguien sin vivienda
    **ya se sabe** que no tiene ninguna, y seguir enseñando «cargando» para
    siempre seria la otra cara del problema que esto arregla.
  */
  setUbicaciones: (ubicaciones) => set({ ubicaciones, cargadas: true }),
}));
