# Cómo subir Veciyo a TestFlight (iPhone)

Escrito el 05/11/2026. TestFlight es la forma de Apple de probar una app antes
de publicarla en la App Store: se instala con la app «TestFlight» en el iPhone
y se invita a los testers por correo.

Hasta hoy Veciyo **nunca se ha compilado para iPhone**. Esta guía va en orden:
cada paso necesita el anterior.

---

## Lo que ya está listo en el proyecto

- La app está registrada en App Store Connect: equipo `9BWTN3CAXU`, app
  `6812049585`, identificador `com.veciyo.app` (en `eas.json` y `app.json`).
- `app.json` ya tiene lo que Apple revisa al subir:
  - el manifiesto de privacidad (`ios.privacyManifests`);
  - los textos de los permisos de cámara, micrófono y fotos, en español;
  - `ITSAppUsesNonExemptEncryption: false` (la app solo usa el cifrado normal
    de internet; así TestFlight no pregunta por exportación en cada versión);
  - las notificaciones en modo **producción** (`aps-environment` y OneSignal),
    que es lo que exige TestFlight.
- `eas.json` tiene el perfil `production` (canal `production`, número de
  versión automático, credenciales guardadas en Expo).
- Las llamadas con el iPhone bloqueado (CallKit y PushKit) están escritas en
  `modules/veciyo-llamadas` y `plugins/llamada-entrante/ios.js`. **Nunca se
  han compilado**: es lo primero que puede fallar.

---

## 1. Lo que tienes que hacer tú (o el dueño de las cuentas)

### 1.1 Expo: darme permiso en el proyecto correcto

La app se publica hoy desde un proyecto **provisional** de Expo, en la cuenta
`oscarmpz`. El proyecto de verdad es `@nocodehero/veci`, y ahí la cuenta
`oscarmpz` es solo **Viewer** (puede mirar, no publicar).

Quien sea dueño de `nocodehero` en expo.dev:

1. Entra en https://expo.dev/accounts/nocodehero/settings/members
2. Cambia el rol de `oscarmpz` de **Viewer** a **Developer** (o Admin).

Sin esto no se puede compilar para iPhone en el proyecto correcto. Cuando esté,
avísame y hago el paso 2.

### 1.2 Apple Developer

1. La cuenta de Apple Developer del equipo `9BWTN3CAXU` tiene que estar
   **activa** (99 USD al año). Compruébalo en
   https://developer.apple.com/account
2. En **Certificates, Identifiers & Profiles › Identifiers**, abre
   `com.veciyo.app` y marca **Push Notifications** (si no lo está). Guarda.
3. En **Keys**, crea una llave nueva con **Apple Push Notifications service
   (APNs)** marcado. Descarga el archivo `.p8` (**solo se puede descargar una
   vez**: guárdalo bien) y apunta el **Key ID** que sale.
4. Necesito acceso a App Store Connect para subir la compilación. Lo más simple:
   en https://appstoreconnect.apple.com › **Usuarios y acceso**, invita a la
   persona que compila con el rol **App Manager**. Si prefieres no dar acceso,
   crea una **clave de API de App Store Connect** (Usuarios y acceso ›
   Integraciones › Claves) con rol App Manager y me la pasas por un canal
   seguro, nunca por el chat.

### 1.3 OneSignal (avisos push en iPhone)

En https://dashboard.onesignal.com, en la app de Veciyo:
**Settings › Platforms › Apple iOS (APNs)** → sube el mismo `.p8`, con el Key ID
y el Team ID `9BWTN3CAXU`, y el bundle `com.veciyo.app`. Modo **Production**.

### 1.4 Los secretos de las llamadas en iPhone

Para que suene una llamada con el iPhone bloqueado, la función `avisar-llamada`
necesita cuatro secretos en Supabase (**Project Settings › Edge Functions ›
Secrets**). Los pongo yo si me pasas el `.p8` y el Key ID, o los pones tú:

| Secreto | Qué va |
|---|---|
| `APNS_TEAM_ID` | `9BWTN3CAXU` |
| `APNS_KEY_ID` | el Key ID de la llave del paso 1.2 |
| `APNS_LLAVE_P8` | el contenido entero del archivo `.p8` |
| `APNS_TOPIC_VOIP` | `com.veciyo.app.voip` |

