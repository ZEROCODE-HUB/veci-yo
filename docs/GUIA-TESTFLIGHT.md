# Subir Veciyo a TestFlight: lo que hace el dueño de las cuentas

La compilación para iPhone y la subida a TestFlight las hago yo desde GitHub
(flujos «EAS Build iOS» y «EAS Submit iOS», rama `ios/testflight`), con el
token de Expo de nocodehero que ya está guardado en el repositorio. Al dueño
solo le queda esto:

## 1. Añadir a quien va a probar (cuando te avise que ya subió)

1. Entra en https://appstoreconnect.apple.com › **Apps › Veciyo › TestFlight**.
2. En **Probadores internos**, pulsa **+** y añade los correos de quienes van a
   probar.
3. A cada uno le llega un correo: instala la app **TestFlight** desde la App
   Store y, desde ahí, Veciyo.

## Opcional: avisos y llamadas con el iPhone bloqueado

La app abre y funciona sin esto. Hace falta para que en el iPhone lleguen los
avisos push y suenen las llamadas con el teléfono bloqueado:

1. En https://developer.apple.com/account › **Keys**, crea una llave con
   **Apple Push Notifications service (APNs)** marcado.
2. Descarga el archivo `.p8` (solo se puede descargar una vez) y apunta su
   **Key ID**.
3. Pásame el archivo y el Key ID por un canal seguro, nunca por el chat. Yo lo
   configuro en OneSignal y en el servidor.
