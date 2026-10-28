package com.veciyo.app.llamadas

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.lang.ref.WeakReference
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/**
 * La llamada entrante como una llamada de verdad (28/10/2026).
 *
 * Llega un push de OneSignal con `tipo = llamada_entrante`;
 * `LlamadaEntranteExtension` lo intercepta y llama a `mostrar`, que pone un
 * aviso de categoría llamada con el tono del teléfono en bucle y, con la
 * pantalla bloqueada, abre `LlamadaActivity` a pantalla completa. Contestar
 * abre la app en `veciyo://llamada?id=…&accion=contestar`, y la parte de
 * JavaScript (`Intercomunicador`) contesta. Con `tipo = llamada_fin` --la
 * llamada dejó de sonar: la contestó otro, colgaron o nadie contestó-- se
 * quita.
 *
 * Lo genera el plugin `plugins/llamada-entrante` al compilar el APK: la
 * carpeta `android/` no está en git.
 */
object LlamadaEntrante {
  const val CANAL = "veciyo_llamadas"
  const val EXTRA_ID = "llamadaId"
  const val EXTRA_DE = "deQuien"
  /** Para rechazar sin sesión: quién recibe, la firma del aviso y a dónde mandarla. */
  const val EXTRA_USUARIO = "usuarioId"
  const val EXTRA_FIRMA = "firma"
  const val EXTRA_URL_RECHAZO = "rechazarUrl"

  /** La pantalla de llamada abierta, para cerrarla si la llamada termina. */
  var pantallaAbierta: WeakReference<LlamadaActivity>? = null

  fun idDelAviso(llamadaId: String): Int = ("llamada:$llamadaId").hashCode()

  /** Con la app delante, la llamada ya suena dentro de ella. */
  fun appDelante(): Boolean {
    val estado = ActivityManager.RunningAppProcessInfo()
    ActivityManager.getMyMemoryState(estado)
    return estado.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
  }

  private fun tono(): Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

  private fun crearCanal(contexto: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val gestor = contexto.getSystemService(NotificationManager::class.java)
    if (gestor.getNotificationChannel(CANAL) != null) return
    val canal = NotificationChannel(CANAL, "Llamadas", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Llamadas por la app: portería, administración y viviendas"
      setSound(
        tono(),
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build(),
      )
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 800, 600, 800, 600, 800)
      lockscreenVisibility = Notification.VISIBILITY_PUBLIC
    }
    gestor.createNotificationChannel(canal)
  }

  /** Abre la app en la llamada: `accion` es «contestar» o «ver». */
  fun abrirLaApp(contexto: Context, llamadaId: String, accion: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse("veciyo://llamada?id=$llamadaId&accion=$accion"))
      .setPackage(contexto.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)

  private fun flags(): Int = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

  fun mostrar(contexto: Context, llamadaId: String, deQuien: String, segundos: Int, rechazo: Bundle) {
    crearCanal(contexto)
    val base = idDelAviso(llamadaId)

    val pantalla = Intent(contexto, LlamadaActivity::class.java)
      .putExtra(EXTRA_ID, llamadaId)
      .putExtra(EXTRA_DE, deQuien)
      .putExtras(rechazo)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION)
    val aPantallaCompleta = PendingIntent.getActivity(contexto, base, pantalla, flags())
    val contestar = PendingIntent.getActivity(
      contexto, base + 1, abrirLaApp(contexto, llamadaId, "contestar"), flags(),
    )
    val rechazar = PendingIntent.getBroadcast(
      contexto,
      base + 2,
      Intent(contexto, RechazarLlamadaReceiver::class.java).putExtra(EXTRA_ID, llamadaId).putExtras(rechazo),
      flags(),
    )

    val aviso = NotificationCompat.Builder(contexto, CANAL)
      .setSmallIcon(contexto.applicationInfo.icon)
      .setContentTitle(deQuien)
      .setContentText("Te llama por Veciyo")
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_CALL)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(true)
      .setSound(tono())
      .setFullScreenIntent(aPantallaCompleta, true)
      .setContentIntent(aPantallaCompleta)
      .addAction(0, "Rechazar", rechazar)
      .addAction(0, "Contestar", contestar)
      .setTimeoutAfter(segundos.coerceIn(10, 180) * 1000L)
      .build()
    // Que el tono se repita hasta que se conteste, se rechace o se acabe.
    aviso.flags = aviso.flags or Notification.FLAG_INSISTENT

    try {
      NotificationManagerCompat.from(contexto).notify(base, aviso)
    } catch (_: SecurityException) {
      // Sin permiso de notificaciones no hay nada que enseñar.
    }
  }

  /** Lo que el aviso trae para rechazar sin sesión, listo para pasar entre pantallas. */
  fun datosDeRechazo(usuarioId: String, firma: String, url: String): Bundle = Bundle().apply {
    putString(EXTRA_USUARIO, usuarioId)
    putString(EXTRA_FIRMA, firma)
    putString(EXTRA_URL_RECHAZO, url)
  }

  /**
   * Rechaza en el servidor, sin sesión (`rechazar-llamada`): a quien llama le
   * sale «rechazada» al momento. Con la firma del aviso, que solo vale para
   * esta llamada y esta persona. Si falla, al menos ya dejó de sonar aquí.
   * Corre fuera del hilo principal; `alTerminar` se llama siempre.
   */
  fun rechazarEnElServidor(llamadaId: String, datos: Bundle?, alTerminar: () -> Unit = {}) {
    val usuarioId = datos?.getString(EXTRA_USUARIO).orEmpty()
    val firma = datos?.getString(EXTRA_FIRMA).orEmpty()
    val url = datos?.getString(EXTRA_URL_RECHAZO).orEmpty()
    if (llamadaId.isEmpty() || usuarioId.isEmpty() || firma.isEmpty() || !url.startsWith("https://")) {
      alTerminar()
      return
    }
    Thread {
      try {
        val conexion = URL(url).openConnection() as HttpURLConnection
        conexion.requestMethod = "POST"
        conexion.connectTimeout = 8000
        conexion.readTimeout = 8000
        conexion.doOutput = true
        conexion.setRequestProperty("Content-Type", "application/json")
        val cuerpo = JSONObject()
          .put("llamadaId", llamadaId)
          .put("usuarioId", usuarioId)
          .put("firma", firma)
          .toString()
        conexion.outputStream.use { it.write(cuerpo.toByteArray()) }
        conexion.responseCode
        conexion.disconnect()
      } catch (_: Exception) {
        // Sin red: a quien llama le sonará hasta el tiempo de espera.
      } finally {
        alTerminar()
      }
    }.start()
  }

  fun cancelar(contexto: Context, llamadaId: String) {
    if (llamadaId.isEmpty()) return
    NotificationManagerCompat.from(contexto).cancel(idDelAviso(llamadaId))
    pantallaAbierta?.get()?.let { if (it.llamadaId == llamadaId) it.finish() }
  }
}
