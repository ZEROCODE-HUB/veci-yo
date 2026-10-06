import { theme } from "@/config";
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Button, Select } from "@/shared/components";
import { useChatScreen } from "../hooks/useChatScreen";
import { ChatConversationList } from "../components/chat/ChatConversationList";
import { useUnidadesDisponibles } from "@/shared/hooks";

export function ChatScreen() {
  const {
    soloNoLeidos,
    filtroChat,
    tabActiva,
    filtroTorre,
    filtroDepto,
    esGuardia,
    soloSeguridadAdmin,
    setSoloNoLeidos,
    setFiltroChat,
    setTabActiva,
    setFiltroTorre,
    setFiltroDepto,
    convFiltradas,
    totalNoLeidos,
    handleSelectConversation,
    handleNewChat,
    marcarMensajesLeidos,
    alternarSilencio,
  } = useChatScreen();

  /*
    Las torres y los deptos del edificio, de la base. Solo los usa la portería
    --es la única que filtra por vivienda-- y la consulta vale lo mismo para
    todos los roles, así que no se condiciona: un hook no se llama dentro de un
    `if` (regla de los hooks, y el linter lo tiene en error).
  */
  const { torres, codigosDe } = useUnidadesDisponibles();

  return (
    <View className="flex-1 bg-white">
      {!esGuardia && (
        <View
          className="px-4 py-3"
          style={{
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Button variant="primary" onPress={handleNewChat}>
            + Nuevo chat
          </Button>
        </View>
      )}

      <View
        className="px-4 py-1.5"
        style={{
          backgroundColor: theme.colors.bgCard,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => setSoloNoLeidos(!soloNoLeidos)}
            className="rounded-full px-3.5 py-1"
            style={{
              backgroundColor: soloNoLeidos
                ? theme.colors.primary
                : "transparent",
              borderWidth: 1.5,
              borderColor: soloNoLeidos
                ? theme.colors.primary
                : theme.colors.border,
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{
                color: soloNoLeidos
                  ? theme.colors.textInverse
                  : theme.colors.textSecondary,
              }}
            >
              {soloNoLeidos ? `● No leídos (${totalNoLeidos})` : "○ No leídos"}
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
                style={{ color: theme.colors.primary }}
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
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tabActiva === tab.key }}
                  aria-selected={tabActiva === tab.key}
                  onPress={() => {
                    setTabActiva(tab.key);
                    setFiltroTorre("");
                    setFiltroDepto("");
                  }}
                  className="rounded-full px-3 py-1.5"
                  style={{
                    backgroundColor:
                      tabActiva === tab.key
                        ? theme.colors.primary
                        : theme.colors.bgMuted,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        tabActiva === tab.key
                          ? theme.colors.textInverse
                          : theme.colors.textSecondary,
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {/*
              Las torres y los deptos salen de la base. Estaban **escritos a
              fuego** --«Torre 1», «Torre 2», «Torre 3» y dieciséis números de
              departamento-- así que en un edificio con una cuarta torre o con
              el depto 501 el filtro no los ofrecía: la portería no podía
              llegar a esa conversación por aquí.

              Es la misma forma que el `<Badge status="Pendiente" />` escrito a
              mano: la decisión vivía en la pantalla y no en el dato.
            */}
            {tabActiva === "torres" && (
              <View className="flex-row gap-2 mt-1.5 pb-1">
                <View className="w-[50%]">
                  <Select
                    value={filtroTorre || null}
                    options={[
                      { value: "", label: "Todas las torres" },
                      ...torres.map((t) => ({ value: t, label: t })),
                    ]}
                    onChange={(value) => {
                      setFiltroTorre(String(value));
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
                        ...codigosDe(filtroTorre).map((d) => ({
                          value: d,
                          label: d,
                        })),
                      ]}
                      onChange={(value) => setFiltroDepto(String(value))}
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
            ].map((filter) => (
              <Pressable
                key={filter.key}
                onPress={() => setFiltroChat(filter.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: filtroChat === filter.key }}
                aria-selected={filtroChat === filter.key}
                className="rounded-full px-3 py-1"
                style={{
                  backgroundColor:
                    filtroChat === filter.key
                      ? theme.colors.primary
                      : theme.colors.bgMuted,
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color:
                      filtroChat === filter.key
                        ? theme.colors.textInverse
                        : theme.colors.textSecondary,
                  }}
                >
                  {filter.key === "grupos" ? "👥 " : ""}
                  {filter.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <ChatConversationList
        conversations={convFiltradas}
        onSelect={handleSelectConversation}
        onSilenciar={alternarSilencio}
        /*
          El vacío dice **por qué** está vacío. La portería abre el chat en la
          pestaña «Torres», que son las conversaciones que no son de seguridad
          ni de administración, y hoy no hay ninguna: leía «No hay
          conversaciones» con tres hilos de seguridad esperando a un clic de
          distancia.

          Es la familia de «una pantalla que anuncia lo que no intentó», en
          pequeño: el texto era cierto para el filtro puesto y falso para lo
          que la persona entiende al leerlo.
        */
        emptyMessage={
          soloNoLeidos
            ? "No hay conversaciones sin leer"
            : esGuardia && tabActiva === "torres"
              ? "Aquí van los chats con una vivienda. Los hilos de seguridad y de administración están en sus pestañas."
              : "No hay conversaciones"
        }
      />
    </View>
  );
}
