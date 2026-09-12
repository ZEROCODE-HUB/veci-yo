import React from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Button, Select } from "@/shared/components";
import { useChatScreen } from "../hooks/useChatScreen";
import {
  ChatConversationList,
  ChatThread,
  ChatComposer,
  ChatNewForm,
} from "../components/chat/";

export function ChatScreen() {
  const {
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
    convFiltradas,
    totalNoLeidos,
    mensajesVisibles,
    esGuardia,
    soloSeguridadAdmin,
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
  } = useChatScreen();

  // ── LISTA VIEW ──
  if (vista === "lista") {
    return (
      <View className="flex-1 bg-white">
        {!esGuardia && (
          <View
            className="px-4 py-3"
            style={{ borderBottomWidth: 1, borderBottomColor: "#E5E7EB" }}
          >
            <Button variant="primary" onPress={handleNewChat}>
              + Nuevo chat
            </Button>
          </View>
        )}

        {/* Filters bar */}
        <View
          className="px-4 py-1.5"
          style={{
            backgroundColor: "#FFFFFF",
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
          }}
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setSoloNoLeidos(!soloNoLeidos)}
              className="rounded-full px-3.5 py-1"
              style={{
                backgroundColor: soloNoLeidos ? "#F5B800" : "transparent",
                borderWidth: 1.5,
                borderColor: soloNoLeidos ? "#F5B800" : "#E5E7EB",
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: soloNoLeidos ? "#fff" : "#6B7280" }}
              >
                {soloNoLeidos
                  ? `● No leídos (${totalNoLeidos})`
                  : "○ No leídos"}
              </Text>
            </Pressable>
            {totalNoLeidos > 0 && (
              <Pressable
                onPress={() => {
                  marcarMensajesLeidos();
                  setSoloNoLeidos(false);
                }}
              >
                <Text
                  className="text-xs font-medium"
                  style={{ color: "#F5B800" }}
                >
                  Marcar todos leídos
                </Text>
              </Pressable>
            )}
          </View>

          {esGuardia ? (
            <>
              <View className="flex-row gap-1 mt-1.5 pb-1">
                {[
                  { key: "torres" as const, label: " Torres" },
                  { key: "seguridad" as const, label: " Seguridad" },
                  { key: "admin" as const, label: " Admin" },
                ].map((tab) => (
                  <Pressable
                    key={tab.key}
                    onPress={() => {
                      setTabActiva(tab.key);
                      setFiltroTorre("");
                      setFiltroDepto("");
                    }}
                    className="rounded-full px-3 py-1.5"
                    style={{
                      backgroundColor:
                        tabActiva === tab.key ? "#F5B800" : "#F9FAFB",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: tabActiva === tab.key ? "#fff" : "#6B7280",
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {tabActiva === "torres" && (
                <View className="flex-row gap-2 mt-1.5 pb-1">
                  <View className="w-[50%]">
                    <Select
                      value={filtroTorre || null}
                      options={[
                        { value: "", label: "Todas las torres" },
                        { value: "Torre 1", label: "Torre 1" },
                        { value: "Torre 2", label: "Torre 2" },
                        { value: "Torre 3", label: "Torre 3" },
                      ]}
                      onChange={(v) => {
                        setFiltroTorre(String(v));
                        setFiltroDepto("");
                      }}
                    />
                  </View>
                  {filtroTorre ? (
                    <View className="flex-1">
                      <Select
                        value={filtroDepto || null}
                        options={[
                          { value: "", label: "Todos los deptos" },
                          ...(
                            [
                              "101",
                              "102",
                              "103",
                              "104",
                              "105",
                              "106",
                              "201",
                              "202",
                              "301",
                              "302",
                              "303",
                              "304",
                              "305",
                              "306",
                              "401",
                              "402",
                              "403",
                              "404",
                              "405",
                              "406",
                            ] as const
                          ).map((d) => ({ value: d, label: d })),
                        ]}
                        onChange={(v) => setFiltroDepto(String(v))}
                      />
                    </View>
                  ) : null}
                </View>
              )}
            </>
          ) : soloSeguridadAdmin ? null : (
            <View className="flex-row gap-1.5 mt-1.5 pb-1">
              {[
                { key: "todos" as const, label: "Todos" },
                { key: "individuales" as const, label: "Individuales" },
                { key: "grupos" as const, label: "Grupos" },
              ].map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setFiltroChat(f.key)}
                  className="rounded-full px-3 py-1"
                  style={{
                    backgroundColor:
                      filtroChat === f.key ? "#F5B800" : "#F9FAFB",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: filtroChat === f.key ? "#fff" : "#6B7280" }}
                  >
                    {f.key === "grupos" ? "👥 " : ""}
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <ChatConversationList
          conversations={convFiltradas}
          onSelect={handleSelectConversation}
          emptyMessage={
            soloNoLeidos
              ? "No hay conversaciones sin leer"
              : "No hay conversaciones"
          }
        />
      </View>
    );
  }

  // ── CHAT VIEW ──
  if (vista === "chat" && selectedConv) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 bg-white">
          <ChatThread conversation={selectedConv} messages={mensajesVisibles} />
          <ChatComposer
            value={texto}
            onChangeText={setTexto}
            onSend={handleSend}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── NUEVO CHAT VIEW ──
  return (
    <ChatNewForm
      torre={torre}
      depto={depto}
      piso={piso}
      persona={persona}
      busquedaPersona={busquedaPersona}
      soloSeguridadAdmin={soloSeguridadAdmin}
      onTorreChange={handleTorreChange}
      onDeptoChange={(v) => setDepto(String(v))}
      onPisoChange={(v) => setPiso(String(v))}
      onPersonaChange={(v) => setPersona(String(v))}
      onBusquedaChange={(v) => {
        setBusquedaPersona(v);
        setPersona("");
      }}
      onStartChat={handleStartChat}
    />
  );
}
