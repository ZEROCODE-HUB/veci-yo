import type { IngresoSalida } from "../types";

export const HORAS_TURNO = [
  "06:00",
  "08:00",
  "10:00",
  "12:00",
  "14:00",
  "16:00",
  "18:00",
  "20:00",
  "22:00",
  "00:00",
];

export const COLOR_FAMILIARES = "#2563EB";
export const COLOR_TEMPORAL = "#F59E0B";

const NOMBRES_CON_VEHICULO = [
  "Guillermo Sarpeito",
  "Mario Bonefi",
  "Carlos Mendoza",
  "Roberto Andrade",
  "Carmen Villalobos",
  "Diego Villalobos",
  "Jorge Sarpeito",
  "Luis F. Soto",
];

function obtenerIndiceHora(hora: string) {
  const horaNumerica = parseInt((hora || "0").split(":")[0], 10);
  const indice =
    horaNumerica < 6
      ? HORAS_TURNO.length - 1
      : Math.floor((horaNumerica - 6) / 2);
  return Math.min(Math.max(indice, 0), HORAS_TURNO.length - 1);
}

export function calcularTrafico(data: IngresoSalida[], modoIngreso: boolean) {
  const familiarIng = HORAS_TURNO.map(() => 0);
  const temporalIng = HORAS_TURNO.map(() => 0);
  const familiarSal = HORAS_TURNO.map(() => 0);
  const temporalSal = HORAS_TURNO.map(() => 0);
  const vehiculosIng = HORAS_TURNO.map(() => 0);
  const vehiculosSal = HORAS_TURNO.map(() => 0);

  data.forEach((item) => {
    const indiceIngreso = obtenerIndiceHora(item.horaIngreso);
    const esFamiliar = item.tipo !== "Huésped temporal";
    if (esFamiliar) familiarIng[indiceIngreso]++;
    else temporalIng[indiceIngreso]++;
    if (NOMBRES_CON_VEHICULO.includes(item.nombre)) vehiculosIng[indiceIngreso]++;

    if (item.horaSalida) {
      const indiceSalida = obtenerIndiceHora(item.horaSalida);
      if (esFamiliar) familiarSal[indiceSalida]++;
      else temporalSal[indiceSalida]++;
      if (NOMBRES_CON_VEHICULO.includes(item.nombre)) vehiculosSal[indiceSalida]++;
    }
  });

  const usadoFamiliar = modoIngreso ? familiarIng : familiarSal;
  const usadoTemporal = modoIngreso ? temporalIng : temporalSal;
  const usadoVehiculos = modoIngreso ? vehiculosIng : vehiculosSal;
  const usadoPorHora = usadoFamiliar.map((valor, indice) => valor + usadoTemporal[indice]);

  return {
    usadoFamiliar,
    usadoTemporal,
    usadoVehiculos,
    usadoPorHora,
    maxVal: Math.max(1, ...usadoPorHora),
  };
}
