import React from "react";
import { useAuthStore } from "@/stores";
import { ListaParaEmpezar } from "./ListaParaEmpezar";
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
  if (rolActivo === "propietario" || rolActivo === "propietario-no-residente") {
    return <DelPropietario />;
  }
  return null;
}

function DelAdministrador() {
  const { pasos, carga } = usePasosDelAdministrador();
  return <ListaParaEmpezar titulo="Tu edificio, paso a paso" pasos={pasos} carga={carga} />;
}

function DelPropietario() {
  const { pasos, carga } = usePasosDelPropietario();
  return <ListaParaEmpezar titulo="Tu vivienda, paso a paso" pasos={pasos} carga={carga} />;
}

function DelGuardia() {
  const { pasos, carga } = usePasosDelGuardia();
  return <ListaParaEmpezar titulo="Tu puesto, paso a paso" pasos={pasos} carga={carga} />;
}
