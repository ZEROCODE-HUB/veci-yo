import React from "react";
import { ScrollView } from "react-native";
import { LlamadaPanel, LlamadaSelector } from "../components/llamadas";
import { HistorialLlamadasCard } from "../components/llamadas/HistorialLlamadasCard";
import { useLlamada } from "../hooks/useLlamada";

export function CallScreen() {
  const llamada = useLlamada();

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="p-4 gap-3"
    >
      <LlamadaSelector
        esPersonal={llamada.esPersonal}
        torres={llamada.torres}
        torre={llamada.torre}
        onTorreChange={llamada.cambiarTorre}
        viviendas={llamada.viviendas}
        unidadId={llamada.unidadId}
        onViviendaChange={llamada.setUnidadId}
        destinos={llamada.destinos}
        destino={llamada.destino}
        onDestinoChange={llamada.setDestino}
        opcionesDelPersonal={llamada.opcionesDelPersonal}
        aUnaVivienda={llamada.aUnaVivienda}
      />
      <LlamadaPanel
        avatarEmoji={llamada.avatarEmoji}
        aQuien={llamada.aQuien}
        nombreDelContacto={llamada.nombreDelContacto}
        motivo={llamada.motivo}
        sinApp={llamada.sinApp}
        buscando={llamada.buscando}
        porInternet={llamada.porInternet}
        numero={llamada.numero}
        onLlamarPorLaApp={() => void llamada.llamarPorLaApp()}
        onLlamarPorTelefono={() => void llamada.llamarPorTelefono()}
      />
      <HistorialLlamadasCard
        historial={llamada.historial}
        persona={llamada.aQuien}
      />
    </ScrollView>
  );
}
