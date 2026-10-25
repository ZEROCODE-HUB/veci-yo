import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { DesplazableConTeclado } from "@/shared/layouts";
import {
  Badge,
  Button,
  Card,
  Cargando,
  Input,
  SearchBar,
} from "@/shared/components/ui";
import { useUIStore } from "@/stores";
import { mensajeDeError } from "@/shared/utils/error.util";
import {
  CUENTAS_POR_PAGINA,
  ROLES_PLATAFORMA,
  type AccionSobreCuenta,
  type CuentaEnElPanel,
} from "../services/plataforma.repo";
import { useUsuariosDeLaApp } from "../hooks/usePanelDeLaApp";

/**
 * Las cuentas de la app: la lista por páginas, un buscador que la filtra, y
 * actuar sobre cada una (23 y 24/10/2026: «no quiero buscar sí o sí»).
 *
 * De cada cuenta se ve lo que hace falta para ayudar a alguien que no puede
 * entrar --nombre, correo, si confirmó, si está bloqueada, cuándo entró por
 * última vez-- y en qué edificios está con qué rol. Nada de su vida en ellos:
 * ni chats, ni visitas, ni pagos (límite del 02/10/2026).
 *
 * Cada acción pide un segundo toque para confirmar, como quitar un rol en
 * Equipo. Suspender pide además el motivo: le llega por correo y lo ve al
 * intentar usar la app (24/10/2026).
 */

const ACCIONES: Record<
  AccionSobreCuenta,
  { boton: string; confirmar: string; hecho: string }
> = {
  suspender: {
    boton: "Suspender la cuenta",
    confirmar: "Confirmar: suspender y avisarle por correo",
    hecho: "Cuenta suspendida",
  },
  reactivar: {
    boton: "Reactivar la cuenta",
    confirmar: "Confirmar: reactivar y avisarle por correo",
    hecho: "Cuenta reactivada",
  },
  enviar_contrasena: {
    boton: "Enviar correo para poner contraseña",
    confirmar: "Confirmar: enviar el correo",
    hecho: "Correo enviado",
  },
  confirmar_correo: {
    boton: "Marcar el correo como confirmado",
    confirmar: "Confirmar: dar el correo por confirmado",
    hecho: "Correo confirmado",
  },
  bloquear: {
    boton: "Bloquear la cuenta",
    confirmar: "Confirmar: no podrá entrar",
    hecho: "Cuenta bloqueada",
  },
  desbloquear: {
    boton: "Desbloquear la cuenta",
    confirmar: "Confirmar: podrá volver a entrar",
    hecho: "Cuenta desbloqueada",
  },
};

const ROL_EN_EDIFICIO: Record<string, string> = {
  propietario: "Propietario",
  inquilino_lider: "Inquilino líder",
  residente: "Residente",
  corresidente: "Corresidente",
  huesped_temporal: "Huésped",
  administrador: "Administración",
  coadministrador: "Coadministración",
  guardia: "Portería",
};

