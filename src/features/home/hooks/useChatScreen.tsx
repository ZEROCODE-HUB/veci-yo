import { useLayoutEffect, useState } from "react";
import { Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore, useAuthStore } from "@/stores";
import { adminList, personasTorre } from "@/data/chatMockData";
import { useChatConversations } from "./useChatConversations";
import type { Conversation } from "@/shared/types";

type VistaChat = "lista" | "chat" | "nuevo";
type FiltroChat = "todos" | "individuales" | "grupos";
type TabChat = "torres" | "seguridad" | "admin";

export function useChatScreen() {
  const navigation = useNavigation<any>();
  const {
    enviarMensaje,
    marcarMensajesLeidos,
    enviarMensajeGrupo,
    marcarMensajesGrupoLeidos,
  } = useChatStore();
  const { usuario } = useAuthStore();
  const nombreUsuario = usuario?.nombre || "Yo";

  const [vista, setVista] = useState<VistaChat>("lista");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [texto, setTexto] = useState("");
  const [soloNoLeidos, setSoloNoLeidos] = useState(false);
  const [filtroChat, setFiltroChat] = useState<FiltroChat>("todos");
  const [tabActiva, setTabActiva] = useState<TabChat>("torres");
  const [filtroTorre, setFiltroTorre] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");
  const [torre, setTorre] = useState("Torre 1");
  const [depto, setDepto] = useState("Departamento 105");
  const [piso, setPiso] = useState("");
  const [persona, setPersona] = useState("Mario");
  const [busquedaPersona, setBusquedaPersona] = useState("");

  const datosConversaciones = useChatConversations({
    soloNoLeidos,
    filtroChat,
    tabActiva,
    filtroTorre,
    filtroDepto,
    selectedConv,
  });

  useLayoutEffect(() => {
    if (vista === "chat" && selectedConv) {
      navigation.setOptions({
        title: selectedConv.nombre,
        headerLeft: () => (
          <PressableHeader
            onPress={() => {
              setSelectedConv(null);
              setVista("lista");
            }}
          />
        ),
      });
    } else if (vista === "nuevo") {
      navigation.setOptions({
        title: "Nuevo chat",
        headerLeft: () => <PressableHeader onPress={() => setVista("lista")} />,
      });
    } else {
      navigation.setOptions({ title: "Chat", headerLeft: undefined });
    }
  }, [navigation, vista, selectedConv]);

  const handleSend = () => {
    if (!texto.trim() || !selectedConv) return;
    if (selectedConv.tipo === "grupo") {
      enviarMensajeGrupo(texto.trim(), selectedConv.grupoId!, nombreUsuario);
    } else {
      enviarMensaje(texto.trim(), selectedConv.nombre);
    }
    setTexto("");
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConv(conv);
    setTexto("");
    setVista("chat");
    setTimeout(() => {
      if (conv.tipo === "grupo") marcarMensajesGrupoLeidos(conv.grupoId!);
      else marcarMensajesLeidos();
    }, 300);
  };

  const handleNewChat = () => {
    setTorre(datosConversaciones.soloSeguridadAdmin ? "Seguridad" : "Torre 1");
    setDepto("Departamento 105");
    setPiso("");
    setPersona(datosConversaciones.soloSeguridadAdmin ? "Seguridad" : "Mario");
    setBusquedaPersona("");
    setVista("nuevo");
  };

  const handleStartChat = () => {
    const conv: Conversation = {
      id: persona,
      tipo: "individual",
      nombre: persona,
      ultimoMensaje: "",
      ultimaHora: "",
      ultimaFecha: "",
      avatarEmoji: "",
      noLeidos: 0,
    };
    setSelectedConv(conv);
    setTexto("");
    setVista("chat");
  };

  const handleTorreChange = (val: any) => {
    const valor = String(val);
    setTorre(valor);
    if (valor === "Seguridad") setPersona("Seguridad");
    else if (valor === "Administrador") setPersona(adminList[0]);
    else setPersona(personasTorre[0]);
  };

  return {
    vista,
    selectedConv,
    texto,
    soloNoLeidos,
    filtroChat,
    tabActiva,
    filtroTorre,
    filtroDepto,
    torre,
    depto,
    piso,
    persona,
    busquedaPersona,
    ...datosConversaciones,
    setSoloNoLeidos,
    setFiltroChat,
    setTabActiva,
    setFiltroTorre,
    setFiltroDepto,
    setTexto,
    setDepto,
    setPiso,
    setPersona,
    setBusquedaPersona,
    handleSend,
    handleSelectConversation,
    handleNewChat,
    handleStartChat,
    handleTorreChange,
    marcarMensajesLeidos,
  };
}

function PressableHeader({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1 mr-2">
      <Ionicons name="chevron-back" size={24} color="#111827" />
    </Pressable>
  );
}