---

## 2. Lo que hago yo en cuanto tenga el permiso de Expo

1. Cambiar `app.json` al proyecto correcto:
   - `owner`: `nocodehero`;
   - `extra.eas.projectId`: `b09b0e34-a30f-48a6-8601-21ce41e804ee`;
   - `updates.url`: `https://u.expo.dev/b09b0e34-a30f-48a6-8601-21ce41e804ee`.
2. En ese proyecto, crear los canales `pruebas` y `production`, y copiar las
   variables `EXPO_PUBLIC_*` a sus entornos `preview` y `production`
   (`eas env:list`, `eas env:create`). Sin la URL de Supabase la app sale en
   blanco: ya pasó una vez.
3. Compilar el **APK 7** para Android con el perfil `preview` (canal `pruebas`)
   y pedir a los testers que lo instalen encima. Es obligatorio: un APK del
   proyecto provisional no recibe actualizaciones del correcto. Este APK trae
   además los arreglos de seguridad que no podían ir por OTA (las piezas de Expo
   con parte nativa) y el texto nuevo del permiso de cámara.
4. Cambiar `npm run ota` para que publique también para iPhone y en el canal
   que toque.

---

## 3. Compilar y subir a TestFlight

Con los pasos 1 y 2 hechos:

```
npx eas build --platform ios --profile production
```

- La primera vez pregunta por las credenciales de Apple: se inicia sesión con
  la cuenta de Apple Developer y EAS crea el certificado y el perfil, y los
  guarda en Expo (`credentialsSource: remote`).
- Tarda unos 20-30 minutos en los servidores de Expo.

Cuando termine:

```
npx eas submit --platform ios --profile production --latest
```

Sube la compilación a App Store Connect. Apple la procesa (10-30 minutos) y
aparece en **TestFlight**.

---

## 4. En App Store Connect, la primera vez

1. **TestFlight › Información de prueba**: un correo de contacto y una frase de
   qué probar.
2. **TestFlight › Probadores internos**: añade a quien vaya a probar (tienen que
   estar en «Usuarios y acceso»). Los internos no necesitan revisión de Apple.
   Los externos (cualquier correo) sí: la primera revisión tarda uno o dos días.
3. **App › Privacidad de la app** (las «etiquetas nutricionales»): Apple pide
   declarar qué datos recoge la app. Veciyo recoge, vinculados a la persona:
   nombre, correo, teléfono, dirección (huéspedes), documento de identidad
   (huéspedes, para la portería y los reportes legales), fotos que la persona
   sube, contenido de los chats, y el identificador del celular para los avisos
   push. No se usan para publicidad ni para rastrear.
4. **App › Información de la app**: la URL de la política de privacidad. Hoy es
   https://veciyo-web-seven.vercel.app/privacidad . Para publicar en la tienda
   conviene que esté en un dominio propio (`veciyo.com`), y que la revise un
   abogado: su propia cabecera dice que no lo ha hecho.

---

## 5. Qué probar en el iPhone antes de dar nada por bueno

Lo de iPhone no se ha probado nunca. En este orden:

1. Abre, entra con una cuenta y cambia de rol.
2. Llega un aviso push con la app cerrada.
3. Portería: escanear el documento de un huésped (el código de barras del
   reverso, y la foto del frente). En iPhone el texto lo lee el lector de
   Apple, no el de Google: es la parte con más riesgo.
4. Llamada por la app con el iPhone **bloqueado**: tiene que sonar como una
   llamada normal (CallKit). Se prueba en un iPhone de verdad; en el simulador
   no funciona.
5. Recuperar la contraseña desde el inicio de sesión.

---

## 6. Después: publicar en la App Store

Con TestFlight probado, en App Store Connect se rellena la ficha (capturas,
descripción, categoría), se elige la compilación y se manda a revisión. Cuando
salga, el enlace de la tienda va en el ajuste `url_app_ios` del panel del
administrador de la app (Ajustes), que es el que usan los correos y la web.
