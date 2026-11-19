import React from "react";
import { useAuthStore } from "@/stores";
import { ListaParaEmpezar } from "./ListaParaEmpezar";
import { sinLosDescartados, TARJETA_ENTERA } from "../helpers/pasosParaEmpezar";
import { usePasosDescartados } from "../hooks/usePasosDescartados";
import {
  usePasosDelAdministrador,
  usePasosDelGuardia,
  usePasosDelPropietario,
} from "../hooks/usePasosParaEmpezar";

/**
 * Elige la lista del rol activo (16/11/2026). Un componente por rol para que
 * cada uno pida solo sus datos: los hooks no se pueden llamar a medias.
 */
export function TuEdificioPasoAPaso() {
  const rolActivo = useAuthStore((s) => s.rolActivo);
  if (rolActivo === "administrador") return <DelAdministrador />;
  if (rolActivo === "guardia") return <DelGuardia />;
  // Desde el 18/11/2026 también el inquilino líder, el residente y el anfitrión.
  if (rolActivo === "propietario" || rolActivo === "propietario-no-residente" || rolActivo === "inquilino-lider") {
    return <DelPropietario />;
  }
  return null;
}

/*
  Cada uno puede quitar un paso que no le aplica, u ocultar la tarjeta
  (18/11/2026, pedido del cliente). Se recuerda en la base.
*/
function ConDescartes({ titulo, pasos, carga }: { titulo: string } & ReturnType<typeof usePasosDelAdministrador>) {
  const { descartados, descartar } = usePasosDescartados();
  return (
    <ListaParaEmpezar
      titulo={titulo}
      pasos={sinLosDescartados(pasos, descartados)}
      carga={carga}
      onQuitarPaso={descartar}
      onOcultar={() => descartar(TARJETA_ENTERA)}
    />
  );
}

function DelAdministrador() {
  return <ConDescartes titulo="Tu edificio, paso a paso" {...usePasosDelAdministrador()} />;
}

function DelPropietario() {
  return <ConDescartes titulo="Tu vivienda, paso a paso" {...usePasosDelPropietario()} />;
}

function DelGuardia() {
  return <ConDescartes titulo="Tu puesto, paso a paso" {...usePasosDelGuardia()} />;
}
