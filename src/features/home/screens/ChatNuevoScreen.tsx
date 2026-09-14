import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "@/stores";
import { adminList, personasTorre } from "@/data/chatMockData";
import { ChatNewForm } from "../components/chat/ChatNewForm";

export function ChatNuevoScreen() {
  const navigation = useNavigation<any>();
  const { rolActivo } = useAuthStore();
  const soloSeguridadAdmin = rolActivo === "huesped-temporal";

  const [torre, setTorre] = useState(
    soloSeguridadAdmin ? "Seguridad" : "Torre 1",
  );
  const [depto, setDepto] = useState("Departamento 105");
  const [piso, setPiso] = useState("");
  const [persona, setPersona] = useState(
    soloSeguridadAdmin ? "Seguridad" : "Mario",
  );
  const [busquedaPersona, setBusquedaPersona] = useState("");

  const handleTorreChange = (value: any) => {
    const selectedTorre = String(value);
    setTorre(selectedTorre);

    if (selectedTorre === "Seguridad") setPersona("Seguridad");
    else if (selectedTorre === "Administrador") setPersona(adminList[0]);
    else setPersona(personasTorre[0]);
  };

  const handleStartChat = () => {
    navigation.replace("ChatConversacion", { conversationId: persona });
  };

  return (
    <ChatNewForm
      torre={torre}
      depto={depto}
      piso={piso}
      persona={persona}
      busquedaPersona={busquedaPersona}
      soloSeguridadAdmin={soloSeguridadAdmin}
      onTorreChange={handleTorreChange}
      onDeptoChange={(value) => setDepto(String(value))}
      onPisoChange={(value) => setPiso(String(value))}
      onPersonaChange={(value) => setPersona(String(value))}
      onBusquedaChange={(value) => {
        setBusquedaPersona(value);
        setPersona("");
      }}
      onStartChat={handleStartChat}
    />
  );
}
