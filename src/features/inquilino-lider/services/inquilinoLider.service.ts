import { useUbicacionStore } from "@/stores/ubicacion-store";
import type { UbicacionFormulario } from "../types";

const SIMULATED_REQUEST_DELAY = 150;

function esperar() {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, SIMULATED_REQUEST_DELAY),
  );
}


export async function obtenerUbicacionesRequest() {
  await esperar();
  return useUbicacionStore.getState().ubicaciones;
}

export async function agregarUbicacionRequest(datos: UbicacionFormulario) {
  await esperar();
  return useUbicacionStore.getState().agregarUbicacion({
    direccion: [datos.distrito, datos.urbanizacion].filter(Boolean).join(", "),
    alias: datos.condominio,
    imagen: datos.imagen,
  });
}

export async function actualizarUbicacionRequest(data: {
  id: number;
  datos: UbicacionFormulario;
}) {
  await esperar();
  useUbicacionStore.getState().actualizarUbicacion(data.id, {
    direccion: [data.datos.distrito, data.datos.urbanizacion]
      .filter(Boolean)
      .join(", "),
    alias: data.datos.condominio,
    imagen: data.datos.imagen,
  });
  return data.id;
}

export async function eliminarUbicacionRequest(id: number) {
  await esperar();
  useUbicacionStore.getState().eliminarUbicacion(id);
  return id;
}
