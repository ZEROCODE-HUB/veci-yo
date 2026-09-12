import React from "react";
import { ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LlamadaPanel, LlamadaSelector } from "../components/llamadas";
import { HistorialLlamadasCard } from "../components/llamadas/HistorialLlamadasCard";
import { useLlamada } from "../hooks/useLlamada";

export function CallScreen() {
  const navigation = useNavigation<any>();
  const {
    torre,
    depto,
    persona,
    opcionesTorre,
    opcionesPersona,
    opcionesDepartamento,
    esPersonal,
    avatarEmoji,
    historialPersona,
    cambiarTorre,
    setDepto,
    setPersona,
    registrarLlamada,
  } = useLlamada();

  const handleCall = () => {
    registrarLlamada({ depto, persona, tipo: "saliente" });
    navigation.navigate("LlamadaEnCurso", { depto, persona });
  };

  const handleReject = () => {
    registrarLlamada({ depto, persona, tipo: "perdida" });
    navigation.goBack();
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="p-4 gap-3"
    >
      <LlamadaSelector
        torre={torre}
        depto={depto}
        persona={persona}
        opcionesTorre={opcionesTorre}
        opcionesDepartamento={opcionesDepartamento}
        opcionesPersona={opcionesPersona}
        esPersonal={esPersonal}
        onTorreChange={cambiarTorre}
        onDeptoChange={setDepto}
        onPersonaChange={setPersona}
      />
      <LlamadaPanel
        avatarEmoji={avatarEmoji}
        onLlamar={handleCall}
        onRechazar={handleReject}
      />
      <HistorialLlamadasCard historial={historialPersona} persona={persona} />
    </ScrollView>
  );
}
