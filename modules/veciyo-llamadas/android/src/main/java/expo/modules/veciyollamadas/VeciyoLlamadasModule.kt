package expo.modules.veciyollamadas

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Lo que la parte de JavaScript necesita saber del celular para que la
 * llamada llegue con la app cerrada (28/10/2026):
 *
 *   · si puede enseñar la llamada a pantalla completa con el celular
 *     bloqueado (Android 14 lo da solo a las apps de llamadas; si falta, se
 *     abre el ajuste para activarlo);
 *   · si Android la deja tranquila para ahorrar batería (algunas marcas
 *     cierran las apps y entonces no llega nada).
 *
 * Tiene el mismo nombre que el módulo de iPhone (`VeciyoLlamadas`, CallKit)
 * y las mismas funciones de este lado, que aquí no hacen nada: la llamada de
 * Android la hace el código del APK (`plugins/llamada-entrante`).
 */
class VeciyoLlamadasModule : Module() {
  private val contexto: Context
    get() = requireNotNull(appContext.reactContext) { "Sin contexto de Android" }

  private fun abrir(intent: Intent) {
    contexto.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  private fun deLaApp(accion: String): Intent =
    Intent(accion, Uri.parse("package:${contexto.packageName}"))

  override fun definition() = ModuleDefinition {
    Name("VeciyoLlamadas")

    Events("tokenVoip", "contestar", "colgar")

    // Lo de CallKit, que en Android no existe.
    Function("listo") { emptyList<Map<String, String>>() }
    Function("tokenVoip") { null as String? }

    // La llamada terminó en otro sitio: que deje de sonar aquí.
    Function("terminar") { llamadaId: String ->
      NotificationManagerCompat.from(contexto).cancel("llamada:$llamadaId".hashCode())
    }

    Function("puedePantallaCompleta") {
      if (Build.VERSION.SDK_INT >= 34) {
        contexto.getSystemService(NotificationManager::class.java).canUseFullScreenIntent()
      } else {
        true
      }
    }

    Function("abrirAjustePantallaCompleta") {
      if (Build.VERSION.SDK_INT >= 34) {
        abrir(deLaApp(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT))
      } else {
        abrir(
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, contexto.packageName),
        )
      }
    }

    Function("sinAhorroDeBateria") {
      contexto.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(contexto.packageName)
    }

    Function("pedirSinAhorroDeBateria") {
      try {
        abrir(deLaApp(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS))
      } catch (_: Exception) {
        // Algunas marcas no tienen esa ventana: la lista general de batería.
        abrir(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      }
    }
  }
}
