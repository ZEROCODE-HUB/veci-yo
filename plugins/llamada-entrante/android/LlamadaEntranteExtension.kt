package com.veciyo.app.llamadas

import com.onesignal.notifications.INotificationReceivedEvent
import com.onesignal.notifications.INotificationServiceExtension

/**
 * Lo primero que corre al llegar un push de OneSignal, con la app abierta,
 * en segundo plano o cerrada. Las llamadas no se enseñan como un aviso más:
 * se cambian por una llamada (`LlamadaEntrante`). El resto sigue su camino.
 *
 * Se registra en el AndroidManifest con el meta-data
 * `com.onesignal.NotificationServiceExtension` (lo pone el plugin).
 */
class LlamadaEntranteExtension : INotificationServiceExtension {
  override fun onNotificationReceived(event: INotificationReceivedEvent) {
    val datos = event.notification.additionalData ?: return
    val llamadaId = datos.optString("llamadaId")
    when (datos.optString("tipo")) {
      "llamada_entrante" -> {
        if (llamadaId.isEmpty()) return
        event.preventDefault()
        // Con la app delante ya suena dentro de ella: dos tonos a la vez, no.
        if (LlamadaEntrante.appDelante()) return
        LlamadaEntrante.mostrar(
          event.context,
          llamadaId,
          datos.optString("deQuien").ifEmpty { "Veciyo" },
          datos.optInt("segundos", 60),
          LlamadaEntrante.datosDeRechazo(
            datos.optString("usuarioId"),
            datos.optString("firma"),
            datos.optString("rechazarUrl"),
          ),
        )
      }
      "llamada_fin" -> {
        event.preventDefault()
        LlamadaEntrante.cancelar(event.context, llamadaId)
      }
    }
  }
}
