import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminStore, usePerfilStore, usePropietarioStore } from "@/stores";
import type { Unidad } from "@/stores/admin-store";
import {
  fetchDirectorioRequest,
  marcarPagosRequest,
} from "../services/directorio.service";
import type {
  DirectorioContacto,
  DirectorioContactos,
  DirectorioDeposito,
  DirectorioEstacionamiento,
} from "../types/directorio";

const CONTACTOS_DEFAULT = {
  administrador: { nombre: "Carlos Gómez", telefono: "+51999888777" },
  anfitrion: { nombre: "María Pérez", telefono: "+51999777666" },
  propietario: { nombre: "Juan López", telefono: "+51999666555" },
} satisfies Record<
  "administrador" | "anfitrion" | "propietario",
  DirectorioContacto
>;

export function useDirectorio() {
  const { unidades, tipologias, depositos } = useAdminStore();
  const residentes = usePropietarioStore((state) => state.residentes);
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
  const anfitrionPrimario = residentes.find(
    (resident: any) => resident.esAnfitrionPrimario,
  );
  const adminPrimario = residentes.find(
    (resident: any) => resident.esAdministradorPrimario,
  );

  const getAdminPrimario = (): DirectorioContacto =>
    adminPrimario
      ? {
          nombre: adminPrimario.nombre,
          telefono:
            adminPrimario.telefono || CONTACTOS_DEFAULT.administrador.telefono,
        }
      : CONTACTOS_DEFAULT.administrador;

  const contactosFor = (unidad: Unidad): DirectorioContactos => ({
    anfitrion: anfitrionPrimario
      ? {
          nombre: anfitrionPrimario.nombre,
          telefono:
            anfitrionPrimario.telefono || CONTACTOS_DEFAULT.anfitrion.telefono,
        }
      : CONTACTOS_DEFAULT.anfitrion,
    administrador: getAdminPrimario(),
    propietario: unidad.propietarioAsignado
      ? {
          nombre: unidad.propietarioAsignado,
          telefono:
            unidad.propietarioEmail || CONTACTOS_DEFAULT.propietario.telefono,
        }
      : CONTACTOS_DEFAULT.propietario,
  });

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
          `${unidad.codigo} ${unidad.propietarioAsignado || ""}`,
          unidad.torreNumero,
        ),
      ),
    [search, torreFiltro, unidades],
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
    [unidades, residentes],
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
                  propietario: CONTACTOS_DEFAULT.propietario,
                  anfitrion: CONTACTOS_DEFAULT.anfitrion,
                  administrador: getAdminPrimario(),
                },
          };
        }),
    [depositos, unidades, search, torreFiltro, residentes],
  );
  return {
    ...query,
    unidades,
    tipologias,
    residentes,
    anfitrionPrimario,
    torres,
    search,
    setSearch,
    torreFiltro,
    setTorreFiltro,
    subTab,
    setSubTab,
    contactosFor,
    getAdminPrimario,
    filtered,
    filteredEst,
    filteredDep,
  };
}

export function useDirectorioPagos() {
  const queryClient = useQueryClient();
  const marcarPagoMantenimiento = usePerfilStore(
    (state) => state.marcarPagoMantenimiento,
  );
  const mutation = useMutation({
    mutationFn: marcarPagosRequest,
    onSuccess: (ids) => {
      ids.forEach((id) => marcarPagoMantenimiento(id, true));
      void queryClient.invalidateQueries({ queryKey: ["directorio"] });
    },
  });
  return { marcarPagos: mutation.mutate, marcandoPagos: mutation.isPending };
}
