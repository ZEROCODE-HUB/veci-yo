import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores";
import { useParametrosDeLaBase } from "@/shared/hooks/useParametrosDeLaBase";
import {
  entrarEnAvisosPush,
  escucharAvisos,
  estadoDelCelular,
  iniciarAvisosPush,
  pedirPermisoDeAvisos,
  salirDeAvisosPush,
} from "@/shared/services/avisosPush";
import { obtenerPreferencias } from "@/features/perfil/services/configuracion.repo";
import { confirmarAvisoRecibido } from "@/features/home/services/notificaciones.repo";
import { buscarActualizacion, reiniciarConActualizacion } from "@/shared/services/actualizaciones";

/**
 * Ata los avisos al celular a la sesión. No pinta nada.
 *
 *   · Arranca OneSignal con `onesignal_app_id`, que viene de la base. Los
 *     parámetros solo los lee quien tiene sesión, así que arranca al entrar.
 *   · Al entrar, este celular pasa a recibir los avisos de esa cuenta; al
 *     salir, deja de recibirlos (si no, el siguiente que entre en este
 *     celular recibiría los del anterior). Una cuenta abierta en varios
 *     celulares los recibe en todos: OneSignal ata cada uno a la misma cuenta.
 *   · Al entrar (o registrarse) se pide el permiso de notificaciones, una vez
 *     por sesión, si el celular todavía no lo dio y la persona no apagó las
 *     notificaciones push (22/10/2026: antes había que ir a Configuración).
 *   · Cuando un push llega con la app abierta, o la persona lo toca, se marca
 *     como recibido en `envio_push`. Es la confirmación que lee la tarjeta de
 *     prueba de Perfil › Avisos, y la que deja ver en la base qué llegó.
 *   · Si el aviso es «Veciyo se actualizó» (22/10/2026), se descarga la
 *     actualización: con la app abierta sale «Reiniciar» arriba; si la
 *     persona tocó el aviso, se reinicia ya con la versión nueva.
 *
 * En la web todo esto no hace nada (`avisosPush.ts`).
 */
export function AvisosPushDeLaSesion() {
  const usuarioId = useAuthStore((s) => s.usuarioId);
  const parametros = useParametrosDeLaBase();
  const appId = parametros.listo ? parametros.texto("onesignal_app_id") : null;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (appId) iniciarAvisosPush(appId);
  }, [appId]);

  useEffect(() => {
    // Salir no espera al id de la app: al cerrar sesión los parámetros dejan
    // de poder leerse, y aun así este celular tiene que soltar la cuenta.
    if (!usuarioId) salirDeAvisosPush();
    else if (appId) entrarEnAvisosPush(usuarioId);
  }, [appId, usuarioId]);

  const { data: preferencias } = useQuery({
    queryKey: ["preferencias"],
    queryFn: obtenerPreferencias,
    enabled: Boolean(usuarioId),
  });
  const avisosPush = preferencias?.avisosPush;
  const yaPreguntado = useRef<string | null>(null);
  useEffect(() => {
    if (!appId || !usuarioId || !avisosPush || yaPreguntado.current === usuarioId) return;
    yaPreguntado.current = usuarioId;
    estadoDelCelular()
      // La tarjeta de Configuración se entera sola (escucha el cambio de permiso).
      .then((estado) => (estado.disponible && !estado.permiso ? pedirPermisoDeAvisos(false) : undefined))
      // Si el sistema no deja preguntar, queda el botón de Configuración.
      .catch(() => {});
  }, [appId, usuarioId, avisosPush]);

  useEffect(() => {
    if (!appId) return;
    return escucharAvisos((notificacionId, tocado, tipo) => {
      if (tipo === "app_actualizada") {
        buscarActualizacion()
          .then(() => (tocado ? reiniciarConActualizacion() : undefined))
          // Sin red no se puede: la app la busca sola la próxima vez que abra.
          .catch(() => {});
      }
      confirmarAvisoRecibido(notificacionId)
        .then(() => queryClient.invalidateQueries({ queryKey: ["envio-push", notificacionId] }))
        // Que no se pueda confirmar no le importa a quien está usando la app:
        // el aviso ya lo tiene delante. Queda sin `recibido_en` y ya.
        .catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["notificaciones"] });
    });
  }, [appId, queryClient]);

  return null;
}
