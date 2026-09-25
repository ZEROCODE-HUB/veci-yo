import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore, usePerfilStore } from "@/stores";
import { useCondominioActivo } from "@/shared/hooks";
import { obtenerContactosPorUnidad } from "@/features/administrador/services/arquitectura.repo";
import type { Unidad } from "@/stores/admin-store";
import {
  fetchDirectorioRequest,
} from "../services/directorio.service";
import type {
  DirectorioContacto,
  DirectorioContactos,
  DirectorioDeposito,
  DirectorioEstacionamiento,
} from "../types/directorio";

// Estos tres contactos estaban fijos -- "Carlos Gómez", "María Pérez" y "Juan
// López" con teléfonos peruanos -- y se mostraban en TODAS las unidades, así
// que la pantalla no servía para llamar a nadie. Ahora salen de
// `membresia_unidad`; cuando la unidad no tiene a alguien asignado se dice,
// en lugar de inventar un nombre.
const SIN_ASIGNAR: DirectorioContacto = { nombre: "Sin asignar", telefono: "" };

export function useDirectorio() {
  const { unidades, tipologias, depositos } = useAdminStore();
  const condominioId = useCondominioActivo() ?? "";
  const contactos = useQuery({
    queryKey: ["directorio", "contactos", condominioId],
    queryFn: () => obtenerContactosPorUnidad(condominioId),
    enabled: Boolean(condominioId),
  });
  const query = useQuery({
    queryKey: ["directorio"],
    queryFn: fetchDirectorioRequest,
    initialData: {
      unidades: useAdminStore.getState().unidades,
      tipologias: useAdminStore.getState().tipologias,
      depositos: useAdminStore.getState().depositos,
    },
  });

  const [search, setSearch] = useState("");
  const [torreFiltro, setTorreFiltro] = useState("");
  const [subTab, setSubTab] = useState<
    "departamentos" | "estacionamientos" | "depositos"
  >("departamentos");
  // El anfitrion y el admin primario son por unidad, no del condominio: los
  // trae `contactos`. Antes se buscaba "el primero que lo sea" en un store de
  // residentes y se aplicaba a todas las unidades por igual.

  const contactosFor = (unidad: Unidad): DirectorioContactos => {
    const deLaUnidad = contactos.data?.[(unidad as any).uuid ?? unidad.id];
    return {
      anfitrion: deLaUnidad?.anfitrion ?? SIN_ASIGNAR,
      administrador: deLaUnidad?.administrador ?? SIN_ASIGNAR,
      propietario: deLaUnidad?.propietario ?? SIN_ASIGNAR,
    };
  };

  const torres = useMemo(
    () =>
      [...new Set(unidades.map((unidad) => unidad.torreNumero))]
        .sort((a, b) => a - b)
        .map((numero) => `Torre ${numero}`),
    [unidades],
  );

  const matches = (text: string, torreNumero: number) =>
    (!torreFiltro ||
      String(torreNumero) === torreFiltro.replace("Torre ", "").trim() ||
      String(torreNumero) === torreFiltro) &&
    (!search || text.toLowerCase().includes(search.toLowerCase()));

  const filtered = useMemo(
    () =>
      unidades.filter((unidad) =>
        matches(
          /*
            El nombre sale de `contactos`, que es lo que trae la base, y no de
            `propietarioAsignado`, que solo se rellena en memoria cuando se
            asigna un propietario **en esa misma sesion** y al recargar vuelve
            a estar vacio.

            Por eso el buscador no encontraba a nadie: el campo dice «Buscar
            torre, depto, propietario...» y buscar «Guillermo» --dueño de dos
            viviendas, con su nombre escrito en esa misma pantalla-- devolvia
            «Sin resultados».
          */
          `${unidad.codigo} ${contactosFor(unidad).propietario.nombre}`,
          unidad.torreNumero,
        ),
      ),
    [search, torreFiltro, unidades, contactos.data],
  );

  const estacionamientosList = useMemo<DirectorioEstacionamiento[]>(
    () =>
      unidades.flatMap((unidad) =>
        Array.from({ length: unidad.estacionamientos || 0 }, (_, index) => ({
          id: `${unidad.id}-${index}`,
          codigo: `${unidad.codigo}-E${index + 1}`,
          ubicacion: unidad.ubicacionParking || `T${unidad.torreNumero}`,
          torreNumero: unidad.torreNumero,
          unidad,
          propietario: unidad.propietarioAsignado || "Sin propietario",
          contactos: contactosFor(unidad),
        })),
      ),
    [unidades, contactos.data],
  );

  const filteredEst = useMemo(
    () =>
      estacionamientosList.filter((item) =>
        matches(
          `${item.codigo} ${item.propietario} ${item.unidad.codigo}`,
          item.torreNumero,
        ),
      ),
    [estacionamientosList, search, torreFiltro],
  );

  const filteredDep = useMemo<DirectorioDeposito[]>(
    () =>
      depositos
        .filter((deposito) => {
          const unidad = unidades.find(
            (item) =>
              String(item.id) === String(deposito.unidadId) ||
              item.codigo === deposito.departamentoCodigo,
          );
          return (
            matches(
              `${deposito.codigo} ${deposito.ubicacion} ${deposito.departamentoCodigo || ""}`,
              deposito.torreNumero,
            ) &&
            (unidad || !deposito.unidadId)
          );
        })
        .map((deposito) => {
          const unidad = unidades.find(
            (item) =>
              String(item.id) === String(deposito.unidadId) ||
              item.codigo === deposito.departamentoCodigo,
          );
          return {
            ...deposito,
            unidad,
            contactos: unidad
              ? contactosFor(unidad)
              : {
                  propietario: SIN_ASIGNAR,
                  anfitrion: SIN_ASIGNAR,
                  administrador: SIN_ASIGNAR,
                },
          };
        }),
    [depositos, unidades, search, torreFiltro, contactos.data],
  );
  return {
    ...query,
    unidades,
    tipologias,
    torres,
    search,
    setSearch,
    torreFiltro,
    setTorreFiltro,
    subTab,
    setSubTab,
    contactosFor,
    filtered,
    filteredEst,
    filteredDep,
  };
}

/*
 * `useDirectorioPagos` vivia aqui y no escribia nada: llamaba a
 * `marcarPagosRequest` —un `delay(200)` que devolvia su entrada— y marcaba
 * un store de Zustand. El registro de pagos es ahora `useCuotas`.
 */
