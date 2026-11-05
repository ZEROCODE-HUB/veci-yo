# Subir Veciyo a TestFlight: lo que hace el dueño de las cuentas

La cuenta de Apple Developer ya está pagada, la app ya está creada en Apple y
Expo ya está conectado con Apple. Solo faltan estos pasos.

## 1. Darme permiso en Expo (2 minutos)

1. Entra en https://expo.dev con la cuenta **nocodehero**.
2. Ve a **Settings › Members**.
3. Busca a **oscarmpz** y cambia su rol de **Viewer** a **Developer**.
4. Avísame.

Con eso yo compilo la app para iPhone y la subo a TestFlight. Tarda alrededor
de una hora.

## 2. Añadir a quien va a probar (cuando te avise que ya subió)

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
