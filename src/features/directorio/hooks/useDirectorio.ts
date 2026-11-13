import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminStore, useAuthStore } from "@/stores";
import { obtenerUnidadesRentaCorta } from "@/features/reglas/services";
import { useCondominioActivo } from "@/shared/hooks";
import {
  obtenerArquitectura,
  obtenerContactosPorUnidad,
} from "@/features/administrador/services/arquitectura.repo";
import { estadoDe, juntarCargas } from "@/shared/components";
import { useEstacionamientosVisita } from "@/features/visitas/hooks/useEstacionamientosVisita";
import { PAPEL_EN_LA_VIVIENDA } from "../helpers/contactos";
import { placaParaBuscar, vehiculosPorUnidad, type VehiculoDelDirectorio } from "../services/vehiculos.repo";
import type { Unidad } from "@/stores/admin-store";
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
  /*
    Las viviendas llegan al store desde `useDatosCondominio`, con esta misma
    consulta. Aquí solo se mira cómo va --misma clave, la caché es una--: sin
    eso, mientras cargaba se leía «Sin resultados» y cada tarjeta decía
    «Propietario: Sin asignar» hasta que llegaban los contactos (13/11/2026).
  */
  const arquitectura = useQuery({
    queryKey: ["condominio", "arquitectura", condominioId],
    queryFn: obtenerArquitectura,
    enabled: Boolean(condominioId),
  });
  /*
    Aqui habia una segunda consulta --`fetchDirectorioRequest`-- que esperaba
    150 ms y devolvia el mismo store que esta justo arriba. Era lo que quedaba
    del prototipo: ni la pantalla miraba su `isLoading` ni su `error`, asi que
    solo anadia una espera inventada. Las unidades, tipologias y depositos los
    trae `useDatosCondominio` desde la base, en `RootNavigator`.
  */

  /*
    Las viviendas con renta corta, para el filtro «Renta corta» (Correcciones,
    06/11/2026). Las da `unidades_renta_corta`, la misma que usa la pantalla de
    renta corta; el rol activo dice si se pide como personal (regla 8).
  */
  const rolActivo = useAuthStore((s) => s.rolActivo);
  const comoPersonal = rolActivo === "administrador" || rolActivo === "guardia";
  const rentaCorta = useQuery({
    queryKey: ["directorio", "renta-corta", condominioId, comoPersonal],
    queryFn: () => obtenerUnidadesRentaCorta({ condominioId, comoPersonal }),
    enabled: Boolean(condominioId),
  });
  const conRentaCorta = useMemo(
    () => new Set((rentaCorta.data ?? []).map((u) => u.id)),
    [rentaCorta.data],
  );
  const [soloRentaCorta, setSoloRentaCorta] = useState(false);

  // Los vehículos de cada vivienda, para verlos y buscar por placa (fila 24).
  const vehiculos = useQuery({
    queryKey: ["directorio", "vehiculos", condominioId],
    queryFn: () => vehiculosPorUnidad(condominioId),
    enabled: Boolean(condominioId),
  });
  const vehiculosDe = useCallback(
    (unidad: Pick<Unidad, "uuid">): VehiculoDelDirectorio[] =>
      vehiculos.data?.[unidad.uuid ?? ""] ?? [],
    [vehiculos.data],
  );

  const [search, setSearch] = useState("");
  /** Lo buscado como placa: sin espacios ni guiones, en mayúsculas. */
  const placaBuscada = placaParaBuscar(search);
  const [torreFiltro, setTorreFiltro] = useState("");
  const [subTab, setSubTab] = useState<
    "departamentos" | "estacionamientos" | "depositos"
  >("departamentos");
  // El anfitrion y el admin primario son por unidad, no del condominio: los
  // trae `contactos`. Antes se buscaba "el primero que lo sea" en un store de
  // residentes y se aplicaba a todas las unidades por igual.

  /*
    Las dos van en `useCallback` porque los cuatro `useMemo` de abajo las
    llaman. Sin esto se recrean en cada render, y los memos tenian que listar a
    mano las dependencias **de la funcion** --`contactos.data`, `search`,
    `torreFiltro`-- en vez de la funcion: el codigo funcionaba, pero las
    dependencias no decian de que dependia de verdad, y el dia que la funcion
    mire una cosa mas hay que acordarse de anadirla en cuatro sitios.
  */
  const contactosFor = useCallback(
    (unidad: Pick<Unidad, "uuid" | "id">): DirectorioContactos => {
      const deLaUnidad = contactos.data?.[unidad.uuid ?? unidad.id];
      return {
        anfitrion: deLaUnidad?.anfitrion ?? SIN_ASIGNAR,
        administrador: deLaUnidad?.administrador ?? SIN_ASIGNAR,
        propietario: deLaUnidad?.propietario ?? SIN_ASIGNAR,
        personas: (deLaUnidad?.personas ?? []).map((p) => ({
          nombre: p.nombre,
          papel: PAPEL_EN_LA_VIVIENDA[p.rol] ?? p.rol,
        })),
      };
    },
    [contactos.data],
  );

  const torres = useMemo(
    () =>
      [...new Set(unidades.map((unidad) => unidad.torreNumero))]
        .sort((a, b) => a - b)
        .map((numero) => `Torre ${numero}`),
    [unidades],
  );

  const matches = useCallback(
    (text: string, torreNumero: number) =>
      (!torreFiltro ||
        String(torreNumero) === torreFiltro.replace("Torre ", "").trim() ||
        String(torreNumero) === torreFiltro) &&
      (!search || text.toLowerCase().includes(search.toLowerCase())),
    [search, torreFiltro],
  );

  const filtered = useMemo(
    () =>
      unidades.filter((unidad) =>
        (!soloRentaCorta || conRentaCorta.has(unidad.uuid ?? "")) &&
        (
          // Por placa, escrita como sea: «abc-123» encuentra «ABC123» (fila 24).
          (placaBuscada.length >= 3 &&
            // Lo buscado contra sí mismo: así solo cuenta el filtro de torre.
            matches(search, unidad.torreNumero) &&
            vehiculosDe(unidad).some((v) => placaParaBuscar(v.placa).includes(placaBuscada))) ||
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
          /*
            Por cualquiera de las personas de la vivienda y su papel, no solo
            el propietario (Para Claude 185, 30/10/2026).
          */
          [
            unidad.codigo,
            `Torre ${unidad.torreNumero}`,
            contactosFor(unidad).propietario.nombre,
            ...contactosFor(unidad).personas.map((p) => `${p.nombre} ${p.papel}`),
          ].join(" "),
          unidad.torreNumero,
        )),
      ),
    [unidades, matches, contactosFor, soloRentaCorta, conRentaCorta, placaBuscada, vehiculosDe, search],
  );

  const estacionamientosList = useMemo<DirectorioEstacionamiento[]>(
    () =>
      unidades.flatMap((unidad) =>
        Array.from({ length: unidad.estacionamientos || 0 }, (_, index) => ({
          id: `${unidad.id}-${index}`,
          // Su código de verdad (09/11/2026); antes se inventaba «101-E1».
          codigo: unidad.codigosEstacionamiento?.[index] ?? `${unidad.codigo}-E${index + 1}`,
          ubicacion: unidad.ubicacionParking || `T${unidad.torreNumero}`,
          torreNumero: unidad.torreNumero,
          unidad,
          // El de los contactos, como en la pestaña de departamentos: con el
          // de memoria no se encontraba una cochera por el nombre de su dueño.
          propietario:
            contactosFor(unidad).propietario.nombre || "Sin propietario",
          contactos: contactosFor(unidad),
        })),
      ),
    [unidades, contactosFor],
  );

  const filteredEst = useMemo(
    () =>
      estacionamientosList.filter((item) =>
        matches(
          // Por todos sus datos (Para Claude 186, 30/10/2026).
          [
            item.codigo,
            item.ubicacion,
            `Torre ${item.torreNumero}`,
            item.propietario,
            item.unidad.codigo,
            ...item.contactos.personas.map((p) => p.nombre),
          ].join(" "),
          item.torreNumero,
        ),
      ),
    [estacionamientosList, matches],
  );

  /*
    Los de visita, que no cuelgan de ningun departamento ni de una torre: se
    buscan por su codigo y su ubicacion, y el filtro de torre no los quita.
  */
  const { cupos: cuposDeVisita } = useEstacionamientosVisita();
  const filteredEstVisita = useMemo(() => {
    const buscado = search.trim().toLowerCase();
    if (!buscado) return cuposDeVisita;
    return cuposDeVisita.filter((cupo) =>
      `${cupo.codigo} ${cupo.ubicacion} visita`.toLowerCase().includes(buscado),
    );
  }, [cuposDeVisita, search]);

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
              // Por todos sus datos, también quién vive en su depto (186).
              [
                deposito.codigo,
                deposito.ubicacion,
                deposito.departamentoCodigo || "",
                `Torre ${deposito.torreNumero}`,
                ...(unidad ? contactosFor(unidad).personas.map((p) => p.nombre) : []),
              ].join(" "),
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
                  personas: [],
                },
          };
        }),
    [depositos, unidades, matches, contactosFor],
  );
  /*
    Cuantos depositos tiene cada vivienda.

    La pildora del directorio decia «📦 Depositos asociados al depto» y ahi se
    quedaba: una etiqueta fija, sin numero, al lado de su hermana «🏠 Estac: 0»
    que si lo dice. El dato existe --`deposito.unidad_id`-- y esta cargado en
    este mismo hook, que lo usa para la pestaña de Depositos; a la tarjeta no
    llegaba.

    Se cuenta como ya lo hace el filtro de abajo: por `unidadId` o, si el
    deposito no lo trae, por el codigo del departamento.
  */
  /*
    13/11/2026 (tester): el código de cada depósito, no solo cuántos hay,
    igual que se hace con los estacionamientos.
  */
  const depositosPorUnidad = useMemo(() => {
    const cuenta = new Map<string, string[]>();
    for (const deposito of depositos) {
      const unidad = unidades.find(
        (item) =>
          String(item.id) === String(deposito.unidadId) ||
          item.codigo === deposito.departamentoCodigo,
      );
      if (!unidad) continue;
      const clave = String(unidad.id);
      cuenta.set(clave, [...(cuenta.get(clave) ?? []), deposito.codigo]);
    }
    return cuenta;
  }, [depositos, unidades]);

  return {
    unidades,
    tipologias,
    torres,
    depositosPorUnidad,
    search,
    setSearch,
    torreFiltro,
    setTorreFiltro,
    subTab,
    setSubTab,
    soloRentaCorta,
    setSoloRentaCorta,
    contactosFor,
    vehiculosDe,
    filtered,
    filteredEst,
    filteredEstVisita,
    filteredDep,
    /** Viviendas y contactos: hasta tenerlos, ni «Sin resultados» ni «Sin asignar». */
    carga: juntarCargas(estadoDe(arquitectura), estadoDe(contactos)),
  };
}

/*
 * `useDirectorioPagos` vivia aqui y no escribia nada: llamaba a
 * `marcarPagosRequest` —un `delay(200)` que devolvia su entrada— y marcaba
 * un store de Zustand. El registro de pagos es ahora `useCuotas`.
 */
