import type { NavegacionApp } from "@/shared/types/navigation";

/**
 * «Tu edificio, paso a paso» (pedido del cliente, 16/11/2026): «que en su
 * pantalla principal haya una card indicando la lista de cosas que debe hacer
 * para tener su edificio ya listo… algo sencillo… que le lleve a la pantalla».
 *
 * Aquí solo se decide **qué pasos hay y cuáles están hechos**, con datos ya
 * cargados: así se prueba sin red y sin montar nada. Las consultas viven en
 * `usePasosParaEmpezar.ts` y el dibujo en `ListaParaEmpezar.tsx`.
 */

/** A dónde lleva la fila al tocarla. */
export interface DestinoDelPaso {
  ruta: keyof NavegacionApp;
  params?: object;
}

export interface PasoParaEmpezar {
  /** Estable: es la `key` de la fila y lo que miran las pruebas. */
  id: string;
  texto: string;
  hecho: boolean;
  /** Una línea debajo: «12 de 20», «Pídeselo a la administración». */
  nota?: string;
  /** La pantalla donde se hace el paso. */
  destino?: DestinoDelPaso;
  /** O una acción en el sitio, como pedir el permiso de avisos. */
  accion?: () => void;
}

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

export interface DatosDelAdministrador {
  torres: number;
  viviendas: number;
  /** Las viviendas que ya tienen propietario (o invitado): estado distinto de `disponible`. */
  viviendasConPropietario: number;
  /** Todos los estacionamientos, privados y de visita. */
  estacionamientos: number;
  garitas: number;
  guardias: number;
  zonas: number;
  /** Reglamentos vigentes del edificio. */
  reglamentos: number;
}

const arquitectura = (pestana: string): DestinoDelPaso => ({
  ruta: "AdministradorArquitectura",
  params: { pestana },
});

export function pasosDelAdministrador(d: DatosDelAdministrador): PasoParaEmpezar[] {
  return [
    {
      id: "torres",
      texto: "Crea las torres y sus departamentos",
      hecho: d.torres > 0 && d.viviendas > 0,
      destino: arquitectura("Torres"),
    },
    {
      id: "estacionamientos",
      texto: "Crea los niveles y los estacionamientos",
      hecho: d.estacionamientos > 0,
      destino: arquitectura("Estacionamientos"),
    },
    {
      id: "garitas",
      texto: "Registra las garitas",
      hecho: d.garitas > 0,
      destino: arquitectura("Porterías"),
    },
    {
      id: "guardias",
      texto: "Invita a los guardias",
      hecho: d.guardias > 0,
      destino: { ruta: "AdministradorSeguridad" },
    },
    {
      id: "zonas",
      texto: "Crea las zonas comunes",
      hecho: d.zonas > 0,
      destino: { ruta: "GestionZonas" },
    },
    {
      /*
        Sin viviendas no hay a quién asignar: no está hecho, aunque «todas las
        que hay» (cero) tengan propietario.
      */
      id: "propietarios",
      texto: "Asigna los propietarios",
      hecho: d.viviendas > 0 && d.viviendasConPropietario >= d.viviendas,
      nota: d.viviendas > 0 ? `${d.viviendasConPropietario} de ${d.viviendas} departamentos` : undefined,
      destino: arquitectura("Torres"),
    },
    {
      id: "reglamento",
      texto: "Sube el reglamento",
      hecho: d.reglamentos > 0,
      destino: { ruta: "AdministradorPermisos" },
    },
  ];
}

// ---------------------------------------------------------------------------
// Lo que comparten propietario y guardia
// ---------------------------------------------------------------------------

export interface AvisosDelCelular {
  /** En la web no hay avisos push: el paso no se pide. */
  disponible: boolean;
  permiso: boolean;
  activar: () => void;
}

/*
  Sin paso del teléfono (17/11/2026, cliente: «¿acaso eso no se pide al
  crear cuenta?»). Se pide: el registro lo exige, quien entra con Google lo da
  en «Completa tus datos», y a las cuentas viejas sin él se les puso uno.
*/

function pasoDeAvisos(avisos: AvisosDelCelular): PasoParaEmpezar[] {
  if (!avisos.disponible) return [];
  return [
    {
      id: "avisos",
      texto: "Activa los avisos en este celular",
      hecho: avisos.permiso,
      // Ya activados, tocar no hace nada útil: sin acción.
      accion: avisos.permiso ? undefined : avisos.activar,
    },
  ];
}

// ---------------------------------------------------------------------------
// Propietario
// ---------------------------------------------------------------------------

export interface DatosDelPropietario {
  /** Sin vivienda activa no hay residentes ni vehículos que pedir. */
  tieneVivienda: boolean;
  /**
   * La vivienda se alquila (renta corta en marcha): ahí nadie es residente
   * (D-70), así que «quién vive» no aplica.
   */
  enAlquiler: boolean;
  /** Alguien de la vivienda vive en ella, o hay alguien más que el propietario. */
  hayQuienViva: boolean;
  /** Estacionamientos privados de la vivienda: es el tope de vehículos. */
  cocheras: number;
  vehiculos: number;
  avisos: AvisosDelCelular;
}

export function pasosDelPropietario(d: DatosDelPropietario): PasoParaEmpezar[] {
  const pasos: PasoParaEmpezar[] = [];
  if (d.tieneVivienda && !d.enAlquiler) {
    pasos.push({
      id: "residentes",
      texto: "Cuéntanos quién vive en tu vivienda",
      hecho: d.hayQuienViva,
      destino: { ruta: "PropietarioConfiguracion" },
    });
  }
  // Sin estacionamiento la vivienda no puede declarar vehículos.
  if (d.tieneVivienda && d.cocheras > 0) {
    pasos.push({
      id: "vehiculos",
      texto: "Registra tus vehículos",
      hecho: d.vehiculos > 0,
      destino: { ruta: "PropietarioConfiguracion" },
    });
  }
  return [...pasos, ...pasoDeAvisos(d.avisos)];
}

// ---------------------------------------------------------------------------
// Guardia
// ---------------------------------------------------------------------------

export interface DatosDelGuardia {
  /** El nombre de su garita; vacío si no tiene. */
  garita: string;
  turnos: number;
  avisos: AvisosDelCelular;
}

/** La garita y el turno los pone la administración: el guardia no puede hacerlo. */
const PEDIRSELO = "Pídeselo a la administración";

export function pasosDelGuardia(d: DatosDelGuardia): PasoParaEmpezar[] {
  const garita = d.garita.trim();
  return [
    {
      id: "garita",
      texto: garita ? `Tu garita: ${garita}` : "Tu garita asignada",
      hecho: garita !== "",
      nota: garita ? undefined : PEDIRSELO,
    },
    {
      id: "turno",
      texto: "Tu turno de trabajo",
      hecho: d.turnos > 0,
      nota: d.turnos > 0 ? undefined : PEDIRSELO,
    },
    ...pasoDeAvisos(d.avisos),
  ];
}

/** «4 de 7 listos». */
export function cuentaDePasos(pasos: PasoParaEmpezar[]) {
  const hechos = pasos.filter((p) => p.hecho).length;
  return { hechos, total: pasos.length, completa: pasos.length > 0 && hechos === pasos.length };
}