export function PlataformaUsuariosScreen() {
  const addToast = useUIStore((s) => s.addToast);
  const [texto, setTexto] = useState("");
  /** Lo escrito, aplicado un momento después de dejar de teclear. */
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const { esDueno, usuarioId, cuentas, total, cargando, error, actuar } =
    useUsuariosDeLaApp(filtro, pagina);
  const [abierta, setAbierta] = useState<string | null>(null);
  /** «usuario:acción» a punto de hacerse: el segundo toque la confirma. */
  const [porConfirmar, setPorConfirmar] = useState<string | null>(null);
  /** El motivo de la suspensión que se está escribiendo. */
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    const espera = setTimeout(() => {
      setFiltro(texto.trim());
      setPagina(1);
    }, 400);
    return () => clearTimeout(espera);
  }, [texto]);

  const paginas = Math.max(1, Math.ceil(total / CUENTAS_POR_PAGINA));

  const hacer = async (cuenta: CuentaEnElPanel, accion: AccionSobreCuenta) => {
    const llave = `${cuenta.usuarioId}:${accion}`;
    if (porConfirmar !== llave) {
      setPorConfirmar(llave);
      return;
    }
    if (accion === "suspender" && motivo.trim().length < 3) {
      addToast("Escribe el motivo: se lo mandamos por correo", "error");
      return;
    }
    setPorConfirmar(null);
    try {
      const { correo } = await actuar.mutateAsync({
        usuarioId: cuenta.usuarioId,
        accion,
        motivo: accion === "suspender" ? motivo.trim() : undefined,
      });
      setMotivo("");
      addToast(`${ACCIONES[accion].hecho}: ${cuenta.nombre}`, "success");
      if (correo && !correo.enviado) {
        addToast(
          `No salió el correo: ${correo.motivo ?? "sin motivo"}`,
          "error",
        );
      }
    } catch (e) {
      addToast(mensajeDeError(e, "No se pudo completar"), "error");
    }
  };

  const accionesDe = (c: CuentaEnElPanel): AccionSobreCuenta[] => {
    const lista: AccionSobreCuenta[] = ["enviar_contrasena"];
    if (!c.correoConfirmado) lista.push("confirmar_correo");
    if (c.usuarioId !== usuarioId)
      lista.push(c.bloqueada ? "reactivar" : "suspender");
    return lista;
  };

  return (
    <DesplazableConTeclado
      className="flex-1 bg-gray-50"
      contentContainerClassName="p-4 gap-4"
    >
      <SearchBar
        value={texto}
        onChange={setTexto}
        placeholder="Filtrar por correo o nombre"
      />

      <Text className="px-1 text-xs text-gray-500">
        {total === 1 ? "1 cuenta" : `${total} cuentas`}
        {filtro ? ` con «${filtro}»` : ""}
      </Text>

      {cargando ? <Cargando texto="las cuentas" /> : null}

      {error ? (
        <Card className="p-4">
          <Text className="text-sm text-danger">
            {mensajeDeError(error, "No se pudieron cargar las cuentas")}
          </Text>
        </Card>
      ) : null}

      {!cargando && !error && cuentas.length === 0 ? (
        <Card className="p-4">
          <Text className="text-sm text-gray-500">
            No hay ninguna cuenta con ese correo o nombre.
          </Text>
        </Card>
      ) : null}

      {cuentas.map((c) => (
        <Card key={c.usuarioId} className="gap-2 p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-900">
                {c.nombre}
              </Text>
              <Text className="text-xs text-gray-500">{c.correo}</Text>
            </View>
            {c.bloqueada ? (
              <Badge status="Cancelado">Suspendida</Badge>
            ) : (
              <Badge status="Activa">Activa</Badge>
            )}
          </View>

          <Text className="text-xs text-gray-500">
            {`Alta ${c.creadaEn} · ${c.ultimoIngreso ? `último ingreso ${c.ultimoIngreso}` : "nunca ha entrado"}`}
          </Text>
          <Text className="text-xs text-gray-500">
            {c.correoConfirmado ? "Correo confirmado" : "Correo sin confirmar"}
            {c.rolPlataforma ? ` · ${ROLES_PLATAFORMA[c.rolPlataforma]}` : ""}
          </Text>
          {c.motivoSuspension ? (
            <Text className="text-xs text-danger">{`Motivo de la suspensión: ${c.motivoSuspension}`}</Text>
          ) : null}
          {c.edificios.length > 0 ? (
            c.edificios.map((e) => (
              <Text
                key={`${e.edificio}-${e.rol}`}
                className="text-xs text-gray-700"
              >
                {`${e.edificio} · ${ROL_EN_EDIFICIO[e.rol] ?? e.rol}`}
              </Text>
            ))
          ) : (
            <Text className="text-xs text-gray-400">
              No está en ningún edificio
            </Text>
          )}

          {esDueno ? (
            abierta === c.usuarioId ? (
              <View className="mt-2 gap-2">
                {accionesDe(c).map((accion) => {
                  const pendiente = porConfirmar === `${c.usuarioId}:${accion}`;
                  return (
                    <View key={accion} className="gap-2">
                      {pendiente && accion === "suspender" ? (
                        <Input
                          label="Motivo (le llega por correo)"
                          value={motivo}
                          onChangeText={setMotivo}
                          placeholder="Por ejemplo: uso indebido de la portería"
                          multiline
                        />
                      ) : null}
                      <Button
                        size="sm"
                        variant={
                          pendiente
                            ? accion === "suspender"
                              ? "danger"
                              : "primary"
                            : "secondary"
                        }
                        onPress={() => hacer(c, accion)}
                        loading={actuar.isPending && pendiente}
                      >
                        {pendiente
                          ? ACCIONES[accion].confirmar
                          : ACCIONES[accion].boton}
                      </Button>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onPress={() => {
                  setAbierta(c.usuarioId);
                  setPorConfirmar(null);
                }}
                style={{ marginTop: 8, alignSelf: "flex-start" }}
              >
                Acciones
              </Button>
            )
          ) : null}
        </Card>
      ))}

      {paginas > 1 ? (
        // «Página X de Y» encima: entre los dos botones, en un celular de 320
        // empujaba «Siguiente» fuera de la pantalla (auditoría de
        // responsividad, 25/10/2026).
        <View className="gap-2">
          <Text className="text-sm text-gray-700 text-center">{`Página ${pagina} de ${paginas}`}</Text>
          <View className="flex-row items-center justify-between gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={pagina <= 1}
              onPress={() => setPagina((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pagina >= paginas}
              onPress={() => setPagina((p) => p + 1)}
            >
              Siguiente
            </Button>
          </View>
        </View>
      ) : null}

      {!esDueno ? (
        <Text className="px-1 text-xs text-gray-500">
          Soporte puede ver las cuentas; actuar sobre ellas es solo del dueño de
          la plataforma.
        </Text>
      ) : null}
    </DesplazableConTeclado>
  );
}
