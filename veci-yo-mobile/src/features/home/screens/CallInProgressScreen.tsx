import React from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LlamadaEnCursoView } from "../components/llamadas";
import { useLlamadaEnCurso } from "../hooks/useLlamadaEnCurso";

export function CallInProgressScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { depto = "Departamento 106 C", persona = "Mario casa" } = route.params || {};
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

