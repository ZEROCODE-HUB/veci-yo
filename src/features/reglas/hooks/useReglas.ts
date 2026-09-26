import { useMemo, useState } from "react";
import { listaDe } from "@/shared/utils";
import { Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useCondominioActivo } from "@/shared/hooks";
import { obtenerUnidadesRentaCorta } from "../services";
import type { DepartamentoRentaCorta } from "../types/reglas";

export const REGLAS_DEPARTAMENTOS_QUERY_KEY = ["reglas", "departamentos"];

export function useReglas() {
  const role = useAuthStore((state) => state.rolActivo);
  const condominioId = useCondominioActivo() ?? "";

  const comoPersonal = role === "administrador" || role === "guardia";

  const query = useQuery({
    queryKey: [...REGLAS_DEPARTAMENTOS_QUERY_KEY, condominioId, comoPersonal],
    queryFn: () => obtenerUnidadesRentaCorta({ condominioId, comoPersonal }),
    enabled: Boolean(condominioId),
  });

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [tower, setTower] = useState("");
  const [department, setDepartment] = useState("");
  const [floor, setFloor] = useState("");
  const [actionsDepartment, setActionsDepartment] =
    useState<DepartamentoRentaCorta | null>(null);
  const [complianceDepartment, setComplianceDepartment] =
    useState<DepartamentoRentaCorta | null>(null);

  const departamentos = listaDe(query.data);

  // Los filtros salen de lo que hay, no de listas fijas: `reglasTorres` era
  // ['A','B','C'] y `reglasPisos` ['1','2','3','4'], así que se podía filtrar
  // por una torre o un piso que no existen en ningún condominio.
  const torres = useMemo(
    () => [...new Set(departamentos.map((d) => d.torre))].sort(),
    [departamentos],
  );
  const pisos = useMemo(
    () => [...new Set(departamentos.map((d) => d.piso))].filter(Boolean).sort(),
    [departamentos],
  );
  const codigos = useMemo(
    () => [...new Set(departamentos.map((d) => d.departamento))].sort(),
    [departamentos],
  );

  const filtered = useMemo(
    () =>
      departamentos.filter((item) => {
        const texto = search.toLowerCase();
        const coincideTexto =
          !texto ||
          item.departamento.toLowerCase().includes(texto) ||
          item.responsable.toLowerCase().includes(texto);
        // Los tres filtros existían en la pantalla y no filtraban nada.
        return (
          coincideTexto &&
          (!tower || item.torre === tower) &&
          (!department || item.departamento === department) &&
          (!floor || item.piso === floor)
        );
      }),
    [departamentos, search, tower, department, floor],
  );

  const callContact = (
    type: "anfitrion" | "administrador" | "propietario",
  ) => {
    if (!actionsDepartment) return;
    const telefono =
      type === "anfitrion"
        ? actionsDepartment.telAnfitrion
        : type === "administrador"
          ? actionsDepartment.telAdmin
          : actionsDepartment.telPropietario;
    setActionsDepartment(null);
    if (telefono) Linking.openURL(`tel:${telefono}`);
  };

  return {
    ...query,
    role,
    isTemporaryGuest: role === "huesped-temporal",
    canCallDepartmentContacts:
      role === "guardia" || role === "huesped-temporal" || role === "administrador",
    search,
    setSearch,
    filterOpen,
    setFilterOpen,
    tower,
    setTower,
    department,
    setDepartment,
    floor,
    setFloor,
    torres,
    pisos,
    codigos,
    filtered,
    actionsDepartment,
    setActionsDepartment,
    complianceDepartment,
    setComplianceDepartment,
    callContact,
  };
}
