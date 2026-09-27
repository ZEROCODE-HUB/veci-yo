import React from "react";
import { LlamadaEnCursoView } from "../components/llamadas";
import { useLlamadaEnCurso } from "../hooks/useLlamadaEnCurso";
import { useNavegacion, useParametros } from "@/shared/hooks";

export function CallInProgressScreen() {
  const navigation = useNavegacion();
  const parametros = useParametros("LlamadaEnCurso");
  const { depto = "Departamento 106 C", persona = "Mario casa" } = parametros ?? {};
  const { segundos, silenciada, alternarSilencio } = useLlamadaEnCurso();

  return (
    <LlamadaEnCursoView
      depto={depto}
      persona={persona}
      segundos={segundos}
      silenciada={silenciada}
      onToggleSilencio={alternarSilencio}
      onColgar={() => navigation.goBack()}
    />
  );
}

